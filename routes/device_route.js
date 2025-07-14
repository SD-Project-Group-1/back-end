const { json, Router } = require("express");
const prisma = require("../config/db");
const { ensureAdminAuth, populatePaging, populateSearch, populateSort, ensureAnyAuth } = require("../helpers/middleware");

const router = Router();
router.use(json());

const sortAdapter = (field, dir) => {
  switch (field) {
    case "device_id": return { device_id: dir };
    case "device": return { device: { model: dir }, device: { make: dir }, device: { brand: dir } };
    case "brand": return { brand: dir };
    case "make": return { make: dir };
    case "model": return { model: dir };
    case "type": return { type: dir };
    case "serial_number": return { serial_number: dir };
    case "location": return { location: { location_nickname: dir } };
    case "created": return { created: dir };
    default:
      console.error("Bad sort field argument! ", field);
      return undefined;
  }
}

const searchAdapter = (field, q) => {
  if (q.startsWith("$location_id=")) {
    q = q.slice(13);

    return isNaN(q) ? {} : { location: { location_id: parseInt(q) } };
  }

  switch (field) {
    case "device_id": return isNaN(q) ? {} : { device_id: Number.parseInt(q) };
    case "brand": return { brand: { contains: q } };
    case "make": return { make: { contains: q } };
    case "model": return { model: { contains: q } };
    case "type": return { type: { contains: q } };
    case "serial_number": return { serial_number: { contains: q } };
    case "location": return { location: { location_nickname: { contains: q } } };
    default:
      console.error("Bad search field argument! ", field);
      return undefined;
  }
}

router.get("/getall",
  ensureAdminAuth, populatePaging, populateSearch(["device_id", "device", "brand", "make", "model", "type", "serial_number"], searchAdapter), populateSort(sortAdapter),
  async (req, res) => {
    try {
      const { pagingConf, whereConf, orderByConf } = req;

      const data = await prisma.device.findMany({
        include: { location: true, borrow: true },
        ...pagingConf,
        ...whereConf,
        ...orderByConf
      });

      const count = await prisma.device.count(whereConf);

      res.send({ data, count });
    } catch (err) {
      res.status(500).send("Failed to get devices.");
      console.error(err);
    }
  });

router.get("/available", ensureAnyAuth, async (req, res) => {
  const { locationId } = req.query;

  if (isNaN(locationId)) {
    res.status(400).send("No loation provided.");
    return;
  }

  try {
    const devices = await prisma.device.findMany({
      where: {
        location_id: locationId
      },
      include: {
        borrow: {
          orderBy: { borrow_date: "desc" },
          take: 1
        }
      }
    });

    const grouped = {};

    for (const d of devices) {
      const type = d.type || "Unknown";
      const latestBorrow = d.borrow[0];
      const isAvailable = !latestBorrow || latestBorrow.borrow_status === "Checked_in";

      if (!grouped[type]) grouped[type] = { deviceType: type, available: true };

      // Mark as unavailable if any device of this type isn't available
      if (!isAvailable) grouped[type].available = false;
    }

    const data = Object.values(grouped);

    res.send({ data });
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to get.");
  }
})

router.get("/get/:deviceId", ensureAdminAuth, async (req, res) => {
  const deviceId = parseInt(req.params.deviceId);

  if (!deviceId) {
    res.status(400).send("Bad Request.");
    return;
  }

  try {
    const device = await prisma.device.findUnique({
      where: { device_id: deviceId },
      include: { location: true },
    });

    if (!device) {
      res.status(400).send("Device not found.");
      return;
    }
  } catch (err) {
    res.status(500).send("Error getting device.");
  }
});

router.post("/create", ensureAdminAuth, async (req, res) => {
  const { brand, make, model, type, serial_number, location_id } = req.body;

  if (!serial_number || !location_id) {
    res.status(400).send("Missing required information.");
    return;
  }

  try {
    const device = await prisma.device.create({
      data: {
        brand,
        make,
        model,
        type,
        serial_number,
        location: {
          connect: { location_id: parseInt(location_id) }
        }
      },
    });

    res.status(201).send(device);
  } catch (err) {
    res.status(400).send("Could not create device.");
    console.error(err);
  }
});

router.delete("/delete/:deviceId", ensureAdminAuth, async (req, res) => {
  const deviceId = parseInt(req.params.deviceId);

  if (!deviceId) {
    res.status(400).send("Bad request.");
    return;
  }

  try {
    await prisma.device.delete({
      where: { device_id: deviceId },
    });
    res.send("Device deleted!");
  } catch (err) {
    res.status(500).send("Failed to delete device.");
    console.error(err);
  }
});

module.exports = router;

