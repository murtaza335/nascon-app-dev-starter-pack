const test = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { createApiClient } = require('../src/api/client');
const { createAuthApi } = require('../src/api/auth');
const { createTodoApi } = require('../src/api/todos');

test('mobile API adapters authenticate and persist real todo CRUD, filters and stats', async () => {
  const client = createApiClient({ baseUrl: process.env.API_URL || 'http://10.108.226.154:3000' });
  const auth = createAuthApi(client); const todos = createTodoApi(client);
  const credentials = { email: `mobile-${randomUUID()}@example.com`, password: randomUUID() };
  const registered = await auth.register(credentials);
  client.setToken(registered.token);
  assert.equal((await auth.me()).user.email, credentials.email);
  await assert.rejects(auth.login({ ...credentials, password: 'incorrect' }), { status: 401, message: 'Invalid email or password' });
  const signedIn = await auth.login(credentials); client.setToken(signedIn.token);
  const { todo } = await todos.create({ title: 'Integration task', description: 'mobile network check', priority: 'high', due_date: '2026-01-01' });
  try {
    assert.equal((await todos.get(todo.id)).todo.title, 'Integration task');
    assert.equal((await todos.list({ q: 'network', priority: 'high', completed: 'false', sort: 'due_date', order: 'asc', page: 1, limit: 20 })).items[0].id, todo.id);
    await todos.update(todo.id, { title: 'Updated task', completed: true, due_date: null });
    assert.equal((await todos.get(todo.id)).todo.title, 'Updated task');
    assert.equal((await todos.stats()).stats.completed, 1);
    await assert.rejects(todos.create({ title: '' }), { status: 400, code: 'VALIDATION_ERROR' });
    assert.equal(await todos.remove(todo.id), null);
    await assert.rejects(todos.get(todo.id), { status: 404 });
    assert.deepEqual((await todos.stats()).stats, { total: 0, completed: 0, pending: 0, overdue: 0 });
  } finally { await todos.remove(todo.id).catch(() => { }); }
});
