/* eslint-disable no-unused-vars */
const errorHandler = (err, req, res, next) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal server error";

  if (status >= 500) {
    console.error("Unhandled error", err);
  }

  res.status(status).json({
    error: message,
    details: err.details || undefined,
  });
};

export default errorHandler;
