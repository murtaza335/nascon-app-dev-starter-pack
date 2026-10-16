const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config');
const { pool } = require('../db');
const { AppError } = require('../utils/app-error');
const { serializeUser } = require('../utils/serializers');

async function requireAuth(request, _response, next) {
  const header = request.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    next(new AppError(401, 'UNAUTHORIZED', 'Unauthorized'));
    return;
  }

  try {
    const payload = jwt.verify(token, jwtSecret);
    const userId = Number.parseInt(String(payload.sub), 10);

    if (!Number.isInteger(userId) || userId <= 0) {
      throw new Error('invalid token payload');
    }

    const result = await pool.query(
      'SELECT id, email, created_at FROM users WHERE id = $1',
      [userId],
    );

    if (result.rowCount === 0) {
      next(new AppError(401, 'UNAUTHORIZED', 'Unauthorized'));
      return;
    }

    request.user = serializeUser(result.rows[0]);
    next();
  } catch (_error) {
    next(new AppError(401, 'UNAUTHORIZED', 'Unauthorized'));
  }
}

module.exports = {
  requireAuth,
};