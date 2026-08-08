export type MediaProviderId = 'seedance_2_5' | 'minimax' | 'pixverse' | 'luma' | 'fal_ai' | 'runware' | 'comfyui';
export type MediaAgentId =
  | 'alfred_creative_agent'
  | 'alfred_video_agent'
  | 'alfred_avatar_agent'
  | 'alfred_travel_agent'
  | 'alfred_course_agent'
  | 'alfred_kids_agent'
  | 'alfred_ecommerce_agent'
  | 'alfred_proptech_agent'
  | 'alfred_crane_agent'
  | 'alfred_social_agent';

export interface MediaProvider {
  id: MediaProviderId;
  name: string;
  role: string;
  strengths: string[];
  supportedOperations: string[];
  configEnv: string[];
  priority: number;
  costTier: 'low' | 'medium' | 'high' | 'local';
  qualityTier: 'standard' | 'premium' | 'cinematic' | 'custom';
  secretPresent: boolean;
}

export interface MediaAgent {
  id: MediaAgentId;
  name: string;
  useES: string;
  useEN: string;
  defaultProvider: MediaProviderId;
  fallbackProviders: MediaProviderId[];
  outputFormats: string[];
  keywords: string[];
  guardrails: string[];
}

export const SEEDANCE_TOOLS = [
  'seedance_text_to_video',
  'seedance_image_to_video',
  'seedance_reference_to_video',
  'seedance_video_edit',
  'seedance_video_extend',
  'seedance_get_task_status',
  'seedance_cancel_task',
  'seedance_download_result',
  'seedance_estimate_cost',
] as const;

export const MEDIA_PROVIDER_CONFIG = {
  seedance_2_5: {
    id: 'seedance_2_5',
    name: 'Seedance 2.5',
    role: 'Primary high-quality text/image/reference-to-video generation engine.',
    strengths: ['cinematic motion', 'prompt adherence', 'image/reference-to-video', 'product and avatar scenes'],
    supportedOperations: [...SEEDANCE_TOOLS],
    configEnv: ['SEEDANCE_API_KEY', 'SEEDANCE_BASE_URL', 'SEEDANCE_MODEL'],
    priority: 1,
    costTier: 'medium',
    qualityTier: 'cinematic',
    secretPresent: Boolean(process.env.SEEDANCE_API_KEY),
  },
  minimax: {
    id: 'minimax',
    name: 'MiniMax Video / Hailuo',
    role: 'Video generation fallback and creative motion provider for campaigns and social media.',
    strengths: ['fast social clips', 'character movement', 'campaign variants', 'prompt-to-video'],
    supportedOperations: ['minimax_text_to_video', 'minimax_image_to_video', 'minimax_get_task_status', 'minimax_download_result', 'minimax_estimate_cost'],
    configEnv: ['MINIMAX_SUBSCRIPTION_KEY', 'MINIMAX_API_KEY', 'MINIMAX_GROUP_ID', 'MINIMAX_BASE_URL'],
    priority: 2,
    costTier: 'medium',
    qualityTier: 'premium',
    secretPresent: Boolean(process.env.MINIMAX_SUBSCRIPTION_KEY || process.env.MINIMAX_API_KEY),
  },
  pixverse: {
    id: 'pixverse',
    name: 'PixVerse',
    role: 'Fast creative variations and stylized social assets.',
    strengths: ['short-form variations', 'stylized ads', 'creative prompts'],
    supportedOperations: ['pixverse_text_to_video', 'pixverse_image_to_video', 'pixverse_status'],
    configEnv: ['PIXVERSE_API_KEY'],
    priority: 3,
    costTier: 'medium',
    qualityTier: 'premium',
    secretPresent: Boolean(process.env.PIXVERSE_API_KEY),
  },
  luma: {
    id: 'luma',
    name: 'Luma',
    role: 'Cinematic reference video and photoreal scenes.',
    strengths: ['cinematic realism', 'camera motion', 'property and destination visuals'],
    supportedOperations: ['luma_text_to_video', 'luma_image_to_video', 'luma_extend_video'],
    configEnv: ['LUMA_API_KEY'],
    priority: 4,
    costTier: 'high',
    qualityTier: 'cinematic',
    secretPresent: Boolean(process.env.LUMA_API_KEY),
  },
  fal_ai: {
    id: 'fal_ai',
    name: 'fal.ai',
    role: 'Multi-model media backend for images/video/audio utilities.',
    strengths: ['model breadth', 'image generation', 'video utilities', 'fast experiments'],
    supportedOperations: ['fal_text_to_video', 'fal_image_to_video', 'fal_image_generation'],
    configEnv: ['FAL_KEY'],
    priority: 5,
    costTier: 'medium',
    qualityTier: 'premium',
    secretPresent: Boolean(process.env.FAL_KEY),
  },
  runware: {
    id: 'runware',
    name: 'Runware',
    role: 'Cost-sensitive image/video generation and production batching.',
    strengths: ['batching', 'lower cost', 'ads and product imagery'],
    supportedOperations: ['runware_generate_image', 'runware_image_to_video'],
    configEnv: ['RUNWARE_API_KEY'],
    priority: 6,
    costTier: 'low',
    qualityTier: 'standard',
    secretPresent: Boolean(process.env.RUNWARE_API_KEY),
  },
  comfyui: {
    id: 'comfyui',
    name: 'ComfyUI',
    role: 'Local/custom workflows for advanced pipelines and private generation.',
    strengths: ['local workflows', 'custom nodes', 'private pipelines', 'controlnets'],
    supportedOperations: ['comfyui_workflow_run', 'comfyui_status', 'comfyui_download_result'],
    configEnv: ['COMFYUI_BASE_URL'],
    priority: 7,
    costTier: 'local',
    qualityTier: 'custom',
    secretPresent: Boolean(process.env.COMFYUI_BASE_URL),
  },
} satisfies Record<MediaProviderId, Omit<MediaProvider, 'id'> & { id: MediaProviderId }>;

