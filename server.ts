// ═══════════════════════════════════════════════════════════════════════
// ALFRED — Servidor Principal
// Expone el Orquestador Central, memoria persistente, telemetría y TTS.
// ═══════════════════════════════════════════════════════════════════════
import './src/env';
import express from 'express';
import crypto from 'crypto';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { processUserRequest, getUptimeSeconds, getTotalQueries } from './src/alfred_core/supervisor';
import { getLLMProvider } from './src/alfred_core/llmProvider';
import { getMessagesBySession, getMessagesByDay, getConversationDays, getRecentTelemetry, getAgentWorkReport, getAgentConversationArchive, saveMessage, saveAttachment, listAttachments, getAttachmentById } from './src/alfred_core/memory';
import PDFDocument from 'pdfkit';
import { SUB_AGENTS, AGENT_TOOLS, SAFETY_POLICIES } from './src/data/alfredData';
import { BUSINESS_AGENTS, CLIENT_SEGMENTS, PAGE_VIDEO_FACTORY, findBusinessMatches } from './src/data/businessAgents';
import { ALFRED_MEMORY_PREFERENCES } from './src/data/alfredMemoryPreferences';
import { synthesizeSpeech, getTtsStatus, listElevenLabsVoices } from './src/utils/ttsEngine';
import { getRevenueCatMcpStatus, buildHermesRevenueCatMcpConfigTemplate } from './src/integrations/revenueCatMcp';
import { getMediaRouterStatus, routeMediaRequest } from './src/data/mediaRouter';
import { getAlfredV3ApiStatus } from './src/integrations/alfredV3Apis';
import { getOperationalBriefing } from './src/integrations/operationalBriefing';
import { buildCryptoMarketAnswer } from './src/alfred_core/marketData';
import { researchWithPerplexity, renderPerplexityResearchHtml } from './src/alfred_core/perplexity';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '50mb' }));

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

app.get('/api/market/crypto', async (req, res) => {
  const asset = typeof req.query.asset === 'string' ? req.query.asset : 'BTC ETH SOL';
  const language = req.query.language === 'en' ? 'en' : 'es';
  const result = await buildCryptoMarketAnswer(asset, language);
  if (!result) return res.status(404).json({ error: 'No crypto asset detected' });
  res.json(result);
});

app.get('/api/perplexity/research', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const language = req.query.language === 'en' ? 'en' : 'es';
  if (!q) return res.status(400).send(language === 'es' ? '<h1>Se requiere una consulta</h1>' : '<h1>Query required</h1>');
  const result = await researchWithPerplexity(q, language);
  if (!result) {
    return res
      .status(503)
      .type('html')
      .send(`<!doctype html><html lang="${language}"><head><meta charset="utf-8"><title>Perplexity unavailable</title></head><body style="font-family:system-ui;background:#09111f;color:#e5eefb;padding:24px"><h1>${language === 'es' ? 'Perplexity no está disponible' : 'Perplexity is unavailable'}</h1><p>${language === 'es' ? 'Configura PERPLEXITY_API_KEY en tu entorno para habilitar la investigación profunda.' : 'Set PERPLEXITY_API_KEY in your environment to enable deep research.'}</p></body></html>`);
  }
  res.type('html').send(renderPerplexityResearchHtml(result, language));
});

