const { json, Router } = require("express");
const prisma = require("../config/db");
const { generateSalt, getHashedPassword } = require("../helpers/encryption");
const { getUserToken } = require("../helpers/authentication");
const { ensureUserAuth, ensureAdminAuth, ensureAnyAuth, populatePaging, populateSearch, populateSort } = require(
  "../helpers/middleware",
);
const { checkEligibility } = require("../helpers/eligibility");
const { parse } = require("dotenv");

const getUserPayload = (user) => (
  {
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
    console.log(
      !first_name,
      !last_name,
      !phone,
      !street_address,
      !city,
      !state,
      !zip_code,
      !dob,
    );
    res.status(400).send("Missing user information.");
    return;
  }

  // Check if user is within service area for account registration
  const eligibility = await checkEligibility(zip_code);
  if (!eligibility.eligible) {
    res.status(400).json({ error: eligibility.reason });
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

  const user = await prisma.user.findFirst({ where: { email: email } });

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

  //token is now a cookie. Not returned as json.
  res.cookie("token", token, {
    httpOnly: true,
    secure: true,
    sameSite: "Strict",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  //MUST NOT INCLUDE HASH OR SALT
  const userPayload = getUserPayload(user);

  // Includes token for mobile apps
  res.json({ message: "Sign in succesful!", userPayload, token: token });
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
    !state || !zip_code || !dob || !is_verified
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
        is_verified: false
      },
    });
    res.send("User information updated succesfully!");
  } catch (err) {
    res.status(500).send("Failed to update data.");
    console.error(err);
  }
});

router.patch("/update/:userId", ensureAnyAuth, async (req, res) => {
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
    is_verified
  } = req.body;

  let userId = req.params.userId;

  try {
    userId = parseInt(userId);
  } catch (error) {
    console.error(error);
    return res.status(400).send("Invalid user id.");
  }

  if (req.role === "user" && req.id !== userId) {
    return res.status(403).send("Unauthorized");
  }

  if (req.role === "user") {
    is_verified = false;
  }

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

  if (is_verified !== undefined && typeof is_verified !== "boolean") {
    return res.status(400).send("Non-boolean value provided for is_verified.");
  }

  if (await prisma.user.count({ where: { user_id: userId } }) === 0) {
    return res.status(400).send(`Could not find a user with id: ${userId}`);
  }

  try {
    await prisma.user.update({
      where: { user_id: userId },
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
        is_verified: is_verified
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
    // Check if any active reservation or rental exists
    const activeBorrow = await prisma.borrow.findFirst({
      where: {
        user_id: requestedId,
        borrow_status: {
          notIn: ["Cancelled", "Checked_in"],
        },
      },
    });

    if (activeBorrow) {
      res.status(400).send("User has an active reservation or rental. Cannot delete account.");
      return;
    }

    const deletedUser = await prisma.user.delete({
      where: { user_id: requestedId },
    });
    if (deletedUser) {
      res.send("User deleted successfully!");
    } else {
      res.status(400).send("No such user.");
    }
  } catch (err) {
    res.status(500).send("Failed to delete.");
    console.error(err);
  }
});

const sortAdapter = (field, dir) => {
  switch (field) {
    case "user_id": return { user_id: dir };
    case "email": return { email: dir };
    case "name": return { last_name: dir, first_name: dir };
    case "first_name": return { first_name: dir };
    case "last_name": return { last_name: dir };
    case "dob": return { dob: dir };
    case "zip_code": return { zip_code: dir }
    case "created": return { created: dir };
    default:
      console.error("Bad sort field argument! ", field);
      return undefined;
  }
}

const searchAdapter = (field, q) => {
  switch (field) {
    case "user_id": return isNaN(q) ? {} : { user_id: Number.parseInt(q) };
    case "email": return { email: { contains: q } };
    case "first_name": return { first_name: { contains: q } };
    case "last_name": return { last_name: { contains: q } };
    case "zip_code": return { zip_code: { contains: q } }
    default:
      console.error("Bad search field argument! ", field);
      return undefined;
  }
}

router.get("/getall",
  ensureAdminAuth, populatePaging, populateSearch(["user_id", "email", "first_name", "last_name", "zip_code"], searchAdapter), populateSort(sortAdapter),
  async (req, res) => {
    const { pagingConf, whereConf, orderByConf } = req;

    try {
      const data = await prisma.user.findMany({
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
          is_verified: true,
          created: true
        },
        ...pagingConf,
        ...whereConf,
        ...orderByConf
      });

      const count = await prisma.user.count(whereConf);

      res.send({ data, count });
    } catch (err) {
      console.error("Could not get admin data!");
      console.error(err);
      res.status(500).send("Failed to query database.");
    }
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
      is_verified: true,
      created: true
    },
  });

  res.send(user);
});

module.exports = router;
