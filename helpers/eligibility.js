const geocoder = require("./geocoder");
const { get_distance_in_miles } = require("./distance");
const neighborhood_centers = require("../data/neighborhood_centers");

async function checkEligibility(zip_code) {
  if (!zip_code) {
    return { eligible: false, reason: "Zip code is required." };
  }
  try {
    const geo_res = await geocoder.geocode({
      zipcode: zip_code,
      country: "USA",
    });

    if (!geo_res || geo_res.length === 0) {
      return { eligible: false, reason: "Zip code could not be located" };
    }
    const { latitude, longitude } = geo_res[0];

    const match = neighborhood_centers.find((center) => {
      const distance = get_distance_in_miles(
        latitude,
        longitude,
        center.lat,
        center.lng,
      );
      return distance <= 5;
    });

    if (match) {
      return { eligible: true };
    } else {
      return { eligible: false, reason: "Not within an approved area" };
    }
  } catch (err) {
    console.error(err);
    return { eligible: false, reason: "Failed to check zip code in range" };
  }
}

module.exports = { checkEligibility }; 