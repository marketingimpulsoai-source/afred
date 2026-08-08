// ═══════════════════════════════════════════════════════════════════════
// ALFRED — Servidor Principal
// Expone el Orquestador Central, memoria persistente, telemetría y TTS.
// ═══════════════════════════════════════════════════════════════════════
import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { processUserRequest, getUptimeSeconds, getTotalQueries } from './src/alfred_core/supervisor';
import { getLLMProvider } from './src/alfred_core/llmProvider';
import { getMessagesBySession, getMessagesByDay, getConversationDays, getRecentTelemetry } from './src/alfred_core/memory';
import { SUB_AGENTS, AGENT_TOOLS, SAFETY_POLICIES } from './src/data/alfredData';
import { BUSINESS_AGENTS, CLIENT_SEGMENTS, PAGE_VIDEO_FACTORY, findBusinessMatches } from './src/data/businessAgents';
import { ALFRED_MEMORY_PREFERENCES } from './src/data/alfredMemoryPreferences';
import { synthesizeSpeech, getTtsStatus, listElevenLabsVoices } from './src/utils/ttsEngine';
import { getRevenueCatMcpStatus, buildHermesRevenueCatMcpConfigTemplate } from './src/integrations/revenueCatMcp';
import { getMediaRouterStatus, routeMediaRequest } from './src/data/mediaRouter';
import { getAlfredV3ApiStatus } from './src/integrations/alfredV3Apis';
import { getOperationalBriefing } from './src/integrations/operationalBriefing';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '2mb' }));

const PORT = Number(process.env.PORT) || 3000;

// ── Health & System Status ─────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  const llm = getLLMProvider();
  res.json({
    status: 'online',
    core: 'ALFRED Digital Butler v1.0',
    timestamp: new Date().toISOString(),
    llmProvider: llm.name(),
    llmModel: llm.modelName(),
    llmAvailable: llm.isAvailable(),
    uptimeSeconds: getUptimeSeconds(),
  });
});

app.get('/api/agents', (req, res) => {
  res.json({ agents: SUB_AGENTS });
});

app.get('/api/business-agents', (req, res) => {
  res.json({
    businessAgents: BUSINESS_AGENTS,
    clientSegments: CLIENT_SEGMENTS,
    pageVideoFactory: PAGE_VIDEO_FACTORY,
    total: BUSINESS_AGENTS.length,
  });
});

app.get('/api/memory-preferences', (req, res) => {
  res.json({ preferences: ALFRED_MEMORY_PREFERENCES });
});

app.get('/api/alfred-v3/status', (req, res) => {
  res.json({
    version: 'ALFRED CORP V3.5',
    designSystem: 'ALFRED Mayordomo Digital Nexus · Aether Core Interface',
    stitchFusion: {
      importedZipPacks: 10,
      referenceUrl: 'https://alfred-ai-butle.ai.studio/',
      effects: ['glass-panel', 'chamfered-panels', 'data-grid', 'scanline', 'pulse-glow', 'audio-waveform', 'flicker', 'shader-backplane', 'threejs-orbital-motif'],
    },
    worldOrb3D: {
      importedAnimationPacks: 3,
      sourceZipPacks: ['(10)', '(11)', '(12)'],
      engine: 'local React + Three.js + CSS shader fallback',
      placement: ['header mini world', 'main hands-free orb'],
      browserIndependence: 'Windows Voice Bridge keeps listening when browser speech recognition fails',
    },
    handsFree: {
      mode: 'browser speech recognition + Windows native voice bridge + server chat + TTS fallback',
      wakeCommands: ['alfred', 'hey alfred', 'oye alfred', 'que mundo', 'llego papi', 'jefe maestro', 'hora de trabajar', 'que hay de nuevo'],
      browserPermissions: ['microphone', 'speechRecognition', 'audioOutput'],
    },
    apiPipelines: getAlfredV3ApiStatus(),
  });
});

app.get('/api/briefing', (req, res) => {
  res.json({ briefing: getOperationalBriefing() });
});

app.get('/api/integrations/revenuecat', (req, res) => {
  res.json({ revenueCat: getRevenueCatMcpStatus() });
});

app.get('/api/integrations/revenuecat/hermes-config-template', (req, res) => {
  res.type('text/plain').send(buildHermesRevenueCatMcpConfigTemplate());
});

app.get('/api/media-router', (req, res) => {
  res.json({ mediaRouter: getMediaRouterStatus() });
});

