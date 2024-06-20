const bcrypt = require("bcryptjs");
const validator = require("validator");

const encryptPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

const isPasswordValid = (password) => {
  const lengthIsValid = validator.isLength(password, { min: 8, max: 16 });
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSpecialChar = /[@$!%*?&]/.test(password);
  const noSpaces = !/\s/.test(password);

  return (
    lengthIsValid &&
    hasUpperCase &&
    hasLowerCase &&
    hasNumber &&
    hasSpecialChar &&
    noSpaces
  );
};

const isPasswordCorrect = async (password, hashPassword) => {
  return await bcrypt.compare(password, hashPassword);
};

module.exports = { encryptPassword, isPasswordValid, isPasswordCorrect };
