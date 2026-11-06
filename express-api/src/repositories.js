const { query, withTransaction } = require('./db');

const PROVIDER_COLUMNS = 'id, razon_social, nit, email, telefono, direccion, estado, creado, actualizado';
const PURCHASE_COLUMNS = 'c.id, c.proveedor_id, p.razon_social AS proveedor, c.numero_factura, c.fecha, c.total, c.estado, c.creado, c.actualizado';
const DETAIL_COLUMNS = 'id, compra_id, descripcion, cantidad, precio_unitario, estado, creado, actualizado';

async function listProviders() {
  return query(`SELECT ${PROVIDER_COLUMNS} FROM proveedores WHERE estado = 1 ORDER BY id DESC`);
}

async function getProvider(id) {
  const rows = await query(`SELECT ${PROVIDER_COLUMNS} FROM proveedores WHERE id = ? AND estado = 1`, [id]);
  return rows[0] || null;
}

async function getProviderIncludingInactive(id) {
  const rows = await query(`SELECT ${PROVIDER_COLUMNS} FROM proveedores WHERE id = ?`, [id]);
  return rows[0] || null;
}

async function createProvider(data) {
  const result = await query(
    'INSERT INTO proveedores (razon_social, nit, email, telefono, direccion) VALUES (?, ?, ?, ?, ?)',
    [data.razon_social, data.nit, data.email, data.telefono, data.direccion],
  );
  return getProviderIncludingInactive(result.insertId);
}

async function updateProvider(id, fields) {
  const keys = Object.keys(fields);
  const values = keys.map((key) => fields[key]);
  const assignments = keys.map((key) => `${key} = ?`).join(', ');
  await query(`UPDATE proveedores SET ${assignments} WHERE id = ? AND estado = 1`, [...values, id]);
  return getProviderIncludingInactive(id);
}

async function softDeleteProvider(id) {
  const result = await query('UPDATE proveedores SET estado = 0 WHERE id = ? AND estado = 1', [id]);
  return result.affectedRows > 0;
}

async function listPurchases() {
  return query(`SELECT ${PURCHASE_COLUMNS} FROM compras c JOIN proveedores p ON c.proveedor_id = p.id WHERE c.estado = 1 ORDER BY c.id DESC`);
}

async function getPurchase(id) {
  const rows = await query(`SELECT ${PURCHASE_COLUMNS} FROM compras c JOIN proveedores p ON c.proveedor_id = p.id WHERE c.id = ? AND c.estado = 1`, [id]);
  return rows[0] || null;
}

async function getPurchaseIncludingInactive(id) {
  const rows = await query(`SELECT ${PURCHASE_COLUMNS} FROM compras c JOIN proveedores p ON c.proveedor_id = p.id WHERE c.id = ?`, [id]);
  return rows[0] || null;
}

async function createPurchase(data) {
  const fields = ['proveedor_id', 'numero_factura', 'total'];
  const values = [data.proveedor_id, data.numero_factura, data.total];
  if (data.fecha) {
    fields.push('fecha');
    values.push(data.fecha);
  }
  const placeholders = fields.map(() => '?').join(', ');
  const result = await query(
    `INSERT INTO compras (${fields.join(', ')}) VALUES (${placeholders})`,
    values,
  );
  return getPurchaseIncludingInactive(result.insertId);
}

async function updatePurchase(id, fields) {
  const keys = Object.keys(fields);
  const values = keys.map((key) => fields[key]);
  const assignments = keys.map((key) => `${key} = ?`).join(', ');
  await query(`UPDATE compras SET ${assignments} WHERE id = ? AND estado = 1`, [...values, id]);
  return getPurchaseIncludingInactive(id);
}

async function softDeletePurchase(id) {
  const result = await query('UPDATE compras SET estado = 0 WHERE id = ? AND estado = 1', [id]);
  return result.affectedRows > 0;
}

async function purchaseIsActive(id) {
  const rows = await query('SELECT id FROM compras WHERE id = ? AND estado = 1', [id]);
  return rows.length > 0;
}

async function listDetails(purchaseId) {
  return query(`SELECT ${DETAIL_COLUMNS} FROM detalle_compra WHERE compra_id = ? AND estado = 1 ORDER BY id`, [purchaseId]);
}

async function getDetail(id) {
  const rows = await query(`SELECT ${DETAIL_COLUMNS} FROM detalle_compra WHERE id = ? AND estado = 1`, [id]);
  return rows[0] || null;
}

async function getDetailIncludingInactive(id) {
  const rows = await query(`SELECT ${DETAIL_COLUMNS} FROM detalle_compra WHERE id = ?`, [id]);
  return rows[0] || null;
}

async function createDetail(data) {
  const result = await query(
    'INSERT INTO detalle_compra (compra_id, descripcion, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
    [data.compra_id, data.descripcion, data.cantidad, data.precio_unitario],
  );
  return getDetailIncludingInactive(result.insertId);
}

async function updateDetail(id, fields) {
  const keys = Object.keys(fields);
  const values = keys.map((key) => fields[key]);
  const assignments = keys.map((key) => `${key} = ?`).join(', ');
  await query(`UPDATE detalle_compra SET ${assignments} WHERE id = ? AND estado = 1`, [...values, id]);
  return getDetailIncludingInactive(id);
}

async function softDeleteDetail(id) {
  const result = await query('UPDATE detalle_compra SET estado = 0 WHERE id = ? AND estado = 1', [id]);
  return result.affectedRows > 0;
}

async function healthCheck() {
  const rows = await query('SELECT 1 AS ok');
  return rows[0]?.ok === 1;
}

module.exports = {
  listProviders,
  getProvider,
  createProvider,
  updateProvider,
  softDeleteProvider,
  listPurchases,
  getPurchase,
  createPurchase,
  updatePurchase,
  softDeletePurchase,
  purchaseIsActive,
  listDetails,
  getDetail,
  createDetail,
  updateDetail,
  softDeleteDetail,
  healthCheck,
  // Exportado para pruebas locales que necesiten una transacción controlada.
  withTransaction,
};
