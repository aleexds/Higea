'use strict';

const jwt = require('jsonwebtoken');

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
    req.user = {
      id: decoded.sub,
      email: decoded.email,
      roles: Array.isArray(decoded.roles) ? decoded.roles : [],
      tenant_id: decoded.tenant_id ?? null,
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

module.exports = { authenticateJWT };
