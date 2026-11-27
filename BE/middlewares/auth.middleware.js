'use strict';

const jwt = require('jsonwebtoken');

// Lista de revocación en memoria (jti -> expMs) para invalidar tokens al cerrar sesión
const revokedTokens = new Map();

function revokeToken(jti, expSeconds) {
  if (!jti) return;
  const expiresAt = expSeconds ? expSeconds * 1000 : Date.now() + 8 * 60 * 60 * 1000;
  revokedTokens.set(jti, expiresAt);
}

function isTokenRevoked(jti) {
  if (!jti) return false;
  const expiresAt = revokedTokens.get(jti);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    revokedTokens.delete(jti);
    return false;
  }
  return true;
}

function clearRevokedTokens() {
  revokedTokens.clear();
}

function authenticateJWT(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Token de autenticación requerido (Authorization: Bearer <token>).',
    });
  }

  const token = authHeader.slice(7).trim();
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    return res.status(500).json({
      success: false,
      message: 'Configuración de seguridad JWT incompleta en el servidor.',
    });
  }

  try {
    const decoded = jwt.verify(token, secret);
    if (decoded.jti && isTokenRevoked(decoded.jti)) {
      return res.status(401).json({
        success: false,
        code: 'TOKEN_REVOKED',
        message: 'La sesión fue cerrada. Inicie sesión nuevamente.',
      });
    }

    req.user = {
      id: decoded.sub,
      email: decoded.email,
      roles: Array.isArray(decoded.roles) ? decoded.roles : [],
      tenant_id: decoded.tenant_id ?? null,
      jti: decoded.jti || null,
      exp: decoded.exp || null,
    };
    return next();
  } catch (err) {
    const isExpired = err.name === 'TokenExpiredError';
    return res.status(401).json({
      success: false,
      message: isExpired
        ? 'La sesión ha expirado. Inicie sesión nuevamente.'
        : 'Token de autenticación inválido.',
      code: isExpired ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID',
    });
  }
}

module.exports = {
  authenticateJWT,
  revokeToken,
  isTokenRevoked,
  clearRevokedTokens,
};
