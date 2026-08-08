# ALFRED Voice Autostart — Windows + Browser Microphone

## Objetivo

ALFRED debe iniciarse cuando Windows arranca, abrir el panel local y quedar preparado para escuchar los saludos del Jefe Maestro:

- `Buenos días Alfred`
- `Buenas tardes Alfred`
- `Buenas noches Alfred`

Cada saludo activa la rutina correspondiente y Alfred responde por voz cuando el navegador permite audio/TTS.

## Arranque con Windows

Se agregó el script:

```text
scripts/windows-start-alfred.bat
```

El script:

1. Entra al proyecto local `Desktop\\afred`.
2. Ejecuta `node dist\\server.mjs` en producción.
3. Espera unos segundos.
4. Abre `http://localhost:3000` en el navegador predeterminado.

También se instaló un acceso directo en la carpeta Startup de Windows:

```text
%APPDATA%\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\ALFRED CORP V3.5.lnk
```

## Micrófono y seguridad del navegador

Los navegadores modernos no permiten que una web active el micrófono silenciosamente sin permiso del usuario.

Por eso el flujo correcto es:

1. Abrir ALFRED.
2. Pulsar una vez `DAR ACCESO AL MICRÓFONO` o el orbe de manos libres.
3. Aceptar el permiso del navegador.
4. Desde ese momento, si el permiso queda concedido, ALFRED intenta autoactivar manos libres cada vez que se abre el panel o Windows inicia el panel.

Si el navegador revoca o bloquea el permiso, ALFRED mostrará el estado del micrófono y pedirá concederlo de nuevo.

## Corrección implementada

Antes, cuando la voz reconocía `Buenos días Alfred`, el panel quitaba la palabra `Alfred` antes de enviar el comando y podía enviar solo `Buenos días`. Ahora:

- Si el comando es saludo + Alfred/Jefe Maestro, se envía el texto completo.
- `Buenos días Alfred` activa `morning_work`.
- `Buenas tardes Alfred` activa `afternoon_service`.
- `Buenas noches Alfred` activa `night_service`.

## Verificación

El smoke test valida los tres comandos:

```text
Buenos días Alfred    -> morning_work
Buenas tardes Alfred  -> afternoon_service
Buenas noches Alfred  -> night_service
```

Además valida que las rutinas con YouTube sigan abriendo el reproductor local con volumen moderado.
