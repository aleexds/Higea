'use strict';

/**
 * Cliente unificado para proveedores de IA (DeepSeek / OpenAI / Gemini) con timeout (RNF-06)
 * y fallback determinístico estructurado cuando no hay API key configurada (RNF-08).
 */
async function callLLM({ systemPrompt, userPrompt, fallbackBuilder }) {
  const provider = (process.env.AI_PROVIDER || 'deepseek').toLowerCase();
  const defaultModels = {
    deepseek: 'deepseek-chat',
    openai: 'gpt-4o-mini',
    gemini: 'gemini-2.0-flash',
  };
  const model = process.env.AI_MODEL || defaultModels[provider] || 'deepseek-chat';
  const apiKey = process.env.AI_API_KEY;
  const timeoutMs = Number(process.env.AI_TIMEOUT_MS) || 15000;

  if (!apiKey || provider === 'mock') {
    const fallback =
      typeof fallbackBuilder === 'function'
        ? fallbackBuilder()
        : { summary: 'Respuesta generada en modo clínico local.' };
    return {
      provider: 'local-clinical-engine',
      model: 'higea-deterministic-v1',
      content: fallback,
      usedFallback: true,
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    if (provider === 'deepseek' || provider === 'openai') {
      const endpoint =
        process.env.AI_BASE_URL ||
        (provider === 'deepseek'
          ? 'https://api.deepseek.com/chat/completions'
          : 'https://api.openai.com/v1/chat/completions');

      const resp = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.2,
        }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        throw new Error(`${provider.toUpperCase()} HTTP ${resp.status}`);
      }
      const data = await resp.json();
      const text = data.choices?.[0]?.message?.content || '';
      return { provider, model, content: { text }, usedFallback: false };
    }

    // Gemini REST API
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: { temperature: 0.2 },
      }),
      signal: controller.signal,
    });

    if (!resp.ok) {
      throw new Error(`Gemini HTTP ${resp.status}`);
    }
    const data = await resp.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    return { provider, model, content: { text }, usedFallback: false };
  } catch (err) {
    if (typeof fallbackBuilder === 'function') {
      return {
        provider: `${provider}-fallback`,
        model,
        content: fallbackBuilder(),
        usedFallback: true,
        warning: err.name === 'AbortError' ? `Timeout IA (${timeoutMs} ms)` : err.message,
      };
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { callLLM };
