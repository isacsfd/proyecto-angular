import { Router } from 'express';
import { pool } from '../db.js';
import { AppError, parseId, texto, numeroNoNegativo, booleano } from '../errores.js';

const router = Router();

async function proveedorActivo(id) {
  const [f] = await pool.query('SELECT id FROM proveedores WHERE id = ? AND estado = 1', [id]);
  if (f.length === 0) throw new AppError(400, 'El proveedor indicado no existe o está inactivo.');
  return f[0].id;
}

/** GET /api/compras — compras activas con su proveedor */
router.get('/', async (_req, res, next) => {
  try {
    const [filas] = await pool.query(
      'SELECT c.id, c.proveedor_id, p.razon_social AS proveedor, c.numero_factura, ' +
        'c.fecha, c.total, c.estado, c.creado, c.actualizado ' +
        'FROM compras c JOIN proveedores p ON c.proveedor_id = p.id ' +
        'WHERE c.estado = 1 ORDER BY c.id DESC'
    );
    res.json(filas);
  } catch (e) {
    next(e);
  }
});

/** GET /api/compras/:id */
router.get('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const [filas] = await pool.query(
      'SELECT c.id, c.proveedor_id, p.razon_social AS proveedor, c.numero_factura, ' +
        'c.fecha, c.total, c.estado, c.creado, c.actualizado ' +
        'FROM compras c JOIN proveedores p ON c.proveedor_id = p.id ' +
        'WHERE c.id = ? AND c.estado = 1',
      [id]
    );
    if (filas.length === 0) throw new AppError(404, 'Compra no encontrada');
    res.json(filas[0]);
  } catch (e) {
    next(e);
  }
});

/** POST /api/compras */
router.post('/', async (req, res, next) => {
  try {
    const proveedor_id = parseId(req.body?.proveedor_id);
    const numero_factura = texto('numero_factura', req.body?.numero_factura, 50, true);
    const fecha = req.body?.fecha ? new Date(req.body.fecha) : new Date();
    const total = numeroNoNegativo('total', req.body?.total, 12) ?? 0;

    if (Number.isNaN(fecha.getTime())) throw new AppError(400, 'fecha inválida.');
    await proveedorActivo(proveedor_id);

    const [r] = await pool.query(
      'INSERT INTO compras (proveedor_id, numero_factura, fecha, total) VALUES (?, ?, ?, ?)',
      [proveedor_id, numero_factura, fecha, total]
    );
    const [filas] = await pool.query(
      'SELECT c.id, c.proveedor_id, p.razon_social AS proveedor, c.numero_factura, ' +
        'c.fecha, c.total, c.estado, c.creado, c.actualizado ' +
        'FROM compras c JOIN proveedores p ON c.proveedor_id = p.id WHERE c.id = ?',
      [r.insertId]
    );
    res.status(201).json(filas[0]);
  } catch (e) {
    next(e);
  }
});

/** PUT /api/compras/:id */
router.put('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const [existe] = await pool.query('SELECT id FROM compras WHERE id = ? AND estado = 1', [id]);
    if (existe.length === 0) throw new AppError(404, 'Compra no encontrada');

    const sets = [];
    const valores = [];

    if (req.body?.proveedor_id !== undefined) {
      const proveedor_id = parseId(req.body.proveedor_id);
      await proveedorActivo(proveedor_id);
      sets.push('proveedor_id = ?');
      valores.push(proveedor_id);
    }
    if (req.body?.numero_factura !== undefined) {
      const numero_factura = texto('numero_factura', req.body.numero_factura, 50, true);
      sets.push('numero_factura = ?');
      valores.push(numero_factura);
    }
    if (req.body?.fecha !== undefined) {
      const fecha = new Date(req.body.fecha);
      if (Number.isNaN(fecha.getTime())) throw new AppError(400, 'fecha inválida.');
      sets.push('fecha = ?');
      valores.push(fecha);
    }
    if (req.body?.total !== undefined) {
      sets.push('total = ?');
      valores.push(numeroNoNegativo('total', req.body.total, 12));
    }
    if (req.body?.estado !== undefined) {
      sets.push('estado = ?');
      valores.push(booleano('estado', req.body.estado));
    }
    if (sets.length === 0) throw new AppError(400, 'No se enviaron campos para actualizar');

    valores.push(id);
    await pool.query(`UPDATE compras SET ${sets.join(', ')} WHERE id = ?`, valores);

    const [filas] = await pool.query(
      'SELECT c.id, c.proveedor_id, p.razon_social AS proveedor, c.numero_factura, ' +
        'c.fecha, c.total, c.estado, c.creado, c.actualizado ' +
        'FROM compras c JOIN proveedores p ON c.proveedor_id = p.id WHERE c.id = ?',
      [id]
    );
    res.json(filas[0]);
  } catch (e) {
    next(e);
  }
});

/** DELETE /api/compras/:id — borrado LÓGICO */
router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const [existe] = await pool.query('SELECT id FROM compras WHERE id = ? AND estado = 1', [id]);
    if (existe.length === 0) throw new AppError(404, 'Compra no encontrada');
    await pool.query('UPDATE compras SET estado = 0 WHERE id = ?', [id]);
    res.json({ mensaje: 'Compra eliminada (borrado lógico)', id });
  } catch (e) {
    next(e);
  }
});

export default router;