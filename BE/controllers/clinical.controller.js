'use strict';

const db = require('../models');
const { AppError } = require('../middlewares/error.middleware');

async function assertDoctorCanAccessPatient(user, patientId) {
  if (user.roles.includes('admin')) return;
  const assignment = await db.DoctorPatient.findOne({
    where: { doctor_id: user.id, patient_id: patientId, status: 'active' },
  });
  if (!assignment) {
    throw new AppError(
      'Acceso denegado: este paciente no pertenece a su cartera asignada.',
      403,
      'PATIENT_NOT_ASSIGNED'
    );
  }
}

async function getMyPatients(req, res, next) {
  try {
    const isAdmin = req.user.roles.includes('admin');
    const patientWhere = {};
    if (req.query.status) {
      patientWhere.clinical_status = req.query.status;
    }

    const include = [
      { model: db.User, as: 'user', attributes: ['id', 'full_name', 'email', 'cedula', 'phone'] },
      { model: db.Medication, as: 'medications', where: { status: 'active' }, required: false },
      { model: db.DiagnosticStudy, as: 'diagnosticStudies', required: false, limit: 1, order: [['performed_at', 'DESC']] },
    ];

    if (!isAdmin) {
      include.push({
        model: db.User,
        as: 'doctors',
        where: { id: req.user.id },
        attributes: [],
        through: { where: { status: 'active' }, attributes: [] },
        required: true,
      });
    }

    const patients = await db.Patient.findAll({
      where: patientWhere,
      include,
      order: [['updated_at', 'DESC']],
    });

    return res.status(200).json({ success: true, data: patients });
  } catch (err) {
    return next(err);
  }
}

async function getPatientDetail(req, res, next) {
  try {
    await assertDoctorCanAccessPatient(req.user, Number(req.params.id));

    const patient = await db.Patient.findByPk(req.params.id, {
      include: [
        { model: db.User, as: 'user', attributes: ['id', 'full_name', 'email', 'cedula', 'phone'] },
        { model: db.ClinicalOrder, as: 'clinicalOrders' },
        {
          model: db.DiagnosticStudy,
          as: 'diagnosticStudies',
          include: [{ model: db.DiagnosticReport, as: 'reports' }],
        },
        {
          model: db.Medication,
          as: 'medications',
          include: [{ model: db.MedicationSchedule, as: 'schedules' }],
        },
        { model: db.Appointment, as: 'appointments' },
      ],
    });

    if (!patient) throw new AppError('Paciente no encontrado.', 404, 'PATIENT_NOT_FOUND');
    return res.status(200).json({ success: true, data: patient });
  } catch (err) {
    return next(err);
  }
}

async function listReports(req, res, next) {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (!req.user.roles.includes('admin')) {
      where.doctor_id = req.user.id;
    }

    const reports = await db.DiagnosticReport.findAll({
      where,
      include: [
        { model: db.DiagnosticStudy, as: 'study', attributes: ['id', 'title', 'modality', 'performed_at'] },
        {
          model: db.Patient,
          as: 'patient',
          include: [{ model: db.User, as: 'user', attributes: ['id', 'full_name', 'cedula'] }],
        },
      ],
      order: [['created_at', 'DESC']],
    });

    return res.status(200).json({ success: true, data: reports });
  } catch (err) {
    return next(err);
  }
}

async function createClinicalOrder(req, res, next) {
  try {
    const { patient_id, order_type, title, description, priority } = req.body;
    await assertDoctorCanAccessPatient(req.user, patient_id);
    const patient = await db.Patient.findByPk(patient_id);
    if (!patient) throw new AppError('Paciente no encontrado.', 404, 'PATIENT_NOT_FOUND');

    const order = await db.ClinicalOrder.create({
      tenant_id: req.user.tenant_id || patient.tenant_id,
      patient_id: patient.id,
      doctor_id: req.user.id,
      order_type,
      title: title.trim(),
      description: description || null,
      priority: priority || 'normal',
      status: 'pending',
    });

    return res.status(201).json({ success: true, data: order });
  } catch (err) {
    return next(err);
  }
}

async function createDiagnosticStudy(req, res, next) {
  try {
    const { order_id, patient_id, modality, title, file_url, metadata } = req.body;
    await assertDoctorCanAccessPatient(req.user, patient_id);
    const patient = await db.Patient.findByPk(patient_id);
    if (!patient) throw new AppError('Paciente no encontrado.', 404, 'PATIENT_NOT_FOUND');

    const study = await db.DiagnosticStudy.create({
      order_id: order_id || null,
      patient_id: patient.id,
      tenant_id: req.user.tenant_id || patient.tenant_id,
      modality,
      title: title.trim(),
      file_url: file_url || null,
      metadata: metadata || null,
      performed_at: new Date(),
      status: 'uploaded',
    });

    return res.status(201).json({ success: true, data: study });
  } catch (err) {
    return next(err);
  }
}

