const express = require('express');
const helmet = require('helmet');
const { config, validateConfig } = require('./config');
const { configureCors, configureRateLimit, requestId } = require('./middleware');
const { errorHandler, HttpError } = require('./errors');
const routes = require('./routes');

function createApp({ validate = true, roleVerifier } = {}) {
  if (validate) validateConfig();
  const app = express();
  app.disable('x-powered-by');
  app.disable('etag');
  app.locals.roleVerifier = roleVerifier;
  app.set('trust proxy', false);
  app.use(helmet());
  app.use(requestId);
  app.use(configureCors());
  app.use(configureRateLimit());
  app.use(express.json({ limit: '32kb' }));
  app.use((req, res, next) => {
    if (req.path === '/health' || req.path === '/health/db' || req.path.startsWith('/api/')) {
      res.setHeader('Cache-Control', 'no-store, max-age=0');
      res.setHeader('Pragma', 'no-cache');
    }
    next();
  });
  app.use(routes);
  app.use((req, res, next) => next(new HttpError(404, 'Ruta no encontrada.', 'NOT_FOUND')));
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
