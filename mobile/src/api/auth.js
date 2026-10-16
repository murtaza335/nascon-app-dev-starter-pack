function createAuthApi(client) {
  return {
    login: (credentials) => client.request('/auth/login', { method: 'POST', body: credentials, protectedCall: false }),
    register: (credentials) => client.request('/auth/register', { method: 'POST', body: credentials, protectedCall: false }),
    me: () => client.request('/auth/me'),
  };
}
module.exports = { createAuthApi };
