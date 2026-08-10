import '../env';
import { Language, UiAction } from '../types';

export interface PerplexityCitation {
  title: string;
  url: string;
  snippet?: string;
  date?: string;
  lastUpdated?: string;
}

export interface PerplexityResearchResult {
  source: 'agent' | 'search';
  query: string;
  summary: string;
  citations: PerplexityCitation[];
  outputText: string;
  modelOrPreset?: string;
  statusCode?: number;
  warning?: string;
}

export interface PerplexityResearchPlan {
  shouldResearch: true;
  source: 'agent' | 'search';
  textPrefix: string;
  uiActions: UiAction[];
  result: PerplexityResearchResult;
}

const PERPLEXITY_AGENT_URL = 'https://api.perplexity.ai/v1/agent';
const PERPLEXITY_SEARCH_URL = 'https://api.perplexity.ai/search';
const PERPLEXITY_PRESET = process.env.ALFRED_PERPLEXITY_PRESET || 'medium';
const PERPLEXITY_MODEL = process.env.ALFRED_PERPLEXITY_MODEL || 'openai/gpt-5.6-sol';

function hasApiKey(): boolean {
  return Boolean(process.env.PERPLEXITY_API_KEY);
}

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
}

function trimQuery(message: string): string {
  return message.trim().replace(/\s+/g, ' ').slice(0, 280);
}

function buildAgentPrompt(message: string, language: Language): string {
  const q = trimQuery(message);
  return language === 'es'
    ? [
        'Eres Alfred, un mayordomo digital que responde con investigación web profunda y precisa.',
        'Usa el tool de web_search cuando haga falta para verificar hechos recientes y fuentes primarias.',
        'Responde en español, con una síntesis breve, puntos clave y una sección final de fuentes citadas.',
        'No inventes datos ni cites fuentes no verificadas.',
        `Consulta: ${q}`,
      ].join('\n')
    : [
        'You are Alfred, a digital butler who answers with deep, accurate web-grounded research.',
        'Use web_search when needed to verify recent facts and primary sources.',
        'Answer in English with a short synthesis, key points, and a final sources section.',
        'Do not invent data or cite unverified sources.',
        `Query: ${q}`,
      ].join('\n');
}

function buildSearchQueries(message: string): string[] {
  const q = trimQuery(message);
  return [
    q,
    `${q} official`,
    `${q} latest`,
  ];
}

function extractTextFromOutput(output: any): string {
  if (!Array.isArray(output)) return '';
  const chunks: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== 'object') continue;
    if (item.type === 'message' && Array.isArray(item.content)) {
      for (const block of item.content) {
        if (block && typeof block === 'object' && typeof block.text === 'string') {
          chunks.push(block.text);
        }
      }
    }
    if (item.type === 'reasoning' && typeof item.text === 'string') {
      chunks.push(item.text);
    }
  }
  return chunks.join('\n').trim();
}

function extractCitationsFromOutput(output: any): PerplexityCitation[] {
  const citations: PerplexityCitation[] = [];
  const seen = new Set<string>();
  const push = (item: Partial<PerplexityCitation> | null | undefined) => {
    if (!item?.url || seen.has(item.url)) return;
    seen.add(item.url);
    citations.push({
      title: item.title || item.url,
      url: item.url,
      snippet: item.snippet,
      date: item.date,
      lastUpdated: item.lastUpdated,
    });
  };

  if (!Array.isArray(output)) return citations;
  for (const item of output) {
    if (!item || typeof item !== 'object') continue;
    if (item.type === 'search_results' && Array.isArray(item.results)) {
      for (const result of item.results) {
        push({
          title: String(result?.title || result?.url || ''),
          url: String(result?.url || ''),
          snippet: typeof result?.snippet === 'string' ? result.snippet : undefined,
          date: typeof result?.date === 'string' ? result.date : undefined,
          lastUpdated: typeof result?.last_updated === 'string' ? result.last_updated : undefined,
        });
      }
    }
    if (item.type === 'message' && Array.isArray(item.content)) {
      for (const block of item.content) {
        if (block && typeof block === 'object' && Array.isArray(block.annotations)) {
          for (const ann of block.annotations) {
            if (ann && typeof ann === 'object' && typeof ann.url === 'string') {
              push({
                title: typeof ann.title === 'string' ? ann.title : ann.url,
                url: ann.url,
                snippet: typeof ann.text === 'string' ? ann.text : undefined,
              });
            }
          }
        }
      }
    }
  }
  return citations;
}

