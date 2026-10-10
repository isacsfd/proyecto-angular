import { Router } from 'express';
import { pool } from '../db.js';
import { AppError, parseId, texto, numeroNoNegativo, booleano } from '../errores.js';

const router = Router();

async function compraActiva(id) {
  const [f] = await pool.query('SELECT id FROM compras WHERE id = ? AND estado = 1', [id]);
  if (f.length === 0) throw new AppError(400, 'La compra indicada no existe o está inactiva.');
  return f[0].id;
}

/** GET /api/compras/:compraId/detalles — detalles ACTIVOS de una compra */
router.get('/compras/:compraId/detalles', async (req, res, next) => {
  try {
    const compra_id = parseId(req.params.compraId);
    await compraActiva(compra_id);
    const [filas] = await pool.query(
      'SELECT id, compra_id, descripcion, cantidad, precio_unitario, estado, creado, actualizado ' +
        'FROM detalle_compra WHERE compra_id = ? AND estado = 1 ORDER BY id',
      [compra_id]
    );
    res.json(filas);
  } catch (e) {
    next(e);
  }
});

/** POST /api/compras/:compraId/detalles */
router.post('/compras/:compraId/detalles', async (req, res, next) => {
  try {
    const compra_id = parseId(req.params.compraId);
    await compraActiva(compra_id);
    const descripcion = texto('descripcion', req.body?.descripcion, 200, true);
    const cantidad = numeroNoNegativo('cantidad', req.body?.cantidad, 6) ?? 1;
    const precio_unitario = numeroNoNegativo('precio_unitario', req.body?.precio_unitario, 12) ?? 0;
    if (cantidad < 1) throw new AppError(400, 'cantidad debe ser mayor o igual a 1.');

    const [r] = await pool.query(
      'INSERT INTO detalle_compra (compra_id, descripcion, cantidad, precio_unitario) VALUES (?, ?, ?, ?)',
      [compra_id, descripcion, cantidad, precio_unitario]
    );
    const [filas] = await pool.query(
      'SELECT id, compra_id, descripcion, cantidad, precio_unitario, estado, creado, actualizado ' +
        'FROM detalle_compra WHERE id = ?',
      [r.insertId]
    );
    res.status(201).json(filas[0]);
  } catch (e) {
    next(e);
  }
});

/** GET /api/detalles/:id */
router.get('/detalles/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const [filas] = await pool.query(
      'SELECT id, compra_id, descripcion, cantidad, precio_unitario, estado, creado, actualizado ' +
        'FROM detalle_compra WHERE id = ? AND estado = 1',
      [id]
    );
    if (filas.length === 0) throw new AppError(404, 'Detalle no encontrado');
    res.json(filas[0]);
  } catch (e) {
    next(e);
  }
});

/** PUT /api/detalles/:id */
router.put('/detalles/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const [existe] = await pool.query('SELECT id FROM detalle_compra WHERE id = ? AND estado = 1', [id]);
    if (existe.length === 0) throw new AppError(404, 'Detalle no encontrado');

    const sets = [];
    const valores = [];
    if (req.body?.descripcion !== undefined) {
      sets.push('descripcion = ?');
      valores.push(texto('descripcion', req.body.descripcion, 200, true));
    }
    if (req.body?.cantidad !== undefined) {
      const cantidad = numeroNoNegativo('cantidad', req.body.cantidad, 6);
      if (cantidad < 1) throw new AppError(400, 'cantidad debe ser mayor o igual a 1.');
      sets.push('cantidad = ?');
      valores.push(cantidad);
    }
    if (req.body?.precio_unitario !== undefined) {
      sets.push('precio_unitario = ?');
      valores.push(numeroNoNegativo('precio_unitario', req.body.precio_unitario, 12));
    }
    if (req.body?.estado !== undefined) {
      sets.push('estado = ?');
      valores.push(booleano('estado', req.body.estado));
    }
    if (sets.length === 0) throw new AppError(400, 'No se enviaron campos para actualizar');
    valores.push(id);
    await pool.query(`UPDATE detalle_compra SET ${sets.join(', ')} WHERE id = ?`, valores);

    const [filas] = await pool.query(
      'SELECT id, compra_id, descripcion, cantidad, precio_unitario, estado, creado, actualizado ' +
        'FROM detalle_compra WHERE id = ?',
      [id]
    );
    res.json(filas[0]);
  } catch (e) {
    next(e);
  }
});

/** DELETE /api/detalles/:id — borrado LÓGICO */
router.delete('/detalles/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const [existe] = await pool.query('SELECT id FROM detalle_compra WHERE id = ? AND estado = 1', [id]);
    if (existe.length === 0) throw new AppError(404, 'Detalle no encontrado');
    await pool.query('UPDATE detalle_compra SET estado = 0 WHERE id = ?', [id]);
    res.json({ mensaje: 'Detalle eliminado (borrado lógico)', id });
  } catch (e) {
    next(e);
  }
});

export default router;