import { Language, RoutingDecision, UiAction } from '../types';

export type AlfredDailyRoutineId = 'morning_work' | 'afternoon_service' | 'night_service' | 'early_morning_update';
export type AlfredDailyRoutinePeriod = 'morning' | 'afternoon' | 'night' | 'early_morning';

export interface AlfredDailyRoutine {
  id: AlfredDailyRoutineId;
  period: AlfredDailyRoutinePeriod;
  label: string;
  matchedTrigger: string;
  responseText: string;
  youtubeUrl?: string;
  youtubeVolume?: 'moderate';
  briefingTopics: string[];
  requiredLiveSources: string[];
  humanConfirmationRequiredFor: string[];
  uiActions: UiAction[];
}

const MORNING_URL = 'https://www.youtube.com/watch?v=rvLNvq5_-Fw&list=PLlQalC1rBuOgcIsxAEBf7aQjWduWaJhpt&index=10';
const AFTERNOON_URL = 'https://www.youtube.com/watch?v=4a1cl9DZ4Vo&list=PLlQalC1rBuOgcIsxAEBf7aQjWduWaJhpt&index=5';

export const DAILY_ROUTINE_TRIGGER_PHRASES = [
  'alfred activa mi rutina diaria',
  'activa mi rutina diaria',
  'alfred inicia mi rutina diaria',
  'inicia mi rutina diaria',
  'abre la rutina diaria',
  'abre la ruina diaria',
  'rutina diaria con musica',
  'rutina diaria con musica guardada',
  'alfred hora de trabajar',
  'que mundo hora de trabajar',
  'llego papi hora de trabajar',
  'hora de trabajar',
  'buen dia alfred',
  'buenos dias alfred',
  'buenos dias jefe maestro',
  'buenos dias',
  'buen dia',
  'buenas tardes jefe maestro',
  'buenas tardes alfred',
  'buenas tardes',
  'buenas noches jefe maestro',
  'buenas noches alfred',
  'buenas noches',
  'alfred que hay de nuevo',
  'que hay de nuevo alfred',
  'que hay de nuevo',
] as const;

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9ñ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getDailyRoutinePeriod(date = new Date()): AlfredDailyRoutinePeriod {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour <= 23) return 'night';
  return 'early_morning';
}

function buildRoutingDecision(query: string, routine: AlfredDailyRoutine): RoutingDecision {
  return {
    query,
    chosenAgentId: null,
    chosenAgentName: 'ALFRED',
    confidence: 99,
    reasoningES: `Escena Rutinas diarias activada por voz/texto: ${routine.label}. La frase disparó la escena y la hora local determinó el bloque ${routine.period}.`,
    reasoningEN: `Daily Routines scene activated by voice/text: ${routine.label}. The phrase triggered the scene and local time selected the ${routine.period} block.`,
    candidates: [{ agentId: 'alfred_core', score: 99, reason: routine.matchedTrigger }],
    latencyMs: 0,
    method: 'direct',
  };
}

function auditAction(routineId: AlfredDailyRoutineId, message: string): UiAction {
  return {
    type: 'audit_log',
    label: 'Registro de auditoría de rutina diaria',
    message,
    routineId,
  };
}

function youtubePlayerUrl(originalUrl: string): string {
  const parsed = new URL(originalUrl);
  const video = parsed.searchParams.get('v') || '';
  const list = parsed.searchParams.get('list') || '';
  const index = parsed.searchParams.get('index') || '1';
  return `/youtube-routine-player.html?video=${encodeURIComponent(video)}&list=${encodeURIComponent(list)}&index=${encodeURIComponent(index)}&volume=40`;
}

function youtubeActions(url: string, routineId: AlfredDailyRoutineId): UiAction[] {
  return [
    {
      type: 'open_url',
      label: 'Abrir YouTube con música en volumen moderado',
      url: youtubePlayerUrl(url),
      target: 'youtube',
      volume: 'moderate',
      message: `URL original: ${url}`,
      routineId,
    },
    {
      type: 'toast',
      label: 'YouTube solicitado',
      message: 'Abrí YouTube para la rutina. Si el navegador bloquea autoplay o volumen, Alfred dejará la instrucción visible para ajustarlo a volumen moderado.',
      routineId,
    },
  ];
}

