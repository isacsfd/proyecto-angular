const mysql = require('mysql2/promise');
const { config } = require('./config');

// Opciones del pool construidas a partir de una configuración (función pura,
// sin abrir conexiones) para poder verificar TLS y límites en las pruebas.
function opcionesPool(cfg = config) {
  const opciones = {
    host: cfg.mysql.host,
    port: cfg.mysql.port,
    user: cfg.mysql.user,
    password: cfg.mysql.password,
    database: cfg.mysql.database,
    waitForConnections: true,
    connectionLimit: cfg.mysql.connectionLimit,
    queueLimit: 0,
    connectTimeout: cfg.mysql.connectTimeout,
    // Recicla conexiones inactivas a los 4 min: TiDB Cloud Starter corta las
    // conexiones inactivas de más de 30 min, así que con 4 min el driver
    // siempre cierra primero y el pool reabre sin errores de socket.
    idleTimeout: cfg.mysql.idleTimeoutMs,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    decimalNumbers: true,
    charset: 'utf8mb4',
  };

  // TLS opcional para MySQL en la nube (TiDB Cloud Starter): solo se activa
  // cuando se define la CA. Con MySQL local queda sin TLS. La verificación del
  // certificado SIEMPRE está activa (rejectUnauthorized: true, no se apaga).
  if (cfg.mysql.sslCa) {
    if (!cfg.mysql.sslCa.includes('-----BEGIN CERTIFICATE-----')) {
      throw new Error('MM_MYSQL_SSL_CA no contiene un certificado PEM válido');
    }
    opciones.ssl = {
      minVersion: 'TLSv1.2',
      ca: cfg.mysql.sslCa,
      rejectUnauthorized: true,
    };
  }

  return opciones;
}

const pool = mysql.createPool(opcionesPool(config));

async function query(sql, params = []) {
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function withTransaction(callback) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function closePool() {
  await pool.end();
}

module.exports = { opcionesPool, pool, query, withTransaction, closePool };
