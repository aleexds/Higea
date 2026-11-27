'use strict';

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticateJWT } = require('../middlewares/auth.middleware');
const { authorizeRoles } = require('../middlewares/role.middleware');
const { validateBody, validateIdParam } = require('../middlewares/validate.middleware');

router.use(authenticateJWT, authorizeRoles('admin'));

router.get('/dashboard', adminController.getDashboardMetrics);

// Gestión de Roles y Usuarios
router.get('/roles', adminController.listRoles);
router.get('/users', adminController.listUsers);
router.post(
  '/users',
  validateBody({
    full_name: { required: true, type: 'string', minLength: 3, maxLength: 150 },
    email: { required: true, type: 'string', email: true, maxLength: 150 },
    password: { required: true, type: 'string', strongPassword: true },
    cedula: { required: false, type: 'string', cedula: true },
    phone: { required: false, type: 'string', minLength: 8, maxLength: 30 },
    tenant_id: { required: false, type: 'number' },
    roles: {
      required: true,
      type: 'array',
      custom: (arr) => {
        const valid = ['admin', 'doctor', 'patient', 'auditor'];
        if (arr.length === 0) return 'Debe asignar al menos un rol.';
        if (arr.some((r) => !valid.includes(r))) return `Roles permitidos: ${valid.join(', ')}.`;
        return null;
      },
    },
  }),
  adminController.createUser
);
router.patch(
  '/users/:id/roles',
  validateIdParam('id'),
  validateBody({
    roles: {
      required: true,
      type: 'array',
      custom: (arr) => {
        const valid = ['admin', 'doctor', 'patient', 'auditor'];
        if (arr.length === 0) return 'Debe asignar al menos un rol.';
        if (arr.some((r) => !valid.includes(r))) return `Roles permitidos: ${valid.join(', ')}.`;
        return null;
      },
    },
  }),
  adminController.updateUserRoles
);
router.patch(
  '/users/:id/status',
  validateIdParam('id'),
  validateBody({
    status: { required: true, type: 'string', enum: ['active', 'inactive'] },
  }),
  adminController.updateUserStatus
);
router.post(
  '/doctor-patients',
  validateBody({
    doctor_id: { required: true, type: 'number' },
    patient_id: { required: true, type: 'number' },
    is_primary: { required: false, type: 'boolean' },
  }),
  adminController.assignDoctorToPatient
);

// Gestión de Clínicas (Tenants)
router.get('/tenants', adminController.listTenants);
router.post(
  '/tenants',
  validateBody({
    name: { required: true, type: 'string', minLength: 3, maxLength: 150 },
    slug: { required: false, type: 'string', minLength: 3, maxLength: 100 },
    legal_id: { required: false, type: 'string', cedula: true },
    plan: { required: false, type: 'string', enum: ['starter', 'clinical', 'enterprise'] },
    contact_email: { required: false, type: 'string', email: true },
  }),
  adminController.createTenant
);
router.patch(
  '/tenants/:id/status',
  validateIdParam('id'),
  validateBody({
    status: { required: true, type: 'string', enum: ['active', 'suspended', 'inactive'] },
  }),
  adminController.updateTenantStatus
);

// Gestión de API Keys
router.get('/api-keys', adminController.listApiKeys);
router.post(
  '/api-keys',
  validateBody({
    tenant_id: { required: true, type: 'number' },
    name: { required: true, type: 'string', minLength: 3, maxLength: 120 },
    scopes: { required: false, type: 'array' },
  }),
  adminController.createApiKey
);
router.patch('/api-keys/:id/revoke', validateIdParam('id'), adminController.revokeApiKey);

// Indicadores BCCR
router.get('/bccr/exchange-rate', adminController.getBccrExchangeRate);
router.get('/bccr/history', adminController.getBccrHistory);

module.exports = router;
