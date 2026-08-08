param(
  [string]$BaseUrl = "http://localhost:3000",
  [string]$Culture = "es-ES",
  [string]$SessionId = "windows_voice_bridge",
  [switch]$SelfTest,
  [switch]$NoSpeak
)

$ErrorActionPreference = "Stop"

function Write-AlfredLog([string]$Message) {
  $stamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
  Write-Host "[$stamp] [ALFRED VOICE BRIDGE] $Message"
}

function Wait-AlfredCore([string]$Url) {
  for ($i = 0; $i -lt 60; $i++) {
    try {
      $health = Invoke-RestMethod -Uri "$Url/api/health" -Method Get -TimeoutSec 3
      if ($health.status -eq "online") { return $true }
    } catch {
      Start-Sleep -Seconds 2
    }
  }
  return $false
}

function Invoke-AlfredCommand([string]$Text) {
  if ([string]::IsNullOrWhiteSpace($Text)) { return }
  $payload = @{
    message = $Text
    language = "es"
    securityLevel = "BALANCED"
    sessionId = $SessionId
    history = @()
  } | ConvertTo-Json -Depth 8

  try {
    Write-AlfredLog "Orden detectada: $Text"
    $response = Invoke-RestMethod -Uri "$BaseUrl/api/chat" -Method Post -ContentType "application/json; charset=utf-8" -Body ([Text.Encoding]::UTF8.GetBytes($payload)) -TimeoutSec 60
    $answer = [string]$response.text
    if ([string]::IsNullOrWhiteSpace($answer)) { $answer = "Jefe Maestro, recibí la orden pero no hubo respuesta del núcleo." }
    Write-AlfredLog "Respuesta: $($answer.Substring(0, [Math]::Min(180, $answer.Length)))"
    if (-not $NoSpeak) {
      if (-not (Speak-AlfredCloud $answer)) { Speak-Alfred $answer }
    }
  } catch {
    $msg = "Jefe Maestro, no pude comunicarme con el núcleo local de Alfred. Verifique que el servidor esté activo."
    Write-AlfredLog "ERROR enviando orden: $($_.Exception.Message)"
    if (-not $NoSpeak) { Speak-Alfred $msg }
  }
}

function Speak-AlfredCloud([string]$Text) {
  $tempPath = $null
  try {
    $payload = @{ text = $Text; language = "es" } | ConvertTo-Json -Depth 4
    $tts = Invoke-RestMethod -Uri "$BaseUrl/api/tts" -Method Post -ContentType "application/json; charset=utf-8" -Body ([Text.Encoding]::UTF8.GetBytes($payload)) -TimeoutSec 60
    if ($tts.provider -ne "elevenlabs" -or [string]::IsNullOrWhiteSpace([string]$tts.audioBase64)) {
      Write-AlfredLog "TTS cloud no disponible: $($tts.provider). Se usará fallback local."
      return $false
    }

    $tempPath = [IO.Path]::Combine([IO.Path]::GetTempPath(), "alfred-tts-$([Guid]::NewGuid().ToString('N')).mp3")
    [IO.File]::WriteAllBytes($tempPath, [Convert]::FromBase64String([string]$tts.audioBase64))
    $wmp = New-Object -ComObject WMPlayer.OCX
    $media = $wmp.newMedia($tempPath)
    $wmp.currentMedia = $media
    $wmp.controls.play()
    $deadline = (Get-Date).AddSeconds(90)
    while ((Get-Date) -lt $deadline -and $wmp.playState -notin @(1, 10)) { Start-Sleep -Milliseconds 150 }
    $wmp.controls.stop()
    $wmp.close()
    Remove-Item -LiteralPath $tempPath -Force -ErrorAction SilentlyContinue
    return $true
  } catch {
    Write-AlfredLog "ElevenLabs playback unavailable; local fallback: $($_.Exception.Message)"
    if ($tempPath) { Remove-Item -LiteralPath $tempPath -Force -ErrorAction SilentlyContinue }
    return $false
  }
}

function Speak-Alfred([string]$Text) {
  try {
    $speaker = New-Object System.Speech.Synthesis.SpeechSynthesizer
    $voice = $speaker.GetInstalledVoices() | Where-Object { $_.VoiceInfo.Culture.Name -eq "es-ES" } | Select-Object -First 1
    if ($voice) { $speaker.SelectVoice($voice.VoiceInfo.Name) }
    $speaker.Rate = -1
    $speaker.Volume = 90
    $speaker.SpeakAsyncCancelAll() | Out-Null
    $speaker.Speak($Text)
    $speaker.Dispose()
  } catch {
    Write-AlfredLog "ERROR de voz/síntesis: $($_.Exception.Message)"
  }
}

Add-Type -AssemblyName System.Speech

