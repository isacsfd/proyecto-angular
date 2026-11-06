const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { config } = require('./config');
const { HttpError } = require('./errors');

const ROLES_PERMITIDOS = new Set(['super_administrador', 'Administrador']);

function requestId(req, res, next) {
  const incoming = req.get('x-request-id');
  const id = incoming && /^[A-Za-z0-9._-]{1,80}$/.test(incoming)
    ? incoming
    : crypto.randomUUID();
  req.requestId = id;
  res.setHeader('X-Request-ID', id);
  next();
}

function authRequired(req, res, next) {
  if (!config.jwtSecret) {
    return next(new HttpError(503, 'Autenticación de Express no configurada.', 'AUTH_NOT_CONFIGURED'));
  }
  const header = req.get('authorization') || '';
  const match = header.match(/^Bearer\s+([^\s]+)$/i);
  if (!match) {
    return next(new HttpError(401, 'No autenticado. Incluya un token Bearer.', 'UNAUTHENTICATED'));
  }
  try {
    const options = { algorithms: ['HS256'] };
    if (config.jwtIssuer) options.issuer = config.jwtIssuer;
    if (config.jwtAudience) options.audience = config.jwtAudience;
    const payload = jwt.verify(match[1], config.jwtSecret, options);
    if (!payload || typeof payload !== 'object' || !Number.isInteger(payload.id) || payload.id <= 0) {
      throw new Error('invalid identity');
    }
    if (typeof payload.rol !== 'string' || !payload.rol.trim()) {
      throw new Error('invalid role');
    }
    req.bearerToken = match[1];
    req.auth = payload;
    return next();
  } catch (error) {
    return next(new HttpError(401, 'Token inválido o expirado. Inicie sesión nuevamente.', 'INVALID_TOKEN'));
  }
}

async function verifyCurrentUserWithFastApi({ token, payload }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.fastApiIntrospectionTimeoutMs);
  try {
    const response = await fetch(config.fastApiIntrospectionUrl, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
      signal: controller.signal,
    });
    if (response.status === 401 || response.status === 403) {
      throw new HttpError(401, 'Sesión no válida. Inicie sesión nuevamente.', 'IDENTITY_REJECTED');
    }
    if (!response.ok) {
      throw new HttpError(503, 'Servicio de identidad no disponible.', 'IDENTITY_UNAVAILABLE');
    }
    const current = await response.json();
    if (
      current?.active !== true ||
      !Number.isInteger(current.id) ||
      current.id !== payload.id ||
      typeof current.rol !== 'string' ||
      !current.rol.trim()
    ) {
      throw new HttpError(401, 'Sesión no válida. Inicie sesión nuevamente.', 'IDENTITY_REJECTED');
    }
    return current;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(503, 'Servicio de identidad no disponible.', 'IDENTITY_UNAVAILABLE');
  } finally {
    clearTimeout(timeout);
  }
}

async function requirePurchasesRole(req, res, next) {
  if (!req.auth || !req.bearerToken) {
    return next(new HttpError(401, 'No autenticado. Incluya un token Bearer.', 'UNAUTHENTICATED'));
  }
  try {
    // FastAPI es la autoridad de identidad: el rol del JWT se revalida contra
    // la BD mediante /api/auth/introspect antes de permitir una operación.
    const current = await (req.app.locals.roleVerifier || verifyCurrentUserWithFastApi)({
      token: req.bearerToken,
      payload: req.auth,
    });
    req.auth = { ...req.auth, ...current };
    if (!ROLES_PERMITIDOS.has(current.rol)) {
      return next(new HttpError(403, 'Permisos insuficientes para gestionar proveedores y compras.', 'FORBIDDEN'));
    }
    return next();
  } catch (error) {
    return next(error);
  }
}

function configureCors() {
  return cors({
    origin(origin, callback) {
      if (!origin || config.corsOrigins.includes(origin)) return callback(null, true);
      return callback(new HttpError(403, 'Origen no permitido por CORS.', 'CORS_ORIGIN'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'Cache-Control', 'Pragma'],
  });
}

function configureRateLimit() {
  return rateLimit({
    windowMs: config.rateLimitWindowMs,
    limit: config.rateLimitMax,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { detail: 'Demasiadas solicitudes. Espere un momento e intente nuevamente.' },
  });
}

module.exports = {
  configureCors,
  configureRateLimit,
  requestId,
  authRequired,
  requirePurchasesRole,
  verifyCurrentUserWithFastApi,
};
