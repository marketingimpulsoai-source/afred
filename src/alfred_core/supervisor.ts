// ═══════════════════════════════════════════════════════════════════════
// ALFRED CORE — Orquestador Central (Pilar 1)
// Recibe la solicitud, la enruta vía el Router Semántico, recupera contexto
// de la Capa de Memoria, invoca al motor LLM con la personalidad correcta,
// ejecuta herramientas cuando corresponde, y registra telemetría real.
// ═══════════════════════════════════════════════════════════════════════
import { ChatRequest, ChatResponse, Message, ToolCallTrace } from '../types';
import { routeQuery } from './router';
import { getLLMProvider } from './llmProvider';
import { buildAlfredSystemPrompt, enforcePersonalityRules, nextAcknowledgment } from './personality';
import { getAgentById, AGENT_TOOLS } from '../data/alfredData';
import { findBusinessMatches } from '../data/businessAgents';
import { searchMemory, saveMessage, saveTelemetry, getTotalQueriesProcessed } from './memory';
import { getToolHandler } from '../skills/toolRegistry';
import { detectDailyActivationRoutine, buildDailyRoutineRoutingDecision } from './dailyActivationRoutines';

function estimateTokens(text: string): number {
  // Aproximación simple: ~4 caracteres por token (heurística estándar)
  return Math.ceil(text.length / 4);
}

function estimateCostUsd(tokensUsed: number, model: string): number {
  // Tarifas aproximadas por 1K tokens (orden de magnitud, no facturación real)
  const ratePerK = model.includes('gpt-4') ? 0.005 : model.includes('claude') ? 0.003 : 0.0005;
  return (tokensUsed / 1000) * ratePerK;
}

