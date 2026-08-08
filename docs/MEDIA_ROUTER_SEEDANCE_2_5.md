# Alfred Media Router — Seedance 2.5, MiniMax y proveedores audiovisuales

Alfred incorpora una capa audiovisual para producir campañas, vídeos de producto, avatares, cursos, propiedades, viajes, ecommerce, maquinaria y contenido social.

## Arquitectura

```text
Alfred Core
│
├── Media Router
│   ├── Seedance 2.5
│   ├── MiniMax
│   ├── PixVerse
│   ├── Luma
│   ├── fal.ai
│   ├── Runware
│   └── ComfyUI
│
├── Video Agent
├── Creative Agent
├── Avatar Agent
├── Voice Agent
└── Cost & Quality Router
```

## Agentes incorporados

| Agente de Alfred | Uso de Seedance 2.5 |
| --- | --- |
| Alfred-CreativeAgent | Crear anuncios, vídeos de productos y contenido para campañas |
| Alfred-VideoAgent | Generar vídeos desde texto, imágenes o referencias |
| Alfred-AvatarAgent | Crear vídeos de personajes y modelos virtuales |
| Alfred-TravelAgent | Vídeos de destinos, hoteles, rutas y experiencias |
| Alfred-CourseAgent | Introducciones, lecciones y vídeos promocionales |
| Alfred-KidsAgent | Personajes educativos y animaciones infantiles |
| Alfred-EcommerceAgent | Vídeos de móviles, electrónicos, gift cards y productos |
| Alfred-PropTechAgent | Presentaciones de propiedades y recorridos visuales |
| Alfred-CraneAgent | Vídeos técnicos de maquinaria y equipos de izamiento |
| Alfred-SocialAgent | Adaptación automática a Reels, Shorts, TikTok y anuncios |

## Herramientas Seedance 2.5

- `seedance_text_to_video`
- `seedance_image_to_video`
- `seedance_reference_to_video`
- `seedance_video_edit`
- `seedance_video_extend`
- `seedance_get_task_status`
- `seedance_cancel_task`
- `seedance_download_result`
- `seedance_estimate_cost`

## Secretos

Las claves reales de Seedance, MiniMax y otros proveedores no deben guardarse en memoria, documentación, logs, Git ni ZIPs.

Variables locales seguras:

```env
SEEDANCE_API_KEY=
SEEDANCE_BASE_URL=
SEEDANCE_MODEL=seedance-2.5
MINIMAX_SUBSCRIPTION_KEY=
MINIMAX_API_KEY=
MINIMAX_GROUP_ID=
MINIMAX_BASE_URL=https://api.minimax.io
PIXVERSE_API_KEY=
LUMA_API_KEY=
FAL_KEY=
RUNWARE_API_KEY=
COMFYUI_BASE_URL=
```

## API local

```http
GET /api/media-router
POST /api/media-router/route
```

Ejemplo:

```bash
curl -s http://localhost:3000/api/media-router
curl -s -X POST http://localhost:3000/api/media-router/route \
  -H "Content-Type: application/json" \
  -d '{"message":"Crear video ecommerce para TikTok con Seedance","limit":4}'
```

## Reglas de seguridad

- Confirmar uso comercial, derechos de imágenes/referencias, música, marcas y rostros.
- No clonar identidades reales sin consentimiento explícito.
- Contenido infantil: privacidad, edad adecuada y no explotación.
- Maquinaria/seguridad industrial: no sustituir manuales oficiales ni certificaciones.
- Cost & Quality Router debe elegir proveedor según calidad, coste, privacidad, tiempo y formato.
