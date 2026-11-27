'use strict';

const db = require('../../models');
const { callLLM } = require('./llm.client');
const { executeAuditedAgent } = require('./baseAgent');
const { AppError } = require('../../middlewares/error.middleware');

const KNOWN_INTERACTIONS = [
  {
    pair: ['metformina', 'contraste'],
    severity: 'high',
    alert: 'Riesgo de acidosis láctica asociada a medio de contraste yodado si TFG < 45 mL/min/1.73m². Evaluar suspensión temporal y control de creatinina a las 48 h (Guía ESUR).',
  },
  {
    pair: ['atorvastatina', 'claritromicina'],
    severity: 'high',
    alert: 'Inhibición potente de CYP3A4: aumenta riesgo de miopatía y rabdomiólisis.',
  },
  {
    pair: ['warfarina', 'ibuprofeno'],
    severity: 'high',
    alert: 'Incremento significativo del riesgo de sangrado gastrointestinal y elevación de INR.',
  },
];

/**
 * Agente 2: Guía e Interacción de Medicamentos (Rol: Médico / Paciente)
 */
async function runMedicationInteraction({ user, patientId, additionalSubstances = [] }) {
  let targetPatientId = patientId;
  if (user.roles.includes('patient') && !user.roles.includes('doctor') && !user.roles.includes('admin')) {
    const ownPatient = await db.Patient.findOne({ where: { user_id: user.id } });
    if (!ownPatient) throw new AppError('Expediente de paciente no encontrado.', 404, 'PATIENT_NOT_FOUND');
    targetPatientId = ownPatient.id;
  }

  const patient = await db.Patient.findByPk(targetPatientId, {
    include: [
      {
        model: db.Medication,
        as: 'medications',
        where: { status: 'active' },
        required: false,
        include: [{ model: db.MedicationSchedule, as: 'schedules' }],
      },
    ],
  });

  if (!patient) throw new AppError('Paciente no encontrado.', 404, 'PATIENT_NOT_FOUND');

  const isDoctor = user.roles.includes('doctor') || user.roles.includes('admin');
  const medNames = (patient.medications || []).map((m) => m.name);
  const allItemsLower = [...medNames, ...additionalSubstances].map((s) => String(s).toLowerCase());

  return executeAuditedAgent({
    agentName: 'medication_interaction_guide',
    user,
    patientId: patient.id,
    inputPayload: { patient_id: patient.id, active_medications: medNames, additionalSubstances },
    handler: async () => {
      const detectedAlerts = KNOWN_INTERACTIONS.filter((rule) =>
        rule.pair.every((term) => allItemsLower.some((item) => item.includes(term)))
      );

      const scheduleGuide = (patient.medications || []).map((med) => ({
        medication: `${med.name} ${med.dosage}`,
        instructions: med.instructions,
        food_warnings: med.food_warnings,
        schedules: (med.schedules || []).map((s) => ({
          time_of_day: s.time_of_day,
          scheduled_time: s.scheduled_time,
          dose_amount: s.dose_amount,
          notes: s.notes,
        })),
      }));

      const llm = await callLLM({
        systemPrompt: isDoctor
          ? 'Eres un agente de farmacovigilancia clínica para médicos. Evalúa interacciones fármaco-fármaco y alertas preventivas.'
          : 'Eres un guía amable de medicamentos para pacientes. Explica horarios, indicaciones con comidas y precauciones sin cambiar dosis ni recetar.',
        userPrompt: `Medicamentos activos: ${medNames.join(', ')}. Sustancias adicionales a evaluar: ${additionalSubstances.join(', ') || 'Ninguna'}. Alergias: ${patient.allergies || 'Ninguna'}.`,
        fallbackBuilder: () => ({
          audience: isDoctor ? 'doctor' : 'patient',
          active_medications_count: medNames.length,
          allergies_on_file: patient.allergies || 'Sin alergias registradas',
          interactions_detected: detectedAlerts,
          schedule_guide: scheduleGuide,
          summary:
            detectedAlerts.length > 0
              ? `Se detectaron ${detectedAlerts.length} alerta(s) preventiva(s) que requieren revisión médica.`
              : 'No se detectaron interacciones críticas entre los medicamentos evaluados. Continúe respetando sus horarios indicados.',
          supervision_notice: 'No suspenda ni modifique dosis sin indicación de su médico tratante.',
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

module.exports = { runMedicationInteraction };
