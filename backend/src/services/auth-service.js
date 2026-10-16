const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { pool } = require('../db');
const { jwtExpiresIn, jwtSecret } = require('../config');
const { AppError } = require('../utils/app-error');
const { serializeUser } = require('../utils/serializers');

function createToken(userId) {
  return jwt.sign({ sub: String(userId) }, jwtSecret, { expiresIn: jwtExpiresIn });
}

async function registerUser({ email, password }) {
  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const result = await pool.query(
      'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
      [email, passwordHash],
    );

    return serializeUser(result.rows[0]);
  } catch (error) {
    if (error && error.code === '23505') {
      throw new AppError(409, 'CONFLICT', 'Email already registered');
    }

    throw error;
  }
}

async function loginUser({ email, password }) {
  const result = await pool.query(
    'SELECT id, email, password_hash, created_at FROM users WHERE email = $1',
    [email],
  );

  if (result.rowCount === 0) {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid email or password');
  }

  const user = result.rows[0];
  const passwordOk = await bcrypt.compare(password, user.password_hash);

  if (!passwordOk) {
    throw new AppError(401, 'UNAUTHORIZED', 'Invalid email or password');
  }

  return serializeUser(user);
}

module.exports = {
  createToken,
  loginUser,
  registerUser,
};