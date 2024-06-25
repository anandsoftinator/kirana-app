const { StatusCodes } = require("http-status-codes");

class CustomAPIError extends Error {
  constructor(message, statusCode = StatusCodes.BAD_REQUEST) {
    super(message);
    this.message = message;
    this.statusCode = statusCode;
  }
}

class UnauthenticatedError extends CustomAPIError {
  constructor(message) {
    super(message, StatusCodes.UNAUTHORIZED);
  }
}

class UnauthorizedError extends CustomAPIError {
  constructor(message) {
    super(message, StatusCodes.FORBIDDEN);
  }
}

module.exports = {
  CustomAPIError,
  UnauthenticatedError,
  UnauthorizedError,
};
