const test = require('node:test');
const assert = require('node:assert/strict');
const { createDemoService, validateTodo, clampPage } = require('../src/api/demo');

test('create, edit, complete and delete refresh contract-shaped stats', async () => {
  const api = createDemoService([]);
  const { todo } = await api.create({ title: '  Ship the demo  ', priority: 'high', due_date: '2026-01-01' });
  assert.equal(todo.title, 'Ship the demo');
  assert.equal(todo.completed, false);
  assert.equal(todo.description, '');
  assert.equal('user_id' in todo, false);
  assert.deepEqual((await api.stats()).stats, { total: 1, completed: 0, pending: 1, overdue: 1 });
  await api.update(todo.id, { title: 'Demo delivered', completed: true });
  assert.equal((await api.list()).items[0].title, 'Demo delivered');
  assert.deepEqual((await api.stats()).stats, { total: 1, completed: 1, pending: 0, overdue: 0 });
  assert.equal(await api.remove(todo.id), null);
  assert.equal((await api.list()).total_pages, 0);
  await assert.rejects(api.remove(todo.id), { code: 'NOT_FOUND' });
});

test('validation rejects empty title, calendar overflow, extra fields and completed on create', () => {
  for (const input of [{ title: ' ' }, { title: 'x'.repeat(201) }, { title: 'x', due_date: '2026-02-30' }, { title: 'x', due_date: '2026-13-01' }, { title: 'x', completed: false }, { title: 'x', priority: 'urgent' }, { title: 'x', description: 'x'.repeat(1001) }]) {
    assert.throws(() => validateTodo(input), (error) => error.code === 'VALIDATION_ERROR' && error.message === 'Validation failed' && error.details.length > 0);
  }
  assert.equal(validateTodo({ title: 'Leap day', due_date: '2028-02-29' }).due_date, '2028-02-29');
  assert.throws(() => validateTodo({}, true), { code: 'VALIDATION_ERROR' });
});

test('filters search description, priority and completion together; null dates sort last', async () => {
  const api = createDemoService([]);
  await api.create({ title: 'C', description: 'Design review', priority: 'high', due_date: null });
  const { todo } = await api.create({ title: 'B', description: 'Design feedback', priority: 'low', due_date: '2028-01-02' });
  await api.create({ title: 'A', description: 'DESIGN brief', priority: 'high', due_date: '2028-01-01' });
  await api.update(todo.id, { completed: true });
  const result = await api.list({ q: 'design', priority: 'high', completed: 'false', sort: 'due_date', order: 'desc', limit: 1, page: 1 });
  assert.equal(result.items[0].title, 'A'); assert.equal(result.total, 2); assert.equal(result.total_pages, 2);
  assert.equal((await api.list({ sort: 'priority', order: 'asc' })).items[0].priority, 'low');
  assert.equal((await api.list({ sort: 'title', order: 'asc' })).items[0].title, 'A');
  assert.deepEqual((await api.list({ page: 10 })).items, []);
});

test('overdue excludes completed, undated and UTC today', async () => {
  const api = createDemoService([]);
  const today = new Date().toISOString().slice(0, 10);
  await api.create({ title: 'Today', due_date: today });
  await api.create({ title: 'No deadline' });
  const { todo } = await api.create({ title: 'Past', due_date: '2000-01-01' });
  await api.update(todo.id, { completed: true });
  assert.equal((await api.stats()).stats.overdue, 0);
  await api.update(todo.id, { completed: false });
  assert.equal((await api.stats()).stats.overdue, 1);
});

test('last-page deletion recovers to the previous available page', async () => {
  const api = createDemoService([]);
  for (let index = 0; index < 21; index++) await api.create({ title: `Task ${index}` });
  const last = await api.list({ page: 2, limit: 20 });
  await api.remove(last.items[0].id);
  const after = await api.list({ page: 2, limit: 20 });
  const page = clampPage(after.page, after.total_pages);
  assert.equal(page, 1);
  assert.equal((await api.list({ page, limit: 20 })).items.length, 20);
  assert.equal(clampPage(2, 0), 1);
});
