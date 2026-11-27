'use strict';

const express = require('express');
const router = express.Router();
const clinicalController = require('../controllers/clinical.controller');
const { authenticateJWT } = require('../middlewares/auth.middleware');
const { authorizeRoles } = require('../middlewares/role.middleware');
const { validateBody, validateIdParam } = require('../middlewares/validate.middleware');

router.use(authenticateJWT, authorizeRoles('doctor', 'admin'));

router.get('/patients', clinicalController.getMyPatients);
router.get('/patients/:id', validateIdParam('id'), clinicalController.getPatientDetail);

router.post(
  '/orders',
  validateBody({
    patient_id: { required: true, type: 'number' },
    order_type: { required: true, type: 'string', enum: ['radiology', 'laboratory', 'pharmacy', 'consultation'] },
    title: { required: true, type: 'string', minLength: 3, maxLength: 180 },
    priority: { required: false, type: 'string', enum: ['low', 'normal', 'high', 'urgent'] },
  }),
  clinicalController.createClinicalOrder
);

router.post(
  '/studies',
  validateBody({
    patient_id: { required: true, type: 'number' },
    modality: { required: true, type: 'string', enum: ['xray', 'ct', 'mri', 'ultrasound', 'lab_panel', 'other'] },
    title: { required: true, type: 'string', minLength: 3, maxLength: 180 },
  }),
  clinicalController.createDiagnosticStudy
);

router.patch(
  '/reports/:id/validate',
  validateIdParam('id'),
  validateBody({
    status: { required: true, type: 'string', enum: ['approved', 'rejected', 'pending_validation'] },
    findings: { required: false, type: 'string' },
    conclusion: { required: false, type: 'string' },
    priority: { required: false, type: 'string', enum: ['low', 'normal', 'high', 'urgent'] },
  }),
  clinicalController.validateReport
);

router.post(
  '/medications',
  validateBody({
    patient_id: { required: true, type: 'number' },
    name: { required: true, type: 'string', minLength: 2, maxLength: 150 },
    dosage: { required: true, type: 'string', minLength: 1, maxLength: 80 },
    start_date: { required: true, type: 'string', date: true },
    end_date: { required: false, type: 'string', date: true },
    schedules: { required: false, type: 'array' },
  }),
  clinicalController.prescribeMedication
);

router.get('/appointments', clinicalController.getDoctorAppointments);
router.post(
  '/appointments',
  validateBody({
    patient_id: { required: true, type: 'number' },
    scheduled_at: { required: true, type: 'string', date: true },
    modality: { required: false, type: 'string', enum: ['in_person', 'telehealth'] },
    reason: { required: true, type: 'string', minLength: 3, maxLength: 255 },
  }),
  clinicalController.createAppointment
);
router.patch(
  '/appointments/:id/status',
  validateIdParam('id'),
  validateBody({
    status: { required: true, type: 'string', enum: ['scheduled', 'confirmed', 'completed', 'cancelled', 'no_show'] },
  }),
  clinicalController.updateAppointmentStatus
);

router.get('/documents', clinicalController.listClinicalDocuments);
router.post(
  '/documents',
  validateBody({
    title: { required: true, type: 'string', minLength: 3, maxLength: 200 },
    category: {
      required: false,
      type: 'string',
      enum: ['radiology', 'pharmacology', 'laboratory', 'triage', 'governance', 'general'],
    },
    content: { required: true, type: 'string', minLength: 20 },
  }),
  clinicalController.createClinicalDocument
);

module.exports = router;
