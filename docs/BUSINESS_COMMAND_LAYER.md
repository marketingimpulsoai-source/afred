# Alfred/Afred Business Command Layer

Este documento convierte los tres blueprints adjuntos del portafolio en una capa operativa dentro de Alfred.

## Fuentes incorporadas

- `Portafolio de proyectos IA y plan para llegar a 20.000 USD mes.md`
- `Ideas de Micro‑SaaS y SaaS verticales para lanzar rápido con IA (2026).md`
- `Alfred Jarvis – Cartera de negocios y subagentes especialistas (versión Hermes Agent).md`

## Arquitectura resultante

Alfred mantiene sus **12 sub-agentes técnicos base**:

1. Thomas — arquitectura.
2. Ada — código.
3. Leonardo — APIs.
4. Victoria — datos/SEO.
5. Marcus — marketing.
6. Webb — infraestructura.
7. Grace — soporte.
8. Fortress — seguridad.
9. Doc — documentación.
10. Sterling — SaaS builder.
11. Minerva — memoria.
12. Hugo — multimedia.

Encima se añadió una capa de **16 especialistas de negocio** en `src/data/businessAgents.ts`. Cada especialista declara:

- negocios asociados (`S1`, `A4`, `A1`, `RE1`, etc.),
- división del holding,
- prioridad y score de flujo de caja,
- subagente técnico supervisor,
- mercados objetivo,
- tipos de clientes,
- tipos de páginas,
- tipos de videos,
- skills Hermes recomendadas,
- entregables,
- guardrails,
- playbooks operativos.

## Especialistas creados

| Código | Especialista | Negocios | Supervisor técnico | Uso principal |
|---|---|---|---|---|
| BA-01 | Alfred-Salesmaster | S1 | Marcus | Outbound B2B, leads, citas, auditorías. |
| BA-02 | Alfred-MarketingArchitect | A4/B2 | Marcus | CRM, funnels, automatización, scoring. |
| BA-03 | Alfred-CreativeForge | B3/V1 | Hugo | Páginas, anuncios, UGC permitido, videos. |
| BA-04 | Alfred-SaaSArchitect | B2/A4/RE1/D1/R1 | Thomas | Micro-SaaS, APIs, SaaS vertical. |
| BA-05 | Alfred-CodeEngineer | A3/B2 | Ada | Repos, implementación, tests, CI. |
| BA-06 | Alfred-TravelMaster | A1/H1 | Victoria | Travel afiliados, rutas, SEO travel. |
| BA-07 | Alfred-CoursesMaster | SL1/A8 | Doc | Cursos, cohortes, webinars, VSL. |
| BA-08 | Alfred-EcomMaster | A5 | Marcus | Ecommerce, gift cards, catálogo, antifraude. |
| BA-09 | Alfred-PropTech | A9/RE1 | Sterling | Portal inmobiliario y SaaS alquileres. |
| BA-10 | Alfred-AutoHub | A10 | Leonardo | Venta/alquiler de autos. |
| BA-11 | Alfred-CraneConnect | A11 | Leonardo | Marketplace global de grúas. |
| BA-12 | Alfred-Trader | A6 | Fortress | Trading/arbitraje con control de riesgo. |
| BA-13 | Alfred-KidMentor | A7/SH1 | Doc | Educación financiera infantil segura. |
| BA-14 | Alfred-OperationsCFO | CashFlow/TaxPrep/AgentCost | Victoria | Ruta a 20k USD/mes, márgenes, pricing. |
| BA-15 | Alfred-Localization | Markets | Grace | Adaptación US/Canadá/Europa/Latam/Brasil. |
| BA-16 | Alfred-ClientStudio | ClientPagesVideos | Hugo | Orquestador universal de páginas y videos para clientes. |

## Fábrica universal de páginas y videos

La pestaña **NEGOCIOS + CLIENTES** incluye:

- router local por texto para detectar especialistas,
- matriz de prioridad cash-flow,
- tipos de páginas:
  - landing high-converting,
  - one-page website,
  - sales page,
  - service page,
  - waitlist,
  - demo booking,
  - marketplace listing,
  - product page,
  - course page,
  - localized SEO page,
- tipos de videos:
  - UGC ad,
  - VSL,
  - explainer,
  - demo walkthrough,
  - testimonial,
  - YouTube Short,
  - TikTok/Reel,
  - training lesson,
  - property tour,
  - industrial inspection.

Workflow universal:

1. Diagnóstico del cliente.
2. Selección de subagente vertical.
3. Oferta y CTA.
4. Estructura de página.
5. Guion video.
6. Prompts visuales.
7. QA legal/claims.
8. Entrega y medición.

## Endpoints añadidos

```http
GET /api/business-agents
POST /api/business-agents/route
```

Ejemplo:

```json
{
  "message": "Necesito páginas y videos para clientes SaaS, clínicas e inmobiliarias",
  "limit": 3
}
```

Respuesta: lista de especialistas con score y keywords detectadas.

## Guardrails importantes

- Contenido adulto/creator economy solo con mayores de edad, consentimiento, cumplimiento de plataforma y disclosure IA.
- Trading/arbitraje no ejecuta operaciones ni da asesoría financiera personalizada.
- Outreach B2B no envía mensajes sin aprobación explícita.
- Páginas/videos de clientes requieren revisión humana antes de publicar.
- Datos de menores: mínimo necesario, privacidad y contenido seguro.
- No se guardan secretos ni API keys en documentación o ZIP.