export const MEDIA_AGENTS: MediaAgent[] = [
  {
    id: 'alfred_creative_agent',
    name: 'Alfred-CreativeAgent',
    useES: 'Crear anuncios, vídeos de productos y contenido para campañas.',
    useEN: 'Create ads, product videos, and campaign content.',
    defaultProvider: 'seedance_2_5',
    fallbackProviders: ['minimax', 'pixverse', 'fal_ai', 'runware'],
    outputFormats: ['UGC ad', 'product ad', 'VSL hook', 'campaign variant'],
    keywords: ['anuncio', 'campaña', 'creative', 'ad', 'producto', 'marketing', 'ugc'],
    guardrails: ['No usar marcas, rostros o música protegida sin autorización.'],
  },
  {
    id: 'alfred_video_agent',
    name: 'Alfred-VideoAgent',
    useES: 'Generar vídeos desde texto, imágenes o referencias.',
    useEN: 'Generate videos from text, images, or references.',
    defaultProvider: 'seedance_2_5',
    fallbackProviders: ['minimax', 'luma', 'fal_ai'],
    outputFormats: ['text-to-video', 'image-to-video', 'reference-to-video', 'video extension'],
    keywords: ['video', 'vídeo', 'texto a video', 'imagen a video', 'referencia', 'seedance'],
    guardrails: ['Confirmar duración, aspect ratio, derechos de referencias y destino de uso.'],
  },
  {
    id: 'alfred_avatar_agent',
    name: 'Alfred-AvatarAgent',
    useES: 'Crear vídeos de personajes y modelos virtuales.',
    useEN: 'Create character and virtual-model videos.',
    defaultProvider: 'seedance_2_5',
    fallbackProviders: ['minimax', 'pixverse', 'comfyui'],
    outputFormats: ['avatar pitch', 'virtual model', 'character explainer'],
    keywords: ['avatar', 'personaje', 'modelo virtual', 'character', 'influencer virtual'],
    guardrails: ['No clonar identidad real sin consentimiento explícito.'],
  },
  {
    id: 'alfred_travel_agent',
    name: 'Alfred-TravelAgent',
    useES: 'Vídeos de destinos, hoteles, rutas y experiencias.',
    useEN: 'Destination, hotel, route, and experience videos.',
    defaultProvider: 'luma',
    fallbackProviders: ['seedance_2_5', 'minimax', 'fal_ai'],
    outputFormats: ['destination reel', 'hotel promo', 'route visual', 'experience ad'],
    keywords: ['viaje', 'hotel', 'destino', 'ruta', 'travel', 'tour'],
    guardrails: ['Evitar promesas engañosas sobre ubicaciones, precios o disponibilidad.'],
  },
  {
    id: 'alfred_course_agent',
    name: 'Alfred-CourseAgent',
    useES: 'Introducciones, lecciones y vídeos promocionales.',
    useEN: 'Course introductions, lessons, and promo videos.',
    defaultProvider: 'seedance_2_5',
    fallbackProviders: ['minimax', 'fal_ai', 'comfyui'],
    outputFormats: ['lesson intro', 'course promo', 'educational short'],
    keywords: ['curso', 'lección', 'clase', 'educación', 'course', 'lesson'],
    guardrails: ['Mantener contenido educativo preciso y apto para el público objetivo.'],
  },
  {
    id: 'alfred_kids_agent',
    name: 'Alfred-KidsAgent',
    useES: 'Personajes educativos y animaciones infantiles.',
    useEN: 'Educational characters and children-safe animations.',
    defaultProvider: 'seedance_2_5',
    fallbackProviders: ['pixverse', 'comfyui', 'fal_ai'],
    outputFormats: ['kids animation', 'educational character', 'story short'],
    keywords: ['niños', 'infantil', 'kids', 'cuento', 'animación educativa'],
    guardrails: ['Cumplir seguridad infantil, privacidad, edad adecuada y no explotación.'],
  },
  {
    id: 'alfred_ecommerce_agent',
    name: 'Alfred-EcommerceAgent',
    useES: 'Vídeos de móviles, electrónicos, gift cards y productos.',
    useEN: 'Videos for phones, electronics, gift cards, and products.',
    defaultProvider: 'seedance_2_5',
    fallbackProviders: ['runware', 'minimax', 'fal_ai'],
    outputFormats: ['product demo', 'ecommerce ad', 'marketplace video'],
    keywords: ['ecommerce', 'tienda', 'móvil', 'electrónico', 'gift card', 'producto'],
    guardrails: ['No prometer características, precios o descuentos falsos.'],
  },
  {
    id: 'alfred_proptech_agent',
    name: 'Alfred-PropTechAgent',
    useES: 'Presentaciones de propiedades y recorridos visuales.',
    useEN: 'Property presentations and visual walkthroughs.',
    defaultProvider: 'luma',
    fallbackProviders: ['seedance_2_5', 'minimax', 'fal_ai'],
    outputFormats: ['property tour', 'real estate teaser', 'neighborhood reel'],
    keywords: ['propiedad', 'inmueble', 'real estate', 'casa', 'apartamento', 'tour'],
    guardrails: ['Distinguir renders/IA de material real cuando corresponda.'],
  },
  {
    id: 'alfred_crane_agent',
    name: 'Alfred-CraneAgent',
    useES: 'Vídeos técnicos de maquinaria y equipos de izamiento.',
    useEN: 'Technical videos for machinery and lifting equipment.',
    defaultProvider: 'seedance_2_5',
    fallbackProviders: ['luma', 'comfyui', 'fal_ai'],
    outputFormats: ['technical demo', 'safety explainer', 'industrial walkthrough'],
    keywords: ['grúa', 'crane', 'maquinaria', 'izamiento', 'industrial', 'equipo'],
    guardrails: ['No sustituir manuales certificados ni instrucciones de seguridad oficiales.'],
  },
  {
    id: 'alfred_social_agent',
    name: 'Alfred-SocialAgent',
    useES: 'Adaptación automática a Reels, Shorts, TikTok y anuncios.',
    useEN: 'Automatic adaptation to Reels, Shorts, TikTok, and ads.',
    defaultProvider: 'minimax',
    fallbackProviders: ['seedance_2_5', 'pixverse', 'runware'],
    outputFormats: ['9:16 reel', 'YouTube Short', 'TikTok ad', 'cutdown variants'],
    keywords: ['reel', 'short', 'tiktok', 'shorts', 'social', 'vertical', 'anuncio corto'],
    guardrails: ['Adaptar claims, duración y formato a la plataforma.'],
  },
];

