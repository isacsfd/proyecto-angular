const path = require('node:path');
const fs = require('node:fs');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');

process.env.EXPRESS_ENV_FILE = path.resolve(__dirname, '../../.env');
process.env.MM_MYSQL_DATABASE = process.env.MM_MYSQL_TEST_DATABASE || 'biblioteca_iub_compras_test';
process.env.MM_JWT_SECRET = process.env.MM_JWT_SECRET || 'clave-de-prueba-express-iub-2026-suficiente';
process.env.EXPRESS_CORS_ORIGINS = 'http://localhost:4200,http://127.0.0.1:4200';

const { config } = require('../src/config');
const { pool, closePool } = require('../src/db');

async function ensureSchema() {
  if (!config.mysql.database.endsWith('_test')) {
    throw new Error('Las pruebas Express solo pueden usar una base cuyo nombre termine en _test');
  }
  const schema = fs.readFileSync(
    path.resolve(__dirname, '../../docker/mysql-init/01-compras.sql'),
    'utf8',
  );
  const admin = await mysql.createConnection({
    host: config.mysql.host,
    port: config.mysql.port,
    user: config.mysql.user,
    password: config.mysql.password,
    connectTimeout: config.mysql.connectTimeout,
    multipleStatements: true,
  });
  await admin.query(`CREATE DATABASE IF NOT EXISTS \`${config.mysql.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await admin.end();

  const schemaConnection = await mysql.createConnection({
    host: config.mysql.host,
    port: config.mysql.port,
    user: config.mysql.user,
    password: config.mysql.password,
    database: config.mysql.database,
    connectTimeout: config.mysql.connectTimeout,
    multipleStatements: true,
  });
  await schemaConnection.query(schema);
  await schemaConnection.end();

  await pool.query('DELETE FROM detalle_compra');
  await pool.query('DELETE FROM compras');
  await pool.query('DELETE FROM proveedores');
}

function tokenFor(rol = 'Administrador', id = 1) {
  return jwt.sign(
    { id, sub: String(id), rol, sede: 'Soledad' },
    config.jwtSecret,
    { algorithm: 'HS256', expiresIn: '1h' },
  );
}

module.exports = { ensureSchema, tokenFor, pool, closePool };
