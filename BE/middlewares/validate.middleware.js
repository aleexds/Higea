'use strict';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// Cédula física CR (1-1234-5678 o 9 dígitos) o DIMEX (11-12 dígitos) o jurídica (3-101-123456)
const CEDULA_CR_REGEX = /^(\d-\d{4}-\d{4}|\d{9}|\d{11,12}|3-\d{3}-\d{6})$/;
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?)?$/;
// Al menos 8 caracteres, 1 mayúscula, 1 minúscula, 1 número y 1 símbolo
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,100}$/;

function isStrongPassword(value) {
  return typeof value === 'string' && STRONG_PASSWORD_REGEX.test(value);
}

function isValidEmail(value) {
  return typeof value === 'string' && EMAIL_REGEX.test(value.trim());
}

function isValidCedulaCR(value) {
  return typeof value === 'string' && CEDULA_CR_REGEX.test(value.trim());
}

function isValidDate(value) {
  if (typeof value !== 'string' || !ISO_DATE_REGEX.test(value.trim())) return false;
  const parsed = Date.parse(value);
  return !Number.isNaN(parsed);
}

/**
 * Middleware factory for strict input validation (RNF-04 / Sección 6.1).
 * schema: { fieldName: { required, type, minLength, maxLength, enum, email, cedula, date, custom } }
 */
function validateBody(schema) {
  return (req, res, next) => {
    const body = req.body || {};
    const errors = [];

    for (const [field, rules] of Object.entries(schema)) {
      const value = body[field];
      const isMissing = value === undefined || value === null || value === '';

      if (rules.required && isMissing) {
        errors.push({ field, message: `El campo '${field}' es obligatorio.` });
        continue;
      }

      if (isMissing) continue;

      if (rules.type === 'string' && typeof value !== 'string') {
        errors.push({ field, message: `El campo '${field}' debe ser una cadena de texto.` });
        continue;
      }
      if (rules.type === 'number' && (typeof value !== 'number' || Number.isNaN(value))) {
        errors.push({ field, message: `El campo '${field}' debe ser numérico.` });
        continue;
      }
      if (rules.type === 'boolean' && typeof value !== 'boolean') {
        errors.push({ field, message: `El campo '${field}' debe ser booleano (true/false).` });
        continue;
      }
      if (rules.type === 'array' && !Array.isArray(value)) {
        errors.push({ field, message: `El campo '${field}' debe ser una lista.` });
        continue;
      }

      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (rules.minLength && trimmed.length < rules.minLength) {
          errors.push({
            field,
            message: `El campo '${field}' debe tener al menos ${rules.minLength} caracteres.`,
          });
        }
        if (rules.maxLength && trimmed.length > rules.maxLength) {
          errors.push({
            field,
            message: `El campo '${field}' no debe exceder ${rules.maxLength} caracteres.`,
          });
        }
        if (rules.email && !isValidEmail(trimmed)) {
          errors.push({ field, message: `El campo '${field}' debe ser un correo electrónico válido.` });
        }
        if (rules.cedula && !isValidCedulaCR(trimmed)) {
          errors.push({
            field,
            message: `El campo '${field}' debe tener un formato válido de cédula de Costa Rica (ej. 1-1425-0892).`,
          });
        }
        if (rules.date && !isValidDate(trimmed)) {
          errors.push({
            field,
            message: `El campo '${field}' debe ser una fecha válida en formato ISO (YYYY-MM-DD).`,
          });
        }
        if (rules.strongPassword && !isStrongPassword(value)) {
          errors.push({
            field,
            message: `El campo '${field}' debe tener mínimo 8 caracteres, incluir mayúscula, minúscula, número y símbolo.`,
          });
        }
      }

      if (rules.enum && !rules.enum.includes(value)) {
        errors.push({
          field,
          message: `El campo '${field}' debe ser uno de: ${rules.enum.join(', ')}.`,
        });
      }

      if (typeof rules.custom === 'function') {
        const customError = rules.custom(value, body);
        if (customError) {
          errors.push({ field, message: customError });
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Error de validación en los datos enviados.',
        errors,
      });
    }

    return next();
  };
}

function validateIdParam(paramName = 'id') {
  return (req, res, next) => {
    const raw = req.params[paramName];
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      return res.status(400).json({
        success: false,
        message: `El parámetro '${paramName}' debe ser un entero positivo válido.`,
      });
    }
    return next();
  };
}

module.exports = {
  validateBody,
  validateIdParam,
  isValidEmail,
  isValidCedulaCR,
  isValidDate,
  isStrongPassword,
};