export function getMediaProviders(): MediaProvider[] {
  return Object.values(MEDIA_PROVIDER_CONFIG);
}

export function routeMediaRequest(message: string, limit = 3) {
  const text = message.toLowerCase();
  const matches = MEDIA_AGENTS.map(agent => {
    const matchedKeywords = agent.keywords.filter(keyword => text.includes(keyword.toLowerCase()));
    const provider = MEDIA_PROVIDER_CONFIG[agent.defaultProvider];
    const providerBoost = provider.id === 'seedance_2_5' && /seedance|cinematic|cinemático|reference|referencia/.test(text) ? 3 : 0;
    const formatBoost = agent.outputFormats.filter(format => text.includes(format.toLowerCase())).length;
    const score = matchedKeywords.length * 2 + providerBoost + formatBoost + agent.fallbackProviders.length * 0.1;
    return { agent, provider, score, matchedKeywords };
  })
    .filter(match => match.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return matches.length ? matches : [{
    agent: MEDIA_AGENTS.find(a => a.id === 'alfred_video_agent')!,
    provider: MEDIA_PROVIDER_CONFIG.seedance_2_5,
    score: 1,
    matchedKeywords: ['default-video-router'],
  }];
}

export function getMediaRouterStatus() {
  const providers = getMediaProviders();
  return {
    core: 'Alfred Core Media Router',
    primaryProvider: 'Seedance 2.5',
    providers,
    agents: MEDIA_AGENTS,
    seedanceTools: SEEDANCE_TOOLS,
    configuredProviders: providers.filter(p => p.secretPresent || p.id === 'comfyui').map(p => p.id),
    secretPolicy: 'Secrets must live only in local .env/Hermes secret storage. Values are never returned by this API.',
    costQualityRouter: {
      defaultStrategy: 'quality_first_then_cost',
      rules: [
        'Use Seedance 2.5 for primary cinematic, product, avatar and reference-to-video jobs.',
        'Use MiniMax for fast social variants and campaign cutdowns.',
        'Use Luma for travel, real estate and camera-rich cinematic realism.',
        'Use Runware for cost-sensitive product batches.',
        'Use ComfyUI for local/private/custom workflows.',
      ],
    },
  };
}
