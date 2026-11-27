'use strict';

const { runRadiologyPreAnalysis } = require('./radiologyPreAnalysis.agent');
const { runMedicationInteraction } = require('./medicationInteraction.agent');
const { runLabExamExplainer } = require('./labExamExplainer.agent');
const { runPatientAssistant } = require('./patientAssistant.agent');
const { runClinicalRag } = require('./clinicalRag.agent');
const { runTriageAutomation } = require('./triageAutomation.agent');
const { runMetricsAnalyst } = require('./metricsAnalyst.agent');
const { runComplianceGovernance } = require('./complianceGovernance.agent');

module.exports = {
  runRadiologyPreAnalysis,
  runMedicationInteraction,
  runLabExamExplainer,
  runPatientAssistant,
  runClinicalRag,
  runTriageAutomation,
  runMetricsAnalyst,
  runComplianceGovernance,
};
