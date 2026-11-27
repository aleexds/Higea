'use strict';

const db = require('../../models');
const { callLLM } = require('./llm.client');
const { executeAuditedAgent } = require('./baseAgent');
const { AppError } = require('../../middlewares/error.middleware');

/**
 * Agente 1: Pre-Análisis de Radiología e Imágenes (Rol: Médico)
 * Nunca publica directo al paciente; siempre crea borrador en estado pending_validation.
 */
async function runRadiologyPreAnalysis({ user, studyId, clinicalNotes }) {
  const study = await db.DiagnosticStudy.findByPk(studyId, {
    include: [{ model: db.Patient, as: 'patient' }],
  });
  if (!study) {
    throw new AppError('Estudio diagnóstico no encontrado.', 404, 'STUDY_NOT_FOUND');
  }

  return executeAuditedAgent({
    agentName: 'radiology_pre_analysis',
    user,
    patientId: study.patient_id,
    inputPayload: { study_id: study.id, modality: study.modality, title: study.title, clinicalNotes: clinicalNotes || null },
    handler: async () => {
      const meta = study.metadata || {};
      const llm = await callLLM({
        systemPrompt:
          'Eres un asistente de pre-análisis radiológico para médicos en Higea. Genera un borrador estructurado técnico con hallazgos, prioridad y recomendaciones de verificación. Nunca emitas un diagnóstico definitivo ni te dirijas al paciente.',
        userPrompt: `Estudio: ${study.title} (${study.modality}). Metadatos: ${JSON.stringify(meta)}. Notas clínicas: ${clinicalNotes || 'Ninguna'}.`,
        fallbackBuilder: () => {
          const priority = meta.egfr && meta.egfr < 45 ? 'high' : 'normal';
          return {
            structured_findings: [
              `Modalidad analizada: ${study.modality.toUpperCase()} — ${study.title}.`,
              meta.contrast
                ? 'Estudio realizado con medio de contraste. Verificar función renal y protocolos post-contraste.'
                : 'Estudio sin medio de contraste registrado.',
              meta.egfr && meta.egfr < 45
                ? `Alerta preventiva: TFG estimada (${meta.egfr} mL/min/1.73m²) disminuida; correlacionar con nefroprotección.`
                : 'Sin alertas críticas automáticas en metadatos técnicos.',
            ],
            suggested_priority: priority,
            draft_text: `Borrador de pre-análisis IA para ${study.title}: Revisar hallazgos estructurales y correlacionar con clínica del paciente (${clinicalNotes || 'sin notas adicionales'}). Requiere validación y firma médica obligatoria antes de visibilidad al paciente.`,
            medical_supervision_notice:
              'BORRADOR PENDIENTE DE VALIDACIÓN MÉDICA: Este pre-análisis no es visible para el paciente hasta ser aprobado formalmente por un médico.',
          };
        },
      });

      const draftText = llm.content.draft_text || llm.content.text;
      const priority = llm.content.suggested_priority || 'normal';

      const report = await db.DiagnosticReport.create({
        study_id: study.id,
        patient_id: study.patient_id,
        doctor_id: user.id,
        ai_draft: draftText,
        findings: Array.isArray(llm.content.structured_findings)
          ? llm.content.structured_findings.join(' ')
          : draftText,
        priority,
        status: 'pending_validation',
      });

      await study.update({ status: 'pre_analyzed' });

      return {
        provider: llm.provider,
        model: llm.model,
        output: {
          report_id: report.id,
          report_status: report.status,
          priority: report.priority,
          analysis: llm.content,
        },
      };
    },
  });
}

module.exports = { runRadiologyPreAnalysis };
