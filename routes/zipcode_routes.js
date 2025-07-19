const { json, Router } = require("express");
const geocoder = require("../helpers/geocoder");
const { get_distance_in_miles } = require("../helpers/distance");
const neighborhood_centers = require("../data/neighborhood_centers");
const { ensureAnyAuth } = require("../helpers/middleware");

const router = Router();
router.use(json());

router.post("/check", async (req, res) => {
  const { zip_code } = req.body;

  if (!zip_code) {
    res.status(400).send("Zip code is required.");
    return;
  }

  try {
    const geo_res = await geocoder.geocode({
      zipcode: zip_code,
      country: "USA",
    });

    if (!geo_res || geo_res.length === 0) {
      res.status(400).send("Zip code could not be located");
      return;
    }

    const { latitude, longitude } = geo_res[0];

    const match = neighborhood_centers.find((neighborhood_centers) => {
      const distance = get_distance_in_miles(
        latitude,
        longitude,
        neighborhood_centers.lat,
        neighborhood_centers.lng,
      );
      return distance <= 5;
    });

    if (match) {
      res.send({
        withinRange: true,
        nearestCenter: match.name,
      });
    } else {
      res.send({ withinRange: false });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to check zip code in range");
  }
});

module.exports = router;

