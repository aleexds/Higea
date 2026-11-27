'use strict';

const db = require('../models');
const { AppError } = require('../middlewares/error.middleware');

async function findOwnPatient(userId) {
  const patient = await db.Patient.findOne({ where: { user_id: userId } });
  if (!patient) {
    throw new AppError('No se encontró expediente clínico asociado a este usuario.', 404, 'PATIENT_NOT_FOUND');
  }
  return patient;
}

async function getPatientOverview(req, res, next) {
  try {
    const patient = await findOwnPatient(req.user.id);

    const [approvedReports, medications, appointments] = await Promise.all([
      db.DiagnosticReport.findAll({
        where: { patient_id: patient.id, status: 'approved' }, // Regla crítica RF-07 / RF-10
        include: [
          { model: db.DiagnosticStudy, as: 'study', attributes: ['id', 'title', 'modality', 'performed_at'] },
          { model: db.User, as: 'validator', attributes: ['id', 'full_name', 'specialty'] },
        ],
        order: [['validated_at', 'DESC']],
      }),
      db.Medication.findAll({
        where: { patient_id: patient.id, status: 'active' },
        include: [{ model: db.MedicationSchedule, as: 'schedules' }],
        order: [['start_date', 'DESC']],
      }),
      db.Appointment.findAll({
        where: { patient_id: patient.id },
        include: [{ model: db.User, as: 'doctor', attributes: ['id', 'full_name', 'specialty'] }],
        order: [['scheduled_at', 'ASC']],
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        patient,
        approved_reports: approvedReports,
        active_medications: medications,
        appointments,
      },
    });
  } catch (err) {
    return next(err);
  }
}

async function getApprovedReports(req, res, next) {
  try {
    const patient = await findOwnPatient(req.user.id);
    const reports = await db.DiagnosticReport.findAll({
      where: { patient_id: patient.id, status: 'approved' },
      include: [
        { model: db.DiagnosticStudy, as: 'study', attributes: ['id', 'title', 'modality', 'file_url', 'performed_at'] },
        { model: db.User, as: 'validator', attributes: ['id', 'full_name', 'specialty', 'license_number'] },
      ],
      order: [['validated_at', 'DESC']],
    });
    return res.status(200).json({ success: true, data: reports });
  } catch (err) {
    return next(err);
  }
}

async function getMyMedications(req, res, next) {
  try {
    const patient = await findOwnPatient(req.user.id);
    const medications = await db.Medication.findAll({
      where: { patient_id: patient.id },
      include: [
        { model: db.MedicationSchedule, as: 'schedules' },
        { model: db.User, as: 'doctor', attributes: ['id', 'full_name', 'specialty'] },
      ],
      order: [['status', 'ASC'], ['start_date', 'DESC']],
    });
    return res.status(200).json({ success: true, data: medications });
  } catch (err) {
    return next(err);
  }
}

async function getMyAppointments(req, res, next) {
  try {
    const patient = await findOwnPatient(req.user.id);
    const appointments = await db.Appointment.findAll({
      where: { patient_id: patient.id },
      include: [{ model: db.User, as: 'doctor', attributes: ['id', 'full_name', 'specialty'] }],
      order: [['scheduled_at', 'ASC']],
    });
    return res.status(200).json({ success: true, data: appointments });
  } catch (err) {
    return next(err);
  }
}

async function requestAppointment(req, res, next) {
  try {
    const patient = await findOwnPatient(req.user.id);
    const { doctor_id, scheduled_at, modality, reason } = req.body;

    const appointment = await db.Appointment.create({
      tenant_id: patient.tenant_id,
      patient_id: patient.id,
      doctor_id,
      scheduled_at,
      modality: modality || 'telehealth',
      reason: reason.trim(),
      status: 'scheduled',
    });

    return res.status(201).json({
      success: true,
      message: 'Solicitud de cita registrada correctamente.',
      data: appointment,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getPatientOverview,
  getApprovedReports,
  getMyMedications,
  getMyAppointments,
  requestAppointment,
};
