# ALFRED CORP V3 — Hands-Free Command Bridge

ALFRED CORP V3 incorpora un panel futurista basado en la referencia generada con Stitch MCP: **Obsidian Command**.

## Funciones V3

- Modo manos libres desde el browser.
- Botón central/orbe para permisos de micrófono.
- Reconocimiento de voz con Web Speech API cuando el navegador lo soporta.
- Wake commands:
  - `Alfred ...`
  - `Hey Alfred ...`
  - `Oye Alfred ...`
- Botones con `data-voice-command` para operación por voz.
- Live transcript en pantalla.
- TTS vía ElevenLabs/Gemini/Web Speech fallback.
- Estado API seguro para:
  - MiniMax API
  - Gemini Nano Banana
  - Stitch MCP
  - Seedance 2.5
  - RevenueCat

## Seguridad de claves

No se guardan claves reales en código, docs, memoria ni ZIPs.

Variables locales admitidas en `.env`:

```env
MINIMAX_API_KEY=
MINIMAX_SUBSCRIPTION_KEY=
MINIMAX_GROUP_ID=
GEMINI_API_KEY=
GOOGLE_API_KEY=
GEMINI_IMAGE_MODEL=gemini-2.5-flash-image-preview
GEMINI_NANO_BANANA_ENABLED=true
STITCH_MCP_API_KEY=
STITCH_MCP_PROJECT_ID=1063777121763794102
SEEDANCE_API_KEY=
```

## Limitaciones del navegador

El micrófono requiere permiso explícito del navegador. Algunos navegadores no soportan reconocimiento continuo; en ese caso V3 conserva modo push-to-talk.

## Diseño

Stitch MCP generó el proyecto:

```text
ALFRED CORP V3 Hands-Free Futuristic Control Panel
projects/1063777121763794102
screen: ALFRED V3 | Command Bridge
```

El diseño local implementado usa:

- Obsidian base.
- Cyan Plasma.
- Royal Violet.
- Gold Signal.
- Emerald Safe.
- Glassmorphism profundo.
- Orbe de permisos.
- Waveforms acústicas.
- Pipeline cards de IA.
