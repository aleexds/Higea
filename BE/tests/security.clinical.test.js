'use strict';

const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

jest.mock('../models', () => ({
  ApiKey: { findOne: jest.fn() },
  DoctorPatient: { findOne: jest.fn() },
  User: { findByPk: jest.fn() },
  DataDeletionRequest: { create: jest.fn() },
  sequelize: { transaction: jest.fn((cb) => cb({})) },
}));

const db = require('../models');
const { authenticateJWT, revokeToken, clearRevokedTokens } = require('../middlewares/auth.middleware');
const { isStrongPassword } = require('../middlewares/validate.middleware');
const {
  sanitizeValue,
  createRateLimiter,
  authenticateApiKey,
} = require('../middlewares/security.middleware');
const { assertDoctorCanAccessPatient } = require('../controllers/clinical.controller');
const governanceService = require('../services/governance.service');

function createMockRes() {
  const res = {};
  res.headers = {};
  res.setHeader = jest.fn((k, v) => {
    res.headers[k] = v;
  });
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('Seguridad Avanzada, Ownership Clínico y Gobernanza Ley 8968', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test_secret_higea_2026';
  });

  afterEach(() => {
    jest.clearAllMocks();
    clearRevokedTokens();
  });

  test('sanitizeValue elimina claves peligrosas (__proto__, constructor) y caracteres de control', () => {
    const dirty = JSON.parse('{"name":"  Carlos\\u0000  ","__proto__":{"admin":true},"nested":{"constructor":"bad","ok":"123"}}');
    const clean = sanitizeValue(dirty);
    expect(clean.name).toBe('Carlos');
    expect(Object.prototype.hasOwnProperty.call(clean, '__proto__')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(clean.nested, 'constructor')).toBe(false);
    expect(clean.nested.ok).toBe('123');
  });

  test('isStrongPassword exige mayúscula, minúscula, número, símbolo y >= 8 caracteres', () => {
    expect(isStrongPassword('Higea2026!')).toBe(true);
    expect(isStrongPassword('weakpass')).toBe(false);
    expect(isStrongPassword('NoSymbol2026')).toBe(false);
    expect(isStrongPassword('Short1!')).toBe(false);
  });

  test('createRateLimiter devuelve HTTP 429 al superar el máximo permitido', () => {
    const limiter = createRateLimiter({ windowMs: 60000, max: 2 });
    const req = { ip: '10.0.0.1', headers: { 'x-enable-rate-limit-test': '1' } };
    const next = jest.fn();

    limiter(req, createMockRes(), next);
    limiter(req, createMockRes(), next);
    expect(next).toHaveBeenCalledTimes(2);

    const res3 = createMockRes();
    limiter(req, res3, next);
    expect(res3.status).toHaveBeenCalledWith(429);
    expect(res3.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'RATE_LIMIT_EXCEEDED' }));
  });

  test('authenticateJWT rechaza un token revocado tras logout (TOKEN_REVOKED)', () => {
    const jti = 'test-jti-12345';
    const token = jwt.sign(
      { sub: 2, email: 'elena.ramos@higea.cr', roles: ['doctor'], tenant_id: 1, jti },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    revokeToken(jti);

    const req = { headers: { authorization: `Bearer ${token}` } };
    const res = createMockRes();
    const next = jest.fn();

    authenticateJWT(req, res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'TOKEN_REVOKED' }));
    expect(next).not.toHaveBeenCalled();
  });

  test('authenticateApiKey rechaza sin header (401) y acepta llave activa de tenant activo', async () => {
    const resMissing = createMockRes();
    await authenticateApiKey({ headers: {} }, resMissing, jest.fn());
    expect(resMissing.status).toHaveBeenCalledWith(401);

    const mockUpdate = jest.fn().mockResolvedValue(true);
    db.ApiKey.findOne.mockResolvedValue({
      id: 1,
      tenant_id: 1,
      scopes: ['studies:write'],
      tenant: { id: 1, status: 'active' },
      update: mockUpdate,
    });

    const reqValid = { headers: { 'x-api-key': 'hg_live_demo_sanjuan_2026' } };
    const next = jest.fn();
    await authenticateApiKey(reqValid, createMockRes(), next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(reqValid.apiKey.tenant_id).toBe(1);
    expect(mockUpdate).toHaveBeenCalled();
  });

  test('assertDoctorCanAccessPatient bloquea con 403 si el paciente no está asignado al médico', async () => {
    db.DoctorPatient.findOne.mockResolvedValue(null);
    await expect(
      assertDoctorCanAccessPatient({ id: 2, roles: ['doctor'] }, 99)
    ).rejects.toMatchObject({ statusCode: 403, code: 'PATIENT_NOT_ASSIGNED' });

    // Admin siempre tiene acceso
    await expect(
      assertDoctorCanAccessPatient({ id: 1, roles: ['admin'] }, 99)
    ).resolves.toBeUndefined();
  });

  test('governanceService.requestAccountDeletion rechaza contraseña incorrecta y anonimiza con contraseña válida', async () => {
    const hash = await bcrypt.hash('Higea2026!', 10);
    const mockUpdate = jest.fn().mockResolvedValue(true);
    db.User.findByPk.mockResolvedValue({
      id: 3,
      status: 'active',
      password_hash: hash,
      update: mockUpdate,
    });

    await expect(
      governanceService.requestAccountDeletion({ userId: 3, password: 'WrongPassword!', reason: 'Prueba' })
    ).rejects.toMatchObject({ statusCode: 401, code: 'IDENTITY_CONFIRMATION_FAILED' });

    db.DataDeletionRequest.create.mockResolvedValue({ id: 1, status: 'completed' });
    const result = await governanceService.requestAccountDeletion({
      userId: 3,
      password: 'Higea2026!',
      reason: 'Derecho de supresión Ley 8968',
    });

    expect(result.notification.sent).toBe(true);
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'anonymized',
        cedula: null,
        phone: null,
      }),
      expect.any(Object)
    );
  });
});