async function callPerplexityAgent(message: string, language: Language): Promise<PerplexityResearchResult | null> {
  if (!hasApiKey()) return null;
  const requestBody: Record<string, unknown> = {
      input: buildAgentPrompt(message, language),
      tools: [{ type: 'web_search' }],
    };
    if (process.env.ALFRED_PERPLEXITY_MODEL?.trim()) {
      requestBody.model = process.env.ALFRED_PERPLEXITY_MODEL.trim();
    } else {
      requestBody.preset = PERPLEXITY_PRESET;
    }
    const response = await fetch(PERPLEXITY_AGENT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

  const text = await response.text();
  let payload: any = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
  }

  if (!response.ok) {
    const error = new Error(`Perplexity Agent API ${response.status}`) as Error & { statusCode?: number; retryAfter?: string };
    error.statusCode = response.status;
    const retryAfter = response.headers.get('retry-after');
    if (retryAfter) error.retryAfter = retryAfter;
    throw error;
  }

  const outputText = typeof payload?.output_text === 'string' ? payload.output_text.trim() : extractTextFromOutput(payload?.output);
  const citations = extractCitationsFromOutput(payload?.output);
  return {
    source: 'agent',
    query: trimQuery(message),
    summary: outputText || (language === 'es' ? 'Perplexity no devolvió texto resumible.' : 'Perplexity did not return resumable text.'),
    citations,
    outputText,
    modelOrPreset: payload?.model || PERPLEXITY_PRESET,
    statusCode: response.status,
  };
}

async function callPerplexitySearch(message: string, language: Language): Promise<PerplexityResearchResult | null> {
  if (!hasApiKey()) return null;
  const query = buildSearchQueries(message)[0];
  const response = await fetch(PERPLEXITY_SEARCH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      max_results: 5,
      search_context_size: 'high',
      country: language === 'es' ? 'ES' : 'US',
    }),
  });

  const text = await response.text();
  let payload: any = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = { raw: text };
  }

  if (!response.ok) {
    const error = new Error(`Perplexity Search API ${response.status}`) as Error & { statusCode?: number; retryAfter?: string };
    error.statusCode = response.status;
    const retryAfter = response.headers.get('retry-after');
    if (retryAfter) error.retryAfter = retryAfter;
    throw error;
  }

  const results = Array.isArray(payload?.results) ? payload.results : [];
  const citations: PerplexityCitation[] = results
    .slice(0, 5)
    .map((r: any) => ({
      title: String(r?.title || r?.url || ''),
      url: String(r?.url || ''),
      snippet: typeof r?.snippet === 'string' ? r.snippet : undefined,
      date: typeof r?.date === 'string' ? r.date : undefined,
      lastUpdated: typeof r?.last_updated === 'string' ? r.last_updated : undefined,
    }))
    .filter((item: PerplexityCitation) => Boolean(item.title && item.url));

  const summary = citations.length > 0
    ? citations.map((item, index) => `${index + 1}. ${item.title}\n${item.snippet || ''}\n${item.url}`).join('\n\n')
    : (language === 'es' ? 'No se encontraron resultados útiles en Perplexity Search.' : 'No useful results were found in Perplexity Search.');

  return {
    source: 'search',
    query: trimQuery(message),
    summary,
    citations,
    outputText: summary,
    modelOrPreset: 'search',
    statusCode: response.status,
  };
}

function buildTextPrefix(language: Language, source: 'agent' | 'search'): string {
  if (language === 'es') {
    return source === 'agent'
      ? 'Jefe Maestro, confirmé la respuesta con Perplexity Agent API y la dejé sustentada por web grounding y citas reales.\n\n'
      : 'Jefe Maestro, Perplexity Search API devolvió resultados crudos y los usé como respaldo cuando el agente web-grounded no estaba disponible.\n\n';
  }
  return source === 'agent'
    ? 'Jefe Maestro, I confirmed this with Perplexity Agent API and grounded it with live web citations.\n\n'
    : 'Jefe Maestro, Perplexity Search API returned raw results and I used them as a fallback when the web-grounded agent was unavailable.\n\n';
}

function buildUiActions(query: string, source: 'agent' | 'search', language: Language): UiAction[] {
  const internalUrl = `/api/perplexity/research?q=${encodeURIComponent(query)}&language=${language}`;
  return [
    {
      type: 'open_url',
      label: source === 'agent' ? 'Abrir investigación Perplexity' : 'Abrir resultados crudos de Perplexity',
      url: internalUrl,
      target: 'internal',
      message: query,
    },
    {
      type: 'toast',
      label: source === 'agent' ? 'Investigación Perplexity activada' : 'Perplexity Search activado',
      message: language === 'es'
        ? 'Alfred está usando Perplexity para obtener información real y verificable. Si la API web-grounded falla, pasa automáticamente al Search API.'
        : 'Alfred is using Perplexity for real, verifiable information. If the web-grounded API fails, it automatically falls back to the Search API.',
    },
  ];
}

