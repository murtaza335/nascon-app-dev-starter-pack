const port = Number.parseInt(process.env.PORT || '3000', 10);

const databaseUrl = process.env.DATABASE_URL || 'postgres://app:app@postgres:5432/app';
const jwtSecret = process.env.JWT_SECRET || 'dev-secret';
const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';

module.exports = {
  databaseUrl,
  jwtExpiresIn,
  jwtSecret,
  port,
};