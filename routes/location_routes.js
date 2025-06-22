console.log("📦 location_routes loaded");

const { Router } = require("express");
const prisma = require("../config/db");
const { ensureAdminAuth } = require("../helpers/middleware");

const router = Router();

router.get("/ping", (req, res) => {
  res.send("📡 location_routes working!");
});

// router.post("/create", ensureAdminAuth, async (req, res) => {
//   const { street_address, city, state, zip_code } = req.body;

//   if (!street_address || !city || !state || !zip_code) {
//     return res.status(400).send("Missing required fields.");
//   }

//   try {
//     const newLocation = await prisma.location.create({
//       data: { street_address, city, state, zip_code },
//     });

//     res.status(201).json(newLocation);
//   } catch (error) {
//     console.error(error);
//     res.status(500).send("Error creating location.");
//   }
// });

router.post("/testcreate", async (req, res) => {
  const { street_address, city, state, zip_code } = req.body;
  console.log("📩 Received body:", req.body); // optional debug line

  try {
    const location = await prisma.location.create({
      data: { street_address, city, state, zip_code },
    });
    res.status(201).json(location);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error creating location.");
  }
});

module.exports = router;