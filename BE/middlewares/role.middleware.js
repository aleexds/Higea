'use strict';

function authorizeRoles(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !Array.isArray(req.user.roles)) {
      return res.status(401).json({
        success: false,
        message: 'Usuario no autenticado.',
      });
    }

    const hasRole = req.user.roles.some((role) => allowedRoles.includes(role));
    if (!hasRole) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado: su rol no cuenta con permisos para este recurso.',
        requiredRoles: allowedRoles,
      });
    }

    return next();
  };
}

module.exports = { authorizeRoles };
