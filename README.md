# ALFRED — Mayordomo Digital Bilingüe / AI Butler CORP V3

ALFRED es un asistente de IA estilo JARVIS, bilingüe en español e inglés, con personalidad de mayordomo británico formal y una arquitectura de 12 sub-agentes especializados.

## Estado del proyecto

Implementación funcional en React + Vite + Express + TypeScript, ahora alineada con el HUD publicado en `https://alfred-ai-butle.ai.studio/` y ampliada con detalles operativos máximos:

- Interfaz HUD cyberpunk/regency basada en el design system **Aether-Chassis** de Stitch.
- Header completo `ALFRED CORP V1` con estado del núcleo, seguridad, voz, usuario `Jefe Maestro`, hora y 12/12 agentes online.
- Panel **SYSTEM STATUS** con core online, latencia, quantum link, AES-256 GCM y policy ruleset activo.
- Prompts rápidos operativos: estatus, reunión, escaneo de vulnerabilidades, portafolio, arquitectura SaaS y memoria.
- Razonamiento desplegable por respuesta: método de routing, agente, confidence y justificación.
- Botón `Escuchar voz` por mensaje y espectro de audio en tiempo real.
- Backend real con API Express.
- Router semántico con LLM si hay clave configurada y fallback determinista por keywords.
- Memoria persistente real con SQLite.
- Telemetría persistente.
- TTS masculino bilingüe: ElevenLabs Rupert/Alfred (`89gcX1AeMGgcsN8ypHLu`, `eleven_v3_conversational`) → Gemini TTS → Web Speech API masculino local. Preview en `public/audio/alfred-rupert-preview.mp3`.
- **Panel ALFRED CORP V3**: command bridge futurista basado en Stitch MCP Obsidian Command, con orbe de permisos de micrófono, modo manos libres, live transcript, botones accesibles por voz, MiniMax API, Gemini Nano Banana, Stitch MCP y Seedance 2.5.
- Personalidad estricta: siempre trata al usuario como **Jefe Maestro**; saludo por horario (`Buenos días/tardes/noches, jefe maestro`) y protocolo de tareas `Entendido, Jefe Maestro` al iniciar/finalizar.
- Secciones nuevas: Login Biométrico Fortress, Ajustes, HUD Móvil, Memoria Minerva, Arquitectura Operativa, Red Neuronal y **Negocios + Clientes**.
- **Business Command Layer**: 16 especialistas de negocio basados en los documentos del portafolio (`S1`, `SL1`, `A8`, `B3`, `A1`, `A4`, `RE1`, `A5`, `A6`, `A7`, `A9`, `A10`, `A11`, etc.), fábrica universal de páginas/videos para todo tipo de clientes, playbooks, guardrails y endpoints `/api/business-agents` + `/api/business-agents/route`.
- **RevenueCat MCP** preparado para monetización de apps/SaaS: productos, entitlements, offerings, paywalls, analytics y webhooks vía `https://mcp.revenuecat.ai/mcp`, con clave solo en `.env` local y endpoint seguro `/api/integrations/revenuecat`.
- **Media Router futurista**: Seedance 2.5 como proveedor primario, MiniMax/PixVerse/Luma/fal.ai/Runware/ComfyUI como proveedores alternos, 10 agentes audiovisuales y endpoints `/api/media-router` + `/api/media-router/route`.
- Reparación de estado: los 12 sub-agentes quedan **ACTIVE / ONLINE**.

## Los 12 sub-agentes

| Nombre | Rol |
|---|---|
| Thomas | Arquitecto de Software |
| Ada | Ingeniera de Código |
| Leonardo | Gestor de APIs |
| Victoria | Analista SEO/Datos |
| Marcus | Estratega de Marketing |
| Webb | Especialista en Infraestructura |
| Grace | Agente de Soporte al Cliente |
| Fortress | Seguridad y Biometría |
| Doc | Documentación Técnica |
| Sterling | Constructor de SaaS |
| Minerva | Memoria y Conocimiento |
| Hugo | Especialista Multilingüe |

## Instalación

```bash
npm install
cp .env.example .env
npm run dev
```

Abra:

```text
http://localhost:3000
```

## Configuración de IA

ALFRED funciona sin clave de API en modo offline, pero para respuestas generativas completas configure al menos una:

```env
GEMINI_API_KEY=...
# o
OPENAI_API_KEY=...
# o
OPENROUTER_API_KEY=...
```

Prioridad automática:

1. `GEMINI_API_KEY`
2. `OPENAI_API_KEY`
3. `OPENROUTER_API_KEY`
4. Offline fallback

## Voz masculina bilingüe

Para voz cloud de alta calidad:

```env
ELEVENLABS_API_KEY=...
ALFRED_ELEVENLABS_AGENT_ID=agent_0001kzhcg3anecc9xmf62eceh6m9
ALFRED_TTS_VOICE_ID=89gcX1AeMGgcsN8ypHLu
ALFRED_TTS_MODEL_ID=eleven_v3_conversational
```

El preview de Rupert queda en `public/audio/alfred-rupert-preview.mp3`. Detalles completos: `docs/VOICE_ALFRED_RUPERT.md`.

Si no hay ElevenLabs, usa Gemini TTS si hay `GEMINI_API_KEY`; si tampoco existe, el navegador usa Web Speech API intentando seleccionar voz masculina ES/EN con pitch grave.

## Scripts

```bash
npm run dev      # desarrollo
npm run build    # build producción
npm start        # servidor producción después del build
npm run lint     # type-check TypeScript
npm run smoke    # prueba API básica
```

## Arquitectura

Los 4 pilares están en:

- `src/alfred_core/supervisor.ts` — Orquestador central.
- `src/alfred_core/router.ts` — Router semántico.
- `src/alfred_core/memory.ts` — Memoria SQLite persistente.
- `src/skills/toolRegistry.ts` — Gestor de tools/skills.

Documentación extensa:

- `docs/ARCHITECTURE.md`
- `docs/AGENTS.md`
- `docs/BUSINESS_COMMAND_LAYER.md`
- `docs/VOICE_ALFRED_RUPERT.md`
- `docs/REVENUECAT_MCP.md`
- `docs/MEDIA_ROUTER_SEEDANCE_2_5.md`
- `docs/ALFRED_CORP_V3_HANDS_FREE.md`
- `docs/rutinas-diarias-alfred.md`
- `docs/OPERATIONAL_BRIEFING_V3.md`
- `docs/WINDOWS_RUN_COMMANDS.md`
- `docs/ALFRED_MEMORY_PREFERENCES.md`

## Verificación realizada

Comandos ejecutados con éxito:

```bash
npm install
npx tsc --noEmit
npm run build
NODE_ENV=production node dist/server.mjs
curl http://localhost:3000/api/health
curl http://localhost:3000/api/agents
curl -X POST http://localhost:3000/api/chat ...
```

Resultados confirmados:

- 12 agentes cargados.
- Router enruta arquitectura → Thomas.
- Router enruta seguridad API → Fortress.
- Alternancia `Comprendido` / `Entendido` funcionando.
- SQLite creado físicamente en `data/alfred.db`.
- Telemetría persistente funcionando.
