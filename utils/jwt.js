const jwt = require("jsonwebtoken");
const tokenBlacklist = new Set();

const createJWT = (payload) => {
  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_LIFETIME,
  });
  return token;
};

const isTokenBlacklisted = (token) => tokenBlacklist.has(token);

const blacklistToken = (token) => {
  tokenBlacklist.add(token);
};

const isTokenValid = ({ token }) => jwt.verify(token, process.env.JWT_SECRET);

module.exports = {
  createJWT,
  isTokenValid,
  isTokenBlacklisted,
  blacklistToken,
};
