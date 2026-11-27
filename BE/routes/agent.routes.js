'use strict';

const express = require('express');
const router = express.Router();
const agentController = require('../controllers/agent.controller');
const { authenticateJWT } = require('../middlewares/auth.middleware');
const { authorizeRoles } = require('../middlewares/role.middleware');
const { validateBody } = require('../middlewares/validate.middleware');

router.use(authenticateJWT);

// Agente 1: Pre-Análisis de Radiología e Imágenes (Médico)
router.post(
  '/radiology-pre-analysis',
  authorizeRoles('doctor', 'admin'),
  validateBody({
    study_id: { required: true, type: 'number' },
    clinical_notes: { required: false, type: 'string', maxLength: 2000 },
  }),
  agentController.radiologyPreAnalysis
);

// Agente 2: Guía e Interacción de Medicamentos (Médico / Paciente)
router.post(
  '/medication-interaction',
  authorizeRoles('doctor', 'patient', 'admin'),
  validateBody({
    patient_id: { required: false, type: 'number' },
    additional_substances: { required: false, type: 'array' },
  }),
  agentController.medicationInteraction
);

// Agente 3: Explicador de Exámenes y Laboratorio (Paciente / Médico)
router.post(
  '/lab-explainer',
  authorizeRoles('patient', 'doctor', 'admin'),
  validateBody({
    report_id: { required: true, type: 'number' },
  }),
  agentController.labExamExplainer
);

// Agente 4: Asistente Conversacional y de Voz (Paciente)
router.post(
  '/patient-assistant',
  authorizeRoles('patient'),
  validateBody({
    message: { required: true, type: 'string', minLength: 2, maxLength: 1500 },
    channel: { required: false, type: 'string', enum: ['text', 'voice'] },
  }),
  agentController.patientAssistant
);

// Agente 5: Consulta Documental y Protocolos RAG (Médico)
router.post(
  '/clinical-rag',
  authorizeRoles('doctor', 'admin'),
  validateBody({
    query: { required: true, type: 'string', minLength: 3, maxLength: 1500 },
    category: {
      required: false,
      type: 'string',
      enum: ['radiology', 'pharmacology', 'laboratory', 'triage', 'governance', 'general'],
    },
    patient_id: { required: false, type: 'number' },
  }),
  agentController.clinicalRag
);

// Agente 6: Triaje y Automatización de Tareas (Médico)
router.post(
  '/triage-automation',
  authorizeRoles('doctor', 'admin'),
  validateBody({
    patient_id: { required: false, type: 'number' },
    task_type: { required: false, type: 'string', maxLength: 80 },
  }),
  agentController.triageAutomation
);

// Agente 7: Analista de Métricas y Reportes (Admin / Médico)
router.post(
  '/metrics-analyst',
  authorizeRoles('admin', 'doctor'),
  validateBody({
    focus: { required: false, type: 'string', maxLength: 100 },
  }),
  agentController.metricsAnalyst
);

// Agente 8: Asistente de Cumplimiento y Gobernanza (Admin / Auditor)
router.post(
  '/compliance-governance',
  authorizeRoles('admin', 'auditor'),
  validateBody({
    scope: { required: false, type: 'string', maxLength: 100 },
  }),
  agentController.complianceGovernance
);

module.exports = router;
