const assert = require('node:assert/strict');
const test = require('node:test');

// Este archivo corre en su propio proceso (node --test): se configuran las
// variables ANTES de cargar config/db y NO se usa helpers.js (que genera
// tokens y toca la base de pruebas real).
// Con MM_MYSQL_SSL_CA vacío el pool queda en modo sin TLS (MySQL local).
process.env.MM_MYSQL_SSL_CA = '';
const { config } = require('../src/config');
const { opcionesPool } = require('../src/db');

test('pool por defecto: sin TLS (MySQL local) y reciclaje a los 4 minutos', () => {
  const opciones = opcionesPool(config);
  assert.equal(opciones.ssl, undefined);
  assert.equal(opciones.idleTimeout, 240000);
  assert.equal(opciones.enableKeepAlive, true);
  assert.equal(opciones.charset, 'utf8mb4');
  assert.equal(opciones.connectionLimit, config.mysql.connectionLimit);
});

test('con CA configurada aplica TLS 1.2+ verificando el certificado', () => {
  const ca = '-----BEGIN CERTIFICATE-----\nMIIB-TEST\n-----END CERTIFICATE-----\n';
  const opciones = opcionesPool({
    ...config,
    mysql: { ...config.mysql, sslCa: ca },
  });
  assert.equal(opciones.ssl.rejectUnauthorized, true);
  assert.equal(opciones.ssl.minVersion, 'TLSv1.2');
  assert.equal(opciones.ssl.ca, ca);
});

test('rechaza una CA que no es un PEM', () => {
  assert.throws(
    () => opcionesPool({ ...config, mysql: { ...config.mysql, sslCa: 'certificado-sin-formato' } }),
    /PEM/,
  );
});

test('normaliza los saltos de línea escapados (\\n) de la CA en la variable', () => {
  process.env.MM_MYSQL_SSL_CA = '-----BEGIN CERTIFICATE-----\\nMIIB-ESCAPADO\\n-----END CERTIFICATE-----';
  const ruta = require.resolve('../src/config');
  const copiaOriginal = require.cache[ruta];
  delete require.cache[ruta];
  try {
    const { config: configEscapado } = require(ruta);
    const pemEsperado = '-----BEGIN CERTIFICATE-----\nMIIB-ESCAPADO\n-----END CERTIFICATE-----';
    assert.equal(configEscapado.mysql.sslCa, pemEsperado);
  } finally {
    delete require.cache[ruta];
    if (copiaOriginal) require.cache[ruta] = copiaOriginal;
  }
});
