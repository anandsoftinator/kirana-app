const { StatusCodes } = require("http-status-codes");
const { CustomAPIError } = require("../errors");

const errorHandlerMiddleware = (err, req, res, next) => {
  let customError = {
    // Default values
    statusCode: err.statusCode || StatusCodes.INTERNAL_SERVER_ERROR,
    message: err.message || "Something went wrong, try again later",
    data: null,
    error: true,
  };

  if (err instanceof CustomAPIError) {
    customError = {
      statusCode: err.statusCode,
      message: err.message,
      data: null,
      error: true,
    };
  }

  res.status(customError.statusCode).json({
    message: customError.message,
    data: customError.data,
    error: customError.error,
  });
};

module.exports = errorHandlerMiddleware;
