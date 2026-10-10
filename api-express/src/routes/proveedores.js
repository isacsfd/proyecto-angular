import { Router } from 'express';
import { pool } from '../db.js';
import { AppError, parseId, texto, emailValido, booleano } from '../errores.js';

const router = Router();

/** GET /api/proveedores — lista de proveedores ACTIVOS */
router.get('/', async (_req, res, next) => {
  try {
    const [filas] = await pool.query(
      'SELECT id, razon_social, nit, email, telefono, direccion, estado, creado, actualizado ' +
        'FROM proveedores WHERE estado = 1 ORDER BY id DESC'
    );
    res.json(filas);
  } catch (e) {
    next(e);
  }
});

/** GET /api/proveedores/:id — un proveedor activo */
router.get('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const [filas] = await pool.query(
      'SELECT id, razon_social, nit, email, telefono, direccion, estado, creado, actualizado ' +
        'FROM proveedores WHERE id = ? AND estado = 1',
      [id]
    );
    if (filas.length === 0) throw new AppError(404, 'Proveedor no encontrado');
    res.json(filas[0]);
  } catch (e) {
    next(e);
  }
});

/** POST /api/proveedores — crear */
router.post('/', async (req, res, next) => {
  try {
    const razon_social = texto('razon_social', req.body?.razon_social, 150, true);
    const nit = texto('nit', req.body?.nit, 50, true);
    const email = emailValido('email', texto('email', req.body?.email, 120));
    const telefono = texto('telefono', req.body?.telefono, 30);
    const direccion = texto('direccion', req.body?.direccion, 255);

    const [r] = await pool.query(
      'INSERT INTO proveedores (razon_social, nit, email, telefono, direccion) VALUES (?, ?, ?, ?, ?)',
      [razon_social, nit, email ?? null, telefono ?? null, direccion ?? null]
    );
    const [filas] = await pool.query(
      'SELECT id, razon_social, nit, email, telefono, direccion, estado, creado, actualizado FROM proveedores WHERE id = ?',
      [r.insertId]
    );
    res.status(201).json(filas[0]);
  } catch (e) {
    next(e);
  }
});

/** PUT /api/proveedores/:id — actualizar */
router.put('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const [existe] = await pool.query('SELECT id FROM proveedores WHERE id = ? AND estado = 1', [id]);
    if (existe.length === 0) throw new AppError(404, 'Proveedor no encontrado');

    const campos = {};
    const valores = [];

    const razon_social = texto('razon_social', req.body?.razon_social, 150);
    const nit = texto('nit', req.body?.nit, 50);
    const email = emailValido('email', texto('email', req.body?.email, 120));
    const telefono = texto('telefono', req.body?.telefono, 30);
    const direccion = texto('direccion', req.body?.direccion, 255);
    const estado = booleano('estado', req.body?.estado);

    if (razon_social !== undefined) { campos.razon_social = '?'; valores.push(razon_social); }
    if (nit !== undefined) { campos.nit = '?'; valores.push(nit); }
    if (email !== undefined) { campos.email = '?'; valores.push(email); }
    if (telefono !== undefined) { campos.telefono = '?'; valores.push(telefono); }
    if (direccion !== undefined) { campos.direccion = '?'; valores.push(direccion); }
    if (estado !== undefined) { campos.estado = '?'; valores.push(estado); }

    if (Object.keys(campos).length === 0) {
      throw new AppError(400, 'No se enviaron campos para actualizar');
    }
    const setSql = Object.keys(campos).map((k) => `${k} = ?`).join(', ');
    valores.push(id);
    await pool.query(`UPDATE proveedores SET ${setSql} WHERE id = ?`, valores);

    const [filas] = await pool.query(
      'SELECT id, razon_social, nit, email, telefono, direccion, estado, creado, actualizado FROM proveedores WHERE id = ?',
      [id]
    );
    res.json(filas[0]);
  } catch (e) {
    next(e);
  }
});

/** DELETE /api/proveedores/:id — borrado LÓGICO (estado = 0) */
router.delete('/:id', async (req, res, next) => {
  try {
    const id = parseId(req.params.id);
    const [existe] = await pool.query('SELECT id FROM proveedores WHERE id = ? AND estado = 1', [id]);
    if (existe.length === 0) throw new AppError(404, 'Proveedor no encontrado');
    await pool.query('UPDATE proveedores SET estado = 0 WHERE id = ?', [id]);
    res.json({ mensaje: 'Proveedor eliminado (borrado lógico)', id });
  } catch (e) {
    next(e);
  }
});

export default router;