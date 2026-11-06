const express = require('express');
const repo = require('./repositories');
const { asyncHandler, HttpError } = require('./errors');
const {
  bodyObject,
  text,
  id,
  nonNegativeNumber,
  booleanFlag,
  email,
  dateTime,
  assertOnlyKnownFields,
} = require('./validation');
const { authRequired, requirePurchasesRole } = require('./middleware');

const router = express.Router();
const protect = [authRequired, requirePurchasesRole];

function providerCreate(body) {
  bodyObject(body);
  assertOnlyKnownFields(body, new Set(['razon_social', 'nit', 'email', 'telefono', 'direccion']));
  return {
    razon_social: text('razon_social', body.razon_social, 150, true),
    nit: text('nit', body.nit, 50, true),
    email: email('email', body.email),
    telefono: text('telefono', body.telefono, 30),
    direccion: text('direccion', body.direccion, 255),
  };
}

function providerUpdate(body) {
  bodyObject(body);
  assertOnlyKnownFields(body, new Set(['razon_social', 'nit', 'email', 'telefono', 'direccion', 'estado']));
  const result = {};
  if ('razon_social' in body) result.razon_social = text('razon_social', body.razon_social, 150, true);
  if ('nit' in body) result.nit = text('nit', body.nit, 50, true);
  if ('email' in body) result.email = email('email', body.email);
  if ('telefono' in body) result.telefono = text('telefono', body.telefono, 30);
  if ('direccion' in body) result.direccion = text('direccion', body.direccion, 255);
  if ('estado' in body) result.estado = booleanFlag('estado', body.estado);
  if (!Object.keys(result).length) throw new HttpError(400, 'No se enviaron campos para actualizar.', 'VALIDATION');
  return result;
}

function purchaseCreate(body) {
  bodyObject(body);
  assertOnlyKnownFields(body, new Set(['proveedor_id', 'numero_factura', 'fecha', 'total']));
  return {
    proveedor_id: id('proveedor_id', body.proveedor_id),
    numero_factura: text('numero_factura', body.numero_factura, 50, true),
    fecha: dateTime('fecha', body.fecha),
    total: nonNegativeNumber('total', body.total, 999999999999) ?? 0,
  };
}

function purchaseUpdate(body) {
  bodyObject(body);
  assertOnlyKnownFields(body, new Set(['proveedor_id', 'numero_factura', 'fecha', 'total', 'estado']));
  const result = {};
  if ('proveedor_id' in body) result.proveedor_id = id('proveedor_id', body.proveedor_id);
  if ('numero_factura' in body) result.numero_factura = text('numero_factura', body.numero_factura, 50, true);
  if ('fecha' in body) result.fecha = dateTime('fecha', body.fecha, true);
  if ('total' in body) result.total = nonNegativeNumber('total', body.total, 999999999999);
  if ('estado' in body) result.estado = booleanFlag('estado', body.estado);
  if (!Object.keys(result).length) throw new HttpError(400, 'No se enviaron campos para actualizar.', 'VALIDATION');
  return result;
}

function detailCreate(body, compraId) {
  bodyObject(body);
  assertOnlyKnownFields(body, new Set(['descripcion', 'cantidad', 'precio_unitario']));
  const cantidad = nonNegativeNumber('cantidad', body.cantidad, 999999) ?? 1;
  if (cantidad < 1) throw new HttpError(400, 'cantidad debe ser mayor o igual a 1.', 'VALIDATION');
  return {
    compra_id: compraId,
    descripcion: text('descripcion', body.descripcion, 200, true),
    cantidad,
    precio_unitario: nonNegativeNumber('precio_unitario', body.precio_unitario, 999999999999) ?? 0,
  };
}

function detailUpdate(body) {
  bodyObject(body);
  assertOnlyKnownFields(body, new Set(['descripcion', 'cantidad', 'precio_unitario', 'estado']));
  const result = {};
  if ('descripcion' in body) result.descripcion = text('descripcion', body.descripcion, 200, true);
  if ('cantidad' in body) {
    result.cantidad = nonNegativeNumber('cantidad', body.cantidad, 999999);
    if (result.cantidad === null || result.cantidad < 1) throw new HttpError(400, 'cantidad debe ser mayor o igual a 1.', 'VALIDATION');
  }
  if ('precio_unitario' in body) result.precio_unitario = nonNegativeNumber('precio_unitario', body.precio_unitario, 999999999999);
  if ('estado' in body) result.estado = booleanFlag('estado', body.estado);
  if (!Object.keys(result).length) throw new HttpError(400, 'No se enviaron campos para actualizar.', 'VALIDATION');
  return result;
}

router.get('/health', asyncHandler(async (req, res) => {
  res.json({ status: 'ok', service: 'biblioteca-iub-express' });
}));

router.get('/health/db', asyncHandler(async (req, res) => {
  const ok = await repo.healthCheck();
  if (!ok) throw new HttpError(503, 'Base de datos de compras no disponible.', 'DATABASE_UNAVAILABLE');
  res.json({ status: 'ok', database: 'ok' });
}));

