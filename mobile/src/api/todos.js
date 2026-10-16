function createTodoApi(client) {
  return {
    list(params = {}) {
      const query = Object.entries(params).filter(([, value]) => value !== '' && value !== null && value !== undefined).map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&');
      return client.request(`/todos${query ? `?${query}` : ''}`);
    },
    get: (id) => client.request(`/todos/${id}`),
    stats: () => client.request('/todos/stats'),
    create: (fields) => client.request('/todos', { method: 'POST', body: fields }),
    update: (id, fields) => client.request(`/todos/${id}`, { method: 'PATCH', body: fields }),
    remove: (id) => client.request(`/todos/${id}`, { method: 'DELETE' }),
  };
}
const clampPage = (page, total_pages) => Math.min(page, Math.max(1, total_pages));
module.exports = { createTodoApi, clampPage };
