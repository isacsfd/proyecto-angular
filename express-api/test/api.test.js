const assert = require('node:assert/strict');
const test = require('node:test');
const request = require('supertest');
const { ensureSchema, tokenFor, pool, closePool } = require('./helpers');
const { createApp } = require('../src/app');

const rolesVigentes = new Map([[1, 'Administrador'], [2, 'Estudiante']]);
const app = createApp({
  roleVerifier: async ({ payload }) => ({
    active: true,
    id: payload.id,
    rol: rolesVigentes.get(payload.id) || payload.rol,
    rol_id: payload.id,
    sede: 'Soledad',
  }),
});
const adminHeaders = () => ({ Authorization: `Bearer ${tokenFor('Administrador', 1)}` });
const studentHeaders = () => ({ Authorization: `Bearer ${tokenFor('Estudiante', 2)}` });

test.before(async () => {
  await ensureSchema();
});

test.after(async () => {
  await pool.query('DELETE FROM detalle_compra');
  await pool.query('DELETE FROM compras');
  await pool.query('DELETE FROM proveedores');
  await closePool();
});

test('health básico y conexión MySQL', async () => {
  const health = await request(app).get('/health');
  assert.equal(health.status, 200);
  assert.equal(health.body.status, 'ok');
  assert.equal(health.headers['cache-control'], 'no-store, max-age=0');

  const dbHealth = await request(app).get('/health/db');
  assert.equal(dbHealth.status, 200);
  assert.equal(dbHealth.body.database, 'ok');
});

test('CORS permite los dos orígenes locales y rechaza terceros', async () => {
  const localhost = await request(app)
    .options('/api/proveedores')
    .set('Origin', 'http://localhost:4200')
    .set('Access-Control-Request-Method', 'GET')
    .set('Access-Control-Request-Headers', 'authorization,cache-control,pragma');
  assert.equal(localhost.status, 204);
  assert.equal(localhost.headers['access-control-allow-origin'], 'http://localhost:4200');

  const loopback = await request(app)
    .options('/api/proveedores')
    .set('Origin', 'http://127.0.0.1:4200')
    .set('Access-Control-Request-Method', 'GET')
    .set('Access-Control-Request-Headers', 'authorization,cache-control,pragma');
  assert.equal(loopback.status, 204);
  assert.equal(loopback.headers['access-control-allow-origin'], 'http://127.0.0.1:4200');

  const external = await request(app)
    .options('/api/proveedores')
    .set('Origin', 'https://origen-no-autorizado.test')
    .set('Access-Control-Request-Method', 'GET');
  assert.equal(external.status, 403);
});

test('protege las rutas y limita por rol', async () => {
  assert.equal((await request(app).get('/api/proveedores')).status, 401);
  assert.equal((await request(app).get('/api/proveedores').set(studentHeaders())).status, 403);
  assert.equal((await request(app).get('/api/proveedores').set(adminHeaders())).status, 200);
});

test('las respuestas mutables no generan caché reutilizable', async () => {
  const response = await request(app).get('/api/proveedores').set(adminHeaders());
  assert.equal(response.status, 200);
  assert.equal(response.headers['cache-control'], 'no-store, max-age=0');
  assert.equal(response.headers.etag, undefined);
});

test('bloquea inmediatamente un administrador degradado', async () => {
  rolesVigentes.set(1, 'Estudiante');
  const response = await request(app).get('/api/proveedores').set(adminHeaders());
  assert.equal(response.status, 403);
  rolesVigentes.set(1, 'Administrador');
});

test('CRUD de proveedor con borrado lógico', async () => {
  const nit = `NIT-${Date.now()}`;
  const created = await request(app)
    .post('/api/proveedores')
    .set(adminHeaders())
    .send({ razon_social: 'Editorial Express Test', nit, email: 'test@example.com' });
  assert.equal(created.status, 201);
  const id = created.body.id;
  assert.equal(created.body.estado, 1);

  const updated = await request(app)
    .put(`/api/proveedores/${id}`)
    .set(adminHeaders())
    .send({ telefono: '3000000000' });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.telefono, '3000000000');

  const deleted = await request(app).delete(`/api/proveedores/${id}`).set(adminHeaders());
  assert.equal(deleted.status, 200);
  assert.match(deleted.body.mensaje, /lógico/);

  assert.equal((await request(app).get(`/api/proveedores/${id}`).set(adminHeaders())).status, 404);
  const [rows] = await pool.query('SELECT estado FROM proveedores WHERE id = ?', [id]);
  assert.equal(rows[0].estado, 0);
});

test('CRUD de compra y detalle valida referencias', async () => {
  const nit = `NIT-C-${Date.now()}`;
  const provider = await request(app)
    .post('/api/proveedores')
    .set(adminHeaders())
    .send({ razon_social: 'Proveedor Compra Test', nit });
  assert.equal(provider.status, 201);

  const purchase = await request(app)
    .post('/api/compras')
    .set(adminHeaders())
    .send({ proveedor_id: provider.body.id, numero_factura: `FAC-${Date.now()}`, total: 120000 });
  assert.equal(purchase.status, 201);

  const detail = await request(app)
    .post(`/api/compras/${purchase.body.id}/detalles`)
    .set(adminHeaders())
    .send({ descripcion: 'Libros de prueba', cantidad: 2, precio_unitario: 60000 });
  assert.equal(detail.status, 201);

  const listed = await request(app).get(`/api/compras/${purchase.body.id}/detalles`).set(adminHeaders());
  assert.equal(listed.status, 200);
  assert.equal(listed.body.length, 1);

  const invalid = await request(app)
    .post('/api/compras')
    .set(adminHeaders())
    .send({ proveedor_id: 999999, numero_factura: 'FAC-INVALIDA' });
  assert.equal(invalid.status, 400);

  const duplicate = await request(app)
    .post('/api/proveedores')
    .set(adminHeaders())
    .send({ razon_social: 'Duplicado', nit });
  assert.equal(duplicate.status, 409);
});

test('rechaza campos desconocidos y entradas inválidas', async () => {
  const response = await request(app)
    .post('/api/proveedores')
    .set(adminHeaders())
    .send({ razon_social: 'Proveedor', nit: 'NIT-INVALIDO', password: 'no-debe-entrar' });
  assert.equal(response.status, 400);
  assert.match(response.body.detail, /Campo no permitido/);
});

test('rechaza JSON malformado sin exponer trazas', async () => {
  const response = await request(app)
    .post('/api/proveedores')
    .set(adminHeaders())
    .set('Content-Type', 'application/json')
    .send('{"razon_social":');
  assert.equal(response.status, 400);
  assert.equal(response.body.detail, 'JSON inválido.');
  assert.equal(response.body.stack, undefined);
});
