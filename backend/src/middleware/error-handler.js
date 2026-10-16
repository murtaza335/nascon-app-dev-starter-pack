const { ZodError } = require('zod');
const { AppError } = require('../utils/app-error');

function formatError(status, code, message, details = []) {
  return {
    error: {
      code,
      details,
      message,
    },
  };
}

function notFoundHandler(_request, response) {
  response.status(404).json(formatError(404, 'NOT_FOUND', 'Not found'));
}

function errorHandler(error, _request, response, _next) {
  if (response.headersSent) {
    return;
  }

  if (error instanceof AppError) {
    response.status(error.status).json(formatError(error.status, error.code, error.message, error.details));
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json(formatError(400, 'VALIDATION_ERROR', 'Validation failed', error.issues.map((issue) => ({
      field: issue.path.length > 0 ? issue.path.join('.') : 'body',
      message: issue.message,
    }))));
    return;
  }

  if (error && error.type === 'entity.parse.failed') {
    response.status(400).json(formatError(400, 'VALIDATION_ERROR', 'Validation failed'));
    return;
  }

  console.error(error);
  response.status(500).json(formatError(500, 'INTERNAL_ERROR', 'Internal server error'));
}

module.exports = {
  errorHandler,
  formatError,
  notFoundHandler,
};