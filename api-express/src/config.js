import 'dotenv/config';

/**
 * Configuración central de la API Express.
 * Todo se lee de variables de entorno (con valores por defecto para desarrollo local).
 */
export const config = {
  port: Number(process.env.PORT || 3001),
  db: {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_DATABASE || 'biblioteca_iub_compras',
    connectionLimit: Number(process.env.DB_POOL_LIMIT || 10),
  },
  corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:4200,http://localhost:3001')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
};