const { Router, json } = require("express");
const prisma = require("../config/db");
const { ensureAnyAuth, ensureAdminAuth, populatePaging, populateSearch, populateSort } = require("../helpers/middleware");

const router = Router();
router.use(json());

// Test route
router.get("/ping", (req, res) => {
  res.send("Borrow route is working!");
});

router.get("/requested/:userId", ensureAnyAuth, async (req, res) => {
  if (req.role === "user" && req.params.user_id !== req.id) {
    res.status(401).send("Not authorized");
    return;
  }

  const request = await prisma.borrow.findFirst({
    where: {
      user_id: req.id,
      borrow_status: {
        not: "Checked_in"
      }
    },
    include: {
      device: {
        include: {
          location: true
        }
      },
    }
  });

  res.json(request);
})

// Create borrow record: Users can submit requests; only admins can set status and condition
router.post("/create", ensureAnyAuth, async (req, res) => {
  let {
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

  reason_for_borrow = reason_for_borrow.replace(' ', '_');

  const validStatus = ["Scheduled", "Cancelled", "Checked out", "Checked in", "Late", "Submitted"];
  const validConditions = ["Good", "Fair", "Damaged"];
  const validReasons = ["Job Search", "School", "Training", "Other"];

  // Enforce defaults and prevent override if not admin
  if (req.role !== "admin") {
    borrow_status = "Submitted";	// Force default status for users
    device_return_condition = null; // Ignore user input)
  } else {
    borrow_status = borrow_status || "Submitted";
    device_return_condition = device_return_condition || null;  // Admins can set or leave null
  }

  if (!device_id) {
    const device = await prisma.device.findFirst({
      where: {
        location: {
          location_nickname: {
            contains: device_location,
          }
        },
        OR: [
          {
            borrow: {
              none: {},
            },
          },
          {
            borrow: {
              every: {
                borrow_status: 'Checked_in',
              },
            },
          },
        ],
      }
    });

    if (!device) {
      console.error("Could not find a device to borrow!");
      res.status(400).send("Could not find a device to borrow!")
      return;
    }

    device_id = device.device_id;
  }

  if (!user_id || !device_id || !borrow_date || !reason_for_borrow) {
    return res.status(400).send("Missing required fields.");
  }

  if (!validStatus.includes(borrow_status) ||
    (device_return_condition && !validConditions.includes(device_return_condition)) ||
    !validReasons.includes(reason_for_borrow)) {
    return res.status(400).send("Invalid enum value provided.");
  }

  try {
    const borrow = await prisma.borrow.create({
      data: {
        borrow_date: new Date(borrow_date),
        return_date: return_date ? new Date(return_date) : null,
        borrow_status,
        device_return_condition,
        user_location,
        device_location,
        reason_for_borrow,
        user: {
          connect: { user_id: user_id }
        },
        device: {
          connect: { device_id: device_id }
        }
      }
    });

    res.status(201).json(borrow);
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to create borrow record.");
  }
});

const sortAdapter = (field, dir) => {
  switch (field) {
    case "borrow_id": return { borrow_id: dir };
    case "first_name": return { user: { first_name: dir } };
    case "last_name": return { user: { last_name: dir } };
    case "device": return { device: { brand: dir }, device: { make: dir }, device: { model: dir } };
    case "device_serial_number": return { device: { serial_number: dir } };
    case "borrow_status": return { borrow_status: dir };
    case "borrow_date": return { borrow_date: dir };
    case "return_date": return { return_date: dir };
    case "created": return { created: dir };
    default:
      console.error("Bad sort field argument! ", field);
      return undefined;
  }
}

const searchAdapter = (field, q) => {
  const validStatus = [
    "Submitted",
    "Scheduled",
    "Cancelled",
    "Checked_out",
    "Checked_in",
    "Late"
  ];

  switch (field) {
    case "borrow_id": return isNaN(q) ? undefined : { borrow_id: q };
    case "first_name": return { user: { first_name: { contains: q } } };
    case "borrow_status": return { borrow_status: { in: validStatus.filter(x => x.toLowerCase().startsWith(q.toLowerCase())) } };
    case "device": return { device: { OR: [{ brand: { contains: q } }, { make: { contains: q } }, { model: { contains: q } }, { type: { contains: q } }] } };
    case "device_serial_number": return { device: { serial_number: { contains: q } } };
    default:
      console.error("Bad search field argument! ", field);
      return undefined;
  }
}

// Get all borrow records (Admin only)
router.get("/getall",
  ensureAdminAuth, populatePaging, populateSort(sortAdapter), populateSearch(["borrow_id", "first_name", "borrow_status", "device", "device_serial_number"], searchAdapter),
  async (req, res) => {
    try {
      const { pagingConf, whereConf, orderByConf } = req;

      //TODO: Where needs to be usable on fields inside of usser too.
      const data = await prisma.borrow.findMany({
        include: {
          user: {
            select: {
              user_id: true,
              email: true,
              first_name: true,
              last_name: true,
              phone: true,
              street_address: true,
              city: true,
              state: true,
              zip_code: true,
              dob: true,
            }
          },
          device: {
            include: { location: true }
          }
        },
        ...pagingConf,
        ...whereConf,
        ...orderByConf
      });

      const count = await prisma.borrow.count(whereConf);

      res.json({ data, count });
    } catch (error) {
      console.error(error);
      res.status(500).send("Failed to retrieve borrow records.");
    }
  });

// Get borrow record by ID (User can access only their own)
router.get("/:borrowId", ensureAnyAuth, async (req, res) => {
  const borrowId = parseInt(req.params.borrow_id);

  if (!borrowId) {
    res.status(400).send("Missing borrow id.");
    return;
  }

  try {
    const record = await prisma.borrow.findUnique({
      where: { borrow_id: borrowId },
      include: {
        user: {
          select: {
            user_id: true,
            email: true,
            first_name: true,
            last_name: true,
            phone: true,
            street_address: true,
            city: true,
            state: true,
            zip_code: true,
            dob: true,

          }
        },
        device: {
          include: { location: true }
        }
      }
    });

    if (!record) return res.status(404).send("Borrow record not found.");

    if (req.role === "user" && req.id !== record.user_id) {
      return res.status(403).send("Access denied.");
    }

    res.json(record);
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to retrieve borrow record.");
  }
});

// Get records by user ID (User or Admin)
router.get("/user/:userId", ensureAnyAuth, async (req, res) => {
  const userId = parseInt(req.params.user_id);

  if (req.role === "user" && req.id !== userId) {
    return res.status(403).send("Access denied. You can only access your own borrow records.");
  }

  try {
    const records = await prisma.borrow.findMany({
      where: { user_id: userId },
      include: {
        device: {
          include: {location: true}
        }
      }
    });
    res.json(records);
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to retrieve records for this user.");
  }
});

// Get records by device ID (Admin only)
router.get("/device/:deviceId", ensureAdminAuth, async (req, res) => {
  const deviceId = parseInt(req.params.deviceId);
  try {
    const records = await prisma.borrow.findMany({
      where: { device_id: deviceId },
      include: {
        user: {
          select: {
            user_id: true,
            email: true,
            first_name: true,
            last_name: true,
            phone: true,
            street_address: true,
            city: true,
            state: true,
            zip_code: true,
            dob: true,
          }
        }
      }
    });
    res.json(records);
  } catch (error) {
    console.error(error);
    res.status(500).send("Failed to retrieve records for this device.");
  }
});

// Update borrow record (Admin only)
router.patch("/update/:borrowId", ensureAdminAuth, async (req, res) => {
  const borrowId = parseInt(req.params.borrow_id);
  const { borrow_status, return_date, device_return_condition } = req.body;

  try {
    const record = await prisma.borrow.findUnique({
      where: { borrow_id: borrowId }
    });

    if (!record) {
      return res.status(404).send("Borrow record not found.");
    }

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

// Delete a borrow record (Admin only)
router.delete("/delete/:borrowId", ensureAdminAuth, async (req, res) => {
  const borrowId = parseInt(req.params.borrow_id);

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
