const { json, Router } = require("express");
const prisma = require("../config/db");
const { ensureAdminAuth, populatePaging, populateSearch, populateSort } = require("../helpers/middleware");

const router = Router();
router.use(json());

router.get("/getall",
  ensureAdminAuth, populatePaging, populateSearch(["brand", "make", "model", "type", "serial_number"]), populateSort,
  async (req, res) => {
    try {
      const { pagingConf, whereConf, orderByConf } = req;

      const devices = await prisma.device.findMany({
        include: { location: true, borrow: true },
        ...pagingConf,
        ...whereConf,
        ...orderByConf
      });

      res.send(devices);
    } catch (err) {
      res.status(500).send("Failed to get devices.");
      console.error(err);
    }
  });

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
          connect: {location_id: parseInt(location_id) }
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

