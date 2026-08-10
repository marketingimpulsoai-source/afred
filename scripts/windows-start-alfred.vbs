Option Explicit

Dim shell, fso, root, chromePath, profileDir, serverCmd, voiceCmd, chromeCmd
Dim baseUrl

Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
root = fso.GetParentFolderName(fso.GetParentFolderName(WScript.ScriptFullName))
profileDir = shell.ExpandEnvironmentStrings("%LOCALAPPDATA%") & "\AlfredChromeProfile"
baseUrl = "http://localhost:3000"

chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
If Not fso.FileExists(chromePath) Then
  chromePath = "chrome.exe"
End If

serverCmd = "cmd.exe /c cd /d """ & root & """ && node dist\server.mjs"
voiceCmd = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & root & "\scripts\windows-alfred-voice-bridge.ps1"""
chromeCmd = """" & chromePath & """ --new-window """ & baseUrl & """ --user-data-dir=""" & profileDir & """"

If Not IsCoreUp(baseUrl) Then
  shell.Run serverCmd, 0, False
  If Not WaitForCore(baseUrl, 60, 2000) Then
    WScript.Quit 1
  End If
End If

shell.Run voiceCmd, 0, False
WScript.Sleep 1000
shell.Run chromeCmd, 1, False

Function WaitForCore(url, attempts, delayMs)
  Dim i
  For i = 1 To attempts
    If IsCoreUp(url) Then
      WaitForCore = True
      Exit Function
    End If
    WScript.Sleep delayMs
  Next
  WaitForCore = False
End Function

Function IsCoreUp(url)
  Dim http
  On Error Resume Next
  Set http = CreateObject("WinHttp.WinHttpRequest.5.1")
  http.SetTimeouts 1000, 1000, 1000, 1000
  http.Open "GET", url & "/api/health", False
  http.Send
  If Err.Number = 0 Then
    IsCoreUp = (http.Status = 200)
  Else
    IsCoreUp = False
  End If
  Err.Clear
  On Error GoTo 0
End Function
