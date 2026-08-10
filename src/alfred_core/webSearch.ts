// ═══════════════════════════════════════════════════════════════════════
// ALFRED CORE — Búsqueda web compartida
// Fuente única de verdad para la búsqueda usada por el panel Web Core y
// por el Modo Agente. Devuelve resultados reales de DuckDuckGo HTML y,
// si la red falla, enlaces de respaldo verificables (nunca datos inventados).
// ═══════════════════════════════════════════════════════════════════════

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface WebSearchResponse {
  query: string;
  source: 'duckduckgo-html' | 'fallback';
  results: WebSearchResult[];
  warning?: string;
}

const RESULT_PATTERN = /<a rel="nofollow" class="result__a" href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;

export function searchEngineUrl(engine: 'google' | 'bing' | 'duckduckgo', query: string): string {
  const encoded = encodeURIComponent(query);
  if (engine === 'google') return `https://www.google.com/search?q=${encoded}`;
  if (engine === 'bing') return `https://www.bing.com/search?q=${encoded}`;
  return `https://duckduckgo.com/?q=${encoded}`;
}

function fallbackResults(query: string): WebSearchResult[] {
  return [
    { title: `DuckDuckGo: ${query}`, url: searchEngineUrl('duckduckgo', query), snippet: 'Abrir búsqueda externa solo si el Jefe Maestro lo indica.' },
    { title: `Bing: ${query}`, url: searchEngineUrl('bing', query), snippet: 'Fuente alternativa para contrastar resultados.' },
    { title: `Google: ${query}`, url: searchEngineUrl('google', query), snippet: 'Fuente alternativa; puede bloquear iframe.' },
  ];
}

function cleanHtml(value: string): string {
  return value
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function decodeRedirect(rawHref: string): string {
  const rawUrl = rawHref.replace(/&amp;/g, '&');
  try {
    const parsed = new URL(rawUrl, 'https://duckduckgo.com');
    const uddg = parsed.searchParams.get('uddg');
    return uddg ? decodeURIComponent(uddg) : rawUrl;
  } catch {
    return rawUrl;
  }
}

export async function searchWeb(query: string, limit = 8, timeoutMs = 8000): Promise<WebSearchResponse> {
  const trimmed = query.trim();
  if (!trimmed) return { query, source: 'fallback', results: [] };

  try {
    const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(trimmed)}`, {
      headers: { 'user-agent': 'Mozilla/5.0 ALFRED-WebCore/1.0' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const html = await response.text();
    const results = [...html.matchAll(RESULT_PATTERN)]
      .slice(0, limit)
      .map(match => ({
        title: cleanHtml(match[2]),
        url: decodeRedirect(match[1]),
        snippet: cleanHtml(match[3]),
      }))
      .filter(item => item.title && item.url);

    return results.length
      ? { query: trimmed, source: 'duckduckgo-html', results }
      : { query: trimmed, source: 'fallback', results: fallbackResults(trimmed) };
  } catch (error: any) {
    return {
      query: trimmed,
      source: 'fallback',
      results: fallbackResults(trimmed),
      warning: String(error?.message || error),
    };
  }
}
