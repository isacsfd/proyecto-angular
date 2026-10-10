/** Errores y manejo centralizado de errores HTTP. */

export class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function notFound(req, res) {
  res.status(404).json({ error: 'Ruta no encontrada' });
}

export function errorHandler(err, req, res, _next) {
  if (err && err instanceof AppError) {
    return res.status(err.status).json({ error: err.message });
  }
  if (err && err.message === 'Origen no permitido por CORS') {
    return res.status(403).json({ error: 'Origen no permitido por CORS' });
  }
  // Errores de restricciones de MySQL
  if (err && err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'Registro duplicado: incumple una restricción única.' });
  }
  if (err && (err.code === 'ER_NO_REFERENCED_ROW' || err.code === 'ER_NO_REFERENCED_ROW_2')) {
    return res.status(400).json({ error: 'La referencia indicada no existe.' });
  }
  console.error('[api-express] error:', err);
  return res.status(500).json({ error: 'Error interno del servidor.' });
}

export function parseId(valor) {
  const n = Number(valor);
  if (!Number.isInteger(n) || n < 1) throw new AppError(400, 'Identificador inválido');
  return n;
}

export function texto(campo, valor, max, obligatorio = false) {
  if (valor === undefined || valor === null) {
    if (obligatorio) throw new AppError(400, `El campo ${campo} es obligatorio.`);
    return undefined;
  }
  const t = String(valor).trim();
  if (obligatorio && t === '') throw new AppError(400, `El campo ${campo} es obligatorio.`);
  if (t.length > max) throw new AppError(400, `El campo ${campo} supera ${max} caracteres.`);
  return t;
}

export function booleano(campo, valor) {
  if (valor === undefined || valor === null) return undefined;
  const n = Number(valor);
  if (n !== 0 && n !== 1) throw new AppError(400, `El campo ${campo} debe ser 0 o 1.`);
  return n;
}

export function emailValido(campo, valor) {
  if (valor === undefined || valor === null || valor === '') return undefined;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor)) {
    throw new AppError(400, `El campo ${campo} debe ser un email válido.`);
  }
  return valor;
}

export function numeroNoNegativo(campo, valor, maxDigitos = 10) {
  if (valor === undefined || valor === null) return undefined;
  const n = Number(valor);
  if (!Number.isFinite(n) || n < 0 || n > Number('9'.repeat(maxDigitos))) {
    throw new AppError(400, `El campo ${campo} debe ser un número no negativo.`);
  }
  return n;
}