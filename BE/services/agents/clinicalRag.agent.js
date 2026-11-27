'use strict';

const db = require('../../models');
const { callLLM } = require('./llm.client');
const { executeAuditedAgent } = require('./baseAgent');

/**
 * Agente 5: Consulta Documental y Protocolos RAG (Rol: Médico)
 * Recupera fragmentos de clinical_documents y cita las fuentes recuperadas.
 */
async function runClinicalRag({ user, query, category = null, patientId = null }) {
  const where = category ? { category } : {};
  const docs = await db.ClinicalDocument.findAll({ where });

  const terms = String(query)
    .toLowerCase()
    .split(/[^a-z0-9áéíóúñ]+/i)
    .filter((w) => w.length >= 3);

  const scored = docs
    .map((doc) => {
      const haystack = `${doc.title} ${doc.content} ${JSON.stringify(doc.tags || [])}`.toLowerCase();
      const score = terms.reduce((acc, term) => (haystack.includes(term) ? acc + 1 : acc), 0);
      return { doc, score };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const retrieved = scored.length > 0 ? scored.map((s) => s.doc) : docs.slice(0, 2);

  return executeAuditedAgent({
    agentName: 'clinical_protocol_rag',
    user,
    patientId,
    inputPayload: { query, category, matched_docs: retrieved.map((d) => d.id) },
    handler: async () => {
      const citations = retrieved.map((d) => ({
        document_id: d.id,
        title: d.title,
        source: d.source,
        category: d.category,
        excerpt: d.content.slice(0, 360),
      }));

      const llm = await callLLM({
        systemPrompt:
          'Eres un asistente clínico RAG para médicos en Higea. Responde estrictamente usando los fragmentos de protocolos clínicos recuperados y cita siempre las fuentes.',
        userPrompt: `Pregunta clínica: ${query}\n\nDocumentos recuperados:\n${citations
          .map((c, i) => `[${i + 1}] ${c.title} (${c.source}): ${c.excerpt}`)
          .join('\n')}`,
        fallbackBuilder: () => ({
          answer:
            citations.length > 0
              ? `Según la documentación clínica recuperada (${citations.map((c) => c.title).join('; ')}): ${citations[0].excerpt}`
              : 'No se encontraron protocolos cargados que coincidan con la consulta.',
          citations,
          medical_supervision_notice:
            'Respuesta de apoyo basada en protocolos cargados. La decisión clínica final corresponde al profesional médico.',
        }),
      });

      return {
        provider: llm.provider,
        model: llm.model,
        output: {
          ...llm.content,
          citations,
        },
      };
    },
  });
}

module.exports = { runClinicalRag };
