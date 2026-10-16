const { createClient } = require('redis');

const url = process.env.REDIS_URL;

if (!url) {
  throw new Error('REDIS_URL is required');
}

const cacheClient = createClient({ url });

cacheClient.on('error', (error) => {
  console.error('redis error', error);
});

async function connectCache() {
  if (!cacheClient.isOpen) {
    await cacheClient.connect();
  }
}

async function pingCache() {
  await connectCache();
  return cacheClient.ping();
}

module.exports = {
  cacheClient,
  connectCache,
  pingCache,
};
