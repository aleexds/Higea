'use strict';

const agents = require('../services/agents');

async function radiologyPreAnalysis(req, res, next) {
  try {
    const result = await agents.runRadiologyPreAnalysis({
      user: req.user,
      studyId: req.body.study_id,
      clinicalNotes: req.body.clinical_notes,
    });
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    return next(err);
  }
}

async function medicationInteraction(req, res, next) {
  try {
    const result = await agents.runMedicationInteraction({
      user: req.user,
      patientId: req.body.patient_id,
      additionalSubstances: req.body.additional_substances || [],
    });
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    return next(err);
  }
}

async function labExamExplainer(req, res, next) {
  try {
    const result = await agents.runLabExamExplainer({
      user: req.user,
      reportId: req.body.report_id,
    });
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    return next(err);
  }
}

async function patientAssistant(req, res, next) {
  try {
    const result = await agents.runPatientAssistant({
      user: req.user,
      message: req.body.message,
      channel: req.body.channel || 'text',
    });
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    return next(err);
  }
}

async function clinicalRag(req, res, next) {
  try {
    const result = await agents.runClinicalRag({
      user: req.user,
      query: req.body.query,
      category: req.body.category || null,
      patientId: req.body.patient_id || null,
    });
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    return next(err);
  }
}

async function triageAutomation(req, res, next) {
  try {
    const result = await agents.runTriageAutomation({
      user: req.user,
      patientId: req.body.patient_id || null,
      taskType: req.body.task_type || 'triage_orders',
    });
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    return next(err);
  }
}

async function metricsAnalyst(req, res, next) {
  try {
    const result = await agents.runMetricsAnalyst({
      user: req.user,
      focus: req.body.focus || 'executive_summary',
    });
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    return next(err);
  }
}

async function complianceGovernance(req, res, next) {
  try {
    const result = await agents.runComplianceGovernance({
      user: req.user,
      scope: req.body.scope || 'full_audit',
    });
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  radiologyPreAnalysis,
  medicationInteraction,
  labExamExplainer,
  patientAssistant,
  clinicalRag,
  triageAutomation,
  metricsAnalyst,
  complianceGovernance,
};
