const {json, Router} = require("express");
const prisma = require("../config/db");
const {ensureAdminAuth, ensureAnyAuth} = require("../helpers/middleware");

const router = Router();
router.use(json());

// Get all devices
router.get("/getall", ensureAnyAuth, async(req, res) => {
    try {
        const devices = await prisma.device.findMany({
            include: {location: true}
        });
        res.send(devices);
    } catch (err){
        res.status(500).send("Failed to get devices.");
        console.error(err);
    }
});

//Get Device by ID
router.get("/get/:deviceID", ensureAnyAuth, async (req, res) => {
    const deviceId = parseInt(req.params.deviceId);

    if (!deviceId) {
        res.status(400).send("Bad Request.")
        return;
    }

    try {
        const device = await prisma.device.findUnique({
            where: {device_id: deviceId},
            include: {location: true}
        });

        if (!device) {
            res.status(400).send("Device not found.");
            return;
        }
    } catch (err) {
        res.status(500).send("Error getting device.")
    }
});

//Create new device (Admin only)
router.post("/create", ensureAdminAuth, async (req, res) => {
    const {brand, serial_number, location_id } = req.body;

    if (!serial_number || !location_id) {
        res.status(400).send("Missing required information.");
        return;
    }

    try {
        const device = await prisma.device.create({
            data: { brand, serial_number, location_id }
        });

        res.status(201).send(device);
    } catch (err) {
        res.status(400).send("Could not create device.");
        console.error(err);
    }
});

//Remove device (Admin only)
router.delete("/delete/:deviceID", ensureAdminAuth, async (req, res) => {
    const deviceId = parseInt(req.params.deviceId);

    if (!deviceId) {
        res.status(400).send("Bad request.");
        return;
    }

    try {
        await prisma.device.delete({
            where: { device_id: deviceId }
        });
        res.send("Device deleted!");
    } catch (err) {
        res.status(500).send("Failed to delete device.");
        console.error(err);
    }
});

module.exports = router;