// Proveedores
router.get('/api/proveedores', protect, asyncHandler(async (req, res) => res.json(await repo.listProviders())));
router.get('/api/proveedores/:id', protect, asyncHandler(async (req, res) => {
  const row = await repo.getProvider(id('proveedor_id', req.params.id));
  if (!row) throw new HttpError(404, 'Proveedor no encontrado.', 'NOT_FOUND');
  res.json(row);
}));
router.post('/api/proveedores', protect, asyncHandler(async (req, res) => {
  const row = await repo.createProvider(providerCreate(req.body));
  res.status(201).json(row);
}));
router.put('/api/proveedores/:id', protect, asyncHandler(async (req, res) => {
  const providerId = id('proveedor_id', req.params.id);
  if (!await repo.getProvider(providerId)) throw new HttpError(404, 'Proveedor no encontrado.', 'NOT_FOUND');
  res.json(await repo.updateProvider(providerId, providerUpdate(req.body)));
}));
router.delete('/api/proveedores/:id', protect, asyncHandler(async (req, res) => {
  const providerId = id('proveedor_id', req.params.id);
  if (!await repo.softDeleteProvider(providerId)) throw new HttpError(404, 'Proveedor no encontrado.', 'NOT_FOUND');
  res.json({ mensaje: 'Proveedor eliminado (borrado lógico)', id: providerId });
}));

// Compras
router.get('/api/compras', protect, asyncHandler(async (req, res) => res.json(await repo.listPurchases())));
router.get('/api/compras/:id', protect, asyncHandler(async (req, res) => {
  const purchaseId = id('compra_id', req.params.id);
  const row = await repo.getPurchase(purchaseId);
  if (!row) throw new HttpError(404, 'Compra no encontrada.', 'NOT_FOUND');
  res.json(row);
}));
router.post('/api/compras', protect, asyncHandler(async (req, res) => {
  const data = purchaseCreate(req.body);
  if (!await repo.getProvider(data.proveedor_id)) throw new HttpError(400, 'El proveedor indicado no existe o está inactivo.', 'REFERENCE');
  res.status(201).json(await repo.createPurchase(data));
}));
router.put('/api/compras/:id', protect, asyncHandler(async (req, res) => {
  const purchaseId = id('compra_id', req.params.id);
  if (!await repo.getPurchase(purchaseId)) throw new HttpError(404, 'Compra no encontrada.', 'NOT_FOUND');
  const data = purchaseUpdate(req.body);
  if (data.proveedor_id && !await repo.getProvider(data.proveedor_id)) throw new HttpError(400, 'El proveedor indicado no existe o está inactivo.', 'REFERENCE');
  res.json(await repo.updatePurchase(purchaseId, data));
}));
router.delete('/api/compras/:id', protect, asyncHandler(async (req, res) => {
  const purchaseId = id('compra_id', req.params.id);
  if (!await repo.softDeletePurchase(purchaseId)) throw new HttpError(404, 'Compra no encontrada.', 'NOT_FOUND');
  res.json({ mensaje: 'Compra eliminada (borrado lógico)', id: purchaseId });
}));

// Detalles
router.get('/api/compras/:id/detalles', protect, asyncHandler(async (req, res) => {
  const purchaseId = id('compra_id', req.params.id);
  if (!await repo.purchaseIsActive(purchaseId)) throw new HttpError(400, 'La compra indicada no existe o está inactiva.', 'REFERENCE');
  res.json(await repo.listDetails(purchaseId));
}));
router.post('/api/compras/:id/detalles', protect, asyncHandler(async (req, res) => {
  const purchaseId = id('compra_id', req.params.id);
  if (!await repo.purchaseIsActive(purchaseId)) throw new HttpError(400, 'La compra indicada no existe o está inactiva.', 'REFERENCE');
  res.status(201).json(await repo.createDetail(detailCreate(req.body, purchaseId)));
}));
router.get('/api/detalles/:id', protect, asyncHandler(async (req, res) => {
  const detailId = id('detalle_id', req.params.id);
  const row = await repo.getDetail(detailId);
  if (!row) throw new HttpError(404, 'Detalle no encontrado.', 'NOT_FOUND');
  res.json(row);
}));
router.put('/api/detalles/:id', protect, asyncHandler(async (req, res) => {
  const detailId = id('detalle_id', req.params.id);
  if (!await repo.getDetail(detailId)) throw new HttpError(404, 'Detalle no encontrado.', 'NOT_FOUND');
  res.json(await repo.updateDetail(detailId, detailUpdate(req.body)));
}));
router.delete('/api/detalles/:id', protect, asyncHandler(async (req, res) => {
  const detailId = id('detalle_id', req.params.id);
  if (!await repo.softDeleteDetail(detailId)) throw new HttpError(404, 'Detalle no encontrado.', 'NOT_FOUND');
  res.json({ mensaje: 'Detalle eliminado (borrado lógico)', id: detailId });
}));

module.exports = router;
