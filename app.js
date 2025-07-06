const express = require("express");

const userRoutes = require("./routes/user_routes.js");
const adminRoutes = require("./routes/admin_routes.js");
const deviceRoutes = require("./routes/device_route");
const locationRoutes = require("./routes/location_routes");
const borrowRoutes = require("./routes/borrow_routes");
const cookieParser = require("cookie-parser");
const prisma = require("./config/db.js");
const { ensureAnyAuth } = require("./helpers/middleware.js");

const app = express();

app.use(express.json());
app.use(cookieParser());

app.use("/api/user", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/devices", deviceRoutes);
app.use("/api/locations", locationRoutes);
app.use("/api/borrow", borrowRoutes);

app.get("/api/me", ensureAnyAuth, async (req, res) => {
  try {
    if (req.role === "user") {
      const user = await prisma.user.findUniqueOrThrow({
        where: { user_id: req.id },
      });
      res.json({
        message: "User login successful",
        loginType: "user",
        user: {
          id: user.user_id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          phone: user.phone,
          street_address: user.street_address,
          city: user.city,
          state: user.state,
          zip_code: user.zip_code,
          dob: user.dob,
        }
      });
      return;
    }

    const admin = await prisma.admin.findUniqueOrThrow({
      where: { admin_id: req.id },
    });

    res.json({
      message: "Admin login successful",
      loginType: "admin",
      admin: {
        admin_id: admin.admin_id,
        email: admin.email,
        first_name: admin.first_name,
        last_name: admin.last_name,
        role: admin.role,
      },
    });
  } catch (error) {
    res.status(400).json({ error: "Something went wrong!" });
    console.error("[/api/me] Could not get user.");
    console.error(error);
  }
});

app.post("/api/signout", async (_req, res) => {
  res.clearCookie("token");
  res.sendStatus(204);
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
