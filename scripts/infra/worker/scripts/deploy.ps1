#Requires -Version 5.1
<#
.SYNOPSIS
  Deploy i-thinking-downloads Worker using a local wrangler install.

.NOTES
  Requires CLOUDFLARE_API_TOKEN (or prior `wrangler login`).
  Then: pnpm secret / wrangler secret put AUTH_KEY_SECRET
#>
param(
  [string] $Wrangler = "D:\Documents\cache\wrangler-cli\node_modules\.bin\wrangler.cmd",
  [string] $WorkerDir = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
)

$ErrorActionPreference = "Stop"
Set-Location $WorkerDir

if (-not (Test-Path $Wrangler)) {
  throw "wrangler not found at $Wrangler"
}

& $Wrangler deploy
Write-Host "Deploy finished. Set secret if not yet: & '$Wrangler' secret put AUTH_KEY_SECRET"
