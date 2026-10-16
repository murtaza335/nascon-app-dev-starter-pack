const { getDefaultConfig } = require('expo/metro-config');
const http = require('node:http');
const https = require('node:https');
const config = getDefaultConfig(__dirname);

// Keep web preview same-origin without changing the team's backend CORS policy.
config.server.enhanceMiddleware = (middleware) => (request, response, next) => {
  if (!request.url.startsWith('/api/')) return middleware(request, response, next);
  const target = new URL(request.url.slice(4), process.env.API_PROXY_TARGET || 'http://127.0.0.1:3000');
  if (target.origin !== new URL(process.env.API_PROXY_TARGET || 'http://127.0.0.1:3000').origin) {
    response.writeHead(400); response.end(); return;
  }
  const upstream = (target.protocol === 'https:' ? https : http).request(target, {
    method: request.method,
    headers: { ...request.headers, host: target.host },
  }, (result) => {
    response.writeHead(result.statusCode, result.headers);
    result.pipe(response);
  });
  upstream.setTimeout(15000, () => upstream.destroy(new Error('Backend timeout')));
  upstream.on('error', () => {
    if (response.headersSent) { response.destroy(); return; }
    response.writeHead(502, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: { code: 'INTERNAL_ERROR', message: 'Cannot reach the backend. Check that it is running.', details: [] } }));
  });
  request.on('aborted', () => upstream.destroy());
  request.pipe(upstream);
};
module.exports = config;
