function notFoundHandler(req, res, next) {
  const error = new Error(`Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404);
  next(error);
}

function errorHandler(error, _req, res, _next) {
  const statusCode = error.statusCode || error.status || (res.statusCode >= 400 ? res.statusCode : 500);

  res.status(statusCode).json({
    status: 'error',
    message: statusCode >= 500 ? 'An unexpected error occurred' : (error.message || 'Request failed'),
  });
}

module.exports = { notFoundHandler, errorHandler };
