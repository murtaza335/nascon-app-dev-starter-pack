const { z } = require('zod');

const prioritySchema = z.enum(['low', 'medium', 'high']);

function isValidCalendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return date instanceof Date && !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const calendarDateSchema = z.string().refine(isValidCalendarDate, { message: 'must be a valid date in YYYY-MM-DD format' });

const positiveIntegerParamSchema = z.coerce.number().int().positive();

module.exports = {
  calendarDateSchema,
  isValidCalendarDate,
  positiveIntegerParamSchema,
  prioritySchema,
};