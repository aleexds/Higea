'use strict';

process.env.JWT_SECRET = 'test_secret_higea_2026';

const request = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../services/auth.service', () => ({
  register: jest.fn(),
  login: jest.fn(),
  requestPasswordReset: jest.fn(),
  resetPassword: jest.fn(),
}));

const authService = require('../services/auth.service');
const app = require('../app');

describe('Rutas y Controlador de Autenticación + Control de Acceso', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('GET /api/health responde 200 OK', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.service).toBe('Higea Clinical SaaS API');
  });

  test('POST /api/auth/register rechaza si faltan campos o consentimientos', async () => {
    const res = await request(app).post('/api/auth/register').send({
      full_name: 'Ana',
      email: 'correo-invalido',
      password: '123',
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(authService.register).not.toHaveBeenCalled();
  });

  test('POST /api/auth/register crea cuenta cuando los datos son válidos', async () => {
    authService.register.mockResolvedValue({
      token: 'fake-jwt-token',
      user: { id: 10, full_name: 'Ana Pérez', email: 'ana@higea.cr', roles: ['patient'] },
    });

    const res = await request(app).post('/api/auth/register').send({
      full_name: 'Ana Pérez',
      email: 'ana@higea.cr',
      password: 'Password2026!',
      cedula: '1-1425-0892',
      accept_privacy: true,
      accept_terms: true,
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBe('fake-jwt-token');
  });

  test('GET /api/admin/tenants bloquea con 403 a un paciente autenticado', async () => {
    const patientToken = jwt.sign(
      { sub: 3, email: 'carlos.morales@higea.cr', roles: ['patient'], tenant_id: 1 },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const res = await request(app)
      .get('/api/admin/tenants')
      .set('Authorization', `Bearer ${patientToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/governance/audit/agent-runs bloquea con 403 a un médico', async () => {
    const doctorToken = jwt.sign(
      { sub: 2, email: 'elena.ramos@higea.cr', roles: ['doctor'], tenant_id: 1 },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const res = await request(app)
      .get('/api/governance/audit/agent-runs')
      .set('Authorization', `Bearer ${doctorToken}`);

    expect(res.status).toBe(403);
  });
});
