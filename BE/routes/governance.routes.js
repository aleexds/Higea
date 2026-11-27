'use strict';

const express = require('express');
const router = express.Router();
const governanceController = require('../controllers/governance.controller');
const { authenticateJWT } = require('../middlewares/auth.middleware');
const { authorizeRoles } = require('../middlewares/role.middleware');
const { validateBody } = require('../middlewares/validate.middleware');

// Documentos legales públicos (Política de Privacidad Ley 8968 y Términos)
router.get('/legal-documents', governanceController.getLegalDocuments);

// Rutas autenticadas para todos los roles
router.get('/profile', authenticateJWT, governanceController.getProfile);
router.patch(
  '/profile',
  authenticateJWT,
  validateBody({
    full_name: { required: false, type: 'string', minLength: 3, maxLength: 150 },
    phone: { required: false, type: 'string', minLength: 8, maxLength: 30 },
    specialty: { required: false, type: 'string', maxLength: 120 },
    two_factor_enabled: { required: false, type: 'boolean' },
  }),
  governanceController.updateProfile
);

router.get('/consents', authenticateJWT, governanceController.getMyConsents);
router.post(
  '/consents',
  authenticateJWT,
  validateBody({
    consent_type: {
      required: true,
      type: 'string',
      enum: ['privacy_policy', 'terms_of_service', 'ai_telemetry', 'clinical_notifications'],
    },
    accepted: { required: true, type: 'boolean' },
  }),
  governanceController.recordConsent
);

router.post(
  '/account-deletion',
  authenticateJWT,
  validateBody({
    password: { required: true, type: 'string', minLength: 1 },
    reason: { required: false, type: 'string', maxLength: 1000 },
  }),
  governanceController.requestAccountDeletion
);

// Rutas de auditoría en solo lectura (Auditor / Admin)
router.get('/audit/agent-runs', authenticateJWT, authorizeRoles('auditor', 'admin'), governanceController.getAuditLogs);
router.get('/audit/external-apis', authenticateJWT, authorizeRoles('auditor', 'admin'), governanceController.getExternalApiLogs);
router.get('/audit/deletion-requests', authenticateJWT, authorizeRoles('auditor', 'admin'), governanceController.getDeletionRequests);

module.exports = router;
