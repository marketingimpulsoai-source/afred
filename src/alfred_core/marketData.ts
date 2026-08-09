import { Language, UiAction } from '../types';

export interface CryptoQuote {
  symbol: string;
  name: string;
  binanceSymbol: string;
  priceUsd: number | null;
  change24hPct: number | null;
  high24h: number | null;
  low24h: number | null;
  volumeUsd24h: number | null;
  source: string;
  sourceUrl: string;
}

export interface CryptoMarketAnswer {
  text: string;
  uiActions: UiAction[];
  quotes: CryptoQuote[];
}

const KNOWN_ASSETS: Record<string, { symbol: string; name: string; coingeckoId: string }> = {
  btc: { symbol: 'BTC', name: 'Bitcoin', coingeckoId: 'bitcoin' },
  bitcoin: { symbol: 'BTC', name: 'Bitcoin', coingeckoId: 'bitcoin' },
  eth: { symbol: 'ETH', name: 'Ethereum', coingeckoId: 'ethereum' },
  ethereum: { symbol: 'ETH', name: 'Ethereum', coingeckoId: 'ethereum' },
  sol: { symbol: 'SOL', name: 'Solana', coingeckoId: 'solana' },
  solana: { symbol: 'SOL', name: 'Solana', coingeckoId: 'solana' },
  bnb: { symbol: 'BNB', name: 'BNB', coingeckoId: 'binancecoin' },
  xrp: { symbol: 'XRP', name: 'XRP', coingeckoId: 'ripple' },
  ada: { symbol: 'ADA', name: 'Cardano', coingeckoId: 'cardano' },
  cardano: { symbol: 'ADA', name: 'Cardano', coingeckoId: 'cardano' },
  doge: { symbol: 'DOGE', name: 'Dogecoin', coingeckoId: 'dogecoin' },
  dogecoin: { symbol: 'DOGE', name: 'Dogecoin', coingeckoId: 'dogecoin' },
  avax: { symbol: 'AVAX', name: 'Avalanche', coingeckoId: 'avalanche-2' },
  avalanche: { symbol: 'AVAX', name: 'Avalanche', coingeckoId: 'avalanche-2' },
  link: { symbol: 'LINK', name: 'Chainlink', coingeckoId: 'chainlink' },
  chainlink: { symbol: 'LINK', name: 'Chainlink', coingeckoId: 'chainlink' },
  matic: { symbol: 'MATIC', name: 'Polygon', coingeckoId: 'matic-network' },
  polygon: { symbol: 'MATIC', name: 'Polygon', coingeckoId: 'matic-network' },
  pepe: { symbol: 'PEPE', name: 'Pepe', coingeckoId: 'pepe' },
  shib: { symbol: 'SHIB', name: 'Shiba Inu', coingeckoId: 'shiba-inu' },
};

function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function isCryptoMarketRequest(message: string): boolean {
  const q = normalize(message);
  return /\b(crypto|cripto|criptomoneda|bitcoin|btc|ethereum|eth|solana|sol|binance|coinmarketcap|tradingview|precio|market|mercado|token|usdt)\b/.test(q);
}

export function extractCryptoAssets(message: string): Array<{ symbol: string; name: string; coingeckoId: string }> {
  const q = normalize(message);
  const found = new Map<string, { symbol: string; name: string; coingeckoId: string }>();
  for (const [key, value] of Object.entries(KNOWN_ASSETS)) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`\\b${escaped}\\b`, 'i').test(q)) found.set(value.symbol, value);
  }

  for (const raw of message.match(/\b[A-Z]{2,8}\b/g) || []) {
    const key = raw.toLowerCase();
    if (KNOWN_ASSETS[key]) found.set(KNOWN_ASSETS[key].symbol, KNOWN_ASSETS[key]);
  }

  if (found.size === 0 && /\b(crypto|cripto|criptomonedas|mercado|market)\b/.test(q)) {
    ['BTC', 'ETH', 'SOL'].forEach(symbol => {
      const asset = Object.values(KNOWN_ASSETS).find(a => a.symbol === symbol);
      if (asset) found.set(symbol, asset);
    });
  }
  return [...found.values()].slice(0, 5);
}

async function fetchBinanceQuote(asset: { symbol: string; name: string; coingeckoId: string }): Promise<CryptoQuote | null> {
  const binanceSymbol = `${asset.symbol}USDT`;
  const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) return null;
  const data = await response.json() as Record<string, string>;
  return {
    symbol: asset.symbol,
    name: asset.name,
    binanceSymbol,
    priceUsd: Number(data.lastPrice),
    change24hPct: Number(data.priceChangePercent),
    high24h: Number(data.highPrice),
    low24h: Number(data.lowPrice),
    volumeUsd24h: Number(data.quoteVolume),
    source: 'Binance 24hr ticker',
    sourceUrl: `https://www.binance.com/en/trade/${asset.symbol}_USDT`,
  };
}

