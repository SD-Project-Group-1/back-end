const NodeGeocoder = require('node-geocoder');

const options = {
    provider: 'locationiq',
    apiKey: 'you-api-key-here',
    _formatter: null,
};

const geocoder = NodeGeocoder(options);

module.exports = geocoder;