# RevenueCat MCP para Alfred / Hermes Agent

Alfred debe conocer RevenueCat como integración de monetización para apps, SaaS, móviles, paywalls y suscripciones.

## Endpoint MCP

```text
https://mcp.revenuecat.ai/mcp
```

Si se abre con GET en el navegador puede responder `Method not allowed`; eso es normal. Debe usarse como servidor MCP HTTP/Streamable HTTP.

## Autenticación

RevenueCat MCP soporta:

1. OAuth con clientes compatibles.
2. Bearer token con una API v2 secret key de RevenueCat.

La clave real **no debe** guardarse en memoria, documentación, logs, Git ni ZIPs.

Use `.env` local:

```env
REVENUECAT_MCP_URL=https://mcp.revenuecat.ai/mcp
REVENUECAT_API_KEY=YOUR_REVENUECAT_API_V2_SECRET_KEY
REVENUECAT_AUTH_METHOD=bearer
```

## Capacidades que Alfred debe recordar

RevenueCat MCP permite gestionar:

- Proyectos y apps.
- Productos y precios.
- Entitlements.
- Offerings y packages.
- Paywalls AI y screenshots.
- Audiencias, targeting y experimentos.
- Clientes, suscripciones y eventos.
- Webhooks e integraciones.
- SDK compatibility y métricas.

## Subagentes que lo supervisan

- `Alfred-SaaSArchitect` — modelo de monetización SaaS/app.
- `Alfred-MarketingArchitect` — paywalls, ofertas, paquetes y experimentos.
- `Alfred-ClientStudio` — páginas/landing de pago y assets de cliente.
- `Alfred-OperationsCFO` — pricing, MRR, margen y monetización.
- `Thomas` — arquitectura.
- `Sterling` — SaaS builder.
- `Leonardo` — APIs/webhooks.
- `Fortress` — seguridad de claves y operaciones críticas.

## Guardrails

- Las operaciones de lectura pueden ejecutarse tras una petición explícita del Jefe Maestro.
- Las operaciones de escritura requieren confirmación explícita antes de ejecutarse.
- Crear/editar productos, offerings, packages, entitlements, paywalls, webhooks o archivar recursos puede afectar producción.
- Usar una API key dedicada con mínimos permisos necesarios.
- Preferir OAuth cuando esté disponible.
- No imprimir la API key ni en errores ni en respuestas.

## Hermes Agent MCP config template

Hermes puede conectarse a servidores MCP HTTP con configuración bajo `mcp_servers`.

Plantilla conceptual segura:

```yaml
mcp_servers:
  revenuecat:
    url: "https://mcp.revenuecat.ai/mcp"
    headers:
      Authorization: "Bearer ${REVENUECAT_API_KEY}"
    timeout: 180
    connect_timeout: 60
    sampling:
      enabled: false
```

> Nota: confirme el mecanismo de secretos/expansión de variables de la instalación Hermes antes de poner una clave real en `config.yaml`. Regla de seguridad: secretos en `.env` o almacén de secretos, no en documentos ni repos.

## Endpoint local de Alfred

La app local expone estado seguro sin revelar secretos:

```http
GET /api/integrations/revenuecat
GET /api/integrations/revenuecat/hermes-config-template
```

`/api/integrations/revenuecat` indica si `REVENUECAT_API_KEY` está presente, pero nunca devuelve su valor.

## Test recomendado

```bash
curl http://localhost:3000/api/integrations/revenuecat
```

Debe devolver algo como:

```json
{
  "revenueCat": {
    "name": "RevenueCat MCP",
    "mcpUrl": "https://mcp.revenuecat.ai/mcp",
    "configured": false,
    "secretPresent": false,
    "secretStoredInCode": false
  }
}
```

Cuando la key real esté solo en `.env`, `secretPresent` será `true`.
