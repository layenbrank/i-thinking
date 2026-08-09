#Requires -Version 5.1
<#
.SYNOPSIS
  Upload a renamed NSIS setup.exe to R2 bucket i-thinking via rclone (multipart).

.EXAMPLE
  .\upload-setup.ps1 -AccountId "YOUR_ACCOUNT_ID" -AccessKeyId "..." -SecretAccessKey "..."
#>
param(
  [Parameter(Mandatory = $true)]
  [string] $AccountId,

  [Parameter(Mandatory = $true)]
  [string] $AccessKeyId,

  [Parameter(Mandatory = $true)]
  [string] $SecretAccessKey,

  [string] $SourcePath = "D:\Documents\cache\release\bundle\nsis\i thinking_1.3.0_x64-setup.exe",
  [string] $Version = "1.3.0",
  [string] $Bucket = "i-thinking",
  [string] $RemoteName = "cfr2"
)

$ErrorActionPreference = "Stop"

$rclone = Get-Command rclone -ErrorAction SilentlyContinue
if (-not $rclone) {
  $candidates = @(
    "$env:LOCALAPPDATA\Microsoft\WinGet\Links\rclone.exe",
    "$env:ProgramFiles\rclone\rclone.exe",
    "$env:LOCALAPPDATA\Programs\rclone\rclone.exe"
  )
  foreach ($path in $candidates) {
    if (Test-Path $path) {
      $rclone = @{ Source = $path }
      break
    }
  }
}
if (-not $rclone) {
  throw "rclone not found. Install with: winget install Rclone.Rclone"
}

if (-not (Test-Path -LiteralPath $SourcePath)) {
  throw "Source not found: $SourcePath"
}

$workDir = Join-Path $env:TEMP "i-thinking-r2-upload"
New-Item -ItemType Directory -Force -Path $workDir | Out-Null
$objectName = "i-thinking_${Version}_x64-setup.exe"
$staged = Join-Path $workDir $objectName
Copy-Item -LiteralPath $SourcePath -Destination $staged -Force

$configDir = Join-Path $workDir "rclone-config"
New-Item -ItemType Directory -Force -Path $configDir | Out-Null
$configPath = Join-Path $configDir "rclone.conf"

@"
[$RemoteName]
type = s3
provider = Cloudflare
access_key_id = $AccessKeyId
secret_access_key = $SecretAccessKey
endpoint = https://$AccountId.r2.cloudflarestorage.com
acl = private
no_check_bucket = true
"@ | Set-Content -Path $configPath -Encoding ascii

$dest = "${RemoteName}:${Bucket}/${Version}/"
Write-Host "Uploading $staged -> $dest"

& $rclone.Source @(
  "copy",
  $staged,
  $dest,
  "--config", $configPath,
  "--s3-upload-cutoff", "100M",
  "--s3-chunk-size", "64M",
  "--progress"
)

Write-Host "Done. Object key: ${Version}/${objectName}"
