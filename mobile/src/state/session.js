function createSession({ client, auth, storage }) {
  let state = { phase: 'loading', user: null, error: null };
  let revision = 0;
  let writes = Promise.resolve();
  const listeners = new Set();
  const publish = (next) => { state = next; listeners.forEach((listener) => listener(state)); };
  const write = (action) => { const pending = writes.then(action, action); writes = pending.catch(() => {}); return pending; };
  async function logout(message = null) {
    const current = ++revision;
    client.setToken(null);
    publish({ phase: 'signed_out', user: null, error: message });
    try { await write(() => storage.remove()); }
    catch { if (current === revision) publish({ phase: 'signed_out', user: null, error: 'Could not clear saved sign-in. Please retry signing out.' }); }
  }
  client.setUnauthorizedHandler(() => logout('Your session has expired. Please sign in again.'));
  return {
    getState: () => state,
    subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
    logout,
    async restore() {
      const current = ++revision;
      publish({ phase: 'loading', user: null, error: null });
      try {
        const token = await storage.get();
        if (current !== revision) return;
        if (!token) { publish({ phase: 'signed_out', user: null, error: null }); return; }
        client.setToken(token);
        const { user } = await auth.me();
        if (current === revision) publish({ phase: 'signed_in', user, error: null });
      } catch (error) {
        if (current === revision) publish({ phase: 'error', user: null, error: error.message });
      }
    },
    async authenticate(mode, credentials) {
      const current = ++revision;
      const result = await auth[mode](credentials);
      if (current !== revision) return;
      try { await write(() => storage.set(result.token)); }
      catch { throw new Error('Could not save your sign-in. Check device storage and try again.'); }
      if (current !== revision) return;
      client.setToken(result.token);
      publish({ phase: 'signed_in', user: result.user, error: null });
    },
  };
}
module.exports = { createSession };