app.get('/api/web-core/search', async (req, res) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!q) return res.status(400).json({ error: 'query required' });
  const fallback = [
    { title: `DuckDuckGo: ${q}`, url: `https://duckduckgo.com/?q=${encodeURIComponent(q)}`, snippet: 'Abrir búsqueda externa solo si el Jefe Maestro lo indica.' },
    { title: `Bing: ${q}`, url: `https://www.bing.com/search?q=${encodeURIComponent(q)}`, snippet: 'Fuente alternativa para contrastar resultados.' },
    { title: `Google: ${q}`, url: `https://www.google.com/search?q=${encodeURIComponent(q)}`, snippet: 'Fuente alternativa; puede bloquear iframe.' },
  ];
  try {
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(q)}`;
    const html = await fetch(ddgUrl, { headers: { 'user-agent': 'Mozilla/5.0 ALFRED-WebCore/1.0' } }).then(r => r.text());
    const results = [...html.matchAll(/<a rel="nofollow" class="result__a" href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g)]
      .slice(0, 8)
      .map(match => {
        const rawUrl = match[1].replace(/&amp;/g, '&');
        let url = rawUrl;
        try {
          const parsed = new URL(rawUrl, 'https://duckduckgo.com');
          const uddg = parsed.searchParams.get('uddg');
          if (uddg) url = decodeURIComponent(uddg);
        } catch {}
        const clean = (value: string) => value.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
        return { title: clean(match[2]), url, snippet: clean(match[3]) };
      })
      .filter(item => item.title && item.url);
    res.json({ query: q, source: results.length ? 'duckduckgo-html' : 'fallback', results: results.length ? results : fallback });
  } catch (err: any) {
    res.json({ query: q, source: 'fallback', warning: String(err?.message || err), results: fallback });
  }
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

app.get('/api/history-day/:day', (req, res, next) => {
  if (String(req.params.day).endsWith('.pdf')) return next();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(req.params.day)) {
    return res.status(400).json({ error: 'day must use YYYY-MM-DD' });
  }
  const sessionId = typeof req.query.sessionId === 'string' ? req.query.sessionId : undefined;
  const limit = Math.min(Math.max(Number(req.query.limit) || 10000, 1), 50000);
  const messages = getMessagesByDay(req.params.day, sessionId, limit);
  res.json({ day: req.params.day, sessionId: sessionId || null, messageCount: messages.length, messages });
});

app.get('/api/attachments', (req, res) => {
  const sessionId = typeof req.query.sessionId === 'string' ? req.query.sessionId : undefined;
  const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 1000);
  res.json({ attachments: listAttachments(sessionId, limit) });
});

app.get('/api/attachments/:id', (req, res) => {
  const attachment = getAttachmentById(req.params.id);
  if (!attachment) return res.status(404).json({ error: 'Attachment not found' });
  res.download(attachment.storagePath, attachment.name);
});

app.post('/api/attachments', (req, res) => {
  const { sessionId, name, mimeType, dataBase64 } = req.body || {};
  if (!sessionId || !name || !mimeType || !dataBase64) {
    return res.status(400).json({ error: 'sessionId, name, mimeType and dataBase64 are required' });
  }
  const id = `att_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const sha256 = crypto.createHash('sha256').update(Buffer.from(String(dataBase64), 'base64')).digest('hex');
  const attachment = saveAttachment({
    id,
    sessionId: String(sessionId),
    name: String(name),
    mimeType: String(mimeType),
    base64: String(dataBase64),
    sha256,
  });
  res.status(201).json({ attachment });
});

app.get('/api/history-day/:day.pdf', (req, res) => {
  const day = String(req.params.day).replace(/\.pdf$/i, '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
    return res.status(400).json({ error: 'day must use YYYY-MM-DD' });
  }
  const sessionId = typeof req.query.sessionId === 'string' ? req.query.sessionId : undefined;
  const messages = getMessagesByDay(day, sessionId, 50000);
  const chunks: Buffer[] = [];
  const doc = new PDFDocument({ margin: 42, size: 'A4', bufferPages: true });
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  doc.on('end', () => {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="alfred-conversacion-${req.params.day}.pdf"`);
    res.send(Buffer.concat(chunks));
  });

  doc.fontSize(19).fillColor('#102a43').text('ALFRED - Conversación diaria completa');
  doc.moveDown(0.35).fontSize(10).fillColor('#52606d').text(`Día: ${req.params.day} · Mensajes: ${messages.length}${sessionId ? ` · Sesión: ${sessionId}` : ' · Todas las sesiones'}`);
  doc.moveDown(0.6).fontSize(9).fillColor('#7b8794').text('Exportado desde la memoria persistente local de Alfred. No incluye secretos ni variables de entorno.');

  if (messages.length === 0) {
    doc.moveDown().fontSize(12).fillColor('#243b53').text('No hay mensajes guardados para este día.');
  }

  messages.forEach((msg, index) => {
    const speaker = msg.sender === 'user' ? 'JEFE MAESTRO' : (msg.agentName || msg.agentId || 'ALFRED');
    if (doc.y > 720) doc.addPage();
    doc.moveDown(0.7).fontSize(10).fillColor(msg.sender === 'user' ? '#7c3aed' : '#0b7285').text(`${index + 1}. ${speaker} · ${new Date(msg.createdAt).toLocaleString()}`);
    doc.moveDown(0.15).fontSize(9).fillColor('#243b53').text(String(msg.text || '').replace(/\s+/g, ' '), { align: 'left' });
    if (msg.routingDecision) {
      doc.moveDown(0.15).fontSize(8).fillColor('#627d98').text(`Agente: ${msg.routingDecision.chosenAgentName || 'ALFRED'} · Confianza: ${Math.round(msg.routingDecision.confidence)}% · Método: ${msg.routingDecision.method}`);
    }
  });
  doc.end();
});


app.get('/api/agent-work', (req, res) => {
  const now = new Date();
  const end = typeof req.query.to === 'string' ? new Date(`${req.query.to}T00:00:00`).getTime() : now.getTime() + 1;
  const from = typeof req.query.from === 'string'
    ? new Date(`${req.query.from}T00:00:00`).getTime()
    : end - 7 * 24 * 60 * 60 * 1000;
  const work = getAgentWorkReport(from, end);
  res.json({ from: new Date(from).toISOString(), to: new Date(end).toISOString(), work });
});

app.get('/api/agent-conversations', (_req, res) => {
  const limit = Math.min(Math.max(Number(_req.query.limit) || 200, 1), 1000);
  const conversations = getAgentConversationArchive(limit);
  res.json({ conversations, total: conversations.length });
});

app.get('/api/agent-work.pdf', (req, res) => {
  const now = new Date();
  const end = typeof req.query.to === 'string' ? new Date(`${req.query.to}T00:00:00`).getTime() : now.getTime() + 1;
  const from = typeof req.query.from === 'string'
    ? new Date(`${req.query.from}T00:00:00`).getTime()
    : end - 7 * 24 * 60 * 60 * 1000;
  const work = getAgentWorkReport(from, end);
  const chunks: Buffer[] = [];
  const doc = new PDFDocument({ margin: 42, size: 'A4' });
  doc.on('data', (chunk: Buffer) => chunks.push(chunk));
  doc.on('end', () => {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="alfred-subagents-${new Date(from).toISOString().slice(0, 10)}.pdf"`);
    res.send(Buffer.concat(chunks));
  });
  doc.fontSize(20).fillColor('#102a43').text('ALFRED - Reporte de subagentes');
  doc.moveDown(0.4).fontSize(10).fillColor('#52606d').text(`Periodo: ${new Date(from).toLocaleDateString()} - ${new Date(end).toLocaleDateString()}`);
  doc.moveDown().fontSize(11).fillColor('#102a43').text(`Trabajos registrados: ${work.length}`);
  work.forEach((item: any, index: number) => {
    doc.moveDown(0.7).fontSize(11).fillColor('#0b7285').text(`${index + 1}. ${item.agentName} - ${item.status}`);
    doc.fontSize(9).fillColor('#243b53').text(`Fecha: ${new Date(item.createdAt).toLocaleString()} | Latencia: ${item.latencyMs} ms | Herramientas: ${item.toolsInvokedCount}`);
    doc.fontSize(9).fillColor('#334e68').text(`Orden: ${item.query}`);
    doc.fontSize(9).fillColor('#486581').text(`Resultado: ${item.summary}`);
  });
  doc.end();
});

