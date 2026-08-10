# ALFRED — Hoja de ruta técnica ejecutable

Fecha: 2026-08-10  
Origen: auditoría técnica integral de ALFRED  
Estado inicial: Browser Worker implementado como base real; el resto de la ruta está priorizada por riesgo y valor.

## Objetivo
Convertir ALFRED en un asistente local con control de navegador verificable, orquestación de agentes realmente auditable, políticas de seguridad deny-by-default y experiencia estable en Windows/Chrome.

## Principios de ejecución
1. No anunciar capacidades hasta que existan pruebas automáticas.
2. Todo cambio debe tener criterio de aceptación verificable.
3. Las acciones sensibles requieren confirmación humana.
4. Los artefactos de evidencia deben quedar en disco y ser rastreables.
5. Si una etapa falla, se corrige antes de avanzar a la siguiente.

## Estado actual
- Servidor local endurecido con límites, cabeceras defensivas y validación básica.
- Voz integrada con ElevenLabs/Gemini/Web Speech.
- Web Core funcional con búsqueda interna.
- Browser Worker real implementado en backend, con sesión aislada, apertura, click, fill, submit, extract y download.
- Smoke end-to-end actualizado para verificar el Browser Worker con una fixture local.

## Fase 1 — Browser Worker productivo y seguro

### 1.1 Aislamiento por sesión
**Meta:** cada sesión usa su propio contexto, cookies y almacenamiento.

**Archivos principales:**
- `src/alfred_core/browserWorker.ts`
- `server.ts`
- `scripts/smoke.mjs`

**Criterio de aceptación:**
- Abrir dos sesiones distintas no comparte cookies ni estado.
- `GET /api/browser-worker/status` muestra sesiones separadas.

**Verificación:**
```bash
npm run lint
npm run build
npm run smoke
```

### 1.2 Políticas de URL
**Meta:** bloquear `file:`, localhost y redes privadas por defecto.

**Criterio de aceptación:**
- URL privadas se bloquean salvo `allowPrivate:true`.
- Hay allowlist por dominios si `ALFRED_BROWSER_ALLOW_DOMAINS` está definida.

**Verificación:**
- Añadir casos bloqueados y permitidos en smoke.

### 1.3 Confirmación para acciones sensibles
**Meta:** `submit` y `download` requieren confirmación explícita.

**Criterio de aceptación:**
- Sin `confirm:true`, la API responde `REQUIRES_CONFIRMATION`.
- Con `confirm:true`, ejecuta y genera evidencia.

### 1.4 Evidencia verificable
**Meta:** cada acción produce hash de auditoría y, cuando aplica, screenshot y descarga.

**Criterio de aceptación:**
- `screenshotPath` y `downloadPath` apuntan a archivos reales.
- El hash de auditoría cambia si cambia la acción.

### 1.5 Fixture de prueba local
**Meta:** mantener una página local simple para smoke y regressions.

**Archivos:**
- `public/browser-worker-fixture.html`
- `public/browser-worker-fixture.txt`

**Verificación:**
- `open -> fill -> click -> extract -> download -> close` pasa en CI/smoke.

## Fase 2 — Delegación real de subagentes

### 2.1 Contrato `plan → act → observe`
**Meta:** cada agente debe producir plan, acción y evidencia, no solo texto descriptivo.

**Archivos sugeridos:**
- `src/alfred_core/supervisor.ts`
- `src/alfred_core/router.ts`
- `src/alfred_core/memory.ts`
- `src/types.ts`

**Criterio de aceptación:**
- Cada delegación deja trazas persistidas.
- El supervisor puede cancelar o reintentar tareas.
- El resultado final incluye evidencias, no solo resumen.

### 2.2 DAG de delegación
**Meta:** permitir cadenas de agentes con dependencias explícitas.

**Criterio de aceptación:**
- Un agente puede delegar a otro y retornar con datos intermedios.
- Las dependencias quedan registradas en memoria/telemetría.

### 2.3 Presupuesto y límites
**Meta:** controlar tiempo, pasos y costo por tarea.

**Criterio de aceptación:**
- Cada tarea tiene timeout, budget y límite de pasos.
- El supervisor corta las tareas fuera de presupuesto.

## Fase 3 — Policy Engine y gobierno

### 3.1 Deny-by-default
**Meta:** toda acción externa queda bloqueada salvo allowlist y contexto permitido.

**Criterio de aceptación:**
- No hay acciones privilegiadas sin política aprobada.
- La política deja huella auditable.

### 3.2 Aprobaciones de un solo uso
**Meta:** login, pagos, publicaciones, envíos, descargas sensibles y borrados requieren aprobación humana explícita.

**Criterio de aceptación:**
- Cada aprobación expira.
- Cada aprobación se usa una vez.

### 3.3 Registro verificable
**Meta:** todas las acciones sensibles dejan audit log firmado con timestamp, URL, selector y resultado.

## Fase 4 — UX operativo del modo agente

### 4.1 Estados visibles
**Meta:** mostrar claramente:
- propuesta
- esperando aprobación
- ejecutando
- verificado
- error

**Criterio de aceptación:**
- El usuario ve en qué estado está una acción sensible.

### 4.2 Browser Worker accesible desde la UI
**Meta:** permitir abrir una URL en el worker y ver evidencia en la interfaz.

**Criterio de aceptación:**
- La UI puede invocar el worker con `target: browser`.
- Los resultados se muestran sin romper el panel principal.

## Fase 5 — Rendimiento, estabilidad y accesibilidad

### 5.1 Bundle splitting
**Meta:** reducir el JS principal.

**Criterio de aceptación:**
- El bundle principal se divide en chunks con lazy loading.

### 5.2 Pausa por visibilidad
**Meta:** detener animaciones y trabajo innecesario cuando la pestaña está oculta.

### 5.3 Accesibilidad
**Meta:** mejorar foco, contraste, labels y legibilidad.

## Orden sugerido de implementación
1. Browser Worker: allowlists, confirmaciones, limpieza y pruebas.
2. Integración visible del worker en la UI.
3. Delegación real de subagentes.
4. Policy Engine y aprobaciones.
5. Optimización de rendimiento y accesibilidad.

## Verificación por fase
Cada fase debe cerrar con:
- `npm run lint`
- `npm run build`
- `npm run smoke`
- prueba manual mínima cuando corresponda
- evidencia guardada en disco o logs

## Rollback
Si una fase rompe la operación:
1. Revertir el último commit funcional.
2. Mantener el Browser Worker o la ruta anterior activa mediante feature flag.
3. No avanzar a la siguiente fase hasta volver a verde.

## Estado de salida esperado
Cuando esta hoja de ruta esté cumplida:
- Alfred controlará navegador real con evidencia.
- La delegación será verificable, no decorativa.
- La UI mostrará estados fiables.
- Las acciones sensibles quedarán gobernadas por políticas explícitas.
