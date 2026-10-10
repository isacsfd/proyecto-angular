import './setup-env.js';
import { test, before, after, describe } from 'node:test';
import assert from 'node:assert/strict';

import { crearApp } from '../src/app.js';
import { poolSinBase, pool } from '../src/db.js';
import { initSchema } from '../src/crear_bd.js';
import { config } from '../src/config.js';

const BD_PRUEBAS = config.db.database;
let server;
let base;

function api(method, path, body) {
  return fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', Connection: 'close' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

before(async () => {
  await initSchema(BD_PRUEBAS);
  const app = crearApp();
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      base = `http://127.0.0.1:${server.address().port}`;
      resolve();
    });
  });
});

after(async () => {
  await new Promise((resolve) => {
    server.close(resolve);
    server.closeAllConnections?.();
  });
  await pool.end();
  const admin = poolSinBase();
  const conn = await admin.getConnection();
  try {
    await conn.query('DROP DATABASE IF EXISTS `' + BD_PRUEBAS + '`');
  } finally {
    conn.release();
    await admin.end();
  }
});

describe('API Express — proveedores y compras', () => {
  let proveedorId;
  let compraId;
  let detalleId;

  test('GET /health responde ok', async () => {
    const res = await api('GET', '/health');
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.estado, 'ok');
  });

  test('POST /api/proveedores crea un proveedor (201)', async () => {
    const res = await api('POST', '/api/proveedores', {
      razon_social: 'Proveedor Test', nit: 'T-0001', email: 'prov@test.com',
    });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.ok(body.id);
    assert.equal(body.estado, 1);
    assert.equal(body.nit, 'T-0001');
    proveedorId = body.id;
  });

  test('UNIQUE: nit duplicado devuelve 409', async () => {
    const res = await api('POST', '/api/proveedores', { razon_social: 'Otro', nit: 'T-0001' });
    assert.equal(res.status, 409);
  });

  test('Validación: falta razon_social devuelve 400', async () => {
    const res = await api('POST', '/api/proveedores', { nit: 'T-0002' });
    assert.equal(res.status, 400);
  });

  test('Validación: email inválido devuelve 400', async () => {
    const res = await api('POST', '/api/proveedores', { razon_social: 'X', nit: 'T-0003', email: 'mal' });
    assert.equal(res.status, 400);
  });

  test('GET /api/proveedores lista activos', async () => {
    const res = await api('GET', '/api/proveedores');
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.ok(Array.isArray(body));
    assert.ok(body.some((p) => p.id === proveedorId));
  });

  test('GET /api/proveedores/:id devuelve el proveedor', async () => {
    const res = await api('GET', `/api/proveedores/${proveedorId}`);
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.id, proveedorId);
  });

  test('GET /api/proveedores/:id inexistente devuelve 404', async () => {
    const res = await api('GET', '/api/proveedores/987654');
    assert.equal(res.status, 404);
  });

  test('PUT /api/proveedores/:id actualiza', async () => {
    const res = await api('PUT', `/api/proveedores/${proveedorId}`, { telefono: '3001234567' });
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.telefono, '3001234567');
  });

  test('POST /api/compras con proveedor inexistente devuelve 400', async () => {
    const res = await api('POST', '/api/compras', { proveedor_id: 987654, numero_factura: 'T-F1' });
    assert.equal(res.status, 400);
  });

  test('POST /api/compras crea una compra (201)', async () => {
    const res = await api('POST', '/api/compras', { proveedor_id: proveedorId, numero_factura: 'T-F1', total: 100 });
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.ok(body.id);
    assert.equal(body.proveedor, 'Proveedor Test');
    compraId = body.id;
  });

  test('UNIQUE: numero_factura duplicado devuelve 409', async () => {
    const res = await api('POST', '/api/compras', { proveedor_id: proveedorId, numero_factura: 'T-F1' });
    assert.equal(res.status, 409);
  });

  test('POST /api/compras/:id/detalles con compra inexistente devuelve 400', async () => {
    const res = await api('POST', '/api/compras/987654/detalles', { descripcion: 'x' });
    assert.equal(res.status, 400);
  });

  test('POST detalle y listado', async () => {
    const res = await api('POST', `/api/compras/${compraId}/detalles`, { descripcion: 'Libros', cantidad: 3, precio_unitario: 1000 });
    assert.equal(res.status, 201);
    detalleId = (await res.json()).id;

    const lista = await api('GET', `/api/compras/${compraId}/detalles`);
    assert.equal(lista.status, 200);
    assert.equal((await lista.json()).length, 1);
  });

  test('Validación: cantidad < 1 devuelve 400', async () => {
    const res = await api('POST', `/api/compras/${compraId}/detalles`, { descripcion: 'x', cantidad: 0 });
    assert.equal(res.status, 400);
  });

  test('PUT /api/detalles/:id actualiza', async () => {
    const res = await api('PUT', `/api/detalles/${detalleId}`, { cantidad: 10 });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).cantidad, 10);
  });

  test('DELETE lógico de detalle y 404 posterior', async () => {
    const del = await api('DELETE', `/api/detalles/${detalleId}`);
    assert.equal(del.status, 200);
    const get = await api('GET', `/api/detalles/${detalleId}`);
    assert.equal(get.status, 404);
  });

  test('DELETE lógico de proveedor y 404 posterior', async () => {
    const del = await api('DELETE', `/api/proveedores/${proveedorId}`);
    assert.equal(del.status, 200);
    const get = await api('GET', `/api/proveedores/${proveedorId}`);
    assert.equal(get.status, 404);
  });
});