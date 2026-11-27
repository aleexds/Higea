'use strict';

const bccrService = require('../services/bccr.service');
const db = require('../models');

function verifyWebhookSecret(req, res) {
  const expected = process.env.N8N_WEBHOOK_SECRET;
  const provided = req.headers['x-higea-webhook-secret'];
  if (expected && provided !== expected) {
    res.status(401).json({ success: false, message: 'Secreto de webhook n8n inválido.' });
    return false;
  }
  return true;
}

/**
 * Workflow n8n #1: Onboarding y Consentimiento
 */
async function n8nOnboarding(req, res, next) {
  try {
    if (!verifyWebhookSecret(req, res)) return;
    const { user_id } = req.body;
    const user = await db.User.findByPk(user_id, {
      attributes: ['id', 'full_name', 'email', 'status'],
      include: [{ model: db.Role, as: 'roles', attributes: ['name'] }],
    });
    return res.status(200).json({
      success: true,
      workflow: 'onboarding_consent',
      data: { user, welcomed_at: new Date().toISOString() },
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Workflow n8n #2: Sincronización Diaria Tipo de Cambio BCCR
 */
async function n8nSyncBccr(req, res, next) {
  try {
    if (!verifyWebhookSecret(req, res)) return;
    const rate = await bccrService.getCurrentExchangeRate({ forceRefresh: true });
    return res.status(200).json({
      success: true,
      workflow: 'bccr_daily_sync',
      data: rate,
    });
  } catch (err) {
    return next(err);
  }
}

/**
 * Workflow n8n #3: Baja y Anonimización de Datos (consulta de estado/confirmación)
 */
async function n8nDataDeletion(req, res, next) {
  try {
    if (!verifyWebhookSecret(req, res)) return;
    const { deletion_request_id } = req.body;
    const requestRecord = await db.DataDeletionRequest.findByPk(deletion_request_id);
    return res.status(200).json({
      success: true,
      workflow: 'data_deletion_ley8968',
      data: requestRecord,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  n8nOnboarding,
  n8nSyncBccr,
  n8nDataDeletion,
};
