# ALFRED · Modo Agente (navegación real de internet)

El Modo Agente permite que Alfred **abra ventanas de internet y opere el
navegador de verdad**, devolviendo evidencia verificable (URL final, título,
texto extraído, captura de pantalla y hash de auditoría). Nunca inventa el
contenido de una página: si la navegación falla o la política la bloquea, lo
declara explícitamente.

## Cómo se activa

Basta con hablarle a Alfred en lenguaje natural desde el chat:

- `abre youtube`
- `abre https://www.revenuecat.com/docs`
- `modo agente: entra a github.com/marketingimpulsoai-source/afred`
- `busca en internet las últimas noticias de RevenueCat`

`src/alfred_core/agentMode.ts` detecta la orden (`detectAgentBrowserTask`) y la
convierte en una tarea de navegación. Si el mensaje es conversación normal, el
Modo Agente no se activa y el pipeline habitual sigue igual.

## Pipeline `plan → act → observe`

1. **Plan** — se resuelve el destino: URL explícita, atajo de sitio conocido
   (YouTube, GitHub, Gmail, X, Instagram, TradingView, …) o búsqueda real vía
   `src/alfred_core/webSearch.ts`.
2. **Act** — el Browser Worker (`open`) navega con Playwright/Chromium.
3. **Observe** — se extrae el texto (`extract`), se guarda una captura y se
   calcula el hash de auditoría; si hay LLM configurado se resume el contenido
   **real** extraído.

Cada paso se registra como `ToolCallTrace` y queda en telemetría y en la
memoria SQLite, con el agente Webb (AG-06) como responsable.

## Ventanas visibles vs. headless

| Variable | Efecto |
| --- | --- |
| `ALFRED_BROWSER_HEADLESS=true` (por defecto) | Navega en segundo plano; la evidencia se ve como captura dentro del Web Core. |
| `ALFRED_BROWSER_HEADLESS=false` | Abre **ventanas reales de Chrome** en el escritorio del Jefe Maestro. |
| `ALFRED_BROWSER_EXECUTABLE_PATH` | Usa un Chrome instalado en lugar del Chromium de Playwright. |

## Política de seguridad

- Solo `http`/`https`.
- localhost y redes privadas bloqueadas salvo `ALFRED_BROWSER_ALLOW_PRIVATE=true`.
- Allowlist opcional con `ALFRED_BROWSER_ALLOW_DOMAINS`.
- `submit` y `download` **exigen confirmación explícita** (`confirm: true`).
- Máximo `ALFRED_BROWSER_MAX_SESSIONS` sesiones; las inactivas se cierran tras
  `ALFRED_BROWSER_SESSION_TTL_MS`.
- Artefactos servidos solo desde `data/browser-worker` a través de
  `GET /api/browser-worker/artifact?path=…`, con protección contra path traversal.

## API

```http
POST /api/agent-mode/run
{ "message": "abre https://example.com", "sessionId": "s1", "language": "es" }
```

- `200` — tarea ejecutada, incluye `evidence` y `toolCallTraces`.
- `422` — el mensaje no contiene una orden de navegación.
- `502` — la navegación falló o fue bloqueada por política.

```http
POST /api/browser-worker/command   # open | click | fill | submit | extract | download | close
GET  /api/browser-worker/status
GET  /api/browser-worker/artifact?path=<relativo>
```

## Herramientas expuestas a los subagentes

Webb (AG-06) dispone ahora de herramientas de ejecución real:

- `browser_open_url` — abre una URL y devuelve evidencia.
- `browser_extract_text` — extrae texto de la página abierta.
- `web_search_live` — búsqueda web real con URLs verificables.

El resto del catálogo devuelve `executed: false`, para distinguir con
honestidad los entregables declarativos de las acciones ejecutadas.

## Verificación automática

`npm run smoke` cubre: estado del worker, `open/fill/click/extract/download`
contra el fixture local, endpoint de artefactos (incluyendo rechazo de path
traversal), no activación del Modo Agente en conversación normal y una
navegación completa de Modo Agente con hash de auditoría. CI ejecuta el smoke
con Chromium instalado.
