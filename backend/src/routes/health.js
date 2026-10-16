const express = require('express');
const { pool } = require('../db');

const router = express.Router();

router.get('/health', async (_request, response) => {
  try {
    await pool.query('SELECT 1');
  } catch (_error) {
    response.status(503).json({ status: 'error' });
    return;
  }

  response.status(200).json({ status: 'ok' });
});

module.exports = router;
