param(
  [string]$BaseUrl = 'http://localhost:3000',
  [string]$Root = "$PSScriptRoot\.."
)

$ErrorActionPreference = 'SilentlyContinue'

try {
  $response = Invoke-WebRequest -Uri "$BaseUrl/api/health" -UseBasicParsing -TimeoutSec 5
  if ($response.StatusCode -eq 200) { exit 0 }
} catch {
}

$launcher = Join-Path $Root 'scripts\windows-start-alfred.bat'
if (Test-Path $launcher) {
  Start-Process -FilePath $launcher
}
