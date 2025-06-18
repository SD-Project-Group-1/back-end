const { checkAdminToken, checkUserToken } = require("./authentication");

/**
 * @param {string} type
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
async function auth(type, req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(400).send("Bad authorization.");
    return;
  }
  const token = authHeader.split(" ")[1];
  const { role } = req.params;

  if (type === "either") {
    type = role ? "admin" : "user";
  }

  let result;
  switch (type) {
    case "user":
      result = await checkUserToken(token);
      req.role = "user";
      break;
    case "admin":
      result = await checkAdminToken(token, role);
      req.role = role;
      break;
  }

  console.log(result);
  console.log(req.role);
  console.log(type);

  if (result !== null) {
    req.id = result.id;
    next();
    return;
  }

  res.status(400).send("Not authorized");
}

const ensureAnyAuth = async (req, res, next) =>
  await auth("either", req, res, next);

const ensureUserAuth = async (req, res, next) =>
  await auth("user", req, res, next);

const ensureAdminAuth = async (req, res, next) =>
  await auth("admin", req, res, next);

module.exports = { ensureAnyAuth, ensureUserAuth, ensureAdminAuth };
