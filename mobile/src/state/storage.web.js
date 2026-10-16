// The browser preview retains a session only in this tab. Native uses SecureStore.
const key = 'daylight_token';
export const tokenStorage = {
  async get() { return window.sessionStorage.getItem(key); },
  async set(token) { window.sessionStorage.setItem(key, token); },
  async remove() { window.sessionStorage.removeItem(key); },
};
