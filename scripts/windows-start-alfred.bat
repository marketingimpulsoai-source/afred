@echo off
setlocal
cd /d "%USERPROFILE%\Desktop\afred"
set NODE_ENV=production
set ELEVENLABS_API_KEY=
set GEMINI_API_KEY=
set GOOGLE_API_KEY=
set OPENAI_API_KEY=
set OPENROUTER_API_KEY=
set REVENUECAT_API_KEY=
set SEEDANCE_API_KEY=
set MINIMAX_SUBSCRIPTION_KEY=
set MINIMAX_API_KEY=
set STITCH_MCP_API_KEY=
set SERPER_API_KEY=
start "ALFRED CORE SERVER" /min cmd /c "node dist\server.mjs"
timeout /t 5 /nobreak >nul
start "ALFRED VOICE BRIDGE" /min powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%USERPROFILE%\Desktop\afred\scripts\windows-alfred-voice-bridge.ps1"
start "" "http://localhost:3000"
endlocal
