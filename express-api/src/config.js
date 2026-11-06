const path = require('node:path');
const dotenv = require('dotenv');

// Carga únicamente configuración local si existe. Los valores del entorno
// siempre tienen prioridad y no se incluyen secretos en el código.
dotenv.config({
  path: process.env.EXPRESS_ENV_FILE || path.resolve(__dirname, '../../.env'),
});

function entero(nombre, valorPorDefecto, minimo = 1) {
  const valor = Number.parseInt(process.env[nombre] || valorPorDefecto, 10);
  if (!Number.isInteger(valor) || valor < minimo) {
    throw new Error(`${nombre} debe ser un entero >= ${minimo}`);
  }
  return valor;
}

function listaCsv(nombre, valorPorDefecto) {
  return (process.env[nombre] || valorPorDefecto)
    .split(',')
    .map((valor) => valor.trim())
    .filter(Boolean);
}

const config = {
  // En Render el web service expone el puerto asignado en la variable PORT:
  // tiene prioridad. Localmente se usa EXPRESS_PORT y, si faltan ambas, 4000.
  port: entero('PORT', entero('EXPRESS_PORT', 4000)),
  jwtSecret: process.env.MM_JWT_SECRET || '',
  jwtIssuer: process.env.MM_JWT_ISSUER || '',
  jwtAudience: process.env.MM_JWT_AUDIENCE || '',
  fastApiIntrospectionUrl: process.env.FASTAPI_INTROSPECTION_URL || 'http://127.0.0.1:8000/api/auth/introspect',
  fastApiIntrospectionTimeoutMs: entero('FASTAPI_INTROSPECTION_TIMEOUT_MS', 2500),
  corsOrigins: listaCsv(
    'EXPRESS_CORS_ORIGINS',
    'http://localhost:4200,http://127.0.0.1:4200',
  ),
  rateLimitMax: entero('EXPRESS_RATE_LIMIT_MAX', 120),
  rateLimitWindowMs: entero('EXPRESS_RATE_LIMIT_WINDOW_MS', 60000),
  mysql: {
    host: process.env.MM_MYSQL_HOST || '127.0.0.1',
    port: entero('MM_MYSQL_PORT', 3306),
    user: process.env.MM_MYSQL_USER || 'root',
    password: process.env.MM_MYSQL_PASSWORD || '',
    database: process.env.MM_MYSQL_DATABASE || 'biblioteca_iub_compras',
    connectionLimit: entero('MM_MYSQL_POOL', 5),
    connectTimeout: entero('MM_MYSQL_CONNECT_TIMEOUT', 5000),
  },
};

function validateConfig() {
  if (!config.jwtSecret || config.jwtSecret.length < 32) {
    throw new Error('MM_JWT_SECRET debe tener al menos 32 caracteres');
  }
  if (config.corsOrigins.includes('*')) {
    throw new Error('EXPRESS_CORS_ORIGINS no puede contener *');
  }
}

module.exports = { config, validateConfig };
