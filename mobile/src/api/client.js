function apiError(status, code, message, details = []) {
  return Object.assign(new Error(message), { status, code, details });
}

function createApiClient({ baseUrl, fetchImpl = (...args) => fetch(...args), timeoutMs = 15000 }) {
  let token = null;
  let unauthorizedHandler = async () => {};
  async function request(path, { method = 'GET', body, protectedCall = true } = {}) {
    if (!baseUrl) throw apiError(0, 'CONFIGURATION_ERROR', 'Set EXPO_PUBLIC_API_URL to your backend address, then restart Expo.');
    const requestToken = token;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(`${baseUrl.replace(/\/$/, '')}${path}`, {
        method,
        headers: { Accept: 'application/json', ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(protectedCall && requestToken ? { Authorization: `Bearer ${requestToken}` } : {}) },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        signal: controller.signal,
      });
      if (response.status === 401 && protectedCall && token === requestToken) await unauthorizedHandler();
      if (response.status === 204) return null;
      let payload;
      try { payload = await response.json(); } catch { throw apiError(response.status, 'INVALID_RESPONSE', 'The server returned an unreadable response. Please try again.'); }
      if (!response.ok) throw apiError(response.status, payload.error?.code || 'INTERNAL_ERROR', payload.error?.message || 'Something went wrong. Please try again.', payload.error?.details || []);
      return payload;
    } catch (error) {
      if (typeof error.status === 'number') throw error;
      throw apiError(0, 'NETWORK_ERROR', controller.signal.aborted ? 'The request timed out. Please try again.' : 'Cannot reach the server. Check your connection and backend address.');
    } finally { clearTimeout(timeout); }
  }
  return { request, setToken(value) { token = value; }, setUnauthorizedHandler(handler) { unauthorizedHandler = handler; } };
}

module.exports = { createApiClient, apiError };
