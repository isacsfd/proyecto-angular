import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { ping } from './db.js';
import { errorHandler, notFound } from './errores.js';

import proveedores from './routes/proveedores.js';
import compras from './routes/compras.js';
import detalles from './routes/detalles.js';

export function crearApp() {
  const app = express();

  // CORS seguro por variables de entorno
  app.use(
    cors({
      origin(origin, cb) {
        if (!origin || config.corsOrigins.includes('*') || config.corsOrigins.includes(origin)) {
          return cb(null, true);
        }
        return cb(new Error('Origen no permitido por CORS'));
      },
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  app.use(express.json({ limit: '100kb' }));

  // Health check
  app.get('/health', async (_req, res) => {
    try {
      await ping();
      res.json({ estado: 'ok', servicio: 'biblioteca-iub-api-express', time: new Date().toISOString() });
    } catch {
      res.status(503).json({ estado: 'error', servicio: 'biblioteca-iub-api-express', detalle: 'Base de datos no disponible' });
    }
  });

  app.use('/api/proveedores', proveedores);
  app.use('/api/compras', compras);
  app.use('/api', detalles); // /api/compras/:compraId/detalles y /api/detalles/:id

  app.use(notFound);
  app.use(errorHandler);

  // El error de CORS también pasa por el manejador global
  app.use((err, req, res, next) => errorHandler(err, req, res, next));

  return app;
}