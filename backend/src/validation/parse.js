const { ZodError } = require('zod');
const { AppError } = require('../utils/app-error');

function issuesToDetails(issues) {
  return issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.join('.') : 'body',
    message: issue.message,
  }));
}

function parseOrThrow(schema, value) {
  try {
    return schema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed', issuesToDetails(error.issues));
    }
    throw error;
  }
}

module.exports = {
  parseOrThrow,
};