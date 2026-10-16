const { registerSchema, loginSchema } = require('../validation/auth');
const { parseOrThrow } = require('../validation/parse');
const { createToken, loginUser, registerUser } = require('../services/auth-service');

async function register(request, response) {
  const body = parseOrThrow(registerSchema, request.body ?? {});
  const user = await registerUser(body);
  const token = createToken(user.id);

  response.status(201).json({
    token,
    user,
  });
}

async function login(request, response) {
  const body = parseOrThrow(loginSchema, request.body ?? {});
  const user = await loginUser(body);
  const token = createToken(user.id);

  response.status(200).json({
    token,
    user,
  });
}

async function me(request, response) {
  response.status(200).json({
    user: request.user,
  });
}

module.exports = {
  login,
  me,
  register,
};