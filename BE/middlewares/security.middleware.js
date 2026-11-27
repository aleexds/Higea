'use strict';

const crypto = require('crypto');
const db = require('../models');

const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Limpia recursivamente objetos entrantes contra prototype pollution y caracteres de control.
 */
function sanitizeValue(value) {
  if (typeof value === 'string') {
    // Elimina caracteres de control ASCII excepto tab/newline
    return value.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value && typeof value === 'object') {
    const clean = {};
    for (const [key, val] of Object.entries(value)) {
      if (DANGEROUS_KEYS.has(key)) continue;
      clean[key] = sanitizeValue(val);
    }
    return clean;
  }
  return value;
}

function sanitizeRequest(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    for (const key of Object.keys(req.query)) {
      if (DANGEROUS_KEYS.has(key)) {
        delete req.query[key];
      } else if (typeof req.query[key] === 'string') {
        req.query[key] = sanitizeValue(req.query[key]);
      }
    }
  }
  return next();
}

/**
 * Rate limiter en memoria con ventana fija por IP y ruta (protección fuerza bruta / DoS).
 */
function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 100, message } = {}) {
  const hits = new Map();

  const middleware = (req, res, next) => {
    if (process.env.NODE_ENV === 'test' && !req.headers['x-enable-rate-limit-test']) {
      return next();
    }

    const now = Date.now();
    const key = req.ip || req.connection?.remoteAddress || 'unknown';
    const entry = hits.get(key);

    if (!entry || now > entry.resetAt) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      res.setHeader('X-RateLimit-Limit', String(max));
      res.setHeader('X-RateLimit-Remaining', String(Math.max(max - 1, 0)));
      return next();
    }

    entry.count += 1;
    const remaining = Math.max(max - entry.count, 0);
    res.setHeader('X-RateLimit-Limit', String(max));
    res.setHeader('X-RateLimit-Remaining', String(remaining));

    if (entry.count > max) {
      const retryAfterSec = Math.ceil((entry.resetAt - now) / 1000);
      res.setHeader('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        success: false,
        code: 'RATE_LIMIT_EXCEEDED',
        message: message || 'Demasiadas solicitudes. Intente nuevamente más tarde.',
      });
    }

    return next();
  };

  middleware._resetStore = () => hits.clear();
  return middleware;
}

/**
 * Autenticación B2B mediante X-API-Key contra api_keys (SHA-256) y verificación de tenant activo.
 */
async function authenticateApiKey(req, res, next) {
  try {
    const rawKey = req.headers['x-api-key'];
    if (!rawKey || typeof rawKey !== 'string') {
      return res.status(401).json({
        success: false,
        code: 'API_KEY_REQUIRED',
        message: 'Se requiere el encabezado X-API-Key para integraciones B2B.',
      });
    }

    const keyHash = crypto.createHash('sha256').update(rawKey.trim()).digest('hex');
    const apiKey = await db.ApiKey.findOne({
      where: { key_hash: keyHash, status: 'active' },
      include: [{ model: db.Tenant, as: 'tenant', attributes: ['id', 'name', 'slug', 'status'] }],
    });

    if (!apiKey || !apiKey.tenant || apiKey.tenant.status !== 'active') {
      return res.status(403).json({
        success: false,
        code: 'API_KEY_INVALID',
        message: 'API Key inválida, revocada o clínica inactiva.',
      });
    }

    await apiKey.update({ last_used_at: new Date() });
    req.apiKey = {
      id: apiKey.id,
      tenant_id: apiKey.tenant_id,
      scopes: apiKey.scopes || [],
    };
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  sanitizeRequest,
  sanitizeValue,
  createRateLimiter,
  authenticateApiKey,
};
