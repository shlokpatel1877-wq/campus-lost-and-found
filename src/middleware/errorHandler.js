/**
 * Centralized Error Handling Middleware
 * 
 * In Express:
 * - A 4-argument middleware (err, req, res, next) is recognized as an error handler.
 * - Any call to next(error) inside controllers or middleware will be caught here.
 */

// Handles 404 for unmapped routes
const notFound = (req, res, next) => {
  const error = new Error(`Resource not found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

// Global error handler
const errorHandler = (err, req, res, next) => {
  // If statusCode was already set (e.g. in notFound), use it; otherwise default to 500
  let statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  let message = err.message || 'Internal Server Error';

  // Specific handling for Mongoose Validation Errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    // Extract individual validator error messages into a clean array
    const errors = Object.values(err.errors).map((el) => el.message);
    message = `Validation Failed: ${errors.join(', ')}`;
  }

  // Specific handling for Mongoose CastError (e.g., malformed ObjectId)
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid format for field "${err.path}": ${err.value}`;
  }

  // Specific handling for duplicate key error (code 11000)
  if (err.code && err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    message = `Duplicate field value entered: ${field}`;
  }

  res.status(statusCode).json({
    success: false,
    message,
    // Include stack trace only in development mode for debugging
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
};

module.exports = {
  notFound,
  errorHandler,
};
