const jwt = require("jsonwebtoken");

const secret = process.env.SECRET;

if (!secret) {
  throw new Error("No secret key stored in environment variables.");
}

exports.getUserToken = (id) =>
  jwt.sign({ id, role: "user" }, secret, { expiresIn: "30d" });

exports.getAdminToken = (id, role) =>
  jwt.sign({ id, role }, secret, { expiresIn: "30d" });

exports.checkToken = (token) => checkToken(token);

const checkToken = (token) =>
  new Promise((res, rej) =>
    jwt.verify(token, secret, (err, user) => err ? rej(err) : res(user))
  );
