'use strict';

class AppError extends Error {
  constructor(message, statusCode = 500, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

function notFoundHandler(req, res) {
  return res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
  });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(409).json({
      success: false,
      message: 'Ya existe un registro con ese valor único.',
      details: err.errors ? err.errors.map((e) => e.message) : undefined,
    });
  }

  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Error de validación de base de datos.',
      details: err.errors ? err.errors.map((e) => e.message) : undefined,
    });
  }

  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({
      success: false,
      message: 'Referencia inválida: el registro relacionado no existe.',
    });
  }

  const statusCode = err.statusCode || 500;
  const isProd = process.env.NODE_ENV === 'production';

  return res.status(statusCode).json({
    success: false,
    message: err.message || 'Error interno del servidor.',
    code: err.code || 'INTERNAL_ERROR',
    ...(isProd ? {} : { stack: err.stack }),
  });
}

module.exports = { AppError, notFoundHandler, errorHandler };
