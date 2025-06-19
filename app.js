const express = require("express");
const userRoutes = require("./routes/user_routes.js");

const app = express();

app.use(express.json());

// Routes

//app.use("/api/device", deviceRoutes);
app.use("/api/user", userRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
