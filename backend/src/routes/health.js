const express = require('express');
const { pool } = require('../db');
const { pingCache } = require('../cache');

const router = express.Router();

router.get('/health', async (_request, response) => {
  const failed = [];
  let dbOk = false;
  let cacheOk = false;

  try {
    await pool.query('SELECT 1');
    dbOk = true;
  } catch {
    failed.push('db');
  }

  try {
    await pingCache();
    cacheOk = true;
  } catch {
    failed.push('cache');
  }

  const status = failed.length === 0 ? 'ok' : 'degraded';
  const payload = { status, db: dbOk, cache: cacheOk };

  if (failed.length > 0) {
    payload.failed = failed;
  }

  response.status(failed.length === 0 ? 200 : 503).json(payload);
});

module.exports = router;
