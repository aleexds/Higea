'use strict';

const db = require('../../models');
const { callLLM } = require('./llm.client');
const { executeAuditedAgent } = require('./baseAgent');
const { AppError } = require('../../middlewares/error.middleware');

/**
 * Agente 3: Explicador de Exámenes y Laboratorio (Rol: Paciente / Médico)
 * Guardrail estricto: para rol paciente SOLO explica reportes en estado 'approved'.
 */
async function runLabExamExplainer({ user, reportId }) {
  const report = await db.DiagnosticReport.findByPk(reportId, {
    include: [
      { model: db.DiagnosticStudy, as: 'study' },
      { model: db.Patient, as: 'patient' },
    ],
  });

  if (!report) {
    throw new AppError('Reporte diagnóstico no encontrado.', 404, 'REPORT_NOT_FOUND');
  }

  const isPatientOnly =
    user.roles.includes('patient') && !user.roles.includes('doctor') && !user.roles.includes('admin');

  if (isPatientOnly && report.patient?.user_id !== user.id) {
    throw new AppError('No tiene autorización para consultar reportes de otro paciente.', 403, 'FORBIDDEN_REPORT');
  }

  return executeAuditedAgent({
    agentName: 'lab_exam_explainer',
    user,
    patientId: report.patient_id,
    inputPayload: { report_id: report.id, report_status: report.status },
    handler: async () => {
      // Guardrail clínico obligatorio (HU-05 / HU-08 / HU-10)
      if (isPatientOnly && report.status !== 'approved') {
        return {
          blocked: true,
          blockReason: 'Intento de explicación de reporte no aprobado por el médico.',
          provider: 'higea-clinical-guardrail',
          model: 'guardrail-v1',
          output: {
            blocked: true,
            message:
              'Este examen aún está en revisión por su médico tratante. Por su seguridad, Higea no puede interpretar ni especular sobre resultados hasta que el reporte sea validado y aprobado formalmente.',
          },
        };
      }

      const studyTitle = report.study?.title || 'Estudio clínico';
      const llm = await callLLM({
        systemPrompt:
          'Traduce resultados médicos aprobados a lenguaje claro, empático y accesible para el paciente en español. No emitas nuevos diagnósticos ni recomiendes cambios de tratamiento.',
        userPrompt: `Estudio: ${studyTitle}. Hallazgos: ${report.findings}. Conclusión médica: ${report.conclusion || report.ai_draft}.`,
        fallbackBuilder: () => ({
          study_title: studyTitle,
          report_status: report.status,
          plain_language_summary: `Su estudio "${studyTitle}" fue revisado y validado por su médico. En términos sencillos: ${report.conclusion || report.findings}`,
          key_points: [
            'El reporte ya cuenta con validación médica oficial.',
            'Conserve este informe para su próxima consulta de seguimiento.',
            'Si presenta síntomas nuevos o dudas adicionales, consulte directamente con su médico tratante.',
          ],
          disclaimer: 'Esta explicación es informativa y no sustituye una consulta médica.',
        }),
      });

      return {
        provider: llm.provider,
        model: llm.model,
        output: llm.content,
      };
    },
  });
}

module.exports = { runLabExamExplainer };
