const express = require('express');
const healthRouter = require('./routes/health');
const { router: exampleRouter, ensureExampleTable } = require('./routes/example');
const { waitForDb, pool } = require('./db');
const { connectCache, cacheClient } = require('./cache');

const app = express();
const port = Number.parseInt(process.env.PORT || '3000', 10);

app.use(express.json());

app.use((request, response, next) => {
  const startedAt = Date.now();
  response.on('finish', () => {
    const elapsed = Date.now() - startedAt;
    console.log(`${request.method} ${request.originalUrl} ${response.statusCode} ${elapsed}ms`);
  });
  next();
});

app.use(healthRouter);
app.use(exampleRouter);

app.use((error, _request, response, _next) => {
  console.error(error);
  if (response.headersSent) {
    return;
  }
  response.status(500).json({ error: 'internal server error' });
});

let server;
let shuttingDown = false;

async function start() {
  await connectCache();
  await waitForDb();
  await ensureExampleTable();

  server = app.listen(port, () => {
    console.log(`backend listening on ${port}`);
  });
}

async function shutdown(signal) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  console.log(`received ${signal}, shutting down`);

  const tasks = [];
  if (server) {
    tasks.push(new Promise((resolve) => server.close(resolve)));
  }
  tasks.push(pool.end());
  tasks.push(cacheClient.quit().catch(() => cacheClient.disconnect()));

  await Promise.allSettled(tasks);
  process.exit(0);
}

process.on('SIGTERM', () => {
  shutdown('SIGTERM');
});
process.on('SIGINT', () => {
  shutdown('SIGINT');
});

start().catch((error) => {
  console.error(error);
  process.exit(1);
});

module.exports = app;
