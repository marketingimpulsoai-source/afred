# Alfred Voice — Rupert / Mayordomo Digital

Configuración incorporada desde el agente ElevenLabs proporcionado por el usuario.

## Identidad

- Nombre: `Alfred - Mayordomo Digital`
- Agent ID: `agent_0001kzhcg3anecc9xmf62eceh6m9`
- Voz principal: `89gcX1AeMGgcsN8ypHLu`
- Modelo TTS: `eleven_multilingual_v2`
- ASR objetivo: `scribe_realtime`
- Formato entrada/salida recomendado: `pcm_16000` para conversación realtime.
- Endpoint local de la app: `POST /api/tts`

## Preview de voz

El archivo de referencia se copió a:

```text
public/audio/alfred-rupert-preview.mp3
```

En producción Vite/Express se sirve como:

```text
/audio/alfred-rupert-preview.mp3
```

## Variables de entorno

Copiar `.env.example` a `.env` y completar solo las claves reales:

```env
ELEVENLABS_API_KEY=
ALFRED_ELEVENLABS_AGENT_ID=agent_0001kzhcg3anecc9xmf62eceh6m9
ALFRED_TTS_VOICE_ID=89gcX1AeMGgcsN8ypHLu
ALFRED_TTS_MODEL_ID=eleven_multilingual_v2
ALFRED_TTS_OUTPUT_FORMAT=mp3_44100_128
ALFRED_TTS_STABILITY=0.5
ALFRED_TTS_SIMILARITY_BOOST=0.8
ALFRED_TTS_SPEED=1
ALFRED_TTS_STYLE=0.35
```

## Comportamiento del motor

`src/utils/ttsEngine.ts` usa esta prioridad:

1. ElevenLabs SDK `@elevenlabs/elevenlabs-js` con Rupert/Alfred.
2. Gemini TTS si existe `GEMINI_API_KEY`.
3. Fallback local Web Speech API en el navegador.

Si no hay `ELEVENLABS_API_KEY`, Alfred sigue funcionando sin error y devuelve:

```json
{
  "audioBase64": null,
  "useWebSpeechFallback": true,
  "provider": "web_speech"
}
```

## Tono operativo

El prompt configurado define a Alfred como mayordomo digital bilingüe: formal, cálido, breve para voz, discreto, competente, con iniciativa y sin inventar datos financieros/técnicos.

Reglas mantenidas en la app local:

- Responder al usuario como `Jefe Maestro`.
- Alternar prefijos formales.
- Confirmar antes de acciones sensibles.
- No publicar, enviar mensajes o ejecutar pagos sin aprobación.
- Mantener privacidad y seguridad.
