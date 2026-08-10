Option Explicit

Dim shell, fso, root, chromePath, profileDir, serverCmd, voiceCmd, chromeCmd

Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
root = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName))
profileDir = shell.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\AlfredChromeProfile"

chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
If Not fso.FileExists(chromePath) Then
  chromePath = "chrome.exe"
End If

serverCmd = "cmd.exe /c cd /d """ & root & """ && node dist\server.mjs"
voiceCmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & root & "\scripts\windows-alfred-voice-bridge.ps1"""
chromeCmd = """" & chromePath & """ --new-window ""http://localhost:3000"" --user-data-dir=""" & profileDir & """"

shell.Run serverCmd, 0, False
WScript.Sleep 5000
shell.Run voiceCmd, 0, False
WScript.Sleep 2000
shell.Run chromeCmd, 1, False