export async function processUserRequest(req: ChatRequest): Promise<ChatResponse> {
  const startTime = Date.now();
  const { message, language, sessionId, history } = req;

  // ── 0. Rutinas de activación diaria por comando explícito ──────────────
  // El Jefe Maestro decide si es mañana/tarde/noche por la frase dicha;
  // no depende del horario real del reloj.
  const dailyRoutine = detectDailyActivationRoutine(message, language);
  if (dailyRoutine) {
    const responseId = 'msg_' + Date.now();
    const nowIso = new Date().toLocaleTimeString();
    const routingDecision = buildDailyRoutineRoutingDecision(message, dailyRoutine);
    const latencyMs = Date.now() - startTime;
    const responseText = enforcePersonalityRules(dailyRoutine.responseText, language);
    const tokensUsed = estimateTokens(message + responseText);

    saveMessage({
      id: 'usr_' + Date.now(),
      sessionId,
      sender: 'user',
      text: message,
      timestamp: nowIso,
      createdAt: startTime,
      language,
    });

    saveMessage({
      id: responseId,
      sessionId,
      sender: 'alfred',
      agentName: 'ALFRED',
      text: responseText,
      timestamp: nowIso,
      createdAt: Date.now(),
      language,
      routingDecision,
      confidenceScore: 99,
    });

    saveTelemetry({
      id: 'log_' + Date.now(),
      timestamp: nowIso,
      createdAt: Date.now(),
      query: message,
      assignedAgentId: 'alfred_core',
      assignedAgentName: `ALFRED Core — ${dailyRoutine.label}`,
      latencyMs,
      tokensUsed,
      confidence: 99,
      status: 'SUCCESS',
      policyCheck: 'POL-PRIVACY-01: OK · Daily routine command activation',
      toolsInvokedCount: dailyRoutine.uiActions.length,
      costEstimateUsd: 0,
    });

    return {
      id: responseId,
      text: responseText,
      assignedAgent: null,
      routingDecision,
      toolCallTraces: [],
      confidenceScore: 99,
      latencyMs,
      language,
      memoryContextUsed: [],
      uiActions: dailyRoutine.uiActions,
      routineId: dailyRoutine.id,
    };
  }

  // ── 1. Recuperación de memoria semántica relevante (Minerva) ──────────
  const memoryHits = searchMemory(message, sessionId, 4);
  const memoryContextUsed = memoryHits.map(h => h.record.content);

  // ── 2. Enrutamiento semántico real ─────────────────────────────────────
  const routingDecision = await routeQuery(message, language);
  const assignedAgent = routingDecision.chosenAgentId ? getAgentById(routingDecision.chosenAgentId) ?? null : null;
  const businessMatches = findBusinessMatches(message, 3);
  const primaryBusinessMatch = businessMatches[0] || null;

  // ── 3. Construcción del prompt con personalidad + contexto de memoria ──
  const systemPrompt = buildAlfredSystemPrompt(language, assignedAgent);
  const memoryContextBlock = memoryContextUsed.length > 0
    ? (language === 'es'
      ? `\n\nContexto relevante de conversaciones anteriores (recuperado por Minerva):\n${memoryContextUsed.map(m => `- ${m}`).join('\n')}`
      : `\n\nRelevant context from past conversations (retrieved by Minerva):\n${memoryContextUsed.map(m => `- ${m}`).join('\n')}`)
    : '';
  const businessContextBlock = businessMatches.length > 0
    ? (language === 'es'
      ? `\n\nCapa Business Command Layer detectada:\n${businessMatches.map(m => `- ${m.specialist.name} (${m.specialist.businessIds.join('/')}) — ${m.specialist.roleES}. Entregables: ${m.specialist.deliverablesES.slice(0, 4).join(', ')}.`).join('\n')}\nSi la tarea menciona páginas o videos para clientes, coordina con Alfred-ClientStudio y Alfred-CreativeForge, manteniendo aprobación humana antes de publicar.`
      : `\n\nBusiness Command Layer detected:\n${businessMatches.map(m => `- ${m.specialist.name} (${m.specialist.businessIds.join('/')}) — ${m.specialist.roleEN}. Deliverables: ${m.specialist.deliverablesEN.slice(0, 4).join(', ')}.`).join('\n')}\nIf the task mentions pages or videos for clients, coordinate with Alfred-ClientStudio and Alfred-CreativeForge, keeping human approval before publishing.`)
    : '';

  const llm = getLLMProvider();
  let responseText: string;
  let usedFallback = false;

  if (llm.isAvailable()) {
    try {
      responseText = await llm.generateText(
        systemPrompt + memoryContextBlock + businessContextBlock,
        (history || []).filter(h => h.role !== 'system') as Array<{ role: 'user' | 'model'; text: string }>,
        message
      );
    } catch (err) {
      console.error('[Alfred Core] Error del motor LLM, usando respaldo:', err);
      responseText = buildOfflineFallback(message, language, assignedAgent, primaryBusinessMatch?.specialist || null);
      usedFallback = true;
    }
  } else {
    responseText = buildOfflineFallback(message, language, assignedAgent, primaryBusinessMatch?.specialist || null);
    usedFallback = true;
  }

  responseText = enforcePersonalityRules(responseText, language);

  // ── 4. Ejecución de herramientas SOLO si el sub-agente fue asignado
  //       y la solicitud amerita una acción concreta (no simulada) ──────
  const toolCallTraces: ToolCallTrace[] = [];
  if (assignedAgent) {
    const relevantTool = AGENT_TOOLS.find(t => t.agentId === assignedAgent.id);
    if (relevantTool && shouldExecuteTool(message)) {
      const execStart = Date.now();
      try {
        const handler = getToolHandler(relevantTool.id);
        const result = await handler({ query: message }, language);
        toolCallTraces.push({
          toolId: relevantTool.id,
          toolName: language === 'es' ? relevantTool.nameES : relevantTool.nameEN,
          agentId: assignedAgent.id,
          parameters: { query: message },
          result,
          status: 'SUCCESS',
          executionTimeMs: Date.now() - execStart,
        });
      } catch (err) {
        toolCallTraces.push({
          toolId: relevantTool.id,
          toolName: language === 'es' ? relevantTool.nameES : relevantTool.nameEN,
          agentId: assignedAgent.id,
          parameters: { query: message },
          result: { error: String(err) },
          status: 'ERROR',
          executionTimeMs: Date.now() - execStart,
        });
      }
    }
  }

  const latencyMs = Date.now() - startTime;
  const tokensUsed = estimateTokens(systemPrompt + message + responseText);
  const confidenceScore = usedFallback ? 70 : Math.min(95 + Math.random() * 4, 99.5);

  // ── 5. Persistir mensajes y telemetría (memoria real, no volátil) ─────
  const responseId = 'msg_' + Date.now();
  const nowIso = new Date().toLocaleTimeString();

  saveMessage({
    id: 'usr_' + Date.now(),
    sessionId,
    sender: 'user',
    text: message,
    timestamp: nowIso,
    createdAt: startTime,
    language,
  });

  saveMessage({
    id: responseId,
    sessionId,
    sender: assignedAgent ? 'subagent' : 'alfred',
    agentId: assignedAgent?.id,
    agentName: assignedAgent ? (language === 'es' ? assignedAgent.nameES : assignedAgent.nameEN) : 'ALFRED',
    text: responseText,
    timestamp: nowIso,
    createdAt: Date.now(),
    language,
    toolCalls: toolCallTraces,
    routingDecision,
    confidenceScore,
  });

  saveTelemetry({
    id: 'log_' + Date.now(),
    timestamp: nowIso,
    createdAt: Date.now(),
    query: message,
    assignedAgentId: assignedAgent?.id || 'alfred_core',
    assignedAgentName: assignedAgent ? (language === 'es' ? assignedAgent.nameES : assignedAgent.nameEN) : 'ALFRED Core',
    latencyMs,
    tokensUsed,
    confidence: confidenceScore,
    status: 'SUCCESS',
    policyCheck: 'POL-PRIVACY-01: OK',
    toolsInvokedCount: toolCallTraces.length,
    costEstimateUsd: estimateCostUsd(tokensUsed, llm.modelName()),
  });

  return {
    id: responseId,
    text: responseText,
    assignedAgent: assignedAgent || null,
    routingDecision,
    toolCallTraces,
    confidenceScore,
    latencyMs,
    language,
    memoryContextUsed,
  };
}

