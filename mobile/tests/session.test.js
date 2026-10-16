const test = require('node:test');
const assert = require('node:assert/strict');
const { createApiClient } = require('../src/api/client');
const { createAuthApi } = require('../src/api/auth');
const { createSession } = require('../src/state/session');

function fixture(fetchImpl, initial = null) {
  let saved = initial;
  const storage = { async get() { return saved; }, async set(token) { saved = token; }, async remove() { saved = null; } };
  const client = createApiClient({ baseUrl: '/api', fetchImpl });
  return { session: createSession({ client, auth: createAuthApi(client), storage }), client, saved: () => saved, storage };
}
const user = { id: 1, email: 'person@example.com', created_at: '2026-10-17T00:00:00Z' };

test('register saves token, restart validates /auth/me, logout removes saved token', async () => {
  const fixture1 = fixture(async () => Response.json({ user, token: 'saved-token' }));
  await fixture1.session.authenticate('register', { email: user.email, password: 'test-password' });
  assert.equal(fixture1.saved(), 'saved-token'); assert.equal(fixture1.session.getState().phase, 'signed_in');
  const fixture2 = fixture(async (url, options) => {
    assert.equal(url, '/api/auth/me'); assert.equal(options.headers.Authorization, 'Bearer saved-token'); return Response.json({ user });
  }, fixture1.saved());
  await fixture2.session.restore(); assert.deepEqual(fixture2.session.getState().user, user);
  await fixture2.session.logout(); assert.equal(fixture2.saved(), null); assert.equal(fixture2.session.getState().phase, 'signed_out');
});

test('expired stored token and protected 401 return to login and remove saved data', async () => {
  const f = fixture(async () => Response.json({ error: { code: 'UNAUTHORIZED', message: 'Expired', details: [] } }, { status: 401 }), 'expired');
  await f.session.restore(); assert.equal(f.saved(), null); assert.equal(f.session.getState().phase, 'signed_out');
  assert.match(f.session.getState().error, /session has expired/);
});

test('offline restoration keeps token for retry; failed login never signs user in', async () => {
  const f = fixture(async () => { throw new TypeError('offline'); }, 'keep-for-retry');
  await f.session.restore(); assert.equal(f.saved(), 'keep-for-retry'); assert.equal(f.session.getState().phase, 'error');
  await assert.rejects(f.session.authenticate('login', { email: user.email, password: 'anything' }), { code: 'NETWORK_ERROR' });
  assert.equal(f.session.getState().user, null);
});

test('logout during restore or login cannot resurrect the old session', async () => {
  let finish;
  const f = fixture(() => new Promise((resolve) => { finish = resolve; }), 'old');
  const pending = f.session.restore(); await Promise.resolve();
  await f.session.logout(); finish(Response.json({ user })); await pending;
  assert.equal(f.session.getState().phase, 'signed_out'); assert.equal(f.saved(), null);
  const login = f.session.authenticate('login', { email: user.email, password: 'test' });
  await f.session.logout(); finish(Response.json({ user, token: 'late' })); await login;
  assert.equal(f.session.getState().phase, 'signed_out'); assert.equal(f.saved(), null);
});

test('failed secure storage write does not create an authenticated session', async () => {
  const f = fixture(async () => Response.json({ user, token: 'token' }));
  f.storage.set = async () => { throw new Error('storage unavailable'); };
  await assert.rejects(f.session.authenticate('login', {}), /Could not save your sign-in/);
  assert.equal(f.session.getState().user, null);
});
