@echo off
setlocal
cd /d "%USERPROFILE%\Desktop\afred"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%USERPROFILE%\Desktop\afred\scripts\windows-alfred-voice-bridge.ps1"
endlocal
