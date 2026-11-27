'use strict';

jest.mock('../models', () => ({
  DiagnosticReport: { findByPk: jest.fn() },
  AiAgentRun: { create: jest.fn() },
  ExternalApiLog: { create: jest.fn() },
  ExchangeRate: { findOne: jest.fn(), create: jest.fn() },
}));

const db = require('../models');
const bccrService = require('../services/bccr.service');
const { runLabExamExplainer } = require('../services/agents/labExamExplainer.agent');

describe('Servicios Externos (BCCR) y Guardrails de Agentes IA', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Servicio BCCR', () => {
    test('parsea correctamente NUM_VALOR desde respuesta XML escapada del BCCR', () => {
      const sampleXml = '&lt;Datos_de_INGC011_CAT_INDICADORECONOMIC&gt;&lt;INGC011_CAT_INDICADORECONOMIC&gt;&lt;NUM_VALOR&gt;512.45000000&lt;/NUM_VALOR&gt;&lt;/INGC011_CAT_INDICADORECONOMIC&gt;&lt;/Datos_de_INGC011_CAT_INDICADORECONOMIC&gt;';
      expect(bccrService.parseBccrXmlValue(sampleXml)).toBe(512.45);
    });

    test('formatea fechas a DD/MM/YYYY como exige el web service del BCCR', () => {
      const date = new Date(2026, 10, 27); // 27 nov 2026
      expect(bccrService.formatBccrDate(date)).toBe('27/11/2026');
    });

    test('retorna último tipo de cambio en BD con advertencia controlada cuando BCCR falla (RNF-08)', async () => {
      delete process.env.BCCR_TOKEN;
      db.ExchangeRate.findOne.mockResolvedValueOnce({
        source: 'BCCR',
        buy_rate: '508.5200',
        sell_rate: '512.4500',
        rate_date: '2026-11-27',
        fetched_at: new Date(),
      });

      const result = await bccrService.getCurrentExchangeRate({ forceRefresh: true });
      expect(result.buy_rate).toBe(508.52);
      expect(result.sell_rate).toBe(512.45);
      expect(result.live).toBe(false);
      expect(result.warning).toContain('No se pudo consultar BCCR');
    });
  });

  describe('Agente 3: Explicador de Exámenes (Guardrail Clínico)', () => {
    test('bloquea y audita cuando un paciente intenta explicar un reporte pending_validation', async () => {
      db.DiagnosticReport.findByPk.mockResolvedValue({
        id: 2,
        patient_id: 1,
        status: 'pending_validation',
        findings: 'Pendiente revisión',
        patient: { user_id: 3 },
        study: { title: 'Perfil Lipídico' },
      });
      db.AiAgentRun.create.mockResolvedValue({
        id: 99,
        model_provider: 'higea-clinical-guardrail',
        model_name: 'guardrail-v1',
      });

      const result = await runLabExamExplainer({
        user: { id: 3, roles: ['patient'], tenant_id: 1 },
        reportId: 2,
      });

      expect(result.status).toBe('blocked_guardrail');
      expect(result.data.blocked).toBe(true);
      expect(db.AiAgentRun.create).toHaveBeenCalledWith(
        expect.objectContaining({
          agent_name: 'lab_exam_explainer',
          status: 'blocked_guardrail',
        })
      );
    });

    test('explica correctamente un reporte aprobado (approved) para el paciente', async () => {
      db.DiagnosticReport.findByPk.mockResolvedValue({
        id: 1,
        patient_id: 1,
        status: 'approved',
        findings: 'Nódulo pulmonar basal derecho de 6 mm estable.',
        conclusion: 'Sin complicación aguda.',
        patient: { user_id: 3 },
        study: { title: 'TAC Torácico' },
      });
      db.AiAgentRun.create.mockResolvedValue({
        id: 100,
        model_provider: 'local-clinical-engine',
        model_name: 'higea-deterministic-v1',
      });

      const result = await runLabExamExplainer({
        user: { id: 3, roles: ['patient'], tenant_id: 1 },
        reportId: 1,
      });

      expect(result.status).toBe('success');
      expect(result.data.study_title).toBe('TAC Torácico');
      expect(result.data.plain_language_summary).toContain('Sin complicación aguda');
    });
  });
});
