// ═══════════════════════════════════════════════════════════════════════
// ALFRED CORE — Modo Agente (control real de navegador)
// Traduce órdenes en lenguaje natural ("abre YouTube", "busca X en internet
// y léelo") en acciones verificables del Browser Worker: abrir, extraer,
// capturar evidencia y devolver el contenido real de la página.
// Nunca inventa contenido: si la navegación falla, lo dice explícitamente.
// ═══════════════════════════════════════════════════════════════════════
import { Language, ToolCallTrace, UiAction } from '../types';
import { executeBrowserWorkerCommand, type BrowserWorkerResult } from './browserWorker';
import { getLLMProvider } from './llmProvider';
import { searchWeb, searchEngineUrl } from './webSearch';

export type AgentBrowserIntent = 'open' | 'search';

export interface AgentBrowserTask {
  intent: AgentBrowserIntent;
  /** URL final que abrirá el worker. */
  url: string;
  /** Texto original solicitado por el Jefe Maestro (destino o consulta). */
  target: string;
  label: string;
}

export interface AgentBrowserRun {
  task: AgentBrowserTask;
  ok: boolean;
  text: string;
  uiActions: UiAction[];
  toolCallTraces: ToolCallTrace[];
  evidence: {
    url?: string;
    title?: string;
    screenshotUrl?: string;
    auditHash?: string;
    extractedChars: number;
  };
}

const SITE_SHORTCUTS: Record<string, string> = {
  youtube: 'https://www.youtube.com',
  google: 'https://www.google.com',
  gmail: 'https://mail.google.com',
  drive: 'https://drive.google.com',
  calendario: 'https://calendar.google.com',
  calendar: 'https://calendar.google.com',
  maps: 'https://maps.google.com',
  mapas: 'https://maps.google.com',
  github: 'https://github.com',
  instagram: 'https://www.instagram.com',
  facebook: 'https://www.facebook.com',
  linkedin: 'https://www.linkedin.com',
  twitter: 'https://x.com',
  x: 'https://x.com',
  tiktok: 'https://www.tiktok.com',
  whatsapp: 'https://web.whatsapp.com',
  wikipedia: 'https://es.wikipedia.org',
  chatgpt: 'https://chat.openai.com',
  perplexity: 'https://www.perplexity.ai',
  binance: 'https://www.binance.com',
  tradingview: 'https://www.tradingview.com',
  amazon: 'https://www.amazon.com',
  mercadolibre: 'https://www.mercadolibre.com',
  netflix: 'https://www.netflix.com',
  revenuecat: 'https://www.revenuecat.com',
};

const OPEN_VERBS = /\b(abre|abrir|abreme|ábreme|entra|ingresa|navega|visita|muestrame|muéstrame|ve a|open|go to|browse|visit|navigate to|show me)\b/i;
const SEARCH_VERBS = /\b(busca|buscar|buscame|búscame|investiga|averigua|consulta|search|look up|find)\b/i;
const WEB_CONTEXT = /\b(internet|web|online|en linea|en línea|navegador|browser|google|duckduckgo|bing|youtube|pagina|página|sitio|site|url)\b/i;
const AGENT_MODE_PREFIX = /\b(modo agente|agent mode|modo navegador|browser mode)\b/i;

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
}

