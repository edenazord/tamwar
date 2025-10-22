Param(
  [int]$Port = 5173
)
$ErrorActionPreference = 'Stop'
$root = Join-Path $PSScriptRoot 'web'

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js non trovato. Installa da https://nodejs.org/ e riprova." -ForegroundColor Yellow
  exit 1
}

# Apri il browser dopo un piccolo delay mentre parte il server
Start-Job -ScriptBlock {
  Start-Sleep -Seconds 1
  Start-Process "http://localhost:$using:Port/"
} | Out-Null

node "$PSScriptRoot\server.js" --port $Port --root $root
