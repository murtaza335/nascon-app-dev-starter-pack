// EXAMPLE ONLY: delete or replace on the day.
const express = require('express');
const { pool } = require('../db');

const router = express.Router();

async function ensureExampleTable() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS items (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

function validateName(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

router.get('/api/items', async (_request, response, next) => {
  try {
    const result = await pool.query('SELECT id, name, created_at FROM items ORDER BY id ASC');
    response.json({ items: result.rows });
  } catch (error) {
    next(error);
  }
});

router.post('/api/items', async (request, response, next) => {
  try {
    const { name } = request.body || {};
    if (!validateName(name)) {
      response.status(400).json({ error: 'name is required' });
      return;
    }

    const result = await pool.query('INSERT INTO items (name) VALUES ($1) RETURNING id, name, created_at', [name.trim()]);
    response.status(201).json({ item: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.get('/api/items/:id', async (request, response, next) => {
  try {
    const id = Number.parseInt(request.params.id, 10);
    if (!Number.isInteger(id)) {
      response.status(400).json({ error: 'invalid id' });
      return;
    }

    const result = await pool.query('SELECT id, name, created_at FROM items WHERE id = $1', [id]);
    if (result.rowCount === 0) {
      response.status(404).json({ error: 'item not found' });
      return;
    }

    response.json({ item: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

router.delete('/api/items/:id', async (request, response, next) => {
  try {
    const id = Number.parseInt(request.params.id, 10);
    if (!Number.isInteger(id)) {
      response.status(400).json({ error: 'invalid id' });
      return;
    }

    const result = await pool.query('DELETE FROM items WHERE id = $1 RETURNING id', [id]);
    if (result.rowCount === 0) {
      response.status(404).json({ error: 'item not found' });
      return;
    }

    response.status(204).end();
  } catch (error) {
    next(error);
  }
});

module.exports = {
  router,
  ensureExampleTable,
};