function baseGuards(): string[] {
  return ['enviar mensajes', 'publicar contenido', 'modificar datos', 'ejecutar operaciones financieras'];
}

function morningRoutine(trigger: string): AlfredDailyRoutine {
  const id: AlfredDailyRoutineId = 'morning_work';
  const responseText = [
    'Buenos días, Jefe Maestro. Estoy a sus órdenes. Hoy es un día muy productivo, vamos a comenzar con un breve informe.',
    '',
    'Activaré la rutina de mañana: noticias de IA, apertura del mercado americano, acciones más mencionadas y música de trabajo en YouTube con volumen moderado.',
    '',
    'Prepararé un resumen hablado de aproximadamente 10 minutos sobre nuevos modelos, agentes, lanzamientos, regulaciones y noticias de grandes empresas de IA.',
    'También revisaré principales índices de Estados Unidos, acciones más nombradas, Bitcoin, Ethereum y criptomonedas relevantes.',
    '',
    'Si alguna API de noticias, mercado, voz o YouTube falla, lo informaré explícitamente y continuaré con el resto de la rutina.',
  ].join('\n');
  return {
    id,
    period: 'morning',
    label: 'Rutina de Mañana',
    matchedTrigger: trigger,
    responseText,
    youtubeUrl: MORNING_URL,
    youtubeVolume: 'moderate',
    briefingTopics: ['AI news 24h', 'US market open', 'most mentioned US stocks', 'Bitcoin', 'Ethereum', 'relevant crypto'],
    requiredLiveSources: ['Serper API for AI/news search', 'market data provider for US indices/stocks', 'crypto market provider', 'YouTube browser action'],
    humanConfirmationRequiredFor: baseGuards(),
    uiActions: [auditAction(id, 'Rutina de mañana activada.'), ...youtubeActions(MORNING_URL, id)],
  };
}

function afternoonRoutine(trigger: string): AlfredDailyRoutine {
  const id: AlfredDailyRoutineId = 'afternoon_service';
  const responseText = [
    'Buenas tardes, Jefe Maestro. Estoy a sus órdenes y listo para continuar con las actividades pendientes o comenzar nuevas tareas. Recuerde que estoy para servirle en todo momento.',
    '',
    'Activaré la rutina de tarde: revisión de actividades pendientes, leads, correos, CRM, proyectos, cierre del mercado americano y criptomonedas principales.',
    'Abriré YouTube con la música indicada en volumen moderado.',
    '',
    'Antes de enviar mensajes, publicar contenido, modificar datos o ejecutar operaciones financieras, solicitaré confirmación humana.',
  ].join('\n');
  return {
    id,
    period: 'afternoon',
    label: 'Rutina de Tarde',
    matchedTrigger: trigger,
    responseText,
    youtubeUrl: AFTERNOON_URL,
    youtubeVolume: 'moderate',
    briefingTopics: ['pending tasks', 'leads', 'email inbox', 'CRM', 'projects', 'US market close', 'Bitcoin', 'Ethereum', 'crypto market'],
    requiredLiveSources: ['local tasks/CRM integrations', 'email integrations', 'market data provider', 'crypto market provider', 'YouTube browser action'],
    humanConfirmationRequiredFor: baseGuards(),
    uiActions: [auditAction(id, 'Rutina de tarde activada.'), ...youtubeActions(AFTERNOON_URL, id)],
  };
}

function nightRoutine(trigger: string): AlfredDailyRoutine {
  const id: AlfredDailyRoutineId = 'night_service';
  const responseText = [
    'Buenas noches, Jefe Maestro. Rutina diaria activada.',
    'Abriré la música guardada a volumen moderado y prepararé el cierre del mercado, las criptomonedas más mencionadas y la planificación ligera de mañana.',
    'Si una fuente falla, continuaré con lo disponible y se lo informaré claramente.',
  ].join('\n');
  return {
    id,
    period: 'night',
    label: 'Rutina de Noche',
    matchedTrigger: trigger,
    responseText,
    briefingTopics: ['US market close', 'most mentioned crypto', 'Bitcoin', 'Ethereum', 'light planning', 'project review', 'reports'],
    requiredLiveSources: ['market data provider', 'crypto market provider', 'Serper API for AI/news search'],
    humanConfirmationRequiredFor: baseGuards(),
    uiActions: [
      auditAction(id, 'Rutina de noche activada.'),
      ...youtubeActions(MORNING_URL, id),
      {
        type: 'toast',
        label: 'Rutina de noche activada',
        message: 'Briefing de mercado, cripto, IA y tareas ligeras listo para narración hablada.',
        routineId: id,
      },
    ],
  };
}

