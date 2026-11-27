'use strict';

const db = require('../../models');
const { callLLM } = require('./llm.client');
const { executeAuditedAgent } = require('./baseAgent');

/**
 * Agente 8: Asistente de Cumplimiento y Gobernanza (Rol: Admin / Auditor)
 * Verifica consentimientos vigentes, políticas activas y anonimización frente a la Ley N.º 8968.
 */
async function runComplianceGovernance({ user, scope = 'full_audit' }) {
  const [
    totalActiveUsers,
    anonymizedUsers,
    activeLegalDocs,
    totalConsents,
    deletionRequests,
    blockedGuardrailRuns,
  ] = await Promise.all([
    db.User.count({ where: { status: 'active' } }),
    db.User.count({ where: { status: 'anonymized' } }),
    db.LegalDocument.findAll({ where: { is_active: true }, attributes: ['id', 'doc_type', 'version', 'effective_date'] }),
    db.UserConsent.count({ where: { accepted: true } }),
    db.DataDeletionRequest.findAll({ attributes: ['id', 'status', 'identity_confirmed', 'processed_at'] }),
    db.AiAgentRun.count({ where: { status: 'blocked_guardrail' } }),
  ]);

  const hasPrivacy = activeLegalDocs.some((d) => d.doc_type === 'privacy_policy');
  const hasTerms = activeLegalDocs.some((d) => d.doc_type === 'terms_of_service');
  const pendingDeletions = deletionRequests.filter((r) => r.status === 'pending' || r.status === 'processing').length;

  const snapshot = {
    active_users: totalActiveUsers,
    anonymized_users: anonymizedUsers,
    privacy_policy_active: hasPrivacy,
    terms_of_service_active: hasTerms,
    accepted_consents_count: totalConsents,
    deletion_requests_total: deletionRequests.length,
    deletion_requests_pending: pendingDeletions,
    guardrail_blocks_logged: blockedGuardrailRuns,
  };

  return executeAuditedAgent({
    agentName: 'compliance_governance_assistant',
    user,
    inputPayload: { scope, snapshot },
    handler: async () => {
      const complianceScore =
        (hasPrivacy ? 30 : 0) +
        (hasTerms ? 30 : 0) +
        (totalConsents >= totalActiveUsers ? 25 : 10) +
        (pendingDeletions === 0 ? 15 : 5);

      const llm = await callLLM({
        systemPrompt:
          'Eres un auditor asistente de cumplimiento de la Ley N.º 8968 de Costa Rica para Higea. Evalúa el estado de consentimientos, políticas y derechos ARCO.',
        userPrompt: `Alcance: ${scope}. Estado de gobernanza: ${JSON.stringify(snapshot)}`,
        fallbackBuilder: () => ({
          scope,
          ley_8968_compliance_score: complianceScore,
          status: complianceScore >= 85 ? 'compliant' : 'attention_required',
          snapshot,
          findings: [
            hasPrivacy && hasTerms
              ? 'Política de Privacidad y Términos y Condiciones activos y versionados en base de datos.'
              : 'Falta activar documentos legales obligatorios.',
            `Se registran ${totalConsents} constancias de consentimiento informado y ${blockedGuardrailRuns} bloqueo(s) preventivo(s) por guardrails clínicos.`,
            pendingDeletions === 0
              ? 'No hay solicitudes de supresión/anonimización pendientes de atención.'
              : `Existen ${pendingDeletions} solicitud(es) de eliminación pendientes.`,
          ],
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

module.exports = { runComplianceGovernance };
