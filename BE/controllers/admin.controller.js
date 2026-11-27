'use strict';

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const db = require('../models');
const bccrService = require('../services/bccr.service');
const { AppError } = require('../middlewares/error.middleware');

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS) || 10;

async function getDashboardMetrics(req, res, next) {
  try {
    const [activeTenants, totalUsers, totalStudies, totalAgentRuns, activeApiKeys, exchangeRate] =
      await Promise.all([
        db.Tenant.count({ where: { status: 'active' } }),
        db.User.count({ where: { status: 'active' } }),
        db.DiagnosticStudy.count(),
        db.AiAgentRun.count(),
        db.ApiKey.count({ where: { status: 'active' } }),
        bccrService.getCurrentExchangeRate({ forceRefresh: false }),
      ]);

    const recentRuns = await db.AiAgentRun.findAll({
      order: [['created_at', 'DESC']],
      limit: 10,
      attributes: ['id', 'agent_name', 'role_used', 'latency_ms', 'status', 'created_at'],
    });

    return res.status(200).json({
      success: true,
      data: {
        active_tenants: activeTenants,
        active_users: totalUsers,
        studies_processed: totalStudies,
        ai_agent_runs: totalAgentRuns,
        active_api_keys: activeApiKeys,
        exchange_rate: exchangeRate,
        recent_telemetry: recentRuns,
      },
    });
  } catch (err) {
    return next(err);
  }
}

async function listTenants(req, res, next) {
  try {
    const tenants = await db.Tenant.findAll({
      include: [{ model: db.ApiKey, as: 'apiKeys', attributes: ['id', 'name', 'key_prefix', 'status', 'created_at'] }],
      order: [['created_at', 'DESC']],
    });
    return res.status(200).json({ success: true, data: tenants });
  } catch (err) {
    return next(err);
  }
}

async function createTenant(req, res, next) {
  try {
    const { name, slug, legal_id, plan, contact_email, phone, settings } = req.body;
    const finalSlug =
      slug ||
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

    const tenant = await db.Tenant.create({
      name: name.trim(),
      slug: finalSlug,
      legal_id: legal_id || null,
      plan: plan || 'clinical',
      status: 'active',
      contact_email: contact_email || null,
      phone: phone || null,
      settings: settings || { timezone: 'America/Costa_Rica', country: 'CR' },
    });

    return res.status(201).json({
      success: true,
      message: 'Clínica (tenant) creada correctamente.',
      data: tenant,
    });
  } catch (err) {
    return next(err);
  }
}

async function updateTenantStatus(req, res, next) {
  try {
    const tenant = await db.Tenant.findByPk(req.params.id);
    if (!tenant) throw new AppError('Clínica (tenant) no encontrada.', 404, 'TENANT_NOT_FOUND');

    await tenant.update({ status: req.body.status });
    return res.status(200).json({ success: true, data: tenant });
  } catch (err) {
    return next(err);
  }
}

async function listApiKeys(req, res, next) {
  try {
    const where = req.query.tenant_id ? { tenant_id: Number(req.query.tenant_id) } : {};
    const keys = await db.ApiKey.findAll({
      where,
      attributes: { exclude: ['key_hash'] },
      include: [{ model: db.Tenant, as: 'tenant', attributes: ['id', 'name', 'slug'] }],
      order: [['created_at', 'DESC']],
    });
    return res.status(200).json({ success: true, data: keys });
  } catch (err) {
    return next(err);
  }
}