function extractExplicitUrl(message: string): string | null {
  const httpMatch = message.match(/https?:\/\/[^\s<>"')]+/i);
  if (httpMatch) return httpMatch[0].replace(/[.,;)]+$/, '');
  const domainMatch = message.match(/\b(?:www\.)?[a-z0-9][a-z0-9-]*(?:\.[a-z0-9-]+)+(?:\/[^\s<>"')]*)?/i);
  if (domainMatch && /\.(com|org|net|io|ai|dev|app|co|es|mx|ar|cl|pe|gov|edu|info|tv|me|xyz)(\/|$)/i.test(domainMatch[0])) {
    return `https://${domainMatch[0].replace(/^https?:\/\//i, '')}`.replace(/[.,;)]+$/, '');
  }
  return null;
}

function shortcutFor(message: string): { url: string; name: string } | null {
  const q = normalize(message);
  for (const [name, url] of Object.entries(SITE_SHORTCUTS)) {
    if (new RegExp(`\\b${name}\\b`).test(q)) return { url, name };
  }
  return null;
}

function stripCommandNoise(message: string): string {
  return message
    .replace(AGENT_MODE_PREFIX, ' ')
    .replace(OPEN_VERBS, ' ')
    .replace(SEARCH_VERBS, ' ')
    .replace(/\b(en|on|por|para|dentro de|in|the|la|el|una|un|internet|web|online|navegador|browser|google|duckduckgo|bing)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Detecta si el mensaje es una orden de navegación real. Devuelve `null`
 * para conversación normal, de modo que el resto del pipeline no cambia.
 */
export function detectAgentBrowserTask(message: string): AgentBrowserTask | null {
  if (!message || message.trim().length < 3) return null;
  const raw = message.trim();
  const q = normalize(raw);

  const explicitAgentMode = AGENT_MODE_PREFIX.test(q);
  const hasOpenVerb = OPEN_VERBS.test(q);
  const hasSearchVerb = SEARCH_VERBS.test(q);
  const url = extractExplicitUrl(raw);
  const shortcut = shortcutFor(q);

  if (url && (hasOpenVerb || explicitAgentMode)) {
    return { intent: 'open', url, target: url, label: `Abrir ${url}` };
  }

  if (shortcut && (hasOpenVerb || explicitAgentMode)) {
    return { intent: 'open', url: shortcut.url, target: shortcut.name, label: `Abrir ${shortcut.name}` };
  }

  if ((hasSearchVerb && WEB_CONTEXT.test(q)) || (explicitAgentMode && hasSearchVerb)) {
    const query = stripCommandNoise(raw) || raw;
    return {
      intent: 'search',
      url: searchEngineUrl('duckduckgo', query),
      target: query,
      label: `Buscar y leer: ${query}`,
    };
  }

  if (explicitAgentMode && url) {
    return { intent: 'open', url, target: url, label: `Abrir ${url}` };
  }

  return null;
}

async function summarize(pageText: string, task: AgentBrowserTask, language: Language): Promise<string | null> {
  const llm = getLLMProvider();
  if (!llm.isAvailable() || pageText.trim().length < 200) return null;
  const prompt = language === 'es'
    ? `Resume en español, en 5 viñetas como máximo, el contenido REAL extraído de la página. No agregues datos que no estén en el texto.\n\nOrden del Jefe Maestro: ${task.target}\n\nTEXTO EXTRAÍDO:\n${pageText.slice(0, 6000)}`
    : `Summarize in English, in at most 5 bullets, the REAL content extracted from the page. Do not add anything absent from the text.\n\nRequest: ${task.target}\n\nEXTRACTED TEXT:\n${pageText.slice(0, 6000)}`;
  try {
    return await llm.generateText(prompt, [], task.target);
  } catch {
    return null;
  }
}

function trace(name: string, params: Record<string, unknown>, result: BrowserWorkerResult, startedAt: number): ToolCallTrace {
  return {
    toolId: `browser_${result.action}`,
    toolName: name,
    agentId: 'webb_infra',
    parameters: params,
    result: {
      status: result.status,
      url: result.url,
      title: result.title,
      auditHash: result.auditHash,
      screenshotUrl: result.screenshotUrl,
      error: result.error,
    },
    status: result.status === 'SUCCESS' ? 'SUCCESS' : result.status === 'BLOCKED' ? 'BLOCKED' : result.status === 'REQUIRES_CONFIRMATION' ? 'REQUIRES_CONFIRMATION' : 'ERROR',
    executionTimeMs: Date.now() - startedAt,
  };
}

/**
 * Ejecuta la tarea de navegación con evidencia real (URL final, título,
 * texto extraído, captura y hash de auditoría).
 */
export async function runAgentBrowserTask(task: AgentBrowserTask, sessionId: string, language: Language): Promise<AgentBrowserRun> {
  const toolCallTraces: ToolCallTrace[] = [];
  const uiActions: UiAction[] = [];
  const workerSession = `agent_${sessionId}`;

  let targetUrl = task.url;
  let searchSummaryLines: string[] = [];

  if (task.intent === 'search') {
    const search = await searchWeb(task.target, 5);
    searchSummaryLines = search.results.map((item, index) => `${index + 1}. ${item.title} — ${item.url}`);
    const firstReal = search.results.find(item => !/^https:\/\/(duckduckgo|www\.bing|www\.google)\.com\//.test(item.url));
    if (firstReal) targetUrl = firstReal.url;
  }

  const openStart = Date.now();
  const open = await executeBrowserWorkerCommand({
    sessionId: workerSession,
    action: 'open',
    url: targetUrl,
    screenshot: true,
  });
  toolCallTraces.push(trace('Browser Worker · open', { url: targetUrl }, open, openStart));

  if (open.status !== 'SUCCESS') {
    const reason = open.message || open.error || 'unknown';
    const failureText = language === 'es'
      ? `Entendido, Jefe Maestro. Intenté abrir ${targetUrl} con el Browser Worker y no fue posible: ${reason}. No inventaré el contenido de la página.`
      : `Understood, Jefe Maestro. I tried to open ${targetUrl} with the Browser Worker and it failed: ${reason}. I will not fabricate the page content.`;
    uiActions.push({
      type: 'toast',
      label: language === 'es' ? 'Modo agente bloqueado' : 'Agent mode blocked',
      message: reason,
    });
    return {
      task,
      ok: false,
      text: failureText,
      uiActions,
      toolCallTraces,
      evidence: { url: targetUrl, auditHash: open.auditHash, extractedChars: 0 },
    };
  }

  const extractStart = Date.now();
  const extract = await executeBrowserWorkerCommand({
    sessionId: workerSession,
    action: 'extract',
    screenshot: false,
  });
  toolCallTraces.push(trace('Browser Worker · extract', { url: open.url }, extract, extractStart));

  const pageText = (extract.text || open.text || '').replace(/\s+\n/g, '\n').trim();
  const summary = await summarize(pageText, task, language);
  const excerpt = pageText.slice(0, 1200);

  uiActions.push({
    type: 'focus_tab',
    label: 'ALFRED WEB CORE',
    tabId: 'core',
  });
  uiActions.push({
    type: 'open_url',
    label: open.title || task.label,
    url: open.url || targetUrl,
    target: 'internal',
    message: task.target,
  });
  uiActions.push({
    type: 'audit_log',
    label: language === 'es' ? 'Modo agente ejecutado' : 'Agent mode executed',
    message: `${open.action}:${open.url} · audit ${open.auditHash.slice(0, 16)}`,
  });

  const header = language === 'es'
    ? `Entendido, Jefe Maestro. Modo agente ejecutado con navegador real.\n\n· Página: ${open.title || '(sin título)'}\n· URL final: ${open.url}\n· Evidencia: ${open.screenshotUrl || 'captura no disponible'}\n· Hash de auditoría: ${open.auditHash.slice(0, 32)}`
    : `Understood, Jefe Maestro. Agent mode executed with a real browser.\n\n· Page: ${open.title || '(untitled)'}\n· Final URL: ${open.url}\n· Evidence: ${open.screenshotUrl || 'screenshot unavailable'}\n· Audit hash: ${open.auditHash.slice(0, 32)}`;

  const searchBlock = searchSummaryLines.length
    ? (language === 'es' ? `\n\nResultados de búsqueda verificados:\n${searchSummaryLines.join('\n')}` : `\n\nVerified search results:\n${searchSummaryLines.join('\n')}`)
    : '';

  const contentBlock = summary
    ? (language === 'es' ? `\n\nResumen del contenido real extraído:\n${summary}` : `\n\nSummary of the real extracted content:\n${summary}`)
    : pageText
      ? (language === 'es' ? `\n\nExtracto literal de la página (sin interpretación):\n${excerpt}` : `\n\nLiteral page excerpt (no interpretation):\n${excerpt}`)
      : (language === 'es' ? '\n\nLa página no expuso texto legible; solo dispongo de la captura como evidencia.' : '\n\nThe page exposed no readable text; only the screenshot is available as evidence.');

  return {
    task,
    ok: true,
    text: `${header}${searchBlock}${contentBlock}`,
    uiActions,
    toolCallTraces,
    evidence: {
      url: open.url,
      title: open.title,
      screenshotUrl: open.screenshotUrl,
      auditHash: open.auditHash,
      extractedChars: pageText.length,
    },
  };
}
