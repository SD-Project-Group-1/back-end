const { json, Router } = require("express");
const prisma = require("../config/db");
const { generateSalt, getHashedPassword } = require("../helpers/encryption");
const { getUserToken } = require("../helpers/authentication");
const { ensureUserAuth, ensureAdminAuth, ensureAnyAuth } = require(
  "../helpers/middleware",
);

const router = Router();

router.use(json());

router.post("/create", async (req, res) => {
  if (!req.body) {
    res.status(400).send("Body is undefined!");
    return;
  }

  let {
    email,
    password,
    first_name,
    last_name,
    phone,
    street_address,
    city,
    state,
    zip_code,
    dob,
  } = req.body;
  //NOTE: These are a lot of fields. Maybe use ZOD?

  if (!email || !password) {
    res.status(400).send("Missing credentials.");
    return;
  }

  if (
    !first_name || !last_name || !phone || !street_address || !city || !state ||
    !zip_code || !dob
  ) {
    res.status(400).send("Missing user information.");
    return;
  }

  if (typeof dob === "string") {
    dob = new Date(dob);
  }

  let user = await prisma.user.findFirst({
    where: { email: req.body.email },
  });

  if (user) {
    res.status(400).send("This user already exists!");
    return;
  }

  const salt = generateSalt();

  try {
    user = await prisma.user.create({
      data: {
        email,
        hash: getHashedPassword(password, salt),
        salt,
        first_name,
        last_name,
        phone,
        street_address,
        city,
        state,
        zip_code,
        dob,
      },
    });
  } catch (err) {
    res.status(400).send("Could not create user!");
    console.error(err);
    return;
  }

  res.send("User created!");
});

router.post("/signin", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).send("Bad credentials");
    return;
  }

  const user = await prisma.user.findFirst({ where: { email } });

  if (!user) {
    res.status(400).send("Bad credentials");
    return;
  }

  const hash = getHashedPassword(password, user.salt);

  if (hash !== user.hash) {
    res.status(400).send("Bad credentials");
    return;
  }

  const token = getUserToken(user.user_id);

  res.json({ message: "Sign in succesful!", user, token });
});

router.post("/reset", async (req, res) => {
  res.status(500).send("Later");
});

router.patch("/update", ensureUserAuth, async (req, res) => {
  let {
    email,
    first_name,
    last_name,
    phone,
    street_address,
    city,
    state,
    zip_code,
    dob,
  } = req.body;
  //NOTE: These are a lot of fields. Maybe use ZOD?

  if (
    !email || !first_name || !last_name || !phone || !street_address || !city ||
    !state || !zip_code || !dob
  ) {
    res.status(400).send("Missing user information.");
    return;
  }

  if (typeof dob === "string") {
    dob = new Date(dob);
  }

  try {
    await prisma.user.update({
      where: { user_id: req.id },
      data: {
        email,
        first_name,
        last_name,
        phone,
        street_address,
        city,
        state,
        zip_code,
        dob,
      },
    });
    res.send("User information updated succesfully!");
  } catch (err) {
    res.status(500).send("Failed to update data.");
    console.error(err);
  }
});

router.delete("/delete/:userId", ensureAnyAuth, async (req, res) => {
  const requestedId = Number.parseInt(req.params.userId);

  if (!requestedId) {
    res.status(400).send("Bad request!");
    return;
  }

  if (req.role === "user" && req.id !== requestedId) {
    res.status(400).send("No auth.");
    return;
  }

  try {
    const deletedUser = await prisma.user.delete({
      where: { user_id: requestedId },
    });
    if (deletedUser) {
      res.send("User deleted succesfully!");
    } else {
      res.status(400).send("No such user.");
    }
  } catch (err) {
    res.status(500).send("Failed to delete.");
    console.error(err);
  }
});

router.get("/getall", ensureAdminAuth, async (req, res) => {
  const users = await prisma.user.findMany({
    select: {
      user_id: true,
      email: true,
      first_name: true,
      last_name: true,
      phone: true,
      street_address: true,
      city: true,
      state: true,
      zip_code: true,
      dob: true,
    },
  });

  res.send(users);
});

router.get("/get/:userId", ensureAnyAuth, async (req, res) => {
  const requestedId = Number.parseInt(req.params.userId);

  if (!requestedId) {
    res.status(400).send("Bad request!");
    return;
  }

  if (req.role === "user" && req.id !== requestedId) {
    res.status(400).send("No auth.");
    return;
  }

  const user = await prisma.user.findUnique({
    where: { user_id: requestedId },
    select: {
      user_id: true,
      email: true,
      first_name: true,
      last_name: true,
      phone: true,
      street_address: true,
      city: true,
      state: true,
      zip_code: true,
      dob: true,
    },
  });

  res.send(user);
});

module.exports = router;
