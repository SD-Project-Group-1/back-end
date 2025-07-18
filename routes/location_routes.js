const { json, Router } = require("express");
const prisma = require("../config/db");
const { ensureAdminAuth, ensureAnyAuth, populatePaging, populateSearch, populateSort } = require("../helpers/middleware");

const router = Router();
router.use(json());

const sortAdapter = (field, dir) => {
  switch (field) {
    case "location_nickname": return { location_nickname: dir };
    case "location_id": return { location_id: dir };
    case "street_adress": return { street_address: dir };
    case "city": return { city: dir };
    case "state": return { state: dir };
    case "zip_code": return { zip_code: dir };
    default:
      console.error("Bad sort field argument! ", field);
      return undefined;
  }
}

const searchAdapter = (field, q) => {
  switch (field) {
    case "location_nickname": return { location_nickname: { contains: q } };
    case "location_id": return isNaN(q) ? {} : { location_id: Number.parseInt(q) };
    case "street_adress": return { street_address: { contains: q } };
    case "city": return { city: { contains: q } };
    case "state": return { state: { contains: q } };
    case "zip_code": return { zip_code: { contains: q } };
    default:
      console.error("Bad search field argument! ", field);
      return undefined;
  }
}

router.get("/getall",
  ensureAnyAuth, populatePaging, populateSearch(["location_nickname", "street_address", "city", "state", "zip_code"], searchAdapter), populateSort(sortAdapter),
  async (req, res) => {
    try {
      const { pagingConf, whereConf, orderByConf } = req;

      const includeDevices = req.query.includeDevices === "true";

      const data = await prisma.location.findMany({
        ...pagingConf,
        ...whereConf,
        ...orderByConf,
        include: {
          device: includeDevices
        }
      });

      const count = await prisma.location.count(whereConf);

      res.send({ data, count });
    } catch (err) {
      res.status(500).send("Failed to retrieve locations.");
      console.error(err);
    }
  });

router.get("/get/:locationId", ensureAdminAuth, async (req, res) => {
  const locationId = parseInt(req.params.locationId);

  const includeDevices = req.query.includeDevices === "true";

  if (!locationId) {
    res.status(400).send("Bad request.");
    return;
  }

  try {
    const location = await prisma.location.findUnique({
      where: { location_id: locationId },
      include: { device: includeDevices }
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