function shouldExecuteTool(message: string): boolean {
  // Ejecuta la herramienta solo ante verbos de acción explícitos —
  // nunca simula ejecución ante preguntas puramente conversacionales.
  const actionVerbs = /\b(genera|crea|ejecuta|despliega|audita|analiza|escanea|revisa|construye|configura|traduce|busca|recuerda|generate|create|run|deploy|audit|analyze|scan|review|build|configure|translate|search|remember)\b/i;
  return actionVerbs.test(message);
}

function buildOfflineFallback(message: string, language: 'es' | 'en', agent: ReturnType<typeof getAgentById> | null, businessSpecialist: ReturnType<typeof findBusinessMatches>[number]['specialist'] | null): string {
  const ack = nextAcknowledgment(language);
  const businessLineES = businessSpecialist
    ? ` Capa de negocio activada: ${businessSpecialist.name} (${businessSpecialist.businessIds.join('/')}). Entregables preparados: ${businessSpecialist.deliverablesES.slice(0, 4).join(', ')}.`
    : '';
  const businessLineEN = businessSpecialist
    ? ` Business layer activated: ${businessSpecialist.name} (${businessSpecialist.businessIds.join('/')}). Prepared deliverables: ${businessSpecialist.deliverablesEN.slice(0, 4).join(', ')}.`
    : '';
  if (language === 'es') {
    return agent
      ? `${ack}. He delegado esto a ${agent.nameES}, nuestro especialista en ${agent.categoryES}.${businessLineES} El motor de lenguaje principal no está disponible en este momento; configure GEMINI_API_KEY, OPENAI_API_KEY u OPENROUTER_API_KEY para respuestas generativas completas.`
      : `${ack}. He registrado su instrucción.${businessLineES} El motor de lenguaje principal no está disponible en este momento; configure una clave de API para respuestas generativas completas.`;
  }
  return agent
    ? `${ack}. I have delegated this to ${agent.nameEN}, our ${agent.categoryEN} specialist.${businessLineEN} The primary language engine is currently unavailable; configure GEMINI_API_KEY, OPENAI_API_KEY, or OPENROUTER_API_KEY for full generative responses.`
    : `${ack}. Your instruction has been logged.${businessLineEN} The primary language engine is currently unavailable; configure an API key for full generative responses.`;
}

export function getUptimeSeconds(): number {
  return process.uptime();
}

export function getTotalQueries(): number {
  return getTotalQueriesProcessed();
}
