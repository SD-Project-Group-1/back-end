const { checkToken } = require("./authentication");

/**
 * @param {string} type
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
async function auth(type, req, res, next) {
  const token = req.cookies.token;

  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const result = await checkToken(token);

  if (!result) {
    res.status(400).send("Not authorized");
    return;
  }

  if (type !== "user" && type !== "either" && result.role === "user") {
    res.status(400).json({ error: "Bad auth." });
    return;
  }

  req.id = result.id;
  req.role = result.role;
  next();
}

const ensureAnyAuth = async (req, res, next) =>
  await auth("either", req, res, next);

const ensureUserAuth = async (req, res, next) =>
  await auth("user", req, res, next);

const ensureAdminAuth = async (req, res, next) =>
  await auth("admin", req, res, next);

module.exports = { ensureAnyAuth, ensureUserAuth, ensureAdminAuth };
