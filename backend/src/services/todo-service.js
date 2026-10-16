const { pool } = require('../db');
const { AppError } = require('../utils/app-error');
const { serializeTodo } = require('../utils/serializers');

function toBoolean(value) {
  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return null;
}

function buildWhereClause(userId, filters) {
  const clauses = ['user_id = $1'];
  const params = [userId];
  let nextIndex = 2;

  if (filters.completed !== undefined) {
    clauses.push(`completed = $${nextIndex}`);
    params.push(filters.completed);
    nextIndex += 1;
  }

  if (filters.priority) {
    clauses.push(`priority = $${nextIndex}`);
    params.push(filters.priority);
    nextIndex += 1;
  }

  if (filters.q) {
    clauses.push(`(title ILIKE $${nextIndex} OR description ILIKE $${nextIndex})`);
    params.push(`%${filters.q}%`);
    nextIndex += 1;
  }

  return {
    params,
    whereSql: clauses.join(' AND '),
  };
}

function sortExpression(sort, order) {
  const direction = order === 'asc' ? 'ASC' : 'DESC';

  if (sort === 'due_date') {
    return `t.due_date ${direction} NULLS LAST, t.id ${direction}`;
  }

  if (sort === 'title') {
    return `t.title ${direction}, t.id ${direction}`;
  }

  if (sort === 'priority') {
    return `CASE t.priority WHEN 'low' THEN 1 WHEN 'medium' THEN 2 WHEN 'high' THEN 3 END ${direction}, t.id ${direction}`;
  }

  return `t.created_at ${direction}, t.id ${direction}`;
}

async function createTodo(userId, input) {
  const result = await pool.query(
    `
      INSERT INTO todos (user_id, title, description, priority, due_date)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, title, description, completed, priority, due_date, created_at, updated_at
    `,
    [userId, input.title, input.description, input.priority, input.due_date],
  );

  return serializeTodo(result.rows[0]);
}

async function listTodos(userId, filters) {
  const completed = filters.completed == null ? undefined : toBoolean(filters.completed);
  if (filters.completed && completed === null) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Validation failed');
  }

  const where = buildWhereClause(userId, {
    completed,
    priority: filters.priority,
    q: filters.q,
  });

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS total FROM todos t WHERE ${where.whereSql}`,
    where.params,
  );

  const total = countResult.rows[0].total;
  const limit = filters.limit;
  const page = filters.page;
  const offset = (page - 1) * limit;
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  const rowsResult = await pool.query(
    `
      SELECT t.id, t.title, t.description, t.completed, t.priority, t.due_date, t.created_at, t.updated_at
      FROM todos t
      WHERE ${where.whereSql}
      ORDER BY ${sortExpression(filters.sort, filters.order)}
      LIMIT $${where.params.length + 1}
      OFFSET $${where.params.length + 2}
    `,
    [...where.params, limit, offset],
  );

  return {
    items: rowsResult.rows.map(serializeTodo),
    limit,
    page,
    total,
    total_pages: totalPages,
  };
}

async function getTodo(userId, todoId) {
  const result = await pool.query(
    'SELECT id, title, description, completed, priority, due_date, created_at, updated_at FROM todos WHERE id = $1 AND user_id = $2',
    [todoId, userId],
  );

  if (result.rowCount === 0) {
    throw new AppError(404, 'NOT_FOUND', 'Not found');
  }

  return serializeTodo(result.rows[0]);
}

async function updateTodo(userId, todoId, input) {
  const assignments = [];
  const params = [userId, todoId];

  if (input.title !== undefined) {
    assignments.push(`title = $${params.length + 1}`);
    params.push(input.title);
  }

  if (input.description !== undefined) {
    assignments.push(`description = $${params.length + 1}`);
    params.push(input.description);
  }

  if (input.completed !== undefined) {
    assignments.push(`completed = $${params.length + 1}`);
    params.push(input.completed);
  }

  if (input.priority !== undefined) {
    assignments.push(`priority = $${params.length + 1}`);
    params.push(input.priority);
  }

  if (input.due_date !== undefined) {
    assignments.push(`due_date = $${params.length + 1}`);
    params.push(input.due_date);
  }

  assignments.push('updated_at = NOW()');

  const result = await pool.query(
    `
      UPDATE todos
      SET ${assignments.join(', ')}
      WHERE user_id = $1 AND id = $2
      RETURNING id, title, description, completed, priority, due_date, created_at, updated_at
    `,
    params,
  );

  if (result.rowCount === 0) {
    throw new AppError(404, 'NOT_FOUND', 'Not found');
  }

  return serializeTodo(result.rows[0]);
}

async function deleteTodo(userId, todoId) {
  const result = await pool.query(
    'DELETE FROM todos WHERE user_id = $1 AND id = $2 RETURNING id',
    [userId, todoId],
  );

  if (result.rowCount === 0) {
    throw new AppError(404, 'NOT_FOUND', 'Not found');
  }
}

async function getTodoStats(userId) {
  const result = await pool.query(
    `
      SELECT
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE completed)::int AS completed,
        COUNT(*) FILTER (WHERE NOT completed)::int AS pending,
        COUNT(*) FILTER (WHERE NOT completed AND due_date < CURRENT_DATE)::int AS overdue
      FROM todos
      WHERE user_id = $1
    `,
    [userId],
  );

  return result.rows[0];
}

module.exports = {
  createTodo,
  deleteTodo,
  getTodo,
  getTodoStats,
  listTodos,
  updateTodo,
};