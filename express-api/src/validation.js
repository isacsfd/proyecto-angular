const { HttpError } = require('./errors');

function bodyObject(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new HttpError(400, 'El cuerpo debe ser un objeto JSON.', 'INVALID_BODY');
  }
  return body;
}

function text(name, value, max, required = false) {
  if (value === undefined || value === null) {
    if (required) throw new HttpError(400, `El campo ${name} es obligatorio.`, 'VALIDATION');
    return null;
  }
  const valueText = String(value).trim();
  if (required && !valueText) throw new HttpError(400, `El campo ${name} es obligatorio.`, 'VALIDATION');
  if (valueText.length > max) throw new HttpError(400, `El campo ${name} supera ${max} caracteres.`, 'VALIDATION');
  return valueText || null;
}

function id(name, value) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 1) {
    throw new HttpError(400, `${name} inválido.`, 'VALIDATION');
  }
  return number;
}

function nonNegativeNumber(name, value, max = 999999999999) {
  if (value === undefined || value === null || String(value).trim() === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0 || number > max) {
    throw new HttpError(400, `El campo ${name} debe ser un número no negativo.`, 'VALIDATION');
  }
  return number;
}

function booleanFlag(name, value) {
  if (value === undefined || value === null) return null;
  if (value === true || value === false) return value ? 1 : 0;
  if (String(value) === '1' || String(value).toLowerCase() === 'true') return 1;
  if (String(value) === '0' || String(value).toLowerCase() === 'false') return 0;
  throw new HttpError(400, `El campo ${name} debe ser 0 o 1.`, 'VALIDATION');
}

function email(name, value) {
  const normalized = text(name, value, 120, false);
  if (normalized && !/^\S+@\S+\.\S+$/.test(normalized)) {
    throw new HttpError(400, `El campo ${name} debe ser un email válido.`, 'VALIDATION');
  }
  return normalized;
}

function dateTime(name, value, required = false) {
  if (value === undefined || value === null || String(value).trim() === '') {
    if (required) throw new HttpError(400, `El campo ${name} es obligatorio.`, 'VALIDATION');
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new HttpError(400, `El campo ${name} contiene una fecha inválida.`, 'VALIDATION');
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function assertOnlyKnownFields(body, allowed) {
  for (const key of Object.keys(body)) {
    if (!allowed.has(key)) throw new HttpError(400, `Campo no permitido: ${key}.`, 'VALIDATION');
  }
}

module.exports = {
  bodyObject,
  text,
  id,
  nonNegativeNumber,
  booleanFlag,
  email,
  dateTime,
  assertOnlyKnownFields,
};
