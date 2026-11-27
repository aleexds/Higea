'use strict';

const db = require('../../models');

/**
 * Envuelve cada ejecución de agente IA con:
 * - medición de latencia
 * - registro obligatorio en ai_agent_runs (RF-15)
 * - manejo controlado de bloqueos de guardrail y errores (RNF-08)
 */
async function executeAuditedAgent({
  agentName,
  user,
  patientId = null,
  inputPayload,
  handler,
}) {
  const startedAt = Date.now();
  const primaryRole = (user && Array.isArray(user.roles) && user.roles[0]) || 'unknown';

  try {
    const result = await handler();
    const latencyMs = Date.now() - startedAt;

    const status = result.blocked ? 'blocked_guardrail' : 'success';
    const run = await db.AiAgentRun.create({
      tenant_id: user?.tenant_id || null,
      user_id: user?.id || null,
      patient_id: patientId,
      agent_name: agentName,
      role_used: primaryRole,
      model_provider: result.provider || process.env.AI_PROVIDER || 'local-clinical-engine',
      model_name: result.model || process.env.AI_MODEL || 'higea-deterministic-v1',
      input_payload: inputPayload,
      output_payload: result.output,
      latency_ms: latencyMs,
      status,
      error_message: result.blocked ? result.blockReason || 'Bloqueado por guardrail clínico' : null,
    });

    return {
      run_id: run.id,
      agent: agentName,
      status,
      latency_ms: latencyMs,
      provider: run.model_provider,
      model: run.model_name,
      data: result.output,
    };
  } catch (err) {
    const latencyMs = Date.now() - startedAt;
    await db.AiAgentRun.create({
      tenant_id: user?.tenant_id || null,
      user_id: user?.id || null,
      patient_id: patientId,
      agent_name: agentName,
      role_used: primaryRole,
      model_provider: process.env.AI_PROVIDER || 'local-clinical-engine',
      model_name: process.env.AI_MODEL || 'higea-deterministic-v1',
      input_payload: inputPayload,
      output_payload: null,
      latency_ms: latencyMs,
      status: 'error',
      error_message: err.message,
    });
    throw err;
  }
}

module.exports = { executeAuditedAgent };
