const { json, Router } = require("express");
const prisma = require("../config/db");
const { ensureAdminAuth, ensureAnyAuth, populatePaging, populateSearch, populateSort } = require("../helpers/middleware");

const router = Router();
router.use(json());

router.get("/getall",
  ensureAnyAuth, populatePaging, populateSearch(["location_nickname", "street_address", "city", "state", "zip_code"]), populateSort,
  async (req, res) => {
    try {
      const { pagingConf, whereConf, orderByConf } = req;

      const locations = await prisma.location.findMany({
        ...pagingConf,
        ...whereConf,
        ...orderByConf
      });
      res.send(locations);
    } catch (err) {
      res.status(500).send("Failed to retrieve locations.");
      console.error(err);
    }
  });

router.get("/get/:locationId", ensureAdminAuth, async (req, res) => {
  const locationId = parseInt(req.params.locationId);

  if (!locationId) {
    res.status(400).send("Bad request.");
    return;
  }

  try {
    const location = await prisma.location.findUnique({
      where: { location_id: locationId },
      device: {
        include: { location: true }
      }
    });

    if (!location) {
      res.status(404).send("Location not found.");
      return;
    }
    res.send(location);
  } catch (err) {
    res.status(500).send("Error retrieving location.");
    console.error(err);
  }
});

router.post("/create", ensureAdminAuth, async (req, res) => {
  const { street_address, city, state, zip_code } = req.body;

  if (!street_address || !city || !state || !zip_code) {
    res.status(400).send("Missing required fields.");
    return;
  }

  try {
    const newLocation = await prisma.location.create({
      data: { street_address, city, state, zip_code }
    });
    res.status(201).send(newLocation);
  } catch (err) {
    res.status(400).send("Could not create location.");
    console.error(err);
  }
});

router.delete("/delete/:locationId", ensureAdminAuth, async (req, res) => {
  const locationId = parseInt(req.params.locationId);

  if (!locationId) {
    res.status(400).send("Bad request.");
    return;
  }

  try {
    await prisma.location.delete({
      where: { location_id: locationId }
    });
    res.send("Location deleted!");
  } catch (err) {
    res.status(500).send("Failed to delete location.");
    console.error(err);
  }
});

module.exports = router;
