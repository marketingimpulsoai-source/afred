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
