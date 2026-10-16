const { z } = require('zod');
const { calendarDateSchema, positiveIntegerParamSchema, prioritySchema } = require('./common');

const listQuerySchema = z.object({
  completed: z.enum(['true', 'false']).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.coerce.number().int().min(1).optional().default(1),
  priority: prioritySchema.optional(),
  q: z.string().min(1).max(100).optional(),
  sort: z.enum(['created_at', 'due_date', 'priority', 'title']).optional().default('created_at'),
}).strict();

const createTodoSchema = z.object({
  description: z.string().max(1000).optional().default(''),
  due_date: z.union([calendarDateSchema, z.null()]).optional().default(null),
  priority: prioritySchema.optional().default('medium'),
  title: z.string().transform((value) => value.trim()).pipe(z.string().min(1).max(200)),
}).strict();

const updateTodoSchema = z.object({
  description: z.string().max(1000).optional(),
  due_date: z.union([calendarDateSchema, z.null()]).optional(),
  completed: z.boolean().optional(),
  priority: prioritySchema.optional(),
  title: z.string().transform((value) => value.trim()).pipe(z.string().min(1).max(200)).optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field is required',
});

const todoIdSchema = z.object({
  id: positiveIntegerParamSchema,
}).strict();

module.exports = {
  createTodoSchema,
  listQuerySchema,
  todoIdSchema,
  updateTodoSchema,
};