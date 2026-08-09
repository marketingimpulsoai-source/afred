import { Language, UiAction } from '../types';

export interface WebResearchPlan {
  shouldResearch: boolean;
  textPrefix: string;
  uiActions: UiAction[];
}

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function requiresExternalResearch(message: string): boolean {
  const q = normalize(message);
  if (q.length < 8) return false;
  if (/\b(hola|gracias|ok|entendido|buenos dias|buenas tardes|buenas noches)\b/.test(q) && q.length < 40) return false;
  return /\b(actual|hoy|ahora|noticia|noticias|precio|mercado|analisis|analiza|investiga|busca|verifica|comprueba|fuente|oficial|profundidad|quien es|que es|cuando|donde|empresa|negocio|saas|api|modelo|version|lanzamiento|regulacion|ley|tendencia|competidor|competencia|stock|accion|crypto|cripto)\b/.test(q);
}

function searchUrl(engine: 'google' | 'bing' | 'duckduckgo', query: string): string {
  const encoded = encodeURIComponent(query);
  if (engine === 'google') return `https://www.google.com/search?q=${encoded}`;
  if (engine === 'bing') return `https://www.bing.com/search?q=${encoded}`;
  return `https://duckduckgo.com/?q=${encoded}`;
}

function officialQueries(message: string): string[] {
  const base = message.trim().replace(/\s+/g, ' ').slice(0, 220);
  return [
    `${base} fuente oficial`,
    `${base} documentación oficial`,
    `${base} últimos datos noticias oficiales`,
  ];
}

export function buildWebResearchPlan(message: string, language: Language): WebResearchPlan | null {
  if (!requiresExternalResearch(message)) return null;
  const queries = officialQueries(message);
  const uiActions: UiAction[] = [
    {
      type: 'open_url',
      label: 'Buscar fuentes oficiales en Google',
      url: searchUrl('google', queries[0]),
      target: 'internal',
      message: queries[0],
    },
    {
      type: 'open_url',
      label: 'Buscar documentación/fuente primaria en Bing',
      url: searchUrl('bing', queries[1]),
      target: 'internal',
      message: queries[1],
    },
    {
      type: 'open_url',
      label: 'Contrastar resultados en DuckDuckGo',
      url: searchUrl('duckduckgo', queries[2]),
      target: 'internal',
      message: queries[2],
    },
    {
      type: 'toast',
      label: 'Investigación web activada',
      message: language === 'es'
        ? 'Alfred preparó búsquedas dentro del panel Web Core con prioridad en fuentes oficiales. No tratará como hecho lo que no haya podido verificar.'
        : 'Alfred prepared searches inside the Web Core panel with priority on official sources. It will not treat unverified claims as facts.',
    },
  ];

  const textPrefix = language === 'es'
    ? 'Jefe Maestro, activé investigación web porque esta consulta requiere información externa o actual. Preparé el panel ALFRED WEB CORE con búsquedas orientadas a fuentes oficiales y documentación primaria. Si no puedo verificar un dato con fuente real, lo marcaré como no verificado en vez de inventarlo.\n\n'
    : 'Jefe Maestro, I activated web research because this request requires external or current information. I prepared the ALFRED WEB CORE panel with searches aimed at official sources and primary documentation. If I cannot verify a claim with a real source, I will mark it as unverified instead of inventing it.\n\n';

  return { shouldResearch: true, textPrefix, uiActions };
}
