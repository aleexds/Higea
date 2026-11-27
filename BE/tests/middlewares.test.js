'use strict';

const jwt = require('jsonwebtoken');
const { authenticateJWT } = require('../middlewares/auth.middleware');
const { authorizeRoles } = require('../middlewares/role.middleware');
const {
  validateBody,
  validateIdParam,
  isValidEmail,
  isValidCedulaCR,
  isValidDate,
} = require('../middlewares/validate.middleware');

function createMockRes() {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('Middlewares de Seguridad y Validación', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test_secret_higea_2026';
  });

  describe('authenticateJWT', () => {
    test('rechaza petición sin header Authorization con HTTP 401', () => {
      const req = { headers: {} };
      const res = createMockRes();
      const next = jest.fn();

      authenticateJWT(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    test('rechaza token inválido con HTTP 401', () => {
      const req = { headers: { authorization: 'Bearer invalid.token.here' } };
      const res = createMockRes();
      const next = jest.fn();

      authenticateJWT(req, res, next);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });

    test('acepta token JWT válido y adjunta req.user', () => {
      const token = jwt.sign(
        { sub: 2, email: 'elena.ramos@higea.cr', roles: ['doctor'], tenant_id: 1 },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
      const req = { headers: { authorization: `Bearer ${token}` } };
      const res = createMockRes();
      const next = jest.fn();

      authenticateJWT(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(req.user).toEqual(
        expect.objectContaining({
          id: 2,
          email: 'elena.ramos@higea.cr',
          roles: ['doctor'],
          tenant_id: 1,
        })
      );
    });
  });

  describe('authorizeRoles', () => {
    test('bloquea con HTTP 403 cuando el rol no está permitido', () => {
      const req = { user: { id: 3, roles: ['patient'] } };
      const res = createMockRes();
      const next = jest.fn();

      authorizeRoles('admin', 'doctor')(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    test('permite continuar cuando el usuario tiene el rol requerido', () => {
      const req = { user: { id: 4, roles: ['auditor'] } };
      const res = createMockRes();
      const next = jest.fn();

      authorizeRoles('auditor', 'admin')(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('validateBody y helpers de formato CR', () => {
    test('valida correo, cédula CR y fecha ISO correctamente', () => {
      expect(isValidEmail('carlos@higea.cr')).toBe(true);
      expect(isValidEmail('no-es-correo')).toBe(false);
      expect(isValidCedulaCR('1-1425-0892')).toBe(true);
      expect(isValidCedulaCR('3-101-745210')).toBe(true);
      expect(isValidCedulaCR('abc-123')).toBe(false);
      expect(isValidDate('2026-11-27')).toBe(true);
      expect(isValidDate('27/11/2026')).toBe(false);
    });

    test('responde HTTP 400 cuando faltan campos obligatorios o el formato es inválido', () => {
      const middleware = validateBody({
        email: { required: true, type: 'string', email: true },
        password: { required: true, type: 'string', minLength: 8 },
        cedula: { required: false, type: 'string', cedula: true },
      });

      const req = { body: { email: 'invalido', password: '123', cedula: 'xyz' } };
      const res = createMockRes();
      const next = jest.fn();

      middleware(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          errors: expect.arrayContaining([
            expect.objectContaining({ field: 'email' }),
            expect.objectContaining({ field: 'password' }),
            expect.objectContaining({ field: 'cedula' }),
          ]),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    test('validateIdParam rechaza IDs no enteros con HTTP 400', () => {
      const req = { params: { id: 'abc' } };
      const res = createMockRes();
      const next = jest.fn();

      validateIdParam('id')(req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(next).not.toHaveBeenCalled();
    });
  });
});
