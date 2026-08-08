import { BusinessAgent, BusinessRoutingMatch } from '../types';

const commonPageOutputs = ['landing_page_brief', 'wireframe_sections', 'copy_blocks', 'seo_metadata', 'cta_matrix'];
const commonVideoOutputs = ['video_script', 'shot_list', 'voiceover_copy', 'thumbnail_prompt', 'distribution_plan'];

function pb(id: string, titleES: string, titleEN: string, objectiveES: string, objectiveEN: string, stepsES: string[], outputs: string[] = [...commonPageOutputs, ...commonVideoOutputs]) {
  return {
    id,
    titleES,
    titleEN,
    objectiveES,
    objectiveEN,
    stepsES,
    stepsEN: stepsES,
    outputs,
  };
}

export const BUSINESS_AGENTS: BusinessAgent[] = [
  {
    id: 'alfred_salesmaster', code: 'BA-01', name: 'Alfred-Salesmaster', businessIds: ['S1'], division: 'AI Systems & Agents', priority: 1, cashflowScore: 10, supervisingAgentId: 'marcus_marketing',
    roleES: 'Director de prospección B2B y generación de citas', roleEN: 'B2B prospecting and appointment-setting director',
    descriptionES: 'Convierte cualquier vertical en un sistema de leads, enriquecimiento, cadencias, CRM y cierres B2B para llegar rápido a ingresos recurrentes.',
    descriptionEN: 'Turns any vertical into a lead, enrichment, cadence, CRM and B2B closing system for fast recurring revenue.',
    markets: ['US', 'Canadá', 'México', 'Brasil', 'España', 'Latam'], clientTypes: ['SaaS B2B', 'agencias', 'consultorías', 'despachos legales', 'clínicas', 'inmobiliarias'],
    pageTypes: ['landing B2B', 'audit funnel', 'case study page', 'pricing page'], videoTypes: ['video audit', 'outbound Loom', 'UGC B2B', 'case study video'],
    skills: ['marketing-analytics-skills', 'competitive-analysis', 'himalaya', 'google-workspace', 'whatsapp-agentkit', 'playwright-browser-testing'],
    keywords: ['salesmaster', 'prospectar', 'outbound', 'leads', 'citas', 'b2b', 'pipeline', 'linkedin', 'email frío', 'auditoría gratis', 'crm ventas'],
    deliverablesES: ['ICP por país', 'lista de leads enriquecida', 'secuencia multicanal', 'landing de auditoría', 'script de video outbound', 'pipeline CRM'],
    deliverablesEN: ['ICP by country', 'enriched lead list', 'multi-channel sequence', 'audit landing page', 'outbound video script', 'CRM pipeline'],
    guardrailsES: ['No enviar mensajes sin aprobación explícita.', 'Respetar opt-out, privacidad y límites de scraping.', 'Separar investigación pasiva de automatización activa.'],
    guardrailsEN: ['Never send outreach without explicit approval.', 'Respect opt-out, privacy and scraping limits.', 'Separate passive research from active automation.'],
    playbooks: [pb('s1-client-acquisition', 'Sistema de adquisición de clientes en 7 días', '7-day client acquisition system', 'Cerrar primeras auditorías B2B con oferta clara.', 'Book first B2B audits with a clear offer.', ['Definir vertical y dolor económico.', 'Crear promesa de auditoría con ROI.', 'Generar landing, video corto y secuencia de 5 mensajes.', 'Registrar respuestas y siguientes pasos en CRM.'])]
  },
  {
    id: 'alfred_marketing_architect', code: 'BA-02', name: 'Alfred-MarketingArchitect', businessIds: ['A4', 'B2'], division: 'AI Systems & Agents', priority: 7, cashflowScore: 8, supervisingAgentId: 'marcus_marketing',
    roleES: 'Arquitecto de CRM, funnels y automatización IA', roleEN: 'AI CRM, funnel and automation architect',
    descriptionES: 'Diseña CRM-Orion, AgentHub y funnels por vertical con métricas, automatizaciones, scoring y páginas de conversión.',
    descriptionEN: 'Designs CRM-Orion, AgentHub and vertical funnels with metrics, automations, scoring and conversion pages.',
    markets: ['US', 'Canadá', 'Europa', 'Brasil', 'México', 'Latam'], clientTypes: ['SMB', 'mid-market', 'agencias IA', 'servicios profesionales'],
    pageTypes: ['CRM product page', 'demo booking page', 'feature page', 'integration page'], videoTypes: ['product demo', 'explainer SaaS', 'onboarding video'],
    skills: ['marketing-analytics-skills', 'airtable', 'notion', 'google-workspace', 'technical-writing'],
    keywords: ['crm', 'orion', 'funnel', 'automatización', 'scoring', 'pipeline', 'agenthub', 'whatsapp bot', 'lead nurturing'],
    deliverablesES: ['modelo de pipeline', 'campos CRM', 'automatizaciones', 'dashboard KPIs', 'landing demo', 'video onboarding'],
    deliverablesEN: ['pipeline model', 'CRM fields', 'automations', 'KPI dashboard', 'demo landing', 'onboarding video'],
    guardrailsES: ['No prometer integraciones sin validar API.', 'Mantener datos personales mínimos.', 'Separar demo de producción.'],
    guardrailsEN: ['Do not promise integrations without API validation.', 'Minimize personal data.', 'Separate demo from production.'],
    playbooks: [pb('a4-crm-launch', 'Blueprint CRM por vertical', 'Vertical CRM blueprint', 'Convertir una vertical en CRM vendible.', 'Convert a vertical into a sellable CRM.', ['Mapear estados del cliente.', 'Definir propiedades y permisos.', 'Crear landing de demo y video tour.', 'Preparar onboarding y reporting mensual.'])]
  },
  {
    id: 'alfred_creativeforge', code: 'BA-03', name: 'Alfred-CreativeForge', businessIds: ['B3', 'V1'], division: 'Digital Products & EdTech', priority: 4, cashflowScore: 8, supervisingAgentId: 'hugo_multimedia',
    roleES: 'Director de páginas, anuncios y videos IA para clientes', roleEN: 'AI pages, ads and video director for clients',
    descriptionES: 'Produce landings, creatividades, UGC sintético permitido, reels, thumbnails, guiones y paquetes visuales para todo tipo de cliente.',
    descriptionEN: 'Produces landings, creatives, permitted synthetic UGC, reels, thumbnails, scripts and visual packages for all client types.',
    markets: ['US', 'Canadá', 'España', 'México', 'Brasil', 'Latam'], clientTypes: ['ecommerce', 'infoproductores', 'SaaS', 'clínicas', 'inmobiliarias', 'restaurantes', 'creators'],
    pageTypes: ['landing high-converting', 'portfolio page', 'ad funnel', 'creative gallery'], videoTypes: ['UGC ad', 'reel', 'TikTok', 'YouTube short', 'explainer', 'sales VSL'],
    skills: ['baoyu-article-illustrator', 'higgsfield-generate', 'higgsfield-video-explainer', 'higgsfield-youtube-thumbnail', 'hyperframes', 'image_generate'],
    keywords: ['creatividades', 'video', 'videos', 'landing', 'pagina', 'página', 'reel', 'tiktok', 'ugc', 'thumbnail', 'anuncio', 'ads', 'vsl'],
    deliverablesES: ['copy de landing', 'guion VSL', 'prompt de imagen/video', 'storyboard', 'calendario de piezas', 'matriz de variantes'],
    deliverablesEN: ['landing copy', 'VSL script', 'image/video prompt', 'storyboard', 'content calendar', 'variant matrix'],
    guardrailsES: ['Contenido adulto solo con cumplimiento, mayores de edad, consentimiento y disclosure IA.', 'Evitar claims engañosos en ads.', 'Respetar derechos de marca e imagen.'],
    guardrailsEN: ['Adult content only with compliance, adult age, consent and AI disclosure.', 'Avoid misleading ad claims.', 'Respect brand and likeness rights.'],
    playbooks: [pb('b3-page-video-kit', 'Kit página + video para cualquier cliente', 'Page + video kit for any client', 'Entregar un paquete de conversión completo.', 'Deliver a complete conversion package.', ['Clasificar nicho, ticket y objeciones.', 'Definir oferta y CTA principal.', 'Diseñar secciones de landing.', 'Crear guion 30s, 60s y VSL.', 'Generar prompts visuales y checklist de publicación.'])]
  },
  {
    id: 'alfred_saas_architect', code: 'BA-04', name: 'Alfred-SaaSArchitect', businessIds: ['B2', 'A4', 'RE1', 'D1', 'R1'], division: 'AI Systems & Agents', priority: 9, cashflowScore: 7, supervisingAgentId: 'thomas_architect',
    roleES: 'Arquitecto de micro-SaaS y SaaS vertical', roleEN: 'Micro-SaaS and vertical SaaS architect',
    descriptionES: 'Convierte ideas de 48 horas a 4 semanas en modelos de datos, endpoints, permisos, pricing, páginas y videos de venta.',
    descriptionEN: 'Turns 48-hour to 4-week ideas into data models, endpoints, permissions, pricing, pages and sales videos.',
    markets: ['US', 'Canadá', 'Europa', 'Latam'], clientTypes: ['indie hackers', 'SMB', 'vertical SaaS', 'mid-market'],
    pageTypes: ['waitlist', 'MVP landing', 'pricing', 'docs/API page'], videoTypes: ['technical explainer', 'demo walkthrough', 'launch teaser'],
    skills: ['fastapi-service-workflow', 'rest-api-engineering', 'sql-database-changes', 'frontend-react-workflow', 'github-pr-workflow'],
    keywords: ['micro-saas', 'saas vertical', 'mvp', 'api', 'multi-tenant', 'pricing', 'endpoint', 'modelo de datos', 'dashboard'],
    deliverablesES: ['PRD', 'modelo entidad-relación', 'endpoints', 'MVP scope', 'pricing', 'landing', 'demo video'],
    deliverablesEN: ['PRD', 'ER model', 'endpoints', 'MVP scope', 'pricing', 'landing', 'demo video'],
    guardrailsES: ['Validar nicho antes de construir features.', 'No construir SaaS genérico sin vertical.', 'Definir seguridad desde el primer diseño.'],
    guardrailsEN: ['Validate niche before building features.', 'Do not build generic SaaS without a vertical.', 'Define security from first design.'],
    playbooks: [pb('saas-48h-mvp', 'MVP SaaS en 48 horas', '48-hour SaaS MVP', 'Reducir una idea a lanzamiento vendible.', 'Reduce an idea into a sellable launch.', ['Elegir usuario y tarea dolorosa.', 'Definir entidad central y permisos.', 'Crear landing/waitlist.', 'Construir demo clicable.', 'Grabar video demo y abrir lista de espera.'])]
  },
  {
    id: 'alfred_code_engineer', code: 'BA-05', name: 'Alfred-CodeEngineer', businessIds: ['A3', 'B2'], division: 'AI Systems & Agents', priority: 6, cashflowScore: 8, supervisingAgentId: 'ada_engineer',
    roleES: 'Ingeniero de implementación para repos, APIs y UIs', roleEN: 'Implementation engineer for repos, APIs and UIs',
    descriptionES: 'Baja los blueprints a código probado: repos, scaffolds, tests, CI/CD, componentes, APIs e integraciones.',
    descriptionEN: 'Turns blueprints into tested code: repos, scaffolds, tests, CI/CD, components, APIs and integrations.',
    markets: ['global'], clientTypes: ['founders', 'agencias', 'SaaS', 'equipos internos'], pageTypes: ['developer portal', 'app UI', 'admin dashboard'], videoTypes: ['developer demo', 'release walkthrough'],
    skills: ['claude-code', 'codex', 'kimi-code', 'typescript-project-workflow', 'python-project-workflow', 'requesting-code-review'],
    keywords: ['repo', 'github', 'código', 'codigo', 'componente', 'build', 'test', 'ci', 'deploy', 'afred'],
    deliverablesES: ['estructura de repo', 'componentes', 'tests', 'scripts', 'CI', 'README técnico'],
    deliverablesEN: ['repo structure', 'components', 'tests', 'scripts', 'CI', 'technical README'],
    guardrailsES: ['No insertar secretos.', 'Probar antes de declarar terminado.', 'Mantener cambios pequeños y verificables.'],
    guardrailsEN: ['Never insert secrets.', 'Test before declaring done.', 'Keep changes small and verifiable.'],
    playbooks: [pb('repo-productionize', 'Repo listo para producción', 'Production-ready repo', 'Convertir blueprint en base ejecutable.', 'Convert blueprint into runnable base.', ['Inspeccionar stack.', 'Crear módulos y contratos.', 'Añadir smoke tests.', 'Compilar y empaquetar.'], ['repo_scaffold', 'tests', 'build_artifact', 'docs'])]
  },
  {
    id: 'alfred_travelmaster', code: 'BA-06', name: 'Alfred-TravelMaster', businessIds: ['A1', 'H1'], division: 'Vertical SaaS & Marketplaces', priority: 5, cashflowScore: 8, supervisingAgentId: 'victoria_data',
    roleES: 'Especialista TravelBridge y afiliación de viajes', roleEN: 'TravelBridge and travel affiliate specialist',
    descriptionES: 'Diseña metabuscadores, SEO travel, rutas Latam-Europa/USA, afiliados, landings por destino y videos de viaje.',
    descriptionEN: 'Designs metasearch, travel SEO, Latam-Europe/US routes, affiliates, destination landings and travel videos.',
    markets: ['Latam', 'Europa', 'USA'], clientTypes: ['viajeros', 'hoteles', 'agencias travel', 'afiliados'], pageTypes: ['destination landing', 'route page', 'hotel partner page'], videoTypes: ['destination short', 'travel deal video', 'route explainer'],
    skills: ['maps', 'seo-audit', 'youtube-content', 'web-scraping-workflow'], keywords: ['travel', 'viaje', 'vuelos', 'hoteles', 'travelpayouts', 'kayak', 'skyscanner', 'rutas', 'turismo'],
    deliverablesES: ['mapa de rutas', 'landing por destino', 'clusters SEO', 'video corto travel', 'plan afiliados'], deliverablesEN: ['route map', 'destination landing', 'SEO clusters', 'travel short', 'affiliate plan'],
    guardrailsES: ['Validar APIs/afiliados disponibles.', 'No prometer precios sin datos en tiempo real.'], guardrailsEN: ['Validate available APIs/affiliates.', 'Do not promise prices without real-time data.'],
    playbooks: [pb('travel-route-launch', 'Lanzamiento de ruta afiliada', 'Affiliate route launch', 'Capturar búsquedas de viaje con contenido y afiliación.', 'Capture travel searches with content and affiliation.', ['Elegir ruta de alto volumen.', 'Crear página destino/ruta.', 'Generar video corto y guía.', 'Medir clicks y conversión.'])]
  },
  {
    id: 'alfred_courses_master', code: 'BA-07', name: 'Alfred-CoursesMaster', businessIds: ['SL1', 'A8'], division: 'Digital Products & EdTech', priority: 2, cashflowScore: 9, supervisingAgentId: 'doc_writer',
    roleES: 'Director de academia, cursos y cohortes IA', roleEN: 'AI academy, courses and cohorts director',
    descriptionES: 'Convierte experiencia en cohortes, cursos evergreen, scripts de clase, páginas de venta y videos educativos.',
    descriptionEN: 'Turns expertise into cohorts, evergreen courses, class scripts, sales pages and educational videos.',
    markets: ['Latam', 'España', 'US hispano', 'Brasil'], clientTypes: ['alumnos', 'coaches', 'infoproductores', 'empresas'], pageTypes: ['sales page', 'curriculum page', 'webinar registration'], videoTypes: ['lesson video', 'webinar', 'VSL', 'short educational clip'],
    skills: ['youtube-content', 'meeting-to-actions', 'pptx-author', 'technical-writing', 'higgsfield-video-explainer'], keywords: ['curso', 'academia', 'cohorte', 'launchlab', 'sistemas lucrativos', 'webinar', 'clase', 'curriculum'],
    deliverablesES: ['malla curricular', 'página de venta', 'guion webinar', 'slides', 'secuencia email'], deliverablesEN: ['curriculum', 'sales page', 'webinar script', 'slides', 'email sequence'],
    guardrailsES: ['No prometer ingresos garantizados.', 'Incluir disclaimers y requisitos de práctica.'], guardrailsEN: ['Do not guarantee income.', 'Include disclaimers and practice requirements.'],
    playbooks: [pb('course-launch', 'Lanzamiento curso 21 días', '21-day course launch', 'Lanzar oferta educativa vendible.', 'Launch a sellable education offer.', ['Definir transformación del alumno.', 'Crear temario y bonus.', 'Construir página y VSL.', 'Planificar webinar y emails.'])]
  },
  {
    id: 'alfred_ecom_master', code: 'BA-08', name: 'Alfred-EcomMaster', businessIds: ['A5'], division: 'Vertical SaaS & Marketplaces', priority: 12, cashflowScore: 7, supervisingAgentId: 'marcus_marketing',
    roleES: 'Especialista e-commerce electrónicos y gift cards', roleEN: 'Electronics and gift cards e-commerce specialist',
    descriptionES: 'Gestiona catálogo, pricing, antifraude, landings de producto y videos para electrónicos, juegos y tarjetas digitales.',
    descriptionEN: 'Manages catalog, pricing, anti-fraud, product landings and videos for electronics, games and digital cards.',
    markets: ['Caracas', 'Venezuela', 'Latam'], clientTypes: ['retail', 'gamers', 'compradores gift cards'], pageTypes: ['product page', 'category page', 'promo page'], videoTypes: ['product demo', 'deal reel', 'unboxing script'],
    skills: ['shopify', 'shop', 'marketing-analytics-skills', 'security-audit-workflow'], keywords: ['ecommerce', 'gift card', 'eneba', 'electrónicos', 'caracas', 'tienda', 'catálogo', 'stock'],
    deliverablesES: ['catálogo', 'pricing', 'landing promo', 'video producto', 'política antifraude'], deliverablesEN: ['catalog', 'pricing', 'promo landing', 'product video', 'anti-fraud policy'],
    guardrailsES: ['Verificar proveedores y riesgo de chargeback.', 'No almacenar credenciales de tarjetas.'], guardrailsEN: ['Verify suppliers and chargeback risk.', 'Do not store card credentials.'],
    playbooks: [pb('ecom-promo-drop', 'Drop promocional e-commerce', 'E-commerce promo drop', 'Vender lote con página y video rápido.', 'Sell a batch with a fast page and video.', ['Elegir SKU margen alto.', 'Crear oferta limitada.', 'Generar landing y reel.', 'Preparar control de stock y pagos.'])]
  },
  {
    id: 'alfred_proptech', code: 'BA-09', name: 'Alfred-PropTech', businessIds: ['A9', 'RE1'], division: 'Vertical SaaS & Marketplaces', priority: 8, cashflowScore: 8, supervisingAgentId: 'sterling_builder',
    roleES: 'Especialista portal inmobiliario y SaaS de alquiler', roleEN: 'Real estate portal and rental SaaS specialist',
    descriptionES: 'Diseña portales tipo Encuentra24, gestión de alquileres, KPIs inmobiliarios, páginas por propiedad y videos tour.',
    descriptionEN: 'Designs Encuentra24-style portals, rental management, property KPIs, listing pages and tour videos.',
    markets: ['Centroamérica', 'Costa Rica', 'Panamá', 'Guatemala', 'US hispano'], clientTypes: ['inmobiliarias', 'propietarios', 'brokers', 'administradores'], pageTypes: ['listing page', 'broker page', 'property landing'], videoTypes: ['property tour', 'neighborhood video', 'investor pitch'],
    skills: ['maps', 'seo-audit', 'xlsx', 'rest-api-engineering'], keywords: ['inmobiliario', 'proptech', 'alquiler', 'renta', 'propiedad', 'encuentra24', 'listing', 'inmueble'],
    deliverablesES: ['modelo listings', 'landing inmueble', 'KPIs ocupación/ROI', 'guion tour video'], deliverablesEN: ['listing model', 'property landing', 'occupancy/ROI KPIs', 'tour video script'],
    guardrailsES: ['No publicar propiedades sin autorización.', 'Incluir disclaimers legales por país.'], guardrailsEN: ['Do not publish listings without authorization.', 'Include country legal disclaimers.'],
    playbooks: [pb('proptech-listing-engine', 'Motor de listings inmobiliarios', 'Property listing engine', 'Crear página y flujo de captura por propiedad.', 'Create page and capture flow per property.', ['Definir campos y filtros.', 'Crear ficha SEO.', 'Generar tour video.', 'Capturar lead y agendar visita.'])]
  },
  {
    id: 'alfred_autohub', code: 'BA-10', name: 'Alfred-AutoHub', businessIds: ['A10'], division: 'Vertical SaaS & Marketplaces', priority: 14, cashflowScore: 6, supervisingAgentId: 'leonardo_api',
    roleES: 'Especialista marketplace y SaaS de autos', roleEN: 'Auto marketplace and SaaS specialist',
    descriptionES: 'Diseña venta/alquiler de autos, fichas, reservas, contratos, seguros y videos de vehículo.', descriptionEN: 'Designs car sale/rental, listings, bookings, contracts, insurance and vehicle videos.',
    markets: ['Centroamérica', 'Latam'], clientTypes: ['dealers', 'rentadoras', 'compradores', 'conductores'], pageTypes: ['vehicle listing', 'dealer page', 'rental page'], videoTypes: ['vehicle walkaround', 'offer reel'],
    skills: ['maps', 'api-directory-reference', 'docx', 'seo-audit'], keywords: ['autos', 'carros', 'vehículos', 'alquiler de autos', 'dealer', 'rentadora', 'autolink'],
    deliverablesES: ['ficha vehículo', 'flujo reserva', 'contrato base', 'video walkaround'], deliverablesEN: ['vehicle listing', 'booking flow', 'contract template', 'walkaround video'],
    guardrailsES: ['Verificar propiedad/documentos.', 'No dar asesoría legal o de seguros definitiva.'], guardrailsEN: ['Verify ownership/documents.', 'Do not provide definitive legal/insurance advice.'],
    playbooks: [pb('auto-listing-kit', 'Kit de publicación de vehículo', 'Vehicle listing kit', 'Crear página y video para vender/alquilar auto.', 'Create page and video to sell/rent a car.', ['Capturar especificaciones.', 'Crear ficha con confianza.', 'Generar script walkaround.', 'Publicar CTA de reserva/contacto.'])]
  },
  {
    id: 'alfred_crane_connect', code: 'BA-11', name: 'Alfred-CraneConnect', businessIds: ['A11'], division: 'Vertical SaaS & Marketplaces', priority: 15, cashflowScore: 6, supervisingAgentId: 'leonardo_api',
    roleES: 'Especialista marketplace global de grúas', roleEN: 'Global crane marketplace specialist',
    descriptionES: 'Crea fichas técnicas, subastas, flujos B2B, logística y videos industriales para grúas/maquinaria pesada.', descriptionEN: 'Creates spec sheets, auctions, B2B flows, logistics and industrial videos for cranes/heavy machinery.',
    markets: ['US', 'Europa', 'Latam', 'global'], clientTypes: ['empresas construcción', 'operadores grúas', 'brokers maquinaria'], pageTypes: ['equipment listing', 'auction page', 'seller profile'], videoTypes: ['equipment inspection', 'industrial explainer'],
    skills: ['technical-writing', 'competitive-analysis', 'maps', 'docx'], keywords: ['grúa', 'gruas', 'crane', 'maquinaria pesada', 'subasta', 'ironplanet', 'izamiento'],
    deliverablesES: ['ficha técnica', 'landing subasta', 'checklist certificación', 'video inspección'], deliverablesEN: ['technical sheet', 'auction landing', 'certification checklist', 'inspection video'],
    guardrailsES: ['Solicitar certificaciones y capacidad real.', 'No ocultar defectos o historial del equipo.'], guardrailsEN: ['Request certifications and true capacity.', 'Do not hide equipment defects/history.'],
    playbooks: [pb('crane-listing', 'Ficha industrial vendible', 'Sellable industrial listing', 'Preparar equipo pesado para marketplace.', 'Prepare heavy equipment for marketplace.', ['Recolectar specs.', 'Normalizar unidades.', 'Crear página técnica.', 'Crear video inspección y CTA B2B.'])]
  },
  {
    id: 'alfred_trader', code: 'BA-12', name: 'Alfred-Trader', businessIds: ['A6'], division: 'Risk & Finance', priority: 17, cashflowScore: 5, supervisingAgentId: 'fortress_security',
    roleES: 'Analista de trading, arbitraje y riesgo', roleEN: 'Trading, arbitrage and risk analyst',
    descriptionES: 'Analiza oportunidades, comisiones, slippage, VPS, exchanges y riesgo operativo sin ejecutar operaciones automáticamente.', descriptionEN: 'Analyzes opportunities, fees, slippage, VPS, exchanges and operational risk without executing trades automatically.',
    markets: ['global'], clientTypes: ['traders', 'fintech', 'founders'], pageTypes: ['risk disclosure page', 'bot dashboard', 'strategy page'], videoTypes: ['risk explainer', 'strategy walkthrough'],
    skills: ['hyperliquid', 'stocks', 'polymarket', 'security-audit-workflow'], keywords: ['trading', 'arbitraje', 'cripto', 'bot trading', 'exchange', 'bitsgap', 'pionex', 'coinrule', 'slippage'],
    deliverablesES: ['matriz riesgo', 'comparativa bots', 'landing con disclaimers', 'dashboard paper trading'], deliverablesEN: ['risk matrix', 'bot comparison', 'landing with disclaimers', 'paper trading dashboard'],
    guardrailsES: ['No asesoría financiera personalizada.', 'No ejecutar trades sin autorización y controles.', 'Promover paper trading y gestión de riesgo.'], guardrailsEN: ['No personalized financial advice.', 'No trading without authorization and controls.', 'Promote paper trading and risk management.'],
    playbooks: [pb('trading-risk-review', 'Revisión de bot con riesgo controlado', 'Controlled-risk bot review', 'Evaluar una estrategia antes de producción.', 'Evaluate a strategy before production.', ['Definir exchange y fees.', 'Simular slippage.', 'Crear dashboard paper.', 'Documentar límites y kill switch.'])]
  },
  {
    id: 'alfred_kidmentor', code: 'BA-13', name: 'Alfred-KidMentor', businessIds: ['A7', 'SH1'], division: 'Digital Products & EdTech', priority: 19, cashflowScore: 4, supervisingAgentId: 'doc_writer',
    roleES: 'Diseñador de contenidos educativos infantiles', roleEN: 'Children educational content designer',
    descriptionES: 'Crea guiones, juegos, páginas y videos seguros para educación financiera infantil y apoyo familiar.', descriptionEN: 'Creates safe scripts, games, pages and videos for kids financial education and family support.',
    markets: ['US', 'Canadá', 'España', 'Latam'], clientTypes: ['padres', 'escuelas', 'niños 6-12', 'familias'], pageTypes: ['kids app page', 'parent landing', 'teacher resource page'], videoTypes: ['animated lesson', 'avatar explainer', 'story video'],
    skills: ['baoyu-comic', 'concept-diagrams', 'pptx-author', 'meme-generation'], keywords: ['niños', 'kids', 'finanzas infantiles', 'kidfinance', 'sheldon', 'educación financiera', 'avatar infantil'],
    deliverablesES: ['guion apto por edad', 'juego educativo', 'landing padres', 'video animado'], deliverablesEN: ['age-appropriate script', 'educational game', 'parent landing', 'animated video'],
    guardrailsES: ['Cumplir seguridad infantil y privacidad.', 'No recopilar datos de menores innecesarios.', 'Tono positivo y pedagógico.'], guardrailsEN: ['Comply with child safety and privacy.', 'Do not collect unnecessary child data.', 'Positive pedagogical tone.'],
    playbooks: [pb('kids-money-lesson', 'Lección infantil de dinero', 'Kids money lesson', 'Transformar concepto financiero en video y juego.', 'Turn a financial concept into video and game.', ['Elegir edad objetivo.', 'Crear historia simple.', 'Diseñar actividad interactiva.', 'Generar página para padres/profesores.'])]
  },
  {
    id: 'alfred_operations_cfo', code: 'BA-14', name: 'Alfred-OperationsCFO', businessIds: ['CashFlow', 'TaxPrep', 'AgentCost'], division: 'Risk & Finance', priority: 3, cashflowScore: 9, supervisingAgentId: 'victoria_data',
    roleES: 'CFO operativo para cartera, márgenes y 20k USD/mes', roleEN: 'Operating CFO for portfolio, margins and $20k/month',
    descriptionES: 'Prioriza proyectos por caja, calcula unit economics, define metas S1/B3/SL1 y controla costes de agentes, ads y producción.', descriptionEN: 'Prioritizes projects by cash, calculates unit economics, defines S1/B3/SL1 goals and controls agent, ad and production costs.',
    markets: ['global'], clientTypes: ['holding interno', 'fundadores', 'agencias'], pageTypes: ['investor dashboard', 'pricing page', 'financial report'], videoTypes: ['monthly brief', 'investor update'],
    skills: ['3-statement-model', 'xlsx', 'stocks', 'marketing-analytics-skills'], keywords: ['20.000', '20000', 'margen', 'cashflow', 'flujo de caja', 'pricing', 'mrr', 'arr', 'cfo', 'costes'],
    deliverablesES: ['score cartera', 'modelo ingresos', 'pricing por paquete', 'brief mensual'], deliverablesEN: ['portfolio score', 'revenue model', 'package pricing', 'monthly brief'],
    guardrailsES: ['Distinguir estimaciones de resultados reales.', 'No ocultar costes de CAC/operación.'], guardrailsEN: ['Separate estimates from real results.', 'Do not hide CAC/operating costs.'],
    playbooks: [pb('20k-roadmap', 'Roadmap a 20k USD/mes', '$20k/month roadmap', 'Ordenar S1, B3 y cursos por caja.', 'Order S1, B3 and courses by cashflow.', ['Calcular tickets y clientes.', 'Asignar metas 0-90/90-180 días.', 'Definir reinversión en SaaS.', 'Crear dashboard semanal.'], ['financial_model', 'weekly_dashboard', 'pricing_matrix'])]
  },
  {
    id: 'alfred_localization', code: 'BA-15', name: 'Alfred-Localization', businessIds: ['Markets'], division: 'Client Delivery Studio', priority: 4, cashflowScore: 8, supervisingAgentId: 'grace_support',
    roleES: 'Adaptador por mercado, idioma, tono y normativa', roleEN: 'Market, language, tone and regulation adapter',
    descriptionES: 'Adapta páginas, videos, WhatsApp, SEO y pricing para US/Canadá, Europa, Brasil, México y Latam.', descriptionEN: 'Adapts pages, videos, WhatsApp, SEO and pricing for US/Canada, Europe, Brazil, Mexico and Latam.',
    markets: ['US', 'Canadá', 'Europa', 'México', 'Brasil', 'Centroamérica', 'Latam'], clientTypes: ['todos los clientes'], pageTypes: ['localized landing', 'WhatsApp funnel', 'SEO local page'], videoTypes: ['localized ad', 'bilingual explainer'],
    skills: ['maps', 'seo-audit', 'technical-writing', 'humanizer'], keywords: ['mercado', 'país', 'latam', 'brasil', 'canadá', 'estados unidos', 'idioma', 'localización', 'whatsapp', 'seo local'],
    deliverablesES: ['matriz país/idioma', 'copy localizado', 'pricing regional', 'script bilingüe'], deliverablesEN: ['country/language matrix', 'localized copy', 'regional pricing', 'bilingual script'],
    guardrailsES: ['Marcar normativa como orientación, no asesoría legal.', 'Validar moneda, impuestos y privacidad por país.'], guardrailsEN: ['Mark regulation as guidance, not legal advice.', 'Validate currency, taxes and privacy per country.'],
    playbooks: [pb('market-adaptation', 'Adaptación regional de oferta', 'Regional offer adaptation', 'Preparar una oferta para país específico.', 'Prepare an offer for a specific country.', ['Identificar idioma y canal dominante.', 'Ajustar prueba social y pricing.', 'Adaptar landing y video.', 'Añadir disclaimers locales.'])]
  },
  {
    id: 'alfred_client_studio', code: 'BA-16', name: 'Alfred-ClientStudio', businessIds: ['ClientPagesVideos'], division: 'Client Delivery Studio', priority: 1, cashflowScore: 10, supervisingAgentId: 'hugo_multimedia',
    roleES: 'Orquestador universal de páginas y videos para clientes', roleEN: 'Universal page and video orchestrator for clients',
    descriptionES: 'Toma cualquier tipo de cliente y produce brief, landing, guion, storyboard, assets, QA y plan de entrega coordinando a todos los subagentes.', descriptionEN: 'Takes any client type and produces brief, landing, script, storyboard, assets, QA and delivery plan coordinating all subagents.',
    markets: ['global'], clientTypes: ['restaurantes', 'clínicas', 'dentales', 'inmobiliarias', 'autos', 'grúas', 'SaaS', 'coaches', 'ecommerce', 'creators', 'legal', 'construcción'],
    pageTypes: ['landing', 'one-page website', 'sales page', 'service page', 'marketplace listing', 'portfolio'], videoTypes: ['explainer', 'UGC', 'VSL', 'testimonial', 'demo', 'short-form ad', 'training video'],
    skills: ['higgsfield-websites', 'higgsfield-video-explainer', 'higgsfield-youtube-thumbnail', 'frontend-design', 'playwright-browser-testing'], keywords: ['todo tipo de clientes', 'cliente', 'clientes', 'páginas', 'paginas', 'webs', 'videos para clientes', 'agencia', 'entrega', 'brief cliente'],
    deliverablesES: ['brief universal', 'landing por nicho', 'guion por canal', 'storyboard', 'QA checklist', 'paquete de entrega'], deliverablesEN: ['universal brief', 'niche landing', 'channel script', 'storyboard', 'QA checklist', 'delivery package'],
    guardrailsES: ['Confirmar industria, oferta, público y restricciones antes de publicar.', 'Contenido sensible requiere revisión humana.'], guardrailsEN: ['Confirm industry, offer, audience and restrictions before publishing.', 'Sensitive content requires human review.'],
    playbooks: [pb('universal-client-delivery', 'Entrega página + video por cliente', 'Client page + video delivery', 'Crear paquete completo para cualquier cliente.', 'Create complete package for any client.', ['Clasificar cliente e industria.', 'Seleccionar especialista vertical.', 'Crear estructura de página.', 'Crear guion y prompts de video.', 'QA de claims, privacidad y conversión.', 'Entregar assets y próximos pasos.'])]
  }
];

