// ═══════════════════════════════════════════════════════════════════════
// ALFRED CORE — Router Semántico (Pilar 2)
// Analiza la INTENCIÓN de la solicitud (no coincidencia de palabras clave)
// y decide qué sub-agente debe atender la tarea, optimizando costo/latencia.
//
// Estrategia:
//   1. Clasificación real vía LLM (function calling / structured output)
//      cuando hay proveedor configurado — este es el camino primario.
//   2. Fallback determinista por keywords cuando el LLM no está disponible
//      o falla (offline-first, nunca deja al usuario sin respuesta).
// ═══════════════════════════════════════════════════════════════════════
import { SUB_AGENTS } from '../data/alfredData';
import { RoutingDecision, SubAgent } from '../types';
import { getLLMProvider } from './llmProvider';

function keywordScore(query: string, agent: SubAgent): number {
  const q = query.toLowerCase();
  let score = 0;
  for (const kw of agent.keywords) {
    if (q.includes(kw.toLowerCase())) score += 1;
  }
  return score;
}

function keywordFallbackRouting(query: string): RoutingDecision {
  const start = Date.now();
  const scores = SUB_AGENTS.map(agent => ({ agentId: agent.id, score: keywordScore(query, agent) }));
  scores.sort((a, b) => b.score - a.score);

  const top = scores[0];
  const chosenAgent = top && top.score > 0 ? SUB_AGENTS.find(a => a.id === top.agentId) : null;

  return {
    query,
    chosenAgentId: chosenAgent?.id || null,
    chosenAgentName: chosenAgent?.nameES || null,
    confidence: top && top.score > 0 ? Math.min(60 + top.score * 8, 92) : 40,
    reasoningES: chosenAgent
      ? `Coincidencia de palabras clave con el dominio de ${chosenAgent.nameES} (${chosenAgent.categoryES}).`
      : 'Sin coincidencias claras; Alfred procesará la solicitud directamente.',
    reasoningEN: chosenAgent
      ? `Keyword match with ${chosenAgent.nameEN}'s domain (${chosenAgent.categoryEN}).`
      : 'No clear match; Alfred will process the request directly.',
    candidates: scores.filter(s => s.score > 0).slice(0, 3),
    latencyMs: Date.now() - start,
    method: 'keyword_fallback',
  };
}

/**
 * Clasificación semántica real vía LLM. El modelo recibe la lista de
 * sub-agentes (nombre, rol, descripción) y devuelve el agente elegido en
 * formato estructurado. Esto es routing por SIGNIFICADO, no por substring.
 */
export async function routeQuery(query: string, language: 'es' | 'en'): Promise<RoutingDecision> {
  const start = Date.now();
  const llm = getLLMProvider();

  if (!llm.isAvailable()) {
    return keywordFallbackRouting(query);
  }

  try {
    const agentCatalog = SUB_AGENTS.map(a => ({
      id: a.id,
      name: language === 'es' ? a.nameES : a.nameEN,
      role: language === 'es' ? a.roleES : a.roleEN,
      description: language === 'es' ? a.descriptionES : a.descriptionEN,
    }));

    const routingPrompt = language === 'es'
      ? `Eres el Router Semántico de Alfred. Analiza la SOLICITUD del usuario y decide, basándote en el SIGNIFICADO (no en palabras clave literales), cuál de los siguientes 12 sub-agentes debe atenderla. Si ninguno aplica claramente y Alfred puede responder directamente (saludo, pregunta general, conversación casual), responde con agentId: null.

SOLICITUD: "${query}"

SUB-AGENTES DISPONIBLES:
${agentCatalog.map(a => `- ${a.id}: ${a.name} (${a.role}) — ${a.description}`).join('\n')}

Responde ÚNICAMENTE con un JSON válido en este formato exacto, sin texto adicional:
{"agentId": "<id_del_agente_o_null>", "confidence": <0-100>, "reasoning": "<justificación breve en una frase>"}`
      : `You are Alfred's Semantic Router. Analyze the user's REQUEST and decide, based on MEANING (not literal keywords), which of the following 12 sub-agents should handle it. If none clearly applies and Alfred can respond directly (greeting, general question, casual conversation), respond with agentId: null.

REQUEST: "${query}"

AVAILABLE SUB-AGENTS:
${agentCatalog.map(a => `- ${a.id}: ${a.name} (${a.role}) — ${a.description}`).join('\n')}

Respond ONLY with valid JSON in this exact format, no additional text:
{"agentId": "<agent_id_or_null>", "confidence": <0-100>, "reasoning": "<brief one-sentence justification>"}`;

    const rawResponse = await llm.generateJSON(routingPrompt);
    const parsed = JSON.parse(rawResponse);

    const chosenAgent = parsed.agentId ? SUB_AGENTS.find(a => a.id === parsed.agentId) : null;

    return {
      query,
      chosenAgentId: chosenAgent?.id || null,
      chosenAgentName: chosenAgent ? (language === 'es' ? chosenAgent.nameES : chosenAgent.nameEN) : null,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 75,
      reasoningES: language === 'es' ? parsed.reasoning : (parsed.reasoning || ''),
      reasoningEN: language === 'en' ? parsed.reasoning : (parsed.reasoning || ''),
      candidates: chosenAgent ? [{ agentId: chosenAgent.id, score: parsed.confidence || 75 }] : [],
      latencyMs: Date.now() - start,
      method: 'llm_classification',
    };
  } catch (err) {
    console.warn('[Router Semántico] Fallback a keywords — clasificación LLM falló:', err);
    return keywordFallbackRouting(query);
  }
}
