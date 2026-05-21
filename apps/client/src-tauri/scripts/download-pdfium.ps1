# Download the pre-built pdfium.dll for Windows x64
# from https://github.com/bblanchon/pdfium-binaries/releases
# Usage: powershell -ExecutionPolicy Bypass -File scripts\download-pdfium.ps1

$ErrorActionPreference = 'Stop'
$dest = "$PSScriptRoot\..\pdfium.dll"

if (Test-Path $dest) {
    Write-Host "pdfium.dll already exists at $dest" -ForegroundColor Green
    exit 0
}

# Fetch latest release tag
Write-Host "Fetching latest pdfium-binaries release..." -ForegroundColor Cyan
$releases = Invoke-RestMethod "https://api.github.com/repos/bblanchon/pdfium-binaries/releases/latest"
$tag = $releases.tag_name
Write-Host "Latest tag: $tag"

$url = "https://github.com/bblanchon/pdfium-binaries/releases/download/$tag/pdfium-win-x64.tgz"
$tgz = "$env:TEMP\pdfium-win-x64.tgz"

Write-Host "Downloading $url ..." -ForegroundColor Cyan
Invoke-WebRequest -Uri $url -OutFile $tgz -UseBasicParsing

# Extract pdfium.dll from the archive using tar (available on Windows 10 1803+)
Write-Host "Extracting pdfium.dll..." -ForegroundColor Cyan
$extractDir = "$env:TEMP\pdfium-extract"
New-Item -ItemType Directory -Force -Path $extractDir | Out-Null
tar -xzf $tgz -C $extractDir

$dll = Get-ChildItem -Path $extractDir -Recurse -Filter "pdfium.dll" | Select-Object -First 1
if ($null -eq $dll) {
    Write-Error "pdfium.dll not found in archive. Check the archive contents manually."
    exit 1
}

Copy-Item $dll.FullName $dest -Force
Remove-Item -Recurse -Force $extractDir
Remove-Item -Force $tgz

Write-Host "Done. pdfium.dll placed at $dest" -ForegroundColor Green
Write-Host "Now rebuild with: bun dev:client" -ForegroundColor Yellow
