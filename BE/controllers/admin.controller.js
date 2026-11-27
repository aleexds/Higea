'use strict';

const crypto = require('crypto');
const db = require('../models');
const bccrService = require('../services/bccr.service');
const { AppError } = require('../middlewares/error.middleware');

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
};
