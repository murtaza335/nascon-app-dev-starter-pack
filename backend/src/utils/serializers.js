function toIsoString(value) {
  if (value == null) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toDateString(value) {
  if (value == null) {
    return null;
  }

  if (typeof value === 'string') {
    return value.slice(0, 10);
  }

  return value.toISOString().slice(0, 10);
}

function serializeUser(row) {
  return {
    created_at: toIsoString(row.created_at),
    email: row.email,
    id: row.id,
  };
}

function serializeTodo(row) {
  return {
    completed: row.completed,
    created_at: toIsoString(row.created_at),
    description: row.description,
    due_date: toDateString(row.due_date),
    id: row.id,
    priority: row.priority,
    title: row.title,
    updated_at: toIsoString(row.updated_at),
  };
}

module.exports = {
  serializeTodo,
  serializeUser,
  toIsoString,
  toDateString,
};