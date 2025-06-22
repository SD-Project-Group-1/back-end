const { Router, json } = require("express");
const prisma = require("../config/db");
const { ensureAnyAuth, ensureAdminAuth } = require("../helpers/middleware");

const router = Router();
router.use(json());

// ✅ Test route
router.get("/ping", (req, res) => {
  res.send("Borrow route is working!");
});

// ✅ Create borrow record: Only admins can update borrow_status and return condition
router.post("/create", async (req, res) => {
  const {
    user_id,
    device_id,
    borrow_date,
    return_date,
    borrow_status,
    device_return_condition,
    user_location,
    device_location,
    reason_for_borrow
  } = req.body;

  if (!user_id || !device_id || !borrow_date || !borrow_status || !device_return_condition || !reason_for_borrow) {
    return res.status(400).send("Missing required fields.");
  }

  try {
    const borrow = await prisma.borrow.create({
      data: {
        user_id,
        device_id,
        borrow_date: new Date(borrow_date),
        return_date: return_date ? new Date(return_date) : null,
        borrow_status,
        device_return_condition,
        user_location,
        device_location,
        reason_for_borrow
      }
    });

    res.status(201).json(borrow);
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to create borrow record.");
  }
});

// ✅ Get all borrow records (Admin only)
router.get("/getall", ensureAdminAuth, async (req, res) => {
  try {
    const records = await prisma.borrow.findMany({
      include: {
        user: true,
        device: true
      }
    });
    res.json(records);
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to retrieve borrow records.");
  }
});

// ✅ Get records by user ID (User or Admin)
router.get("/user/:userId", ensureAnyAuth, async (req, res) => {
  const userId = parseInt(req.params.userId);
  try {
    const records = await prisma.borrow.findMany({
      where: { user_id: userId },
      include: { device: true }
    });
    res.json(records);
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to retrieve records for this user.");
  }
});

// ✅ Get records by device ID (Admin only)
router.get("/device/:deviceId", ensureAdminAuth, async (req, res) => {
  const deviceId = parseInt(req.params.deviceId);
  try {
    const records = await prisma.borrow.findMany({
      where: { device_id: deviceId },
      include: { user: true }
    });
    res.json(records);
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to retrieve records for this device.");
  }
});

// ✅ Update borrow status or return date (User or Admin)
router.patch("/update/:borrowId", ensureAnyAuth, async (req, res) => {
  const borrowId = parseInt(req.params.borrowId);
  const { borrow_status, return_date, device_return_condition } = req.body;

  try {
    const updated = await prisma.borrow.update({
      where: { borrow_id: borrowId },
      data: {
        borrow_status,
        return_date: return_date ? new Date(return_date) : undefined,
        device_return_condition
      }
    });

    res.json(updated);
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to update borrow record.");
  }
});

// ✅ Delete a borrow record (Admin only)
router.delete("/delete/:borrowId", ensureAdminAuth, async (req, res) => {
  const borrowId = parseInt(req.params.borrowId);

  try {
    await prisma.borrow.delete({
      where: { borrow_id: borrowId }
    });
    res.send("Borrow record deleted.");
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to delete borrow record.");
  }
});

module.exports = router;