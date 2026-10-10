import mysql from 'mysql2/promise';
import { config } from './config.js';

/**
 * Pool de conexiones a MySQL.
 * Todas las consultas usan placeholders `?` (consultas parametrizadas).
 */
export const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit: config.db.connectionLimit,
  charset: 'utf8mb4',
});

/** Verifica que la base de datos responda (para GET /health). */
export async function ping() {
  const conn = await pool.getConnection();
  try {
    await conn.query('SELECT 1');
  } finally {
    conn.release();
  }
}

/** Ayudante para construir un pool sin base (creación de BD/tablas). */
export function poolSinBase(nombreBd = null) {
  return mysql.createPool({
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: nombreBd || undefined,
    waitForConnections: true,
    connectionLimit: 2,
  });
}