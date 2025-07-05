function get_distance_in_miles(lat1, lon1, lat2, lon2) {
    const toRad = (value) => (value * Math.PI) / 180;
    const R = 3958.8;

    const d_lat = toRad(lat2 - lat1);
    const d_lon = toRad(lon2 - lon1);
    const a = Math.sin(d_lat / 2) ** 2 +
        Math.cos(toRad(lat1) * Math.cos(toRad(lat2))) *
        Math.sin(d_lon / 2) ** 2;

    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));

}
module.exports = { get_distance_in_miles };