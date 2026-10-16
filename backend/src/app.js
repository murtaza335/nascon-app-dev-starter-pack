const express = require('express');
const healthRouter = require('./routes/health');
const authRouter = require('./routes/auth');
const todoRouter = require('./routes/todos');
const { errorHandler, notFoundHandler } = require('./middleware/error-handler');

function createApp() {
  const app = express();

  app.disable('x-powered-by');
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
  app.use('/auth', authRouter);
  app.use('/todos', todoRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = {
  createApp,
};