const jwt = require("jsonwebtoken");

const secret = process.env.SECRET;

if (!secret) {
  throw new Error("No secret key stored in environment variables.");
}

exports.getUserToken = (id) =>
  jwt.sign({ id, role: "user" }, secret, { expiresIn: "30d" });

exports.getAdminToken = (id, role) =>
  jwt.sign({ id, role }, secret, { expiresIn: "30d" });

exports.checkUserToken = (token) => checkToken(token, "user");
exports.checkAdminToken = (token, role) => checkToken(token, role);

const checkToken = (token, role) => {
  return new Promise((res, rej) => {
    jwt.verify(token, secret, (err, user) => {
      if (err) {
        rej(err);
      }

      if (user.role === role) {
        res(user);
      }

      res(null);
    });
  });
};
