Param(
  [int]$Port = 5173
)
$ErrorActionPreference = 'Stop'
$root = Join-Path $PSScriptRoot 'web'

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js non trovato. Installa da https://nodejs.org/ e riprova." -ForegroundColor Yellow
  exit 1
}

node "$PSScriptRoot\server.js" --port $Port --root $root
