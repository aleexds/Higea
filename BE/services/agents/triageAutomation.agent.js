'use strict';

const db = require('../../models');
const { callLLM } = require('./llm.client');
const { executeAuditedAgent } = require('./baseAgent');

const PRIORITY_WEIGHT = { urgent: 4, high: 3, normal: 2, low: 1 };

/**
 * Agente 6: Triaje y Automatización de Tareas (Rol: Médico)
 * Clasifica urgencia de órdenes pendientes y redacta borradores de seguimiento/recordatorios.
 */
async function runTriageAutomation({ user, patientId = null, taskType = 'triage_orders' }) {
  const where = { status: ['pending', 'in_progress'] };
  if (patientId) where.patient_id = patientId;
  if (user.roles.includes('doctor') && !user.roles.includes('admin')) {
    where.doctor_id = user.id;
  }

  const orders = await db.ClinicalOrder.findAll({
    where,
    include: [{ model: db.Patient, as: 'patient', include: [{ model: db.User, as: 'user', attributes: ['full_name'] }] }],
    order: [['created_at', 'ASC']],
  });

  return executeAuditedAgent({
    agentName: 'triage_task_automation',
    user,
    patientId,
    inputPayload: { taskType, patientId, orders_evaluated: orders.length },
    handler: async () => {
      const prioritized = orders
        .map((o) => ({
          order_id: o.id,
          patient_name: o.patient?.user?.full_name || `Paciente #${o.patient_id}`,
          title: o.title,
          order_type: o.order_type,
          current_priority: o.priority,
          recommended_action:
            o.priority === 'urgent' || o.priority === 'high'
              ? 'Priorizar revisión inmediata y notificar seguimiento al paciente.'
              : 'Programar en flujo regular del día.',
          score: PRIORITY_WEIGHT[o.priority] || 1,
        }))
        .sort((a, b) => b.score - a.score);

      const llm = await callLLM({
        systemPrompt:
          'Eres un agente de triaje clínico y automatización administrativa para médicos. Prioriza órdenes pendientes y genera borradores breves de notas clínicas o recordatorios.',
        userPrompt: `Tipo de tarea: ${taskType}. Órdenes pendientes: ${JSON.stringify(prioritized)}`,
        fallbackBuilder: () => ({
          task_type: taskType,
          total_pending_orders: prioritized.length,
          prioritized_queue: prioritized,
          follow_up_draft:
            prioritized.length > 0
              ? `Borrador de recordatorio clínico: Se recuerda dar seguimiento prioritario a "${prioritized[0].title}" del paciente ${prioritized[0].patient_name}.`
              : 'No hay órdenes pendientes de triaje en este momento.',
          supervision_notice: 'Borrador automatizado sujeto a aprobación médica antes de envío.',
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

module.exports = { runTriageAutomation };
