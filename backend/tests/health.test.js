const test = require('node:test');
const assert = require('node:assert/strict');

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

test('req00_health_returns_ok', async () => {
  const response = await fetch(new URL('/health', baseUrl));
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.status, 'ok');
});