if (-not (Wait-AlfredCore $BaseUrl)) {
  Write-AlfredLog "El núcleo de Alfred no respondió en $BaseUrl. El puente se cerrará."
  if (-not $NoSpeak) { Speak-Alfred "Jefe Maestro, el núcleo local de Alfred no está disponible." }
  exit 1
}

if ($SelfTest) {
  Invoke-AlfredCommand "Buenas tardes Alfred"
  Write-AlfredLog "SelfTest completado."
  exit 0
}

$recognizers = [System.Speech.Recognition.SpeechRecognitionEngine]::InstalledRecognizers()
$selected = $recognizers | Where-Object { $_.Culture.Name -eq $Culture } | Select-Object -First 1
if (-not $selected) {
  $selected = $recognizers | Where-Object { $_.Culture.TwoLetterISOLanguageName -eq "es" } | Select-Object -First 1
}
if (-not $selected) {
  Write-AlfredLog "No hay reconocedor de voz en español instalado. Reconocedores disponibles: $($recognizers | ForEach-Object { $_.Culture.Name } | Out-String)"
  if (-not $NoSpeak) { Speak-Alfred "Jefe Maestro, Windows no tiene instalado el reconocedor de voz en español." }
  exit 2
}

$engine = New-Object System.Speech.Recognition.SpeechRecognitionEngine($selected)
$engine.SetInputToDefaultAudioDevice()

$commands = New-Object System.Speech.Recognition.Choices
@(
  "Buenos días Alfred",
  "Buenas tardes Alfred",
  "Buenas noches Alfred",
  "Alfred hora de trabajar",
  "Alfred estatus general del sistema",
  "Alfred activa mi rutina diaria",
  "Alfred revisa la memoria operativa",
  "Alfred verifica permisos del micrófono",
  "Alfred silencio",
  "Alfred responde",
  "Qué mundo hora de trabajar",
  "Llego papi hora de trabajar"
) | ForEach-Object { [void]$commands.Add($_) }

$grammarBuilder = New-Object System.Speech.Recognition.GrammarBuilder
$grammarBuilder.Culture = $selected.Culture
$grammarBuilder.Append($commands)
$commandGrammar = New-Object System.Speech.Recognition.Grammar($grammarBuilder)
$commandGrammar.Name = "ALFRED_COMMANDS"
$engine.LoadGrammar($commandGrammar)

try {
  $dictation = New-Object System.Speech.Recognition.DictationGrammar
  $dictation.Name = "ALFRED_DICTATION"
  $dictation.Enabled = $true
  $engine.LoadGrammar($dictation)
} catch {
  Write-AlfredLog "Dictado libre no disponible; seguiré con comandos de Alfred."
}

$lastText = ""
$lastAt = Get-Date "2000-01-01"

Register-ObjectEvent -InputObject $engine -EventName SpeechRecognized -Action {
  $text = $EventArgs.Result.Text
  $confidence = [double]$EventArgs.Result.Confidence
  $now = Get-Date
  if ([string]::IsNullOrWhiteSpace($text)) { return }
  if ($confidence -lt 0.48) {
    Write-Host "[$($now.ToString('yyyy-MM-dd HH:mm:ss'))] [ALFRED VOICE BRIDGE] Baja confianza: $text ($([Math]::Round($confidence, 2)))"
    return
  }
  $normalized = $text.ToLowerInvariant().Normalize([Text.NormalizationForm]::FormD) -replace '\p{Mn}', ''
  $hasWake = $normalized -match '\b(alfred|jefe maestro|buenos dias|buen dia|buenas tardes|buenas noches|que mundo|llego papi)\b'
  if (-not $hasWake) {
    Write-Host "[$($now.ToString('yyyy-MM-dd HH:mm:ss'))] [ALFRED VOICE BRIDGE] Ignorada sin palabra de activación: $text"
    return
  }
  if ($text -eq $script:lastText -and ($now - $script:lastAt).TotalSeconds -lt 4) { return }
  $script:lastText = $text
  $script:lastAt = $now
  Invoke-AlfredCommand $text
} | Out-Null

Register-ObjectEvent -InputObject $engine -EventName SpeechRecognitionRejected -Action {
  Write-Host "[$((Get-Date).ToString('yyyy-MM-dd HH:mm:ss'))] [ALFRED VOICE BRIDGE] Voz no reconocida."
} | Out-Null

Write-AlfredLog "Escuchando desde Windows con $($selected.Culture.Name): $($selected.Description)"
Write-AlfredLog "Diga: Buenos días Alfred / Buenas tardes Alfred / Buenas noches Alfred."
if (-not $NoSpeak) { Speak-Alfred "Alfred está escuchando, Jefe Maestro." }

$engine.RecognizeAsync([System.Speech.Recognition.RecognizeMode]::Multiple)
try {
  while ($true) { Wait-Event -Timeout 2 | Out-Null }
} finally {
  $engine.RecognizeAsyncStop()
  $engine.Dispose()
}