async function fetchCoinGeckoQuote(asset: { symbol: string; name: string; coingeckoId: string }): Promise<CryptoQuote | null> {
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(asset.coingeckoId)}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true`;
  const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) return null;
  const data = await response.json() as Record<string, { usd?: number; usd_24h_change?: number; usd_24h_vol?: number }>;
  const row = data[asset.coingeckoId];
  if (!row?.usd) return null;
  return {
    symbol: asset.symbol,
    name: asset.name,
    binanceSymbol: `${asset.symbol}USDT`,
    priceUsd: row.usd,
    change24hPct: row.usd_24h_change ?? null,
    high24h: null,
    low24h: null,
    volumeUsd24h: row.usd_24h_vol ?? null,
    source: 'CoinGecko simple price',
    sourceUrl: `https://www.coingecko.com/en/coins/${asset.coingeckoId}`,
  };
}

function formatUsd(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'no disponible';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: value >= 1 ? 2 : 8 }).format(value);
}

function formatPct(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return 'no disponible';
  return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
}

export async function buildCryptoMarketAnswer(message: string, language: Language): Promise<CryptoMarketAnswer | null> {
  if (!isCryptoMarketRequest(message)) return null;
  const assets = extractCryptoAssets(message);
  if (assets.length === 0) return null;

  const quotes: CryptoQuote[] = [];
  const failed: string[] = [];
  for (const asset of assets) {
    try {
      const quote = await fetchBinanceQuote(asset) || await fetchCoinGeckoQuote(asset);
      if (quote) quotes.push(quote); else failed.push(asset.symbol);
    } catch {
      try {
        const quote = await fetchCoinGeckoQuote(asset);
        if (quote) quotes.push(quote); else failed.push(asset.symbol);
      } catch {
        failed.push(asset.symbol);
      }
    }
  }

  if (quotes.length === 0) {
    return {
      quotes: [],
      uiActions: [],
      text: language === 'es'
        ? 'Jefe Maestro, intenté verificar el mercado en fuentes reales, pero Binance y CoinGecko no respondieron en este momento. No le daré un precio inventado; puedo reintentar o abrir CoinMarketCap y TradingView para revisión manual.'
        : 'Jefe Maestro, I tried to verify live market sources, but Binance and CoinGecko are unavailable right now. I will not invent a price; I can retry or open CoinMarketCap and TradingView for manual review.',
    };
  }

  const lines = quotes.map(q => `- ${q.name} (${q.symbol}): ${formatUsd(q.priceUsd)} · 24h ${formatPct(q.change24hPct)} · fuente: ${q.source}.`);
  const first = quotes[0];
  const tvSymbol = `BINANCE:${first.symbol}USDT`;
  const uiActions: UiAction[] = [
    {
      type: 'open_url',
      label: `Abrir TradingView ${first.symbol}/USDT`,
      url: `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(tvSymbol)}`,
      target: 'internal',
      message: `TradingView para ${tvSymbol}`,
    },
    {
      type: 'open_url',
      label: `Abrir CoinMarketCap ${first.symbol}`,
      url: `https://coinmarketcap.com/currencies/${first.name.toLowerCase().replace(/\s+/g, '-')}/`,
      target: 'internal',
      message: `CoinMarketCap para ${first.name}`,
    },
  ];

  const caveat = failed.length ? `\nNo pude confirmar: ${failed.join(', ')}.` : '';
  const text = language === 'es'
    ? [
      'Jefe Maestro, verifiqué el mercado con fuentes reales antes de responder. No usaré precios inventados.',
      ...lines,
      'Preparé TradingView y CoinMarketCap dentro del panel ALFRED WEB CORE para contrastar gráfico, volumen, tendencia y contexto visual.',
      'Lectura rápida: si el cambio 24h es positivo pero el volumen cae, conviene esperar confirmación; si precio y volumen suben juntos, la señal tiene más fuerza. Antes de cualquier operación financiera le pediré confirmación humana.',
      caveat,
    ].filter(Boolean).join('\n')
    : [
      'Jefe Maestro, I verified live market sources before answering. I will not use invented prices.',
      ...lines,
      'I prepared TradingView and CoinMarketCap inside the ALFRED WEB CORE panel to compare chart, volume, trend, and visual context.',
      'Quick read: if 24h change is positive but volume is falling, wait for confirmation; if price and volume rise together, the signal is stronger. I will ask for human confirmation before any financial action.',
      caveat,
    ].filter(Boolean).join('\n');

  return { text, uiActions, quotes };
}
