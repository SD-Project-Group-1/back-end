const { json, Router } = require("express");
const prisma = require("../config/db");
const { ensureAdminAuth } = require("../helpers/middleware");

const router = Router();
router.use(json());

// ✅ GET all devices, including their location info
router.get("/getall", ensureAdminAuth, async (req, res) => {
  try {
    const devices = await prisma.device.findMany({
      include: { location: true }, // Join location info
    });
    res.send(devices);
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to get devices.");
  }
});

// ✅ GET a single device by its ID
router.get("/get/:deviceId", ensureAdminAuth, async (req, res) => {
  const deviceId = parseInt(req.params.deviceId); // Corrected param key to match route

  if (!deviceId) {
    res.status(400).send("Bad request.");
    return;
  }

  try {
    const device = await prisma.device.findUnique({
      where: { device_id: deviceId },
      include: { location: true }, // Join location info
    });

    if (!device) {
      res.status(404).send("Device not found.");
      return;
    }

    res.send(device);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error getting device.");
  }
});

// ✅ POST (create) a new device
router.post("/create", async (req, res) => {
  const { brand, serial_number, location_id } = req.body;

  if (!serial_number || !location_id) {
    res.status(400).send("Missing required information.");
    return;
  }

  try {
    const device = await prisma.device.create({
      data: {
        brand,
        serial_number,
        location_id,
      },
    });

    res.status(201).send(device);
  } catch (err) {
    console.error(err);
    res.status(400).send("Could not create device.");
  }
});

// ✅ DELETE a device by ID
router.delete("/delete/:deviceId", ensureAdminAuth, async (req, res) => {
  const deviceId = parseInt(req.params.deviceId); // Fixed typo from deviceID to deviceId

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
    console.error(err);
    res.status(500).send("Failed to delete device.");
  }
});

module.exports = router;