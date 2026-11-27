'use strict';

const db = require('../models');
const governanceService = require('../services/governance.service');
const { AppError } = require('../middlewares/error.middleware');

async function getProfile(req, res, next) {
  try {
    const user = await db.User.findByPk(req.user.id, {
      attributes: { exclude: ['password_hash', 'reset_token_hash', 'reset_token_expires_at'] },
      include: [
        { model: db.Role, as: 'roles', attributes: ['id', 'name'] },
        { model: db.Tenant, as: 'tenant', attributes: ['id', 'name', 'slug'] },
      ],
    });
    if (!user) throw new AppError('Usuario no encontrado.', 404, 'USER_NOT_FOUND');
    return res.status(200).json({ success: true, data: user });
  } catch (err) {
    return next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const user = await db.User.findByPk(req.user.id);
    if (!user) throw new AppError('Usuario no encontrado.', 404, 'USER_NOT_FOUND');

    const { full_name, phone, specialty, notification_prefs, two_factor_enabled } = req.body;
    await user.update({
      ...(full_name !== undefined ? { full_name: full_name.trim() } : {}),
      ...(phone !== undefined ? { phone: phone.trim() } : {}),
      ...(specialty !== undefined ? { specialty: specialty.trim() } : {}),
      ...(notification_prefs !== undefined ? { notification_prefs } : {}),
      ...(two_factor_enabled !== undefined ? { two_factor_enabled: Boolean(two_factor_enabled) } : {}),
    });

    return res.status(200).json({
      success: true,
      message: 'Perfil actualizado correctamente.',
      data: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        phone: user.phone,
        specialty: user.specialty,
        two_factor_enabled: user.two_factor_enabled,
        notification_prefs: user.notification_prefs,
      },
    });
  } catch (err) {
    return next(err);
  }
}

async function getLegalDocuments(req, res, next) {
  try {
    const docs = await governanceService.getActiveLegalDocuments();
    return res.status(200).json({ success: true, data: docs });
  } catch (err) {
    return next(err);
  }
}

async function getMyConsents(req, res, next) {
  try {
    const consents = await governanceService.getUserConsents(req.user.id);
    return res.status(200).json({ success: true, data: consents });
  } catch (err) {
    return next(err);
  }
}

async function recordConsent(req, res, next) {
  try {
    const consent = await governanceService.updateUserConsent({
      userId: req.user.id,
      consent_type: req.body.consent_type,
      accepted: req.body.accepted,
      ip_address: req.ip,
      user_agent: req.get('user-agent'),
    });
    return res.status(201).json({ success: true, data: consent });
  } catch (err) {
    return next(err);
  }
}

async function requestAccountDeletion(req, res, next) {
  try {
    const result = await governanceService.requestAccountDeletion({
      userId: req.user.id,
      password: req.body.password,
      reason: req.body.reason,
    });
    return res.status(200).json({ success: true, data: result });
  } catch (err) {
    return next(err);
  }
}

async function getAuditLogs(req, res, next) {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const where = {};
    if (req.query.agent_name) where.agent_name = req.query.agent_name;
    if (req.query.status) where.status = req.query.status;

    const runs = await db.AiAgentRun.findAll({
      where,
      include: [{ model: db.User, as: 'user', attributes: ['id', 'full_name', 'email'] }],
      order: [['created_at', 'DESC']],
      limit,
    });

    return res.status(200).json({ success: true, data: runs });
  } catch (err) {
    return next(err);
  }
}

async function getExternalApiLogs(req, res, next) {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const logs = await db.ExternalApiLog.findAll({
      order: [['created_at', 'DESC']],
      limit,
    });
    return res.status(200).json({ success: true, data: logs });
  } catch (err) {
    return next(err);
  }
}

async function getDeletionRequests(req, res, next) {
  try {
    const requests = await db.DataDeletionRequest.findAll({
      order: [['created_at', 'DESC']],
      limit: 100,
    });
    return res.status(200).json({ success: true, data: requests });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  getProfile,
  updateProfile,
  getLegalDocuments,
  getMyConsents,
  recordConsent,
  requestAccountDeletion,
  getAuditLogs,
  getExternalApiLogs,
  getDeletionRequests,
};