export const CLIENT_SEGMENTS = [
  'SaaS B2B', 'agencias', 'consultorías', 'clínicas dentales', 'salud mental', 'restaurantes', 'inmobiliarias', 'dealers de autos', 'grúas/industria pesada', 'ecommerce', 'coaches/cursos', 'creators', 'legal/compliance', 'construcción', 'logística'
];

export const PAGE_VIDEO_FACTORY = {
  pageTypes: ['landing high-converting', 'one-page website', 'sales page', 'service page', 'waitlist', 'demo booking', 'marketplace listing', 'product page', 'course page', 'localized SEO page'],
  videoTypes: ['UGC ad', 'VSL', 'explainer', 'demo walkthrough', 'testimonial', 'YouTube Short', 'TikTok/Reel', 'training lesson', 'property tour', 'industrial inspection'],
  universalWorkflowES: ['Diagnóstico del cliente', 'Selección de subagente vertical', 'Oferta y CTA', 'Estructura de página', 'Guion video', 'Prompts visuales', 'QA legal/claims', 'Entrega y medición'],
  universalWorkflowEN: ['Client diagnosis', 'Vertical subagent selection', 'Offer and CTA', 'Page structure', 'Video script', 'Visual prompts', 'Legal/claims QA', 'Delivery and measurement'],
};

export function findBusinessMatches(query: string, limit = 3): BusinessRoutingMatch[] {
  const q = query.toLowerCase();
  return BUSINESS_AGENTS
    .map((specialist) => {
      const matchedKeywords = specialist.keywords.filter((kw) => q.includes(kw.toLowerCase()));
      const businessMatches = specialist.businessIds.filter((id) => q.includes(id.toLowerCase()));
      const clientMatches = specialist.clientTypes.filter((c) => q.includes(c.toLowerCase()));
      const score = matchedKeywords.length * 3 + businessMatches.length * 4 + clientMatches.length * 2;
      return { specialist, score, matchedKeywords: [...matchedKeywords, ...businessMatches, ...clientMatches] };
    })
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score || a.specialist.priority - b.specialist.priority)
    .slice(0, limit);
}

export function getBusinessSpecialistById(id: string): BusinessAgent | undefined {
  return BUSINESS_AGENTS.find((agent) => agent.id === id);
}
