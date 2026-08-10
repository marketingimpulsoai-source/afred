# ALFRED — Mayordomo Digital Bilingüe / AI Butler CORP V3.5

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
- TTS masculino bilingüe: ElevenLabs Rupert/Alfred (`89gcX1AeMGgcsN8ypHLu`, `eleven_multilingual_v2`) → Gemini TTS → Web Speech API local. Preview en `public/audio/alfred-rupert-preview.mp3`.
- **Panel ALFRED WEB CORE**: Stitch Cyberpunk Nexus Fusion con los 10 ZIPs de Stitch importados, referencia visual `https://alfred-ai-butle.ai.studio/`, glass/chamfer panels, scanline, data-grid, shader backplane, flicker, waveform, Three.js orbital motif y matriz `STITCH FUSION MATRIX`.
- **Lanzador Windows**: un VBScript oculto abre Alfred automáticamente en Google Chrome para mayor compatibilidad con la interfaz y el micrófono, en ventana normal maximizada y con perfil persistente; no deja ventanas visibles de cmd ni PowerShell.
- **Watchdog Windows**: un chequeo programado puede relanzar Alfred si `localhost:3000` no responde.
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
ALFRED_TTS_MODEL_ID=eleven_multilingual_v2
```

Alfred lee `ELEVENLABS_API_KEY` desde el `.env` del proyecto o desde la bóveda de Hermes (`~/.hermes/.env`) si existe, así no hace falta duplicar el secreto.

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

## Modo Agente (abrir ventanas de internet)

Alfred navega de verdad: `abre youtube`, `abre https://…` o `busca en internet …`
activan el Browser Worker (Playwright/Chromium), que abre la página, extrae el
texto y devuelve captura + hash de auditoría. Con
`ALFRED_BROWSER_HEADLESS=false` las ventanas de Chrome se abren visibles en el
escritorio. Detalle completo en `docs/ALFRED_MODO_AGENTE.md`.

```bash
npx playwright install chromium   # requerido una vez para el modo agente
```

## Arquitectura

Los 4 pilares están en:

- `src/alfred_core/supervisor.ts` — Orquestador central.
- `src/alfred_core/router.ts` — Router semántico.
- `src/alfred_core/memory.ts` — Memoria SQLite persistente.
- `src/skills/toolRegistry.ts` — Gestor de tools/skills.
- `src/alfred_core/agentMode.ts` — Modo agente: navegación real con evidencia.
- `src/alfred_core/browserWorker.ts` — Browser Worker con política y auditoría.

Documentación extensa:

- `docs/ARCHITECTURE.md`
- `docs/AGENTS.md`
- `docs/BUSINESS_COMMAND_LAYER.md`
- `docs/VOICE_ALFRED_RUPERT.md`
- `docs/REVENUECAT_MCP.md`
- `docs/MEDIA_ROUTER_SEEDANCE_2_5.md`
- `docs/STITCH_CYBERPUNK_FUSION_V35.md`
- `docs/ALFRED_VOICE_AUTOSTART.md`
- `docs/ALFRED_WORLD_ORB_3D.md`
- `docs/ALFRED_CORP_V3_HANDS_FREE.md`
- `docs/rutinas-diarias-alfred.md`
- `docs/OPERATIONAL_BRIEFING_V3.md`
- `docs/WINDOWS_RUN_COMMANDS.md`
- `docs/ALFRED_MEMORY_PREFERENCES.md`
- `docs/ALFRED_MODO_AGENTE.md`
- `docs/AUDITORIA_ALFRED_2026.md`

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
