# ALFRED Voice Autostart — Windows Native Voice Bridge + Browser Microphone

## Objetivo

ALFRED debe poder escuchar al Jefe Maestro aunque el micrófono del navegador falle o el buscador no soporte reconocimiento continuo.

La solución ahora usa dos capas:

1. **Capa navegador**: Web Speech API cuando Chrome u otro navegador lo permite.
2. **Capa nativa Windows**: `ALFRED Voice Bridge`, un puente PowerShell con `System.Speech` que escucha desde Windows, manda la orden a `http://localhost:3000/api/chat` y responde por voz con el sintetizador de Windows.

El arranque principal de Alfred en Windows usa un **VBScript oculto** para abrir **Google Chrome en ventana normal maximizada** sobre `http://localhost:3000`, y un watchdog puede relanzarlo si el servidor no responde.
Esto evita depender de un solo buscador y evita ventanas visibles de cmd/PowerShell.

## Comandos principales

ALFRED escucha estos saludos:

```text
Buenos días Alfred
Buenas tardes Alfred
Buenas noches Alfred
```

Y activa la rutina correcta:

```text
Buenos días Alfred    -> morning_work
Buenas tardes Alfred  -> afternoon_service
Buenas noches Alfred  -> night_service
```

También reconoce:

```text
Alfred hora de trabajar
Alfred estatus general del sistema
Alfred activa mi rutina diaria
Alfred revisa la memoria operativa
Alfred verifica permisos del micrófono
Qué mundo hora de trabajar
Llego papi hora de trabajar
```

## Archivos agregados

```text
scripts/windows-alfred-voice-bridge.ps1
scripts/windows-start-voice-bridge.bat
scripts/windows-start-alfred.bat
```

## Arranque con Windows

`windows-start-alfred.bat` ahora hace tres cosas:

1. Inicia el servidor local:

```text
node dist\\server.mjs
```

2. Inicia el puente de voz nativo:

```text
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\\windows-alfred-voice-bridge.ps1
```

3. Abre el panel:

```text
http://localhost:3000
```

El acceso directo instalado en Startup sigue apuntando a:

```text
%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\ALFRED CORP V3.5.lnk
```

Como ese acceso directo abre `scripts/windows-start-alfred.bat`, ahora también inicia el puente de voz.

## Por qué el navegador no bastaba

Los navegadores modernos bloquean o limitan:

- activación silenciosa del micrófono,
- reconocimiento continuo,
- reconocimiento cuando la pestaña está en segundo plano,
- soporte de `SpeechRecognition` en algunos buscadores,
- autoplay/respuesta hablada sin interacción inicial.

Por eso se agregó una capa de Windows. El puente usa el reconocedor instalado:

```text
Microsoft Speech Recognizer 8.0 for Windows (Spanish - Spain)
```

Y voz instalada:

```text
Microsoft Helena Desktop
```

## Prueba manual

Con el servidor corriendo:

```bat
scripts\\windows-start-voice-bridge.bat
```

Luego diga:

```text
Buenas tardes Alfred
```

ALFRED enviará la frase al núcleo local y responderá por voz.

## Prueba técnica sin micrófono

Para verificar que el puente conecta con Alfred sin abrir escucha continua:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts\\windows-alfred-voice-bridge.ps1 -SelfTest -NoSpeak
```

Resultado esperado:

```text
Orden detectada: Buenas tardes Alfred
Respuesta: Buenas tardes, Jefe Maestro...
SelfTest completado.
```

## Estado esperado

- Si el navegador permite micrófono: ALFRED escucha desde el panel.
- Si el navegador falla: ALFRED escucha desde Windows Voice Bridge.
- Si el panel está abierto en cualquier buscador: la respuesta y estado se mantienen vía servidor local.
- Si la PC inicia sesión: el Startup launcher levanta servidor, puente de voz y panel.

## Limitaciones reales

La escucha perfecta depende del micrófono físico, idioma instalado en Windows y permisos del sistema. Si Windows no tiene micrófono o el reconocedor de español está desinstalado, el puente informa el error y no inventa funcionamiento.
