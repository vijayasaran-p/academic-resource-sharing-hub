/**
 * Central Error Handling Middleware
 * 
 * Ensures consistent JSON responses across all HTTP errors:
 * { success: false, message: string, errors?: array }
 */

/**
 * 404 Handler for undefined routes
 */
function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl} - Route not found`,
  });
}

/**
 * Central error-handling middleware
 */
function errorHandler(err, req, res, next) {
  // If headers already sent, delegate to default Express handler
  if (res.headersSent) {
    return next(err);
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`[Error] [${req.method} ${req.url}] : ${err.stack || err.message}`);

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
}

module.exports = {
  notFoundHandler,
  errorHandler,
};
