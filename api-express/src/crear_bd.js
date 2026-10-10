import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { poolSinBase } from './db.js';
import { config } from './config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Crea la base de datos y las tablas (idempotente).
 * @param {string|null} nombreBd  Base a crear/usar. Si es null usa config.db.database.
 */
export async function initSchema(nombreBd = null) {
  const bd = nombreBd || config.db.database;
  if (!bd) throw new Error('No se definió un nombre de base de datos');
  const conn = await poolSinBase().getConnection();
  try {
    await conn.query(
      'CREATE DATABASE IF NOT EXISTS `' + bd + '` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
    );
  } finally {
    conn.release();
  }

  const pool = poolSinBase(bd);
  const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
  // Dividir la instrucción CREATE DATABASE/USE y ejecutar solo los CREATE TABLE
  const bloques = sql
    .split(/;\s*\n/)
    .map((s) => s.replace(/CREATE DATABASE[\s\S]*?USE[^;]*;/i, '').trim())
    .filter(Boolean);

  const conn2 = await pool.getConnection();
  try {
    for (const bloque of bloques) {
      if (/^CREATE TABLE/i.test(bloque)) await conn2.query(bloque);
    }
  } finally {
    conn2.release();
    await pool.end();
  }
  return bd;
}

// CLI: npm run db:init
if (process.argv[1] && process.argv[1].endsWith('crear_bd.js')) {
  initSchema()
    .then((bd) => {
      console.log('Esquema listo en la base:', bd);
      process.exit(0);
    })
    .catch((e) => {
      console.error('Error creando el esquema:', e.message);
      process.exit(1);
    });
}