async function createApiKey(req, res, next) {
  try {
    const { tenant_id, name, scopes } = req.body;
    const tenant = await db.Tenant.findByPk(tenant_id);
    if (!tenant) throw new AppError('Clínica (tenant) no encontrada.', 404, 'TENANT_NOT_FOUND');

    const rawKey = `hg_live_${crypto.randomBytes(24).toString('hex')}`;
    const keyPrefix = rawKey.slice(0, 16);
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const record = await db.ApiKey.create({
      tenant_id: tenant.id,
      name: name.trim(),
      key_prefix: keyPrefix,
      key_hash: keyHash,
      scopes: scopes || ['studies:write', 'reports:read'],
      status: 'active',
      created_by: req.user.id,
    });

    return res.status(201).json({
      success: true,
      message: 'API Key generada. Guárdela en un lugar seguro; no se volverá a mostrar completa.',
      data: {
        id: record.id,
        tenant_id: record.tenant_id,
        name: record.name,
        key_prefix: record.key_prefix,
        api_key: rawKey,
        scopes: record.scopes,
        status: record.status,
      },
    });
  } catch (err) {
    return next(err);
  }
}

async function revokeApiKey(req, res, next) {
  try {
    const key = await db.ApiKey.findByPk(req.params.id);
    if (!key) throw new AppError('API Key no encontrada.', 404, 'API_KEY_NOT_FOUND');

    await key.update({ status: 'revoked', revoked_at: new Date() });
    return res.status(200).json({
      success: true,
      message: 'API Key revocada exitosamente.',
      data: { id: key.id, status: key.status, revoked_at: key.revoked_at },
    });
  } catch (err) {
    return next(err);
  }
}

async function getBccrExchangeRate(req, res, next) {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const data = await bccrService.getCurrentExchangeRate({ forceRefresh });
    return res.status(200).json({ success: true, data });
  } catch (err) {
    return next(err);
  }
}

async function getBccrHistory(req, res, next) {
  try {
    const limit = Math.min(Number(req.query.limit) || 30, 90);
    const history = await bccrService.getExchangeRateHistory(limit);
    return res.status(200).json({ success: true, data: history });
  } catch (err) {
    return next(err);
  }
}

async function listRoles(req, res, next) {
  try {
    const roles = await db.Role.findAll({ order: [['id', 'ASC']] });
    return res.status(200).json({ success: true, data: roles });
  } catch (err) {
    return next(err);
  }
}

async function listUsers(req, res, next) {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.tenant_id) where.tenant_id = Number(req.query.tenant_id);

    const users = await db.User.findAll({
      where,
      attributes: { exclude: ['password_hash', 'reset_token_hash', 'reset_token_expires_at'] },
      include: [
        { model: db.Role, as: 'roles', attributes: ['id', 'name'] },
        { model: db.Tenant, as: 'tenant', attributes: ['id', 'name', 'slug'] },
      ],
      order: [['created_at', 'DESC']],
    });
    return res.status(200).json({ success: true, data: users });
  } catch (err) {
    return next(err);
  }
}

