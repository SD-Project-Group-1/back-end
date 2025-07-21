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
  if (isNaN(req.params.userId)) {
    res.status(400).send("Bad request");
    return;
  }

  const userId = parseInt(req.params.userId);

  if (req.role === "user" && userId !== req.id) {
    res.status(401).send("Not authorized");
    return;
  }

  try {
    const request = await prisma.borrow.findFirst({
      where: {
        user_id: userId,
        borrow_status: {
          notIn: ["Checked_in", "Cancelled"]
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
  } catch (error) {
    console.error(error);
    res.status(500).send("Request failed.");
  }
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
    location_id,
    reason_for_borrow,
    preferred_type
  } = req.body;

  reason_for_borrow = reason_for_borrow.replace(' ', '_');
  preferred_type = preferred_type?.replace(' ', '_');

  if (isNaN(location_id)) {
    res.status(400).send("Bad location id");
    return;
  }

  location_id = parseInt(location_id);

  const validStatus = ["Scheduled", "Cancelled", "Checked_out", "Checked_in", "Late", "Submitted"];
  const validConditions = ["Good", "Fair", "Damaged"];
  const validReasons = ["Job_Search", "School", "Training", "Other"];

  // Enforce defaults and prevent override if not admin
  if (req.role !== "admin") {
    borrow_status = "Submitted";	// Force default status for users
    device_return_condition = null; // Ignore user input)
  } else {
    borrow_status = borrow_status || "Submitted";
    device_return_condition = device_return_condition || null;  // Admins can set or leave null
  }

  try {
    const device = device_id ? await prisma.device.findUnique({ where: { device_id: device_id }, include: { borrow: true } }) :
      await prisma.device.findFirst({
        where: {
          location: {
            location_id: location_id
          },
          type: preferred_type ?? undefined,
          OR: [
            {
              borrow: {
                none: {},
              },
            },
            {
              borrow: {
                every: {
                  borrow_status: { in: ["Checked_in", "Cancelled"] }
                },
              },
            }
          ],
        },
        include: { borrow: true }
      });

    if (!device) {
      console.error("Could not find a device to borrow!");
      res.status(400).send("Could not find a device to borrow!")
      return;
    }

    if (device.borrow.some(x => x.borrow_status === "Submitted" || x.borrow_status === "Checked_out" || x.borrow_status === "Scheduled")) {
      res.status(400).send("This device is already reserved.");
      return;
    }

    device_id = device.device_id;

    if (!user_id || !device_id || !borrow_date || !reason_for_borrow) {
      return res.status(400).send("Missing required fields.");
    }

    if (!validStatus.includes(borrow_status) ||
      (device_return_condition && !validConditions.includes(device_return_condition)) ||
      !validReasons.includes(reason_for_borrow)) {
      return res.status(400).send("Invalid enum value provided.");
    }

    // Borrow date validation
    const parsedBorrowDate = new Date(borrow_date);
    if (isNaN(parsedBorrowDate)) {
      return res.status(400).send("Invalid borrow date.");
    }

    // User gets default 7-day return window
    let parsedReturnDate = null;

    if (req.role === "admin") {
      parsedReturnDate = return_date ? new Date(return_date) : null;
    } else {
      parsedReturnDate = new Date(parsedBorrowDate.getTime() + 7 * 24 * 60 * 60 * 1000);
    }

    const borrow = await prisma.borrow.create({
      data: {
        borrow_date: parsedBorrowDate,
        return_date: parsedReturnDate,
        borrow_status,
        device_return_condition,
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
    case "name": return { user: { last_name: dir }, user: { first_name: dir } };
    case "first_name": return { user: { first_name: dir } };
    case "last_name": return { user: { last_name: dir } };
    case "device": return { device: { model: dir }, device: { make: dir }, device: { brand: dir } };
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
    case "borrow_id": return isNaN(q) ? {} : { borrow_id: q };
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
              is_verified: true,
              created: true
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
  const borrowId = parseInt(req.params.borrowId);

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
            is_verified: true,
            created: true
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
  const userId = parseInt(req.params.userId);

  if (req.role === "user" && req.id !== userId) {
    return res.status(403).send("Access denied. You can only access your own borrow records.");
  }

  try {
    const records = await prisma.borrow.findMany({
      where: { user_id: userId },
      include: {
        device: {
          include: { location: true }
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
            is_verified: true
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

const validateDate = (date, maxDays) => {
  date = new Date(date);

  if (isNaN(date))
    return false;

  if (!date || date.valueOf() < Date.now() - (24 * 60 * 60 * 1000)) {
    return false;
  }

  if (maxDays && date.valueOf() > Date.now() + (maxDays * 24 * 60 * 60 * 1000)) {
    return false;
  }

  return true;
}

// Update borrow record (Admin only)
router.patch("/update/:borrowId", ensureAnyAuth, async (req, res) => {
  const borrowId = parseInt(req.params.borrowId);
  let { borrow_status, return_date, device_return_condition, device_id, borrow_date, daily_usage } = req.body;

  try {
    const record = await prisma.borrow.findUnique({
      where: { borrow_id: borrowId }
    });

    const newStatus = borrow_status && record.borrow_status !== borrow_status;
    borrow_status = borrow_status ?? record.borrow_status;

    const retDateVal = new Date(return_date);

    if (return_date && !isNaN(retDateVal)) {
      return_date = retDateVal;
    } else if (return_date) {
      return res.status(400).send(`Bad return date: ${return_date}`);
    } else {
      return_date = record.return_date;
    }

    if (borrow_date && validateDate(borrow_date)) {
      borrow_date = new Date(borrow_date);
    } else if (borrow_date) {
      return res.status(400).send(`Bad borrow date: ${borrow_date}`);
    } else {
      borrow_date = record.borrow_date;
    }

    let usage = undefined;
    if (daily_usage && !isNaN(daily_usage) && borrow_status === "Checked_in") {
      usage = parseInt(daily_usage);
    }

    if (req.role === "user") {
      if (record.user_id !== req.id) {
        res.status(401).send("Cannot edit this request.");
        return;
      }

      if (return_date !== record.return_date) {
        res.status(401).send("A user may not change the return date!");
        return;
      }

      if (borrow_date !== record.borrow_date && borrow_status !== "Submitted") {
        res.status(401).send("A user may not change the borrow date after approval! Please cancel instead.");
        return;
      }


      if (newStatus && borrow_status !== "Cancelled") {
        res.status(401).send("Cannot change the date of or cancel a request that is past the \"submitted\" stage.");
        return;
      }

      if (record.borrow_status === "Checked_out") {
        res.status(401).send("Cannot edit a request that has already been granted. Please return this device to the store for further transactions.");
        return;
      }

      if (device_id !== undefined) {
        res.status(401).send("A user may not specify the exact device.");
        return;
      }
    }

    if (device_id) {
      const device = await prisma.device.findUnique({ where: { device_id }, include: { borrow: true } });

      if (device.borrow.some(x => x.borrow_status === "Submitted" || x.borrow_status === "Checked_out" || x.borrow_status === "Scheduled")) {
        res.status(400).send("This device is already reserved.");
        return;
      }
    }

    const updated = await prisma.borrow.update({
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
            is_verified: true,
            created: true
          }
        }
        , device: { include: { location: true } }
      },
      data: {
        borrow_status,
        borrow_date: borrow_status ? new Date(borrow_date) : undefined,
        return_date: borrow_status === "Cancelled" ? null : (return_date ? new Date(return_date) : undefined),
        daily_usage: usage,
        device_return_condition,
        device: {
          disconnect: device_id === null ? true : undefined,
          connect: device_id ? { device_id: device_id } : undefined
        }
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
