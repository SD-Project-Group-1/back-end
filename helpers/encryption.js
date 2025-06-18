const crypto = require("crypto");

const { createHash } = crypto;

const generateSalt = () => {
  const buf = crypto.randomBytes(16);
  return buf.toString();
};

const getHashedPassword = (password, salt) => {
  const sha256 = createHash("sha256");
  const hash = sha256.update(password + salt).digest("base64");
  return hash;
};

module.exports = { generateSalt, getHashedPassword };
