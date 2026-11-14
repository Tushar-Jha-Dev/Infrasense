/**
 * 404 handler for unknown routes.
 * Registered after all valid application routes.
 */
export const notFoundHandler = (req, res) => {
  res.status(404).json({ message: "Route not found" });
};

/**
 * Central error handling middleware.
 * Registered last in the Express app. Catches unhandled errors and ensures
 * stack traces are never exposed to clients.
 */
export const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  if (res.headersSent) {
    return next(err);
  }

  // Malformed JSON body
  if (
    (err instanceof SyntaxError && err.status === 400 && "body" in err) ||
    err.type === "entity.parse.failed"
  ) {
    return res.status(400).json({ message: "Invalid JSON body" });
  }

  // Request payload too large
  if (err.status === 413 || err.type === "entity.too.large") {
    return res.status(413).json({ message: "Payload too large" });
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const message =
      Object.values(err.errors || {})
        .map((e) => e.message)
        .join(", ") || err.message;
    return res.status(400).json({ message });
  }

  // Mongoose CastError (e.g. invalid ObjectId)
  if (err.name === "CastError") {
    return res.status(400).json({ message: "Invalid id" });
  }

  // MongoDB duplicate key error
  if (err.code === 11000) {
    const fields = err.keyValue ? Object.keys(err.keyValue) : [];
    const message =
      fields.length > 0
        ? `${fields.join(", ")} already exists`
        : "Duplicate key error";
    return res.status(409).json({ message });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return res.status(401).json({ message: "Invalid or expired token" });
  }

  // Client errors with numeric status or statusCode between 400 and 499
  const clientStatus =
    (typeof err?.status === "number" &&
      err.status >= 400 &&
      err.status <= 499 &&
      err.status) ||
    (typeof err?.statusCode === "number" &&
      err.statusCode >= 400 &&
      err.statusCode <= 499 &&
      err.statusCode);

  if (clientStatus) {
    return res.status(clientStatus).json({ message: "Bad request" });
  }

  // Fallback internal server error
  console.error(err);
  return res.status(500).json({ message: "Server error" });
};
