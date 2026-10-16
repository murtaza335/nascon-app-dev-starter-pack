const { createApp } = require('./app');
const { migrate } = require('./db/migrate');
const { pool, waitForDb } = require('./db');
const { port } = require('./config');

const app = createApp();

let server;
let shuttingDown = false;

async function start() {
  server = app.listen(port, '0.0.0.0', () => {
    console.log(`backend listening on ${port}`);
  });

  try {
    await waitForDb();
    await migrate();
  } catch (error) {
    console.error(error);
    await shutdown('BOOT_FAILURE');
  }
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

  await Promise.allSettled(tasks);
  process.exit(0);
}

process.on('SIGTERM', () => {
  shutdown('SIGTERM');
});

process.on('SIGINT', () => {
  shutdown('SIGINT');
});

if (require.main === module) {
  start().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = app;