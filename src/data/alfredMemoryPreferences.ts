export const ALFRED_MEMORY_PREFERENCES = {
  ownerTitle: 'Jefe Maestro',
  timeBasedGreetings: {
    morning: 'Buenos días, jefe maestro',
    afternoon: 'Buenas tardes, jefe maestro',
    night: 'Buenas noches, jefe maestro',
  },
  taskLifecycle: {
    onStart: 'Entendido, Jefe Maestro',
    onComplete: 'Entendido, Jefe Maestro',
  },
  startupMusic: {
    scope: 'computer_only',
    trigger: 'conversation_start',
    volume: 'regular',
    urls: [
      'https://www.youtube.com/watch?v=rvLNvq5_-Fw&list=PLlQalC1rBuOgcIsxAEBf7aQjWduWaJhpt&index=9',
      'https://www.youtube.com/watch?v=4a1cl9DZ4Vo&list=PLlQalC1rBuOgcIsxAEBf7aQjWduWaJhpt&index=6',
    ],
  },
  dailyVoiceRoutines: {
    sceneName: 'Rutinas diarias',
    selectionMode: 'activated_by_phrase_then_selected_by_local_time',
    volume: 'moderate',
    morning: {
      triggers: ['Alfred, hora de trabajar', 'Qué mundo, hora de trabajar', 'Llego papi, hora de trabajar'],
      greeting: 'Buenos días, Jefe Maestro. Estoy a sus órdenes. Hoy es un día muy productivo, vamos a comenzar con un breve informe.',
      youtubeUrl: 'https://www.youtube.com/watch?v=rvLNvq5_-Fw&list=PLlQalC1rBuOgcIsxAEBf7aQjWduWaJhpt&index=10',
    },
    afternoon: {
      triggers: ['Buenas tardes, Jefe Maestro', 'Cualquier variante de saludo + hora de trabajar'],
      greeting: 'Buenas tardes, Jefe Maestro. Estoy a sus órdenes y listo para continuar con las actividades pendientes o comenzar nuevas tareas. Recuerde que estoy para servirle en todo momento.',
      youtubeUrl: 'https://www.youtube.com/watch?v=4a1cl9DZ4Vo&list=PLlQalC1rBuOgcIsxAEBf7aQjWduWaJhpt&index=5',
    },
    night: {
      triggers: ['Buenas noches, Jefe Maestro'],
      greeting: 'Buenas noches, Jefe Maestro. Estoy listo y a su servicio. ¿Cómo puedo ayudarle la noche de hoy?',
    },
    earlyMorning: {
      triggers: ['Alfred, ¿qué hay de nuevo?', 'variantes configuradas por el usuario'],
      greeting: 'Buenas noches/madrugada, Jefe Maestro. Prepararé un resumen rápido para que esté al día.',
    },
    guards: ['human confirmation before sending messages', 'human confirmation before publishing content', 'human confirmation before modifying data', 'human confirmation before financial operations', 'audit every executed action'],
  },
  revenueCatMcp: {
    url: 'https://mcp.revenuecat.ai/mcp',
    auth: 'Bearer token with RevenueCat API v2 secret key, or OAuth when supported',
    apiKeyStorage: 'REVENUECAT_API_KEY in local .env or Hermes secret storage only; never memory, docs, logs, git, or ZIP',
    purpose: 'Manage subscription apps, products, entitlements, offerings, packages, paywalls, analytics, experiments, webhooks, and app monetization workflows.',
    confirmationRequiredFor: ['create-project', 'create-app', 'create-product', 'create-entitlement', 'create-offering', 'create-packages', 'create-paywall-ai', 'edit-paywall-ai', 'create-webhook-integration', 'delete/update/archive operations'],
    supervisingAgents: ['Alfred-SaaSArchitect', 'Alfred-MarketingArchitect', 'Alfred-ClientStudio', 'Alfred-OperationsCFO', 'Thomas', 'Sterling', 'Leonardo'],
  },
  mediaRouter: {
    primaryProvider: 'Seedance 2.5',
    providers: ['Seedance 2.5', 'MiniMax', 'PixVerse', 'Luma', 'fal.ai', 'Runware', 'ComfyUI'],
    seedanceTools: ['seedance_text_to_video', 'seedance_image_to_video', 'seedance_reference_to_video', 'seedance_video_edit', 'seedance_video_extend', 'seedance_get_task_status', 'seedance_cancel_task', 'seedance_download_result', 'seedance_estimate_cost'],
    agents: ['Alfred-CreativeAgent', 'Alfred-VideoAgent', 'Alfred-AvatarAgent', 'Alfred-TravelAgent', 'Alfred-CourseAgent', 'Alfred-KidsAgent', 'Alfred-EcommerceAgent', 'Alfred-PropTechAgent', 'Alfred-CraneAgent', 'Alfred-SocialAgent'],
    secretStorage: 'Seedance, MiniMax and other media provider credentials stay only in local .env or Hermes secret storage; never memory, docs, git, logs, or ZIP.',
  },
  source: 'User voice configuration transcript plus RevenueCat MCP and Seedance 2.5 media router configuration for Alfred - Mayordomo Digital / Hermes Agent memory',
} as const;

export type AlfredTimeOfDay = 'morning' | 'afternoon' | 'night';

export function getAlfredTimeOfDay(date = new Date()): AlfredTimeOfDay {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 19) return 'afternoon';
  return 'night';
}

export function getAlfredTimeGreeting(date = new Date()): string {
  return ALFRED_MEMORY_PREFERENCES.timeBasedGreetings[getAlfredTimeOfDay(date)];
}
