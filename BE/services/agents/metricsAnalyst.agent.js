'use strict';

const db = require('../../models');
const { callLLM } = require('./llm.client');
const { executeAuditedAgent } = require('./baseAgent');

/**
 * Agente 7: Analista de Métricas y Reportes (Rol: Admin / Médico)
 * Interpreta volúmenes de estudios, tiempos de respuesta IA y adherencia/recetas activas.
 */
async function runMetricsAnalyst({ user, focus = 'executive_summary' }) {
  const [
    activeTenants,
    totalStudies,
    pendingReports,
    approvedReports,
    activeMedications,
    totalAgentRuns,
    avgLatencyRow,
  ] = await Promise.all([
    db.Tenant.count({ where: { status: 'active' } }),
    db.DiagnosticStudy.count(),
    db.DiagnosticReport.count({ where: { status: 'pending_validation' } }),
    db.DiagnosticReport.count({ where: { status: 'approved' } }),
    db.Medication.count({ where: { status: 'active' } }),
    db.AiAgentRun.count(),
    db.AiAgentRun.findOne({
      attributes: [[db.sequelize.fn('AVG', db.sequelize.col('latency_ms')), 'avg_latency']],
      raw: true,
    }),
  ]);

  const metrics = {
    active_tenants: activeTenants,
    total_studies: totalStudies,
    pending_validation_reports: pendingReports,
    approved_reports: approvedReports,
    active_medications: activeMedications,
    total_ai_agent_runs: totalAgentRuns,
    avg_ai_latency_ms: Math.round(Number(avgLatencyRow?.avg_latency || 0)),
  };

  return executeAuditedAgent({
    agentName: 'metrics_reports_analyst',
    user,
    inputPayload: { focus, metrics },
    handler: async () => {
      const llm = await callLLM({
        systemPrompt:
          'Eres un analista de métricas clínicas y SaaS de Higea. Redacta un resumen ejecutivo claro con hallazgos y recomendaciones operativas.',
        userPrompt: `Enfoque: ${focus}. Métricas actuales: ${JSON.stringify(metrics)}`,
        fallbackBuilder: () => ({
          focus,
          kpis: metrics,
          executive_summary: `La plataforma opera con ${metrics.active_tenants} clínica(s) activa(s), ${metrics.total_studies} estudio(s) diagnóstico(s) registrados (${metrics.approved_reports} aprobados y ${metrics.pending_validation_reports} pendientes de validación médica) y ${metrics.active_medications} receta(s) activa(s). La latencia promedio de los agentes IA es de ${metrics.avg_ai_latency_ms} ms.`,
          recommendations: [
            metrics.pending_validation_reports > 0
              ? `Atender ${metrics.pending_validation_reports} reporte(s) en cola de validación médica para reducir tiempos de entrega al paciente.`
              : 'Cola de validación médica al día.',
            'Mantener monitoreo de latencia y sincronización diaria del tipo de cambio BCCR.',
          ],
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

module.exports = { runMetricsAnalyst };