async function createUser(req, res, next) {
  try {
    const { full_name, email, password, cedula, phone, specialty, license_number, tenant_id, roles } = req.body;
    const normalizedEmail = email.trim().toLowerCase();

    const existing = await db.User.findOne({ where: { email: normalizedEmail } });
    if (existing) {
      throw new AppError('Ya existe un usuario con ese correo electrónico.', 409, 'EMAIL_EXISTS');
    }

    const roleNames = Array.isArray(roles) && roles.length > 0 ? roles : ['doctor'];
    const roleRecords = await db.Role.findAll({ where: { name: roleNames } });
    if (roleRecords.length !== roleNames.length) {
      throw new AppError('Uno o más roles especificados no existen.', 400, 'INVALID_ROLES');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const createdUser = await db.sequelize.transaction(async (t) => {
      const user = await db.User.create(
        {
          tenant_id: tenant_id || req.user.tenant_id || 1,
          full_name: full_name.trim(),
          email: normalizedEmail,
          cedula: cedula || null,
          phone: phone || null,
          password_hash: passwordHash,
          specialty: specialty || null,
          license_number: license_number || null,
          status: 'active',
        },
        { transaction: t }
      );

      await db.UserRole.bulkCreate(
        roleRecords.map((r) => ({ user_id: user.id, role_id: r.id, assigned_at: new Date() })),
        { transaction: t }
      );

      if (roleNames.includes('patient')) {
        const mrn = `EXP-${new Date().getFullYear()}-${String(user.id).padStart(4, '0')}`;
        await db.Patient.create(
          {
            user_id: user.id,
            tenant_id: user.tenant_id,
            medical_record_number: mrn,
            clinical_status: 'stable',
          },
          { transaction: t }
        );
      }

      return user;
    });

    return res.status(201).json({
      success: true,
      message: 'Usuario creado correctamente con sus roles asignados.',
      data: {
        id: createdUser.id,
        full_name: createdUser.full_name,
        email: createdUser.email,
        tenant_id: createdUser.tenant_id,
        roles: roleNames,
      },
    });
  } catch (err) {
    return next(err);
  }
}

async function updateUserRoles(req, res, next) {
  try {
    const user = await db.User.findByPk(req.params.id);
    if (!user) throw new AppError('Usuario no encontrado.', 404, 'USER_NOT_FOUND');

    const { roles } = req.body;
    const roleRecords = await db.Role.findAll({ where: { name: roles } });
    if (roleRecords.length !== roles.length) {
      throw new AppError('Uno o más roles no son válidos.', 400, 'INVALID_ROLES');
    }

    await db.sequelize.transaction(async (t) => {
      await db.UserRole.destroy({ where: { user_id: user.id }, transaction: t });
      await db.UserRole.bulkCreate(
        roleRecords.map((r) => ({ user_id: user.id, role_id: r.id, assigned_at: new Date() })),
        { transaction: t }
      );
    });

    return res.status(200).json({
      success: true,
      message: 'Roles actualizados correctamente.',
      data: { user_id: user.id, roles },
    });
  } catch (err) {
    return next(err);
  }
}

async function updateUserStatus(req, res, next) {
  try {
    const targetId = Number(req.params.id);
    if (targetId === req.user.id && req.body.status !== 'active') {
      throw new AppError('No puede desactivar su propia cuenta de administrador.', 400, 'SELF_DEACTIVATION_BLOCKED');
    }

    const user = await db.User.findByPk(targetId);
    if (!user) throw new AppError('Usuario no encontrado.', 404, 'USER_NOT_FOUND');

    await user.update({ status: req.body.status });
    return res.status(200).json({
      success: true,
      data: { id: user.id, email: user.email, status: user.status },
    });
  } catch (err) {
    return next(err);
  }
}

async function assignDoctorToPatient(req, res, next) {
  try {
    const { doctor_id, patient_id, is_primary } = req.body;
    const [doctor, patient] = await Promise.all([
      db.User.findByPk(doctor_id, { include: [{ model: db.Role, as: 'roles', attributes: ['name'] }] }),
      db.Patient.findByPk(patient_id),
    ]);

    if (!doctor || !(doctor.roles || []).some((r) => r.name === 'doctor')) {
      throw new AppError('El usuario seleccionado no tiene rol médico.', 400, 'INVALID_DOCTOR');
    }
    if (!patient) {
      throw new AppError('Paciente no encontrado.', 404, 'PATIENT_NOT_FOUND');
    }

    const [assignment, created] = await db.DoctorPatient.findOrCreate({
      where: { doctor_id: doctor.id, patient_id: patient.id },
      defaults: { is_primary: is_primary !== undefined ? Boolean(is_primary) : true, status: 'active' },
    });

    if (!created) {
      await assignment.update({ status: 'active', is_primary: is_primary !== undefined ? Boolean(is_primary) : assignment.is_primary });
    }

    return res.status(created ? 201 : 200).json({
      success: true,
      message: 'Paciente asignado correctamente al médico.',
      data: assignment,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getDashboardMetrics,
  listTenants,
  createTenant,
  updateTenantStatus,
  listApiKeys,
  createApiKey,
  revokeApiKey,
  getBccrExchangeRate,
  getBccrHistory,
  listRoles,
  listUsers,
  createUser,
  updateUserRoles,
  updateUserStatus,
  assignDoctorToPatient,
};
