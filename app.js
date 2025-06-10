const express = require('express');
const app = express();
require('dotenv').config();

app.use(express.json());

// Routes
const deviceRoutes = require('./routes/device_route');

app.use('/api/device', deviceRoutes);

const PORT = process.env.port || 3000;
app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
