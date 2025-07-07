const { checkToken } = require("./authentication");

/**
 * @param {string} type
 * @param {import("express").Request} req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
async function auth(type, req, res, next) {
  // Check for token in Authorization header for mobile
  let token = req.headers.authorization;
  if (token && token.startsWith("Bearer ")) {
    token = token.substring(7); // get only token from header
  } else {
    // Cookie token for web
    token = req.cookies.token;
  }

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

const populatePaging = async (req, _res, next) => {
  let { page, pageSize } = req.query;

  const pagingConf = {};

  try {
    page = Number.parseInt(page);
    pageSize = Number.parseInt(pageSize);
  } catch { }

  if (pageSize && typeof pageSize == "number") {
    pagingConf.take = pageSize;

    console.log("PAGE", page, typeof page)
    if (page && typeof page == "number") {
      pagingConf.skip = (page - 1) * pageSize;
    }
  }

  console.log(pagingConf);

  req.pagingConf = pagingConf;
  next();
}

const populateSearch = (searchableFields) => {
  return async (req, _res, next) => {
    const { q } = req.query;

    if (!q || !searchableFields?.length) {
      req.whereConf = {};
      next();
      return;
    }

    const whereConf = {
      where: {
        OR: []
      }
    }

    whereConf.where.OR = searchableFields.map((field) => {
      let obj = {};
      obj[field] = { contains: q }

      return obj;
    });

    req.whereConf = whereConf;
    next();
  }
}

const populateSort = async (req, _res, next) => {
  const { sortBy, sortDir } = req.query;

  if (!sortBy || !sortDir || sortDir !== "asc" && sortDir !== "desc") {
    req.orderByConf = {};
    next();
    return;
  }

  const orderByConf = {
    orderBy: {

    }
  }

  orderByConf.orderBy[sortBy] = sortDir;
  req.orderByConf = orderByConf;
  next();
}

module.exports = { ensureAnyAuth, ensureUserAuth, ensureAdminAuth, populatePaging, populateSort, populateSearch };