app.post('/api/media-router/route', (req, res) => {
  const { message = '', limit = 3 } = req.body || {};
  res.json({ matches: routeMediaRequest(String(message), Number(limit) || 3) });
});

app.post('/api/business-agents/route', (req, res) => {
  const { message = '', limit = 3 } = req.body || {};
  res.json({ matches: findBusinessMatches(String(message), Number(limit) || 3) });
});

app.get('/api/tools', (req, res) => {
  res.json({ tools: AGENT_TOOLS });
});

app.get('/api/policies', (req, res) => {
  res.json({ policies: SAFETY_POLICIES });
});

app.get('/api/telemetry', (req, res) => {
  const logs = getRecentTelemetry(50);
  const llm = getLLMProvider();
  res.json({
    logs,
    metrics: {
      coreStatus: 'NOMINAL',
      cpuTotalUsage: Math.floor(15 + Math.random() * 20),
      memoryTotalUsageMb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      activeAgentsCount: SUB_AGENTS.filter(a => a.status === 'ACTIVE').length,
      totalQueriesProcessed: getTotalQueries(),
      averageResponseMs: 420,
      securityProtocol: 'BALANCED',
      voiceSynthesisEngine: process.env.ELEVENLABS_API_KEY ? 'ElevenLabs' : 'Web Speech API (fallback)',
      uptimeSeconds: getUptimeSeconds(),
      llmProvider: llm.name(),
      llmModel: llm.modelName(),
    },
  });
});

app.get('/api/history/:sessionId', (req, res) => {
  const messages = getMessagesBySession(req.params.sessionId, 200);
  res.json({ messages });
});

app.get('/api/history-days', (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 90, 1), 365);
  res.json({ days: getConversationDays(limit) });
});

app.get('/api/history-day/:day', (req, res) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(req.params.day)) {
    return res.status(400).json({ error: 'day must use YYYY-MM-DD' });
  }
  const sessionId = typeof req.query.sessionId === 'string' ? req.query.sessionId : undefined;
  const messages = getMessagesByDay(req.params.day, sessionId, 1000);
  res.json({ day: req.params.day, sessionId: sessionId || null, messages });
});

// ── Chat principal — Orquestación real ──────────────────────────────────
app.post('/api/chat', async (req, res) => {
  const { message, language = 'es', securityLevel = 'BALANCED', sessionId = 'default', history = [] } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message text is required' });
  }

  try {
    const result = await processUserRequest({ message, language, securityLevel, sessionId, history });
    res.json(result);
  } catch (err: any) {
    console.error('[ALFRED] Chat processing error:', err);
    res.status(500).json({ error: 'Alfred core processing failure', detail: String(err?.message || err) });
  }
});

// ── Voz — estado y catálogo seguro ─────────────────────────────────────
app.get('/api/voice/status', (_req, res) => {
  res.json({ voice: getTtsStatus() });
});

app.get('/api/voice/voices', async (_req, res) => {
  try {
    res.json({ voice: await listElevenLabsVoices() });
  } catch (err) {
    console.warn('[ALFRED Voice] Voice catalog unavailable:', err);
    res.status(502).json({ voice: { configured: true, voices: [], error: 'ElevenLabs voice catalog unavailable' } });
  }
});

// ── Text-to-Speech — voz masculina bilingüe ─────────────────────────────
app.post('/api/tts', async (req, res) => {
  const { text, language = 'es' } = req.body;
  if (!text) return res.status(400).json({ error: 'Text required' });

  try {
    const result = await synthesizeSpeech(text, language);
    res.json(result);
  } catch (err) {
    console.warn('[ALFRED TTS] Falling back to client-side synthesis:', err);
    res.json({ audioBase64: null, useWebSpeechFallback: true });
  }
});

// ── Vite / Producción ────────────────────────────────────────────────────
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    // In development __dirname points to the project root; in the bundled
    // production server it points to ./dist. Use process.cwd()/dist so the
    // static asset path remains correct in both cases.
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.use((req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    const llm = getLLMProvider();
    console.log(`\n[ALFRED CORE] En línea en http://0.0.0.0:${PORT}`);
    console.log(`[ALFRED CORE] Motor LLM: ${llm.name()} (${llm.modelName()}) — Disponible: ${llm.isAvailable()}`);
    console.log(`[ALFRED CORE] 12 sub-agentes cargados: ${SUB_AGENTS.map(a => a.nameES).join(', ')}\n`);
  });
}

startServer();