async function validateReport(req, res, next) {
  try {
    const report = await db.DiagnosticReport.findByPk(req.params.id);
    if (!report) throw new AppError('Reporte diagnóstico no encontrado.', 404, 'REPORT_NOT_FOUND');
    await assertDoctorCanAccessPatient(req.user, report.patient_id);

    const { status, findings, conclusion, priority } = req.body;
    await report.update({
      status,
      findings: findings !== undefined ? findings : report.findings,
      conclusion: conclusion !== undefined ? conclusion : report.conclusion,
      priority: priority || report.priority,
      validated_by: req.user.id,
      validated_at: new Date(),
    });

    if (status === 'approved') {
      await db.DiagnosticStudy.update({ status: 'reported' }, { where: { id: report.study_id } });
    }

    return res.status(200).json({
      success: true,
      message:
        status === 'approved'
          ? 'Reporte validado y aprobado por el médico. Ahora es visible en el Portal del Paciente.'
          : 'Estado del reporte actualizado.',
      data: report,
    });
  } catch (err) {
    return next(err);
  }
}

async function prescribeMedication(req, res, next) {
  try {
    const { patient_id, name, dosage, route, instructions, food_warnings, start_date, end_date, schedules } = req.body;
    await assertDoctorCanAccessPatient(req.user, patient_id);
    const patient = await db.Patient.findByPk(patient_id);
    if (!patient) throw new AppError('Paciente no encontrado.', 404, 'PATIENT_NOT_FOUND');

    const medication = await db.sequelize.transaction(async (t) => {
      const med = await db.Medication.create(
        {
          patient_id: patient.id,
          doctor_id: req.user.id,
          tenant_id: req.user.tenant_id || patient.tenant_id,
          name: name.trim(),
          dosage: dosage.trim(),
          route: route || 'oral',
          instructions: instructions || null,
          food_warnings: food_warnings || null,
          start_date,
          end_date: end_date || null,
          status: 'active',
        },
        { transaction: t }
      );

      if (Array.isArray(schedules) && schedules.length > 0) {
        await db.MedicationSchedule.bulkCreate(
          schedules.map((s) => ({
            medication_id: med.id,
            time_of_day: s.time_of_day,
            scheduled_time: s.scheduled_time || null,
            dose_amount: s.dose_amount || '1 tableta',
            notes: s.notes || null,
            is_active: true,
          })),
          { transaction: t }
        );
      }

      return med;
    });

    const fullMed = await db.Medication.findByPk(medication.id, {
      include: [{ model: db.MedicationSchedule, as: 'schedules' }],
    });

    return res.status(201).json({ success: true, data: fullMed });
  } catch (err) {
    return next(err);
  }
}

async function getDoctorAppointments(req, res, next) {
  try {
    const where = req.user.roles.includes('admin') ? {} : { doctor_id: req.user.id };
    if (req.query.status) where.status = req.query.status;

    const appointments = await db.Appointment.findAll({
      where,
      include: [
        {
          model: db.Patient,
          as: 'patient',
          include: [{ model: db.User, as: 'user', attributes: ['id', 'full_name', 'email'] }],
        },
      ],
      order: [['scheduled_at', 'ASC']],
    });

    return res.status(200).json({ success: true, data: appointments });
  } catch (err) {
    return next(err);
  }
}

async function createAppointment(req, res, next) {
  try {
    const { patient_id, scheduled_at, duration_minutes, modality, location_or_link, reason, preparation_notes } =
      req.body;
    const patient = await db.Patient.findByPk(patient_id);
    if (!patient) throw new AppError('Paciente no encontrado.', 404, 'PATIENT_NOT_FOUND');

    const appointment = await db.Appointment.create({
      tenant_id: req.user.tenant_id || patient.tenant_id,
      patient_id: patient.id,
      doctor_id: req.user.id,
      scheduled_at,
      duration_minutes: duration_minutes || 30,
      modality: modality || 'in_person',
      location_or_link: location_or_link || null,
      reason: reason.trim(),
      preparation_notes: preparation_notes || null,
      status: 'scheduled',
    });

    return res.status(201).json({ success: true, data: appointment });
  } catch (err) {
    return next(err);
  }
}

async function updateAppointmentStatus(req, res, next) {
  try {
    const appointment = await db.Appointment.findByPk(req.params.id);
    if (!appointment) throw new AppError('Cita médica no encontrada.', 404, 'APPOINTMENT_NOT_FOUND');

    await appointment.update({
      status: req.body.status,
      ...(req.body.reminder_sent !== undefined ? { reminder_sent: Boolean(req.body.reminder_sent) } : {}),
    });

    return res.status(200).json({ success: true, data: appointment });
  } catch (err) {
    return next(err);
  }
}

async function listClinicalDocuments(req, res, next) {
  try {
    const where = req.query.category ? { category: req.query.category } : {};
    const docs = await db.ClinicalDocument.findAll({ where, order: [['created_at', 'DESC']] });
    return res.status(200).json({ success: true, data: docs });
  } catch (err) {
    return next(err);
  }
}

async function createClinicalDocument(req, res, next) {
  try {
    const { title, category, source, content, tags } = req.body;
    const doc = await db.ClinicalDocument.create({
      tenant_id: req.user.tenant_id || null,
      title: title.trim(),
      category: category || 'general',
      source: source || null,
      content,
      tags: tags || [],
      created_by: req.user.id,
    });
    return res.status(201).json({ success: true, data: doc });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getMyPatients,
  getPatientDetail,
  listReports,
  createClinicalOrder,
  createDiagnosticStudy,
  validateReport,
  prescribeMedication,
  getDoctorAppointments,
  createAppointment,
  updateAppointmentStatus,
  listClinicalDocuments,
  createClinicalDocument,
  assertDoctorCanAccessPatient,
};
