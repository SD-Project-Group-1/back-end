const express = require("express");
const userRoutes = require("./routes/user_routes.js");
const deviceRoutes = require("./routes/device_route");

const app = express();

app.use(express.json());

app.use("/api/user", userRoutes);
app.use("/api/devices", deviceRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
