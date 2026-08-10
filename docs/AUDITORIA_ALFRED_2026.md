# Auditoría técnica y funcional de ALFRED

**Repositorio:** `marketingimpulsoai-source/afred`
**Fecha:** 10 de agosto de 2026
**Alcance:** arquitectura, backend, frontend, subagentes, módulos, seguridad, rendimiento, CI y modo agente (navegación de internet).

---

## 1. Resumen ejecutivo

Alfred es un mayordomo digital bilingüe (React 19 + Vite 6 + Express 4 + TypeScript 5.8)
con 12 subagentes, memoria persistente en SQLite, telemetría, TTS multi-proveedor,
capa de negocio (16 especialistas), Media Router y un Browser Worker basado en
Playwright.

El sistema **arranca, compila y pasa el smoke completo**. La auditoría encontró
14 hallazgos: 3 altos, 6 medios y 5 bajos. Todos los altos y la mayoría de los
medios se corrigieron en esta intervención. La brecha principal era que Alfred
**anunciaba capacidades de agente que no ejecutaba de extremo a extremo**: el
Browser Worker existía pero no estaba conectado al lenguaje natural, su
resultado se descartaba en la interfaz y no había evidencia visible ni pruebas
automáticas del flujo completo.

**Estado tras la intervención:** `tsc --noEmit` sin errores, build correcto,
`npm run smoke` OK (incluye ahora navegación real y verificación de evidencia),
y modo agente verificado manualmente contra `example.com` y `playwright.dev`.

---

## 2. Metodología

1. Clonado del repositorio y comparación con el ZIP `ALFRED_System_Complete.zip`
   aportado por el Jefe Maestro (el ZIP resultó ser una versión anterior: le
   faltan, entre otros, `src/alfred_core/browserWorker.ts`, el roadmap del
   Browser Worker y los fixtures de prueba; **la fuente de verdad es el repo**).
2. Instalación de dependencias (`npm install`, 374 paquetes, 0 vulnerabilidades)
   e instalación del runtime de navegador (`npx playwright install chromium`).
3. Verificación estática: `npx tsc --noEmit`.
4. Verificación de build: `npm run build` (frontend Vite + backend esbuild).
5. Verificación funcional: `npm run smoke` contra el servidor de producción.
6. Revisión de código: `server.ts`, `supervisor.ts`, `router.ts`, `memory.ts`,
   `browserWorker.ts`, `toolRegistry.ts`, `webResearch.ts`, `App.tsx`,
   `AlfredCoreHUD.tsx`, datos de agentes, workflows de CI y documentación.
7. Pruebas manuales del modo agente contra sitios públicos reales.

---

## 3. Inventario del sistema

| Capa | Componente | Estado inicial | Estado final |
| --- | --- | --- | --- |
| Orquestación | `supervisor.ts` | Funcional; sin modo agente | Modo agente integrado con evidencia y telemetría |
| Enrutamiento | `router.ts` (LLM + fallback por keywords) | Correcto | Correcto; IDs de agente corregidos |
| Memoria | `memory.ts` (SQLite) | Funcional | Funcional; descarga de adjuntos endurecida |
| Skills | `toolRegistry.ts` (33 tools) | Mayoría declarativas | +3 tools de ejecución real; marca `executed` |
| Navegación | `browserWorker.ts` | Aislado, sin ciclo de vida | Con TTL, límite de sesiones, artefactos servidos y apagado limpio |
| API | `server.ts` (30+ endpoints) | Sin cabeceras ni límite de tasa | Cabeceras defensivas, rate limit, bind loopback |
| Frontend | `App.tsx`, `AlfredCoreHUD.tsx` | Bundle único de 1,75 MB | Code splitting + carga diferida; mayor chunk 506 kB |
| CI | `.github/workflows/ci.yml` | lint + build | lint + build + Chromium + smoke |

Subagentes verificados activos (12/12): Thomas, Ada, Leonardo, Victoria,
Marcus, Webb, Grace, Fortress, Doc, Sterling, Minerva, Hugo.

---

## 4. Hallazgos

### 4.1 Severidad alta

