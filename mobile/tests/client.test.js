const test = require('node:test');
const assert = require('node:assert/strict');
const { createApiClient } = require('../src/api/client');
const { createAuthApi } = require('../src/api/auth');
const { createTodoApi, clampPage } = require('../src/api/todos');

test('live task calls preserve query/body contract, bearer token, and empty DELETE response', async () => {
  const calls = [];
  const client = createApiClient({ baseUrl: 'http://api.test/', fetchImpl: async (url, options) => {
    calls.push({ url, ...options });
    return options.method === 'DELETE' ? new Response(null, { status: 204 }) : Response.json({ todo: { id: 7 } });
  } });
  client.setToken('test-token');
  const api = createTodoApi(client);
  await api.list({ completed: 'false', priority: '', q: 'a & b', sort: 'due_date', order: 'asc', page: 2, limit: 20 });
  assert.equal(calls[0].url, 'http://api.test/todos?completed=false&q=a%20%26%20b&sort=due_date&order=asc&page=2&limit=20');
  assert.equal(calls[0].headers.Authorization, 'Bearer test-token');
  await api.create({ title: 'Read', description: '', priority: 'low', due_date: null });
  assert.deepEqual(JSON.parse(calls[1].body), { title: 'Read', description: '', priority: 'low', due_date: null });
  await api.get(7); await api.update(7, { completed: true }); await api.stats();
  assert.equal(calls[2].url, 'http://api.test/todos/7');
  assert.equal(calls[3].method, 'PATCH');
  assert.equal(calls[4].url, 'http://api.test/todos/stats');
  assert.equal(await api.remove(7), null);
});

test('public auth sends only credentials, and failed login does not invalidate an active session', async () => {
  let expired = false;
  const client = createApiClient({ baseUrl: '/api', fetchImpl: async (url, options) => {
    assert.equal(url, '/api/auth/login'); assert.equal(options.headers.Authorization, undefined);
    assert.deepEqual(JSON.parse(options.body), { email: 'user@example.com', password: 'wrong' });
    return Response.json({ error: { code: 'UNAUTHORIZED', message: 'Invalid email or password', details: [] } }, { status: 401 });
  } });
  client.setToken('existing'); client.setUnauthorizedHandler(async () => { expired = true; });
  await assert.rejects(createAuthApi(client).login({ email: 'user@example.com', password: 'wrong' }), { status: 401, code: 'UNAUTHORIZED', message: 'Invalid email or password', details: [] });
  assert.equal(expired, false);
});

test('preserves server validation messages and details', async () => {
  const details = [{ field: 'title', message: 'Required' }];
  const client = createApiClient({ baseUrl: '/api', fetchImpl: async () => Response.json({ error: { code: 'VALIDATION_ERROR', message: 'Validation failed', details } }, { status: 400 }) });
  await assert.rejects(createTodoApi(client).create({ title: '' }), { status: 400, code: 'VALIDATION_ERROR', message: 'Validation failed', details });
});

test('expired protected request clears session, stale 401 cannot clear a newer token', async () => {
  let release; let invalidations = 0;
  const client = createApiClient({ baseUrl: '/api', fetchImpl: () => new Promise((resolve) => { release = resolve; }) });
  client.setUnauthorizedHandler(async () => { invalidations++; client.setToken(null); });
  client.setToken('old'); const pending = client.request('/todos');
  client.setToken('new'); release(Response.json({ error: { code: 'UNAUTHORIZED', message: 'Expired', details: [] } }, { status: 401 }));
  await assert.rejects(pending, { status: 401 }); assert.equal(invalidations, 0);
  const current = client.request('/todos'); release(Response.json({ error: { code: 'UNAUTHORIZED', message: 'Expired', details: [] } }, { status: 401 }));
  await assert.rejects(current, { status: 401 }); assert.equal(invalidations, 1);
});

test('network, timeout, malformed response and missing configuration are actionable errors', async () => {
  const network = createApiClient({ baseUrl: '/api', fetchImpl: async () => { throw new TypeError('Failed to fetch'); } });
  await assert.rejects(network.request('/todos'), { status: 0, code: 'NETWORK_ERROR' });
  const timeout = createApiClient({ baseUrl: '/api', timeoutMs: 5, fetchImpl: (url, { signal }) => new Promise((resolve, reject) => signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))) });
  await assert.rejects(timeout.request('/todos'), { code: 'NETWORK_ERROR', message: 'The request timed out. Please try again.' });
  const malformed = createApiClient({ baseUrl: '/api', fetchImpl: async () => new Response('<html>') });
  await assert.rejects(malformed.request('/todos'), { code: 'INVALID_RESPONSE' });
  await assert.rejects(createApiClient({ baseUrl: null }).request('/todos'), { code: 'CONFIGURATION_ERROR' });
  assert.equal(clampPage(2, 1), 1); assert.equal(clampPage(2, 0), 1);
});