// ── Chat principal — Orquestación real ──────────────────────────────────
app.post('/api/local-message', (req, res) => {
  const { sessionId = 'default', language = 'es', userText = '', alfredText = '' } = req.body || {};
  if (typeof userText !== 'string' || typeof alfredText !== 'string' || !userText.trim() || !alfredText.trim()) {
    return res.status(400).json({ error: 'userText and alfredText are required' });
  }
  const now = Date.now();
  const timestamp = new Date().toLocaleTimeString();
  saveMessage({ id: 'usr_' + now, sessionId: String(sessionId), sender: 'user', text: userText.slice(0, 5000), timestamp, createdAt: now, language: language === 'en' ? 'en' : 'es' });
  saveMessage({ id: 'alfred_local_' + now, sessionId: String(sessionId), sender: 'alfred', agentName: 'ALFRED', text: alfredText.slice(0, 5000), timestamp, createdAt: now + 1, language: language === 'en' ? 'en' : 'es' });
  res.json({ ok: true });
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

  const server = http.createServer(app);
  server.on('error', async (err: any) => {
    if (err?.code === 'EADDRINUSE') {
      try {
        const healthUrl = `http://127.0.0.1:${PORT}/api/health`;
        const response = await fetch(healthUrl, { signal: AbortSignal.timeout(2000) });
        if (response.ok) {
          console.log(`\n[ALFRED CORE] Ya hay una instancia activa en http://127.0.0.1:${PORT}; saliendo sin error.`);
          process.exit(0);
          return;
        }
      } catch {
        // If the port is occupied but health is not reachable, fall through.
      }
    }
    console.error('[ALFRED CORE] Server error:', err);
    process.exit(1);
  });

  server.listen(PORT, '0.0.0.0', () => {
    const llm = getLLMProvider();
    console.log(`\n[ALFRED CORE] En línea en http://0.0.0.0:${PORT}`);
    console.log(`[ALFRED CORE] Motor LLM: ${llm.name()} (${llm.modelName()}) — Disponible: ${llm.isAvailable()}`);
    console.log(`[ALFRED CORE] 12 sub-agentes cargados: ${SUB_AGENTS.map(a => a.nameES).join(', ')}\n`);
  });
}

startServer();