**H-01 · El modo agente no existía de extremo a extremo.**
El Browser Worker sólo se invocaba desde acciones de UI generadas por rutinas
concretas. Ninguna orden en lenguaje natural ("abre YouTube", "busca esto en
internet y léelo") activaba una navegación real, y el sistema respondía con
texto generado sin haber visitado la página. *Impacto: la capacidad anunciada
no era verificable.*
**Corregido:** nuevo `src/alfred_core/agentMode.ts` con detección de intención
(`open`/`search`), resolución de destino, ejecución `plan → act → observe`,
extracción del contenido real, captura, hash de auditoría y trazas de
herramienta; integrado en `supervisor.ts` y expuesto en `POST /api/agent-mode/run`.

**H-02 · El resultado del Browser Worker se descartaba en la interfaz.**
`App.tsx` hacía `fetch(...).catch(() => {})` y mostraba «Browser Worker
activado» aunque la acción hubiera sido bloqueada o hubiera fallado. *Impacto:
el usuario recibía confirmaciones falsas.*
**Corregido:** ahora se lee la respuesta y se notifica el estado real
(`SUCCESS`/`BLOCKED`/`REQUIRES_CONFIRMATION`/`ERROR`), mostrando la captura como
evidencia dentro del Web Core.

**H-03 · Superficie de red y de disco sin protección.**
El servidor escuchaba en `0.0.0.0` (modo agente y memoria accesibles desde toda
la red local), no había límite de tasa en endpoints costosos (`/api/chat`,
`/api/tts`, búsqueda web, navegador) y `/api/attachments/:id` descargaba
cualquier ruta almacenada sin validar que estuviera dentro del directorio de
adjuntos.
**Corregido:** bind por defecto a `127.0.0.1` (configurable con `ALFRED_HOST`),
límite de tasa por IP y ruta, cabeceras defensivas (`nosniff`, `X-Frame-Options`,
`Referrer-Policy`, `COOP`, `Permissions-Policy`) y validación de contención de
ruta tanto en adjuntos como en el nuevo endpoint de artefactos.

### 4.2 Severidad media

**H-04 · Fuga de sesiones de Chromium.** Las sesiones del worker no caducaban ni
tenían tope; una sesión por usuario/petición podía agotar la memoria.
**Corregido:** TTL configurable (10 min por defecto), máximo de sesiones
(6 por defecto, se cierra la más antigua), barrido periódico y
`shutdownBrowserWorker()` enganchado a `SIGINT`/`SIGTERM`.

**H-05 · Evidencia inaccesible.** Las capturas se guardaban en disco pero no se
podían consultar desde la interfaz.
**Corregido:** `GET /api/browser-worker/artifact?path=…` con resolución segura y
`screenshotUrl` incluido en cada resultado.

**H-06 · IDs de agente inconsistentes.** `supervisor.ts` usaba `'webb'` en
rutas de mercado, Perplexity y GitHub, pero el catálogo define `'webb_infra'`;
`getAgentById('webb')` devolvía `null` y la telemetría quedaba huérfana.
**Corregido:** unificado a `webb_infra`.

**H-07 · Herramientas declarativas indistinguibles de ejecución real.** El
registro devolvía `status: 'GENERATED' | 'ANALYZED' | …` sin señalar si algo se
había ejecutado realmente.
**Corregido:** cada resultado incluye `executed: boolean`; sólo las tools con
efecto externo real (`browser_open_url`, `browser_extract_text`,
`web_search_live`, `detect_language`) lo marcan como `true`.

**H-08 · Búsqueda web duplicada.** El *scraping* de DuckDuckGo estaba embebido
en `server.ts`, imposible de reutilizar desde el núcleo.
**Corregido:** extraído a `src/alfred_core/webSearch.ts`, usado por el endpoint y
por el modo agente.

**H-09 · Bundle de producción de 1,75 MB en un único chunk.** Arranque lento en
equipos modestos.
**Corregido:** `manualChunks` (react/three/d3/lucide), carga diferida de los 11
paneles secundarios e importación explícita de iconos en lugar de
`import * as Icons`. Resultado: entrada de 275 kB (88 kB gzip); `three` (506 kB)
sólo se descarga al usar el orbe 3D.

**H-10 · CI sin pruebas funcionales.** El pipeline sólo hacía lint y build, de
modo que una regresión del modo agente no se detectaba.
**Corregido:** CI instala Chromium y ejecuta `npm run smoke`.

### 4.3 Severidad baja

- **H-11 · `ignoreHTTPSErrors: true`** en el contexto del navegador: acepta
  certificados inválidos. Aceptable para *scraping* de lectura, pero debería
  restringirse cuando se habiliten `fill`/`submit` en sitios sensibles. *Abierto.*
- **H-12 · `allowPrivate` viajaba sólo en el cuerpo de la petición.** Ahora
  también existe el valor por defecto del servidor (`ALFRED_BROWSER_ALLOW_PRIVATE`),
  pero el cliente sigue pudiendo pedirlo; conviene exigir una política de
  servidor cuando Alfred se exponga fuera de loopback. *Parcial.*
- **H-13 · Sin autenticación en la API.** Es coherente con un asistente local en
  loopback, pero cualquier despliegue remoto requiere autenticación. *Abierto
  por diseño; mitigado con el bind a loopback.*
- **H-14 · `NeuralNetworkMap` se importa estática y dinámicamente** (desde
  `AlfredCoreHUD` y desde `App`), por lo que no se separa en su propio chunk.
  Impacto menor. *Abierto.*
- **ZIP desactualizado.** `ALFRED_System_Complete.zip` es anterior al repositorio
  y no debe usarse como base de trabajo.

---

## 5. Verificación realizada

| Prueba | Comando | Resultado |
| --- | --- | --- |
| Tipos | `npx tsc --noEmit` | Sin errores |
| Build | `npm run build` | Frontend + `dist/server.mjs` correctos |
| Smoke funcional | `npm run smoke` | `SMOKE OK` (12/12 agentes, 16 especialistas de negocio, routing, TTS, Media Router, Browser Worker, modo agente, artefactos) |
| Modo agente · URL directa | `POST /api/agent-mode/run` con `abre https://example.com` | `Example Domain`, 127 caracteres extraídos, captura y hash |
| Modo agente · búsqueda | Chat: `busca en internet noticias oficiales de playwright` | Navegó a `playwright.dev/docs/release-notes` con 4 fuentes verificadas y 2 trazas de herramienta |
| Política de seguridad | Artefacto con `../../package.json` | `404` (path traversal rechazado) |
| Conversación normal | `hola alfred como estas` en `/api/agent-mode/run` | `422` — el modo agente no se dispara de más |

---

## 6. Recomendaciones

**Prioridad 1 — próximas 1-2 sesiones de trabajo**

1. **Aprobación explícita en la interfaz** para acciones sensibles: mostrar el
   plan («voy a abrir X y rellenar Y») con botones aprobar/rechazar antes de
   ejecutar `fill`, `submit` o `download`, en lugar de depender sólo del flag
   `confirm` en la API.
2. **Delegación real entre subagentes (DAG).** Hoy el supervisor ejecuta como
   máximo un agente y una herramienta. Implementar un plan de varios pasos con
   presupuesto (máximo de pasos, tiempo y coste) y trazas por nodo.
3. **Configurar un motor LLM.** El sistema corre en modo *offline*; con
   `GEMINI_API_KEY` u `OPENAI_API_KEY` el modo agente pasa de «extracto literal»
   a resumen razonado del contenido real.

**Prioridad 2**

4. **Autenticación local** (token en `.env` + cabecera) si se piensa exponer
   Alfred fuera de `127.0.0.1`, junto con CSRF para los endpoints de escritura.
5. **Cuotas de adjuntos y de artefactos**: límite de tamaño y de tipo MIME, y
   rotación/purga de `data/browser-worker`, que crece con cada captura.
6. **Registro de auditoría firmado y persistente** para las acciones del
   navegador (hoy el hash se calcula pero no se encadena).
7. **Endurecer el navegador**: desactivar `ignoreHTTPSErrors` salvo petición
   explícita y exigir allowlist cuando el modo agente actúe sobre formularios.

**Prioridad 3**

8. **Pruebas end-to-end de interfaz** (Playwright) del flujo chat → modo agente →
   evidencia, añadidas a CI.
9. **Accesibilidad y movimiento reducido**: respetar `prefers-reduced-motion` en
   el orbe 3D y las animaciones del HUD; revisar contraste y foco de teclado.
10. **Actualizar el ZIP de distribución** o eliminarlo para evitar que se trabaje
    sobre una versión anterior.
11. **Escaneo de dependencias en CI** (`npm audit --audit-level=high`) y
    renovación periódica de Playwright/Vite.

---

## 7. Conclusión

Alfred es un sistema sólido y bien estructurado: sus cuatro pilares
(supervisor, router semántico, memoria SQLite y registro de herramientas) están
correctamente separados, los 12 subagentes y los 16 especialistas de negocio
responden, y la capa de voz, media y telemetría funciona. El problema no era la
arquitectura sino la **distancia entre lo anunciado y lo verificable**: el modo
agente estaba a medias, su resultado no llegaba al usuario y nada lo probaba de
forma automática.

Tras esta auditoría, Alfred **abre ventanas de internet de verdad** desde una
orden en lenguaje natural, lee el contenido real de la página, guarda captura y
hash de auditoría, informa con honestidad cuando una navegación se bloquea, y
todo ello queda cubierto por el smoke que ahora corre en CI. Además, la
superficie de red se redujo a loopback, se añadieron límite de tasa y cabeceras
defensivas, se cerró la fuga de sesiones de Chromium y el arranque de la
interfaz es sensiblemente más ligero.

El sistema queda en estado **apto para uso local y para seguir creciendo**. El
siguiente salto de valor —y la recomendación central de este informe— es la
delegación real entre subagentes con aprobación visible en la interfaz: es lo
que convierte a Alfred de un excelente asistente conversacional con navegación
en un verdadero agente autónomo auditable.
