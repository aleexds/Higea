'use strict';

const db = require('../../models');
const { callLLM } = require('./llm.client');
const { executeAuditedAgent } = require('./baseAgent');
const { AppError } = require('../../middlewares/error.middleware');

/**
 * Agente 4: Asistente Conversacional y de Voz (Rol: Paciente)
 * Herramientas acotadas al expediente del paciente autenticado (solo reportes approved).
 */
async function runPatientAssistant({ user, message, channel = 'text' }) {
  const patient = await db.Patient.findOne({
    where: { user_id: user.id },
    include: [
      {
        model: db.Medication,
        as: 'medications',
        where: { status: 'active' },
        required: false,
        include: [{ model: db.MedicationSchedule, as: 'schedules' }],
      },
      {
        model: db.Appointment,
        as: 'appointments',
        required: false,
      },
      {
        model: db.DiagnosticReport,
        as: 'diagnosticReports',
        where: { status: 'approved' }, // Guardrail: únicamente reportes aprobados
        required: false,
        include: [{ model: db.DiagnosticStudy, as: 'study', attributes: ['title', 'modality', 'performed_at'] }],
      },
    ],
  });

  if (!patient) {
    throw new AppError('No se encontró expediente asociado a su cuenta.', 404, 'PATIENT_NOT_FOUND');
  }

  const pendingReportsCount = await db.DiagnosticReport.count({
    where: { patient_id: patient.id, status: 'pending_validation' },
  });

  return executeAuditedAgent({
    agentName: 'patient_conversational_voice_assistant',
    user,
    patientId: patient.id,
    inputPayload: { message, channel },
    handler: async () => {
      const lowerMsg = String(message).toLowerCase();
      const asksPending =
        (lowerMsg.includes('pendiente') || lowerMsg.includes('sin aprobar') || lowerMsg.includes('borrador')) &&
        pendingReportsCount > 0;

      if (asksPending) {
        return {
          blocked: true,
          blockReason: 'Solicitud sobre exámenes pendientes de validación médica.',
          provider: 'higea-clinical-guardrail',
          model: 'guardrail-v1',
          output: {
            channel,
            reply: `Actualmente tienes ${pendingReportsCount} examen(es) en proceso de revisión médica. Por seguridad clínica no puedo adelantar ni especular sobre sus resultados hasta que tu médico los apruebe.`,
            voice_friendly_text: `Tienes ${pendingReportsCount} examen en revisión médica. Te avisaremos en cuanto esté aprobado.`,
          },
        };
      }

      const upcomingAppointments = (patient.appointments || [])
        .filter((a) => ['scheduled', 'confirmed'].includes(a.status))
        .map((a) => ({
          scheduled_at: a.scheduled_at,
          modality: a.modality,
          reason: a.reason,
          location_or_link: a.location_or_link,
        }));

      const activeMeds = (patient.medications || []).map((m) => ({
        name: `${m.name} ${m.dosage}`,
        instructions: m.instructions,
        schedules: (m.schedules || []).map((s) => `${s.time_of_day} (${s.scheduled_time || 'según indicación'})`),
      }));

      const approvedReports = (patient.diagnosticReports || []).map((r) => ({
        study: r.study?.title || 'Estudio',
        conclusion: r.conclusion,
        validated_at: r.validated_at,
      }));

      const llm = await callLLM({
        systemPrompt:
          'Eres el asistente virtual de Higea para pacientes (texto y voz). Responde SOLO con base en las citas, recetas activas y reportes aprobados del expediente provisto. Nunca inventes resultados ni especules sobre exámenes pendientes.',
        userPrompt: `Consulta del paciente: "${message}". Expediente permitido: ${JSON.stringify({
          upcomingAppointments,
          activeMeds,
          approvedReports,
        })}`,
        fallbackBuilder: () => {
          let reply = 'Con gusto te ayudo con tu expediente Higea. ';
          if (lowerMsg.includes('cita') || lowerMsg.includes('agenda')) {
            reply += upcomingAppointments.length
              ? `Tienes ${upcomingAppointments.length} cita(s) próxima(s). La más cercana es: ${upcomingAppointments[0].reason} (${upcomingAppointments[0].modality}).`
              : 'No tienes citas próximas programadas en este momento.';
          } else if (lowerMsg.includes('medicamento') || lowerMsg.includes('receta') || lowerMsg.includes('tomar')) {
            reply += activeMeds.length
              ? `Tus medicamentos activos son: ${activeMeds.map((m) => `${m.name} (${m.instructions})`).join('; ')}.`
              : 'No tienes medicamentos activos registrados.';
          } else if (lowerMsg.includes('examen') || lowerMsg.includes('resultado') || lowerMsg.includes('reporte')) {
            reply += approvedReports.length
              ? `Tienes ${approvedReports.length} reporte(s) aprobado(s): ${approvedReports.map((r) => `${r.study}: ${r.conclusion}`).join(' | ')}.`
              : 'Aún no tienes reportes aprobados disponibles para consulta.';
          } else {
            reply += `Tienes ${upcomingAppointments.length} cita(s) próxima(s), ${activeMeds.length} medicamento(s) activo(s) y ${approvedReports.length} reporte(s) aprobado(s). ¿Sobre cuál deseas más detalle?`;
          }

          return {
            channel,
            reply,
            voice_friendly_text: reply,
            context_summary: {
              upcoming_appointments: upcomingAppointments.length,
              active_medications: activeMeds.length,
              approved_reports: approvedReports.length,
            },
          };
        },
      });

      return {
        provider: llm.provider,
        model: llm.model,
        output: llm.content,
      };
    },
  });
}

module.exports = { runPatientAssistant };
