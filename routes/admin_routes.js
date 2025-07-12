const { json, Router } = require("express");
const prisma = require("../config/db");
const { generateSalt, getHashedPassword } = require("../helpers/encryption");
const { getAdminToken } = require("../helpers/authentication");
const { ensureAdminAuth, populatePaging, populateSearch, populateSort } = require("../helpers/middleware");

const router = Router();
router.use(json());

const sortAdapter = (field, dir) => {
  switch (field) {
    case "admin_id": return { admin_id: dir };
    case "email": return { email: dir };
    case "first_name": return { first_name: dir };
    case "last_name": return { last_name: dir };
    case "role": return { role: dir };
    case "created": return { created: dir };
    default:
      console.error("Bad sort field argument! ", field);
      return undefined;
  }
}

const searchAdapter = (field, q) => {
  switch (field) {
    case "admin_id": return isNaN(num) ? {} : { admin_id: Number.parseInt(q) };
    case "email": return { email: { contains: q } };
    case "first_name": return { first_name: { contains: q } };
    case "last_name": return { last_name: { contains: q } };
    case "role": return { role: { contains: q } };
    default:
      console.error("Bad search field argument! ", field);
      return undefined;
  }
}


router.get("/getall",
  ensureAdminAuth, populatePaging, populateSearch(["admin_id", "email", "first_name", "last_name"], searchAdapter), populateSort(sortAdapter),
  async (req, res) => {
    if (req.role == "staff") {
      res.status(401).send("Unauthorized");
      return;
    }

    const { pagingConf, whereConf, orderByConf } = req;

    try {
      const data = await prisma.admin.findMany({
        select: {
          admin_id: true,
          email: true,
          first_name: true,
          last_name: true,
          role: true
        },
        ...pagingConf,
        ...whereConf,
        ...orderByConf
      });

      const count = await prisma.admin.count(whereConf);

      res.json({ data, count });
    } catch (err) {
      console.error("Could not get admin data!");
      console.error(err);
      res.status(500).send("Failed to query database.");
    }
  });

// Create Admin
router.post("/create", ensureAdminAuth, async (req, res) => {
  if (req.role !== "management") {
    return res.status(403).send("Access denied");
  }

  const {
    email,
    password,
    first_name,
    last_name,
    role = "staff", // Default role for new admins
  } = req.body;

  if (!email || !password || !first_name || !last_name) {
    return res.status(400).send("Missing required fields");
  }

  const existingAdmin = await prisma.admin.findFirst({
    where: { email },
  });

  if (existingAdmin) {
    return res.status(400).send("Admin already exists");
  }

  const salt = generateSalt();
  const hash = getHashedPassword(password, salt);

  try {
    const newAdmin = await prisma.admin.create({
      data: {
        email,
        hash,
        salt,
        first_name,
        last_name,
        role,
      },
    });

    res.status(201).json({
      message: "Admin created successfully",
      admin: {
        admin_id: newAdmin.admin_id,
        email: newAdmin.email,
        first_name: newAdmin.first_name,
        last_name: newAdmin.last_name,
        role: newAdmin.role,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Internal server error");
  }
});

// Admin Login
router.post("/signin", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send("Missing credentials");
  }

  const admin = await prisma.admin.findFirst({ where: { email } });

  if (!admin) {
    return res.status(403).send("Bad credentials");
  }

  const hash = getHashedPassword(password, admin.salt);

  if (hash !== admin.hash) {
    return res.status(401).send("Unauthorized");
  }

  const token = getAdminToken(admin.admin_id, admin.role);

  res.cookie("token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "Strict",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  res.status(200).json({
    message: "Login successful",
    admin: {
      admin_id: admin.admin_id,
      email: admin.email,
      first_name: admin.first_name,
      last_name: admin.last_name,
      role: admin.role,
    },
  });
});

router.get("/get/:adminId", ensureAdminAuth, async (req, res) => {
  if (req.role !== "management") {
    res.status(400).json({ error: "Bad permissions." });
    return;
  }

  const admin = await prisma.admin.findFirst({
    where: { admin_id: req.adminId },
  });

  if (admin === null) {
    res.status(400).json({ error: "No such admin found." });
    return;
  }

  res.status(200).json({
    message: "Login successful",
    admin: {
      admin_id: admin.admin_id,
      email: admin.email,
      first_name: admin.first_name,
      last_name: admin.last_name,
      role: admin.role,
    },
  });
});

// Delete Admin
router.delete("/delete/:adminId", ensureAdminAuth, async (req, res) => {
  const id = Number.parseInt(req.params.adminId);

  if (req.role !== "management" && req.id !== id) {
    return res.status(403).send("Unauthorized");
  }

  try {
    const deletedAdmin = await prisma.admin.delete({
      where: { admin_id: id },
    });
    if (deletedAdmin) {
      res.send("Admin deleted succesfully!");
    } else {
      res.status(400).send("No such admin.");
    }
  } catch (err) {
    res.status(500).send("Failed to delete.");
    console.error(err);
  }
});

module.exports = router;
