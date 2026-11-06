class HttpError extends Error {
  constructor(status, message, code = 'HTTP_ERROR') {
    super(message);
    this.name = 'HttpError';
    this.status = status;
    this.code = code;
  }
}

function mapDatabaseError(error) {
  if (error instanceof HttpError) return error;
  if (error && error.type === 'entity.parse.failed') {
    return new HttpError(400, 'JSON inválido.', 'INVALID_JSON');
  }

  const code = error && error.code;
  if (code === 'ER_DUP_ENTRY') {
    return new HttpError(409, 'Registro duplicado: incumple una restricción única.', 'DUPLICATE');
  }
  if (code === 'ER_NO_REFERENCED_ROW_2' || code === 'ER_ROW_IS_REFERENCED_2') {
    return new HttpError(400, 'La referencia indicada no existe o está siendo utilizada.', 'REFERENCE');
  }
  if (
    code === 'ECONNREFUSED' ||
    code === 'ETIMEDOUT' ||
    code === 'PROTOCOL_CONNECTION_LOST' ||
    code === 'ER_CON_COUNT_ERROR' ||
    code === 'ER_ACCESS_DENIED_ERROR' ||
    code === 'ENOTFOUND'
  ) {
    return new HttpError(503, 'Base de datos de compras no disponible.', 'DATABASE_UNAVAILABLE');
  }
  if (code === 'ER_BAD_NULL_ERROR' || code === 'ER_DATA_TOO_LONG' || code === 'ER_TRUNCATED_WRONG_VALUE') {
    return new HttpError(400, 'Los datos enviados no cumplen el formato requerido.', 'INVALID_DATA');
  }
  return new HttpError(500, 'Error interno del servidor.', 'INTERNAL_ERROR');
}

function asyncHandler(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function errorHandler(error, req, res, next) { // eslint-disable-line no-unused-vars
  const mapped = mapDatabaseError(error);
  if (mapped.status >= 500) {
    console.error(JSON.stringify({
      event: 'request_error',
      requestId: req.requestId,
      status: mapped.status,
      code: mapped.code,
      path: req.path,
    }));
  }
  res.status(mapped.status).json({
    detail: mapped.message,
    request_id: req.requestId,
  });
}

module.exports = { HttpError, mapDatabaseError, asyncHandler, errorHandler };
