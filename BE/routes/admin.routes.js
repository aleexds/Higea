'use strict';

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticateJWT } = require('../middlewares/auth.middleware');
const { authorizeRoles } = require('../middlewares/role.middleware');
const { validateBody, validateIdParam } = require('../middlewares/validate.middleware');

router.use(authenticateJWT, authorizeRoles('admin'));

router.get('/dashboard', adminController.getDashboardMetrics);

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

router.get('/bccr/exchange-rate', adminController.getBccrExchangeRate);
router.get('/bccr/history', adminController.getBccrHistory);

module.exports = router;
