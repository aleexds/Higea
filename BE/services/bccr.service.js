'use strict';

const db = require('../models');

const BCCR_BUY_INDICATOR = '317';
const BCCR_SELL_INDICATOR = '318';

function formatBccrDate(date = new Date()) {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function parseBccrXmlValue(xmlText) {
  const decoded = xmlText
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
  const match = decoded.match(/<NUM_VALOR>([\d.,]+)<\/NUM_VALOR>/i);
  if (!match) return null;
  const parsed = Number.parseFloat(match[1].replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
}

async function fetchIndicatorFromBccr(indicatorCode, dateStr) {
  const baseUrl =
    process.env.BCCR_BASE_URL ||
    'https://gee.bccr.fi.cr/Indicadores/Suscripciones/WS/wsindicadoreseconomicos.asmx';
  const email = process.env.BCCR_EMAIL;
  const token = process.env.BCCR_TOKEN;
  const timeoutMs = Number(process.env.BCCR_TIMEOUT_MS) || 8000;

  if (!email || !token) {
    throw new Error('Credenciales BCCR_EMAIL / BCCR_TOKEN no configuradas en .env');
  }

  const params = new URLSearchParams({
    Indicador: indicatorCode,
    FechaInicio: dateStr,
    FechaFinal: dateStr,
    Nombre: 'Higea Plataforma Clinica',
    SubNiveles: 'N',
    CorreoElectronico: email,
    Token: token,
  });

  const url = `${baseUrl}/ObtenerIndicadoresEconomicosXML?${params.toString()}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const startedAt = Date.now();
  try {
    const response = await fetch(url, { method: 'GET', signal: controller.signal });
    const latency = Date.now() - startedAt;
    const text = await response.text();
    const value = parseBccrXmlValue(text);

    await db.ExternalApiLog.create({
      service_name: 'BCCR',
      endpoint: `${baseUrl}/ObtenerIndicadoresEconomicosXML`,
      method: 'GET',
      status_code: response.status,
      latency_ms: latency,
      request_summary: { indicator: indicatorCode, date: dateStr },
      response_summary: { value },
      success: response.ok && value !== null,
      error_message: value === null ? 'No se encontró NUM_VALOR en XML BCCR' : null,
    });

    if (!response.ok || value === null) {
      throw new Error(`BCCR respondió HTTP ${response.status} sin valor válido para indicador ${indicatorCode}`);
    }

    return value;
  } catch (err) {
    const latency = Date.now() - startedAt;
    await db.ExternalApiLog.create({
      service_name: 'BCCR',
      endpoint: `${baseUrl}/ObtenerIndicadoresEconomicosXML`,
      method: 'GET',
      status_code: null,
      latency_ms: latency,
      request_summary: { indicator: indicatorCode, date: dateStr },
      response_summary: null,
      success: false,
      error_message: err.name === 'AbortError' ? `Timeout (${timeoutMs} ms)` : err.message,
    });
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function getCurrentExchangeRate({ forceRefresh = false } = {}) {
  const todayIso = new Date().toISOString().slice(0, 10);

  if (!forceRefresh) {
    const cached = await db.ExchangeRate.findOne({
      where: { rate_date: todayIso },
      order: [['fetched_at', 'DESC']],
    });
    if (cached) {
      return {
        source: cached.source,
        buy_rate: Number(cached.buy_rate),
        sell_rate: Number(cached.sell_rate),
        rate_date: cached.rate_date,
        fetched_at: cached.fetched_at,
        live: false,
      };
    }
  }

  const dateStr = formatBccrDate(new Date());
  try {
    const [buyRate, sellRate] = await Promise.all([
      fetchIndicatorFromBccr(BCCR_BUY_INDICATOR, dateStr),
      fetchIndicatorFromBccr(BCCR_SELL_INDICATOR, dateStr),
    ]);

    const saved = await db.ExchangeRate.create({
      source: 'BCCR',
      buy_rate: buyRate,
      sell_rate: sellRate,
      rate_date: todayIso,
      fetched_at: new Date(),
    });

    return {
      source: saved.source,
      buy_rate: Number(saved.buy_rate),
      sell_rate: Number(saved.sell_rate),
      rate_date: saved.rate_date,
      fetched_at: saved.fetched_at,
      live: true,
    };
  } catch (err) {
    // Tolerancia a fallos (RNF-08): devolver último valor histórico con advertencia controlada
    const latest = await db.ExchangeRate.findOne({ order: [['fetched_at', 'DESC']] });
    if (latest) {
      return {
        source: latest.source,
        buy_rate: Number(latest.buy_rate),
        sell_rate: Number(latest.sell_rate),
        rate_date: latest.rate_date,
        fetched_at: latest.fetched_at,
        live: false,
        warning: `No se pudo consultar BCCR en vivo (${err.message}). Mostrando último tipo de cambio registrado.`,
      };
    }
    throw err;
  }
}

async function getExchangeRateHistory(limit = 30) {
  return db.ExchangeRate.findAll({
    order: [['rate_date', 'DESC'], ['fetched_at', 'DESC']],
    limit,
  });
}

module.exports = {
  getCurrentExchangeRate,
  getExchangeRateHistory,
  parseBccrXmlValue,
  formatBccrDate,
};
