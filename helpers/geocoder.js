const NodeGeocoder = require('node-geocoder');

const options = {
    provider: 'locationiq',
    apiKey: process.env.LOCATIONIQ_API_KEY,
    _formatter: null,
};

const geocoder = NodeGeocoder(options);

module.exports = geocoder;