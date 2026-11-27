'use strict';

const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patient.controller');
const { authenticateJWT } = require('../middlewares/auth.middleware');
const { authorizeRoles } = require('../middlewares/role.middleware');
const { validateBody } = require('../middlewares/validate.middleware');

router.use(authenticateJWT, authorizeRoles('patient'));

router.get('/overview', patientController.getPatientOverview);
router.get('/reports', patientController.getApprovedReports);
router.get('/medications', patientController.getMyMedications);
router.get('/appointments', patientController.getMyAppointments);

router.post(
  '/appointments',
  validateBody({
    doctor_id: { required: true, type: 'number' },
    scheduled_at: { required: true, type: 'string', date: true },
    modality: { required: false, type: 'string', enum: ['in_person', 'telehealth'] },
    reason: { required: true, type: 'string', minLength: 3, maxLength: 255 },
  }),
  patientController.requestAppointment
);

module.exports = router;