function hasGithubLink(message: string): boolean {
  const text = normalize(message);
  return /https?:\/\/github\.com\//i.test(message) || /\bgithub\.com\//i.test(message) || text.includes('github') || text.includes('repository') && text.includes('github');
}

export async function researchWithPerplexity(message: string, language: Language): Promise<PerplexityResearchResult | null> {
  if (!hasApiKey() || hasGithubLink(message)) return null;
  try {
    return await callPerplexityAgent(message, language);
  } catch (agentError: any) {
    try {
      const searchResult = await callPerplexitySearch(message, language);
      if (searchResult) {
        searchResult.warning = `Agent fallback: ${String(agentError?.message || agentError)}`;
      }
      return searchResult;
    } catch (searchError: any) {
      const messageText = `${String(agentError?.message || agentError)} | ${String(searchError?.message || searchError)}`;
      return {
        source: 'search',
        query: trimQuery(message),
        summary: language === 'es'
          ? 'Perplexity no respondió en este momento. Alfred pasará al flujo web de respaldo.'
          : 'Perplexity is unavailable right now. Alfred will fall back to the backup web flow.',
        citations: [],
        outputText: '',
        modelOrPreset: 'fallback',
        warning: messageText,
      };
    }
  }
}

export async function buildPerplexityResearchPlan(message: string, language: Language): Promise<PerplexityResearchPlan | null> {
  const result = await researchWithPerplexity(message, language);
  if (!result || !result.outputText && !result.summary) return null;
  return {
    shouldResearch: true,
    source: result.source,
    result,
    textPrefix: buildTextPrefix(language, result.source),
    uiActions: buildUiActions(trimQuery(message), result.source, language),
  };
}

export function renderPerplexityResearchHtml(result: PerplexityResearchResult, language: Language): string {
  const esc = (value: string) => value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  const title = language === 'es' ? 'Investigación Perplexity de Alfred' : 'Alfred Perplexity Research';
  const heading = language === 'es' ? 'Resultado de investigación' : 'Research result';
  const citationsHeading = language === 'es' ? 'Fuentes' : 'Sources';
  const notice = result.source === 'agent'
    ? (language === 'es' ? 'Perplexity Agent API web-grounded' : 'Perplexity Agent API web-grounded')
    : (language === 'es' ? 'Perplexity Search API respaldo' : 'Perplexity Search API fallback');
  const citations = result.citations.length
    ? result.citations.map((c, idx) => `<li><a href="${esc(c.url)}" target="_blank" rel="noreferrer">${idx + 1}. ${esc(c.title)}</a>${c.snippet ? `<div class="snippet">${esc(c.snippet)}</div>` : ''}</li>`).join('')
    : `<li>${language === 'es' ? 'No hay fuentes estructuradas disponibles.' : 'No structured sources available.'}</li>`;
  return `<!doctype html>
<html lang="${language}">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${esc(title)}</title>
<style>
  body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#09111f;color:#e5eefb;margin:0;padding:24px;}
  .card{max-width:980px;margin:0 auto;background:#101a2e;border:1px solid #23324d;border-radius:20px;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.35)}
  h1,h2{margin:0 0 12px} p,li{line-height:1.6} .meta{color:#9fb3ce;font-size:14px;margin-bottom:16px}
  .summary{white-space:pre-wrap;background:#0b1426;border:1px solid #22314a;border-radius:16px;padding:18px;overflow:auto}
  ul{padding-left:20px} a{color:#7cc4ff} .snippet{color:#bfd0e4;font-size:14px;margin-top:4px}
</style>
</head>
<body>
  <div class="card">
    <h1>${esc(title)}</h1>
    <div class="meta">${esc(notice)} · ${esc(result.modelOrPreset || 'perplexity')}</div>
    <h2>${esc(heading)}</h2>
    <div class="summary">${esc(result.summary || result.outputText || '')}</div>
    <h2>${esc(citationsHeading)}</h2>
    <ul>${citations}</ul>
    ${result.warning ? `<p class="meta">${esc(result.warning)}</p>` : ''}
  </div>
</body>
</html>`;
}
