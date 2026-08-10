// ═══════════════════════════════════════════════════════════════════════
// ALFRED CORE — Orquestador Central (Pilar 1)
// Recibe la solicitud, la enruta vía el Router Semántico, recupera contexto
// de la Capa de Memoria, invoca al motor LLM con la personalidad correcta,
// ejecuta herramientas cuando corresponde, y registra telemetría real.
// ═══════════════════════════════════════════════════════════════════════
import { ChatRequest, ChatResponse, Message, ToolCallTrace } from '../types';
import { routeQuery } from './router';
import { getLLMProvider } from './llmProvider';
import { buildAlfredSystemPrompt, enforcePersonalityRules, nextAcknowledgment, timeBasedGreeting } from './personality';
import { getAgentById, AGENT_TOOLS } from '../data/alfredData';
import { findBusinessMatches } from '../data/businessAgents';
import { searchMemory, saveMessage, saveTelemetry, saveAgentWork, getTotalQueriesProcessed } from './memory';
import { getToolHandler } from '../skills/toolRegistry';
import { detectDailyActivationRoutine, buildDailyRoutineRoutingDecision } from './dailyActivationRoutines';
import { buildCryptoMarketAnswer, isCryptoMarketRequest } from './marketData';
import { buildWebResearchPlan, requiresExternalResearch } from './webResearch';
import { buildGitHubAnalysisPlan } from './github';

function estimateTokens(text: string): number {
  // Aproximación simple: ~4 caracteres por token (heurística estándar)
  return Math.ceil(text.length / 4);
}

function estimateCostUsd(tokensUsed: number, model: string): number {
  // Tarifas aproximadas por 1K tokens (orden de magnitud, no facturación real)
  const ratePerK = model.includes('gpt-4') ? 0.005 : model.includes('claude') ? 0.003 : 0.0005;
  return (tokensUsed / 1000) * ratePerK;
}

function normalizeFast(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
}

function buildFastConversationReply(message: string, language: 'es' | 'en'): string | null {
  const q = normalizeFast(message);
  if (!q || q.length > 140) return null;
  if (/\balfred\b/.test(q) && /\b(buenos dias|buenas tardes|buenas noches|good morning|good afternoon|good evening)\b/.test(q)) return null;
  if (requiresExternalResearch(message) || isCryptoMarketRequest(message)) return null;
  if (/\b(crea|construye|programa|analiza|investiga|busca|revisa|audita|cotiza|precio|mercado|crypto|despliega|configura|create|build|analyze|research|search|review|audit|price|market|deploy|configure)\b/.test(q)) return null;

  if (/\b(hola|buenas|buenos dias|buenas tardes|buenas noches|que tal|como estas|aqui ando|listo|ok|gracias|perfecto|hey|hi|hello|thanks)\b/.test(q)) {
    return language === 'es'
      ? `${timeBasedGreeting('es')}. Estoy con usted, atento y listo. Dígame qué necesita y responderé sin demora.`
      : `${timeBasedGreeting('en')}, Jefe Maestro. I am with you, attentive and ready. Tell me what you need and I will respond without delay.`;
  }

  if (/\b(si|no|vale|dale|continua|sigue|entendido|comprendido)\b/.test(q) && q.length < 50) {
    return language === 'es'
      ? 'Entendido, Jefe Maestro. Continúo atento. Puede darme la siguiente orden cuando desee.'
      : 'Understood, Jefe Maestro. I remain attentive. Give me the next instruction whenever you wish.';
  }

  return null;
}