function earlyMorningRoutine(trigger: string): AlfredDailyRoutine {
  const id: AlfredDailyRoutineId = 'early_morning_update';
  const responseText = [
    'Buenas noches/madrugada, Jefe Maestro. Prepararé un resumen rápido para que esté al día.',
    '',
    'Activaré la rutina de madrugada: resumen hablado de aproximadamente 10 minutos con las principales noticias de IA de las últimas 24 horas.',
    'Si el Jefe Maestro configura monitoreo de sistemas y servicios, también incluiré su estado general.',
    '',
    'Si alguna API falla, informaré exactamente cuál falló y continuaré con el resto de la rutina.',
  ].join('\n');
  return {
    id,
    period: 'early_morning',
    label: 'Rutina de Madrugada',
    matchedTrigger: trigger,
    responseText,
    briefingTopics: ['AI news last 24h', 'optional systems/services status'],
    requiredLiveSources: ['Serper API for AI/news search', 'optional monitoring integrations'],
    humanConfirmationRequiredFor: baseGuards(),
    uiActions: [
      auditAction(id, 'Rutina de madrugada activada.'),
      {
        type: 'toast',
        label: 'Rutina de madrugada activada',
        message: 'Resumen rápido de IA y estado opcional de sistemas listo.',
        routineId: id,
      },
    ],
  };
}

function isDailyRoutineTrigger(normalized: string): string | null {
  const explicit = DAILY_ROUTINE_TRIGGER_PHRASES.find(trigger => normalized.includes(trigger));
  if (explicit) return explicit;

  const hasRoutineCommand = /\b(activa|activar|inicia|iniciar|abre|abrir)\b.*\b(rutina|ruina)\b.*\b(diaria|diara|diario|diarios)\b/.test(normalized);
  const hasDailyRoutine = /\b(rutina|ruina)\b.*\b(diaria|diara|diario|diarios)\b/.test(normalized);
  const hasMusic = /\b(musica|music)\b/.test(normalized);
  if (hasRoutineCommand || (hasDailyRoutine && hasMusic)) return normalized;

  const hasGreeting = /\b(buen|buenos|buenas)\b/.test(normalized) && /\b(alfred|jefe maestro)\b/.test(normalized);
  const hasWork = normalized.includes('hora de trabajar');
  const hasNew = normalized.includes('que hay de nuevo') || normalized.includes('que hay nuevo');
  if ((hasGreeting && hasWork) || hasNew) return normalized;

  return null;
}

function getRoutinePeriodForTrigger(trigger: string, date = new Date()): AlfredDailyRoutinePeriod {
  if (trigger.includes('buenos dias') || trigger.includes('buen dia')) return 'morning';
  if (trigger.includes('buenas tardes')) return 'afternoon';
  if (trigger.includes('buenas noches')) return 'night';
  return getDailyRoutinePeriod(date);
}

export function detectDailyActivationRoutine(message: string, language: Language = 'es', date = new Date()): AlfredDailyRoutine | null {
  const normalized = normalize(message);
  const trigger = isDailyRoutineTrigger(normalized);
  if (!trigger) return null;

  const period = getRoutinePeriodForTrigger(trigger, date);
  if (period === 'morning') return morningRoutine(trigger);
  if (period === 'afternoon') return afternoonRoutine(trigger);
  if (period === 'night') return nightRoutine(trigger);
  return earlyMorningRoutine(trigger);
}

export function buildDailyRoutineRoutingDecision(query: string, routine: AlfredDailyRoutine): RoutingDecision {
  return buildRoutingDecision(query, routine);
}
