const { json, Router } = require("express");
const prisma = require("../config/db");
const { ensureAdminAuth } = require("../helpers/middleware");

const router = Router();
router.use(json());

router.get("/getall", ensureAdminAuth, async (req, res) => {
  try {
    const { page, pageSize } = req.params;

    const prismaConfig = {
      include: { location: true, borrow: true },
    };

    if (pageSize && typeof pageSize == "number") {
      prismaConfig.take = pageSize;

      if (page && typeof page == "number") {
        prismaConfig.skip = (page - 1) * pageSize;
      }
    }

    const devices = await prisma.device.findMany(prismaConfig);
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
      data: { brand, serial_number, location_id, make, model, type },
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

