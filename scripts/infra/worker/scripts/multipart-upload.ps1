#Requires -Version 5.1
<#
.SYNOPSIS
  Multipart-upload a large setup.exe through the downloads Worker (with retries).
#>
param(
  [string] $WorkerBase = "https://i-thinking-downloads.layenbrank.workers.dev",
  [string] $AuthKeyFile = "$env:TEMP\i-thinking-auth-key.txt",
  [string] $SourcePath = "D:\Documents\cache\i-thinking_1.3.0_x64-setup.exe",
  [string] $ObjectKey = "1.3.0/i-thinking_1.3.0_x64-setup.exe",
  [int] $PartSizeBytes = 8MB,
  [int] $MaxRetries = 5
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $SourcePath)) {
  throw "Source missing: $SourcePath"
}
if (-not (Test-Path -LiteralPath $AuthKeyFile)) {
  throw "Auth key file missing: $AuthKeyFile"
}

$authKey = (Get-Content -LiteralPath $AuthKeyFile -Raw).Trim()
$encodedKey = ($ObjectKey -split "/" | ForEach-Object { [uri]::EscapeDataString($_) }) -join "/"
$base = "$WorkerBase/$encodedKey"

Add-Type -AssemblyName System.Net.Http
$handler = [System.Net.Http.HttpClientHandler]::new()
$client = [System.Net.Http.HttpClient]::new($handler)
$client.Timeout = [TimeSpan]::FromMinutes(10)

function Invoke-JsonRequest {
  param(
    [string] $Method,
    [string] $Uri,
    [byte[]] $BodyBytes = $null,
    [string] $ContentType = $null
  )

  for ($attempt = 1; $attempt -le $MaxRetries; $attempt++) {
    try {
      $request = [System.Net.Http.HttpRequestMessage]::new(
        [System.Net.Http.HttpMethod]::new($Method),
        $Uri
      )
      $request.Headers.TryAddWithoutValidation("X-Custom-Auth-Key", $authKey) | Out-Null

      if ($null -ne $BodyBytes) {
        $content = [System.Net.Http.ByteArrayContent]::new($BodyBytes)
        if ($ContentType) {
          $content.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse($ContentType)
        }
        $request.Content = $content
      }

      $response = $client.SendAsync($request).GetAwaiter().GetResult()
      $text = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
      if (-not $response.IsSuccessStatusCode) {
        throw "HTTP $([int]$response.StatusCode): $text"
      }
      if ([string]::IsNullOrWhiteSpace($text)) { return $null }
      return ($text | ConvertFrom-Json)
    }
    catch {
      if ($attempt -ge $MaxRetries) { throw }
      $delay = [Math]::Min(60, [Math]::Pow(2, $attempt))
      Write-Host ("Retry {0}/{1} after {2}s: {3}" -f $attempt, $MaxRetries, $delay, $_.Exception.Message)
      Start-Sleep -Seconds $delay
    }
  }
}

Write-Host "Creating multipart upload for $ObjectKey ..."
$create = Invoke-JsonRequest -Method "POST" -Uri "$base`?action=mpu-create"
$uploadId = $create.uploadId
if (-not $uploadId) { throw "No uploadId returned" }
Write-Host "uploadId=$uploadId"

$file = Get-Item -LiteralPath $SourcePath
$stream = [System.IO.File]::OpenRead($file.FullName)
$parts = New-Object System.Collections.Generic.List[object]
$partNumber = 1
$buffer = New-Object byte[] $PartSizeBytes

try {
  while ($true) {
    $read = $stream.Read($buffer, 0, $buffer.Length)
    if ($read -le 0) { break }

    $chunk = New-Object byte[] $read
    [Array]::Copy($buffer, $chunk, $read)

    $uri = "$base`?action=mpu-uploadpart&uploadId=$([uri]::EscapeDataString($uploadId))&partNumber=$partNumber"
    Write-Host ("Uploading part {0} ({1:N0} bytes) ..." -f $partNumber, $read)

    $resp = Invoke-JsonRequest -Method "PUT" -Uri $uri -BodyBytes $chunk -ContentType "application/octet-stream"
    $parts.Add([pscustomobject]@{ partNumber = $resp.partNumber; etag = $resp.etag }) | Out-Null
    $partNumber++
  }
}
finally {
  $stream.Dispose()
}

$completeBody = [System.Text.Encoding]::UTF8.GetBytes((@{ parts = @($parts.ToArray()) } | ConvertTo-Json -Compress -Depth 5))
$completeUri = "$base`?action=mpu-complete&uploadId=$([uri]::EscapeDataString($uploadId))"
Write-Host "Completing multipart upload ($($parts.Count) parts) ..."
$done = Invoke-JsonRequest -Method "POST" -Uri $completeUri -BodyBytes $completeBody -ContentType "application/json"
$done | ConvertTo-Json -Compress
Write-Host "Upload complete."
$client.Dispose()