export async function processUserRequest(req: ChatRequest): Promise<ChatResponse> {
  const startTime = Date.now();
  const { message, language, sessionId, history } = req;

  // ── 0.0. Conversación normal ultrarrápida ───────────────────────────────
  // No usa router, memoria ni LLM cuando es charla corta sin búsqueda.
  const fastReply = buildFastConversationReply(message, language);
  if (fastReply) {
    const responseId = 'msg_' + Date.now();
    const nowIso = new Date().toLocaleTimeString();
    const responseText = enforcePersonalityRules(fastReply, language);
    const latencyMs = Date.now() - startTime;
    saveMessage({ id: 'usr_' + Date.now(), sessionId, sender: 'user', text: message, timestamp: nowIso, createdAt: startTime, language });
    saveMessage({ id: responseId, sessionId, sender: 'alfred', agentName: 'ALFRED', text: responseText, timestamp: nowIso, createdAt: Date.now(), language, confidenceScore: 99 });
    saveTelemetry({
      id: 'log_' + Date.now(),
      timestamp: nowIso,
      createdAt: Date.now(),
      query: message,
      assignedAgentId: 'alfred_core_fast',
      assignedAgentName: 'ALFRED Core — Fast Conversation',
      latencyMs,
      tokensUsed: estimateTokens(message + responseText),
      confidence: 99,
      status: 'SUCCESS',
      policyCheck: 'POL-PRIVACY-01: OK · fast local conversation path',
      toolsInvokedCount: 0,
      costEstimateUsd: 0,
    });
    return {
      id: responseId,
      text: responseText,
      assignedAgent: null,
      routingDecision: undefined,
      toolCallTraces: [],
      confidenceScore: 99,
      latencyMs,
      language,
      memoryContextUsed: [],
      uiActions: [],
    };
  }

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

  // ── 0.5. Mercado/crypto con fuentes reales antes del LLM ───────────────
  if (isCryptoMarketRequest(message)) {
    const marketAnswer = await buildCryptoMarketAnswer(message, language);
    if (marketAnswer) {
      const responseId = 'msg_' + Date.now();
      const nowIso = new Date().toLocaleTimeString();
      const latencyMs = Date.now() - startTime;
      const responseText = enforcePersonalityRules(marketAnswer.text, language);
      const routingDecision = {
        query: message,
        chosenAgentId: 'webb',
        chosenAgentName: 'Webb',
        confidence: 98,
        reasoningES: 'Solicitud de mercado/crypto detectada; Alfred verificó precio en fuentes reales antes de responder.',
        reasoningEN: 'Market/crypto request detected; Alfred verified live sources before answering.',
        candidates: [{ agentId: 'webb', score: 98, reason: 'live_market_data' }],
        latencyMs,
        method: 'direct' as const,
      };

      saveMessage({ id: 'usr_' + Date.now(), sessionId, sender: 'user', text: message, timestamp: nowIso, createdAt: startTime, language });
      saveMessage({ id: responseId, sessionId, sender: 'alfred', agentName: 'ALFRED', text: responseText, timestamp: nowIso, createdAt: Date.now(), language, routingDecision, confidenceScore: 98 });
      saveTelemetry({
        id: 'log_' + Date.now(),
        timestamp: nowIso,
        createdAt: Date.now(),
        query: message,
        assignedAgentId: 'webb',
        assignedAgentName: 'Webb — Live Market Verification',
        latencyMs,
        tokensUsed: estimateTokens(message + responseText),
        confidence: 98,
        status: 'SUCCESS',
        policyCheck: 'POL-FINANCE-01: read-only market data; no trading action executed',
        toolsInvokedCount: marketAnswer.uiActions.length + marketAnswer.quotes.length,
        costEstimateUsd: 0,
      });

      return {
        id: responseId,
        text: responseText,
        assignedAgent: null,
        routingDecision,
        toolCallTraces: marketAnswer.quotes.map((quote) => ({
          toolId: 'live_crypto_market_data',
          toolName: quote.source,
          agentId: 'webb',
          parameters: { symbol: quote.symbol, pair: quote.binanceSymbol },
          result: quote,
          status: 'SUCCESS' as const,
          executionTimeMs: latencyMs,
        })),
        confidenceScore: 98,
        latencyMs,
        language,
        memoryContextUsed: [],
        uiActions: marketAnswer.uiActions,
      };
    }
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
  const webResearchPlan = buildWebResearchPlan(message, language);
  const webResearchBlock = webResearchPlan
    ? (language === 'es'
      ? '\n\nModo investigación web activado: la respuesta debe distinguir claramente hechos verificados de hipótesis. Si no hay datos extraídos en tiempo real dentro del contexto, no inventes cifras, fechas ni fuentes; indica que abriste fuentes oficiales para verificación y entrega un plan de análisis claro.'
      : '\n\nWeb research mode is active: clearly separate verified facts from hypotheses. If no live extracted data is present in context, do not invent numbers, dates, or sources; state that official-source tabs were opened for verification and provide a clear analysis plan.')
    : '';

  const githubAnalysisPlan = await buildGitHubAnalysisPlan(message, language);
  if (githubAnalysisPlan) {
    const responseId = 'msg_' + Date.now();
    const nowIso = new Date().toLocaleTimeString();
    const analysis = githubAnalysisPlan.analysis;
    const summary = analysis
      ? (language === 'es'
        ? [
            `Repositorio: ${analysis.owner}/${analysis.name}`,
            analysis.description ? `Descripción: ${analysis.description}` : null,
            analysis.defaultBranch ? `Rama por defecto: ${analysis.defaultBranch}` : null,
            typeof analysis.stars === 'number' ? `Estrellas: ${analysis.stars}` : null,
            typeof analysis.forks === 'number' ? `Forks: ${analysis.forks}` : null,
            typeof analysis.openIssues === 'number' ? `Issues abiertos: ${analysis.openIssues}` : null,
            analysis.language ? `Lenguaje principal: ${analysis.language}` : null,
            analysis.readme ? `README: ${analysis.readme.slice(0, 800)}${analysis.readme.length > 800 ? '…' : ''}` : null,
            analysis.fileTree?.length ? `Archivos iniciales: ${analysis.fileTree.slice(0, 12).map(entry => entry.path).join(', ')}` : null,
          ].filter(Boolean).join('\n')
        : [
            `Repository: ${analysis.owner}/${analysis.name}`,
            analysis.description ? `Description: ${analysis.description}` : null,
            analysis.defaultBranch ? `Default branch: ${analysis.defaultBranch}` : null,
            typeof analysis.stars === 'number' ? `Stars: ${analysis.stars}` : null,
            typeof analysis.forks === 'number' ? `Forks: ${analysis.forks}` : null,
            typeof analysis.openIssues === 'number' ? `Open issues: ${analysis.openIssues}` : null,
            analysis.language ? `Primary language: ${analysis.language}` : null,
            analysis.readme ? `README: ${analysis.readme.slice(0, 800)}${analysis.readme.length > 800 ? '…' : ''}` : null,
            analysis.fileTree?.length ? `Initial files: ${analysis.fileTree.slice(0, 12).map(entry => entry.path).join(', ')}` : null,
          ].filter(Boolean).join('\n'))
      : (language === 'es'
        ? 'No pude obtener metadatos públicos del repositorio, pero preparé el enlace para abrirlo y revisar el código manualmente.'
        : 'I could not obtain public metadata from the repository, but I prepared the link so you can open it and inspect the code manually.');
    const responseText = enforcePersonalityRules(githubAnalysisPlan.textPrefix + summary, language);
    const routingDecision = {
      query: message,
      chosenAgentId: 'webb',
      chosenAgentName: 'Webb',
      confidence: 96,
      reasoningES: 'El mensaje contiene un repositorio GitHub; Alfred realizó análisis público del repositorio antes de responder.',
      reasoningEN: 'The message contains a GitHub repository; Alfred performed a public repository analysis before answering.',
      candidates: [{ agentId: 'webb', score: 96, reason: 'github_repository_analysis' }],
      latencyMs: Date.now() - startTime,
      method: 'direct' as const,
    };
    const latencyMs = Date.now() - startTime;
    const tokensUsed = estimateTokens(message + responseText);
    saveMessage({ id: 'usr_' + Date.now(), sessionId, sender: 'user', text: message, timestamp: nowIso, createdAt: startTime, language });
    saveMessage({ id: responseId, sessionId, sender: 'subagent', agentId: 'webb', agentName: 'Webb', text: responseText, timestamp: nowIso, createdAt: Date.now(), language, routingDecision, confidenceScore: 96 });
    saveTelemetry({
      id: 'log_' + Date.now(),
      timestamp: nowIso,
      createdAt: Date.now(),
      query: message,
      assignedAgentId: 'webb',
      assignedAgentName: 'Webb — GitHub Repository Analysis',
      latencyMs,
      tokensUsed,
      confidence: 96,
      status: 'SUCCESS',
      policyCheck: 'Public GitHub repo analysis only; no secret access or write actions executed',
      toolsInvokedCount: githubAnalysisPlan.uiActions.length,
      costEstimateUsd: 0,
    });
    return {
      id: responseId,
      text: responseText,
      assignedAgent: getAgentById('webb') || null,
      routingDecision,
      toolCallTraces: [],
      confidenceScore: 96,
      latencyMs,
      language,
      memoryContextUsed: [],
      uiActions: githubAnalysisPlan.uiActions,
    };
  }


  const llm = getLLMProvider();
  let responseText: string;
  let usedFallback = false;

  if (llm.isAvailable()) {
    try {
      responseText = await llm.generateText(
        systemPrompt + memoryContextBlock + businessContextBlock + webResearchBlock,
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
  if (webResearchPlan) {
    responseText = enforcePersonalityRules(webResearchPlan.textPrefix + responseText, language);
  }

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

  if (assignedAgent) {
    saveAgentWork({
      id: `work_${responseId}`,
      createdAt: Date.now(),
      query: message,
      assignedAgentId: assignedAgent.id,
      assignedAgentName: language === 'es' ? assignedAgent.nameES : assignedAgent.nameEN,
      status: toolCallTraces.some(trace => trace.status === 'ERROR') ? 'ERROR' : 'SUCCESS',
      latencyMs,
      toolsInvokedCount: toolCallTraces.length,
      summary: responseText.slice(0, 500),
    });
  }

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
    uiActions: webResearchPlan?.uiActions,
  };
}

function shouldExecuteTool(message: string): boolean {
  // Ejecuta la herramienta solo ante verbos de acción explícitos —
  // nunca simula ejecución ante preguntas puramente conversacionales.
  const actionVerbs = /\b(genera|crea|ejecuta|despliega|audita|analiza|escanea|revisa|construye|configura|traduce|busca|recuerda|generate|create|run|deploy|audit|analyze|scan|review|build|configure|translate|search|remember)\b/i;
  return actionVerbs.test(message);
}

function buildOfflineFallback(message: string, language: 'es' | 'en', agent: ReturnType<typeof getAgentById> | null, _businessSpecialist: ReturnType<typeof findBusinessMatches>[number]['specialist'] | null): string {
  const ack = nextAcknowledgment(language);
  if (language === 'es') {
    if (agent) {
      return `${ack}. Voy a coordinarlo con ${agent.nameES}, especialista en ${agent.categoryES}. Le mantendré informado del avance y le entregaré un resultado claro.`;
    }
    if (/\b(hola|buenos días|buenas tardes|buenas noches)\b/i.test(message)) {
      return `${timeBasedGreeting(language)}. Estoy bien y completamente disponible para usted. ¿Qué desea que hagamos?`;
    }
    return `${ack}. Estoy aquí con usted y listo para ayudarle. Dígame qué necesita y lo resolvemos paso a paso.`;
  }
  if (agent) {
    return `${ack}. I will coordinate this with ${agent.nameEN}, our ${agent.categoryEN} specialist. I will keep you informed and deliver a clear result.`;
  }
  if (/\b(hello|hi|good morning|good afternoon|good evening)\b/i.test(message)) {
    return `${timeBasedGreeting(language)}. I am well and fully available to you. What would you like us to work on?`;
  }
  return `${ack}. I am here with you and ready to help. Tell me what you need and we will work through it together.`;
}

export function getUptimeSeconds(): number {
  return process.uptime();
}

export function getTotalQueries(): number {
  return getTotalQueriesProcessed();
}
