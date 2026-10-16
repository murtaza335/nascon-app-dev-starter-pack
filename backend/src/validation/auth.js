const { z } = require('zod');

const registerSchema = z.object({
  email: z.string().trim().email().max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(72),
}).strict();

const loginSchema = z.object({
  email: z.string().trim().min(1).max(254).transform((value) => value.toLowerCase()),
  password: z.string().min(1),
}).strict();

module.exports = {
  loginSchema,
  registerSchema,
};