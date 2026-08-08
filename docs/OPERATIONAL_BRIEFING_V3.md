# ALFRED CORP V3 — Operational Briefing

El **Briefing Operativo V3** añade una capa de estado local para que Alfred no solo converse, sino que inspeccione el entorno técnico donde habita dentro de Hermes Agent.

## Endpoint

```http
GET /api/briefing
```

Devuelve:

- Fecha/hora de generación.
- Misión activa de mejora continua.
- Estado del sistema local:
  - plataforma
  - release
  - arquitectura
  - uptime
  - CPU cores
  - load average
  - RAM total/usada/libre
- Estado de Alfred:
  - versión V3
  - agentes base activos
  - agentes business
  - agentes multimedia
  - proveedor primario de video
  - manos libres/wake commands
- Integraciones:
  - MiniMax / Gemini Nano Banana / Stitch / Seedance pipelines
  - RevenueCat
  - Media Router
- Seguridad:
  - secretos fuera del código
  - confirmación requerida para escrituras
  - conciencia de prompt injection
- Próximas mejoras priorizadas.

## UI

El panel `ALFRED CORP V3` muestra un bloque **Operational Briefing** con tarjetas para:

- CPU
- RAM
- Agents
- Pipelines
- Safety
- Next improvement

## Seguridad

El endpoint no expone secretos. Solo informa si una integración está configurada o pendiente de secreto local.

## Verificación

El smoke test valida:

```text
/api/briefing
briefing.alfred.version === ALFRED CORP V3
briefing.alfred.activeBaseAgents === 12
briefing.safety.secretsInCode === false
```
