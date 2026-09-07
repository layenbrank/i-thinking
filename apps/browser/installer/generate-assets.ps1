# Regenerate installer BMP assets (requires Windows PowerShell / .NET Drawing)
$ErrorActionPreference = "Stop"
$Assets = Join-Path $PSScriptRoot "assets"
New-Item -ItemType Directory -Force -Path $Assets | Out-Null
Add-Type -AssemblyName System.Drawing

function Save-Bmp([System.Drawing.Bitmap]$Bitmap, [string]$Path) {
  $Rect = New-Object Drawing.Rectangle 0, 0, $Bitmap.Width, $Bitmap.Height
  $Clone = $Bitmap.Clone($Rect, [Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $Clone.Save($Path, [Drawing.Imaging.ImageFormat]::Bmp)
  $Clone.Dispose()
  Write-Host "wrote $Path ($($Bitmap.Width)x$($Bitmap.Height))"
}

function New-RoundRect([int]$Width, [int]$Height, [int]$Radius) {
  $Path = New-Object Drawing.Drawing2D.GraphicsPath
  $Diameter = $Radius * 2
  $Path.AddArc(0, 0, $Diameter, $Diameter, 180, 90)
  $Path.AddArc($Width - $Diameter, 0, $Diameter, $Diameter, 270, 90)
  $Path.AddArc($Width - $Diameter, $Height - $Diameter, $Diameter, $Diameter, 0, 90)
  $Path.AddArc(0, $Height - $Diameter, $Diameter, $Diameter, 90, 90)
  $Path.CloseFigure()
  return $Path
}

# Soft pastel background (QQ-like)
$Bg = New-Object Drawing.Bitmap 720, 560
$Graphics = [Drawing.Graphics]::FromImage($Bg)
$Graphics.SmoothingMode = "AntiAlias"
$Graphics.Clear([Drawing.Color]::White)
$Brush1 = New-Object Drawing.Drawing2D.PathGradientBrush(
  @([Drawing.Point]::new(0, 0), [Drawing.Point]::new(420, 0), [Drawing.Point]::new(0, 360)))
$Brush1.CenterColor = [Drawing.Color]::FromArgb(55, 255, 230, 240)
$Brush1.SurroundColors = @(
  [Drawing.Color]::FromArgb(0, 255, 255, 255),
  [Drawing.Color]::FromArgb(0, 255, 255, 255),
  [Drawing.Color]::FromArgb(0, 255, 255, 255)
)
$Graphics.FillRectangle($Brush1, 0, 0, 420, 360)
$Brush2 = New-Object Drawing.Drawing2D.PathGradientBrush(
  @([Drawing.Point]::new(720, 560), [Drawing.Point]::new(240, 560), [Drawing.Point]::new(720, 160)))
$Brush2.CenterColor = [Drawing.Color]::FromArgb(70, 200, 230, 255)
$Brush2.SurroundColors = @(
  [Drawing.Color]::FromArgb(0, 255, 255, 255),
  [Drawing.Color]::FromArgb(0, 255, 255, 255),
  [Drawing.Color]::FromArgb(0, 255, 255, 255)
)
$Graphics.FillRectangle($Brush2, 240, 160, 480, 400)
$Graphics.Dispose()
$Brush1.Dispose()
$Brush2.Dispose()
Save-Bmp $Bg (Join-Path $Assets "home-bg.bmp")
$Bg.Dispose()

# Logo
$Logo = New-Object Drawing.Bitmap 72, 72
$Graphics = [Drawing.Graphics]::FromImage($Logo)
$Graphics.SmoothingMode = "AntiAlias"
$Graphics.Clear([Drawing.Color]::White)
$Path = New-Object Drawing.Drawing2D.GraphicsPath
$Path.AddEllipse(2, 2, 67, 67)
$Paint = New-Object Drawing.Drawing2D.PathGradientBrush $Path
$Paint.CenterColor = [Drawing.Color]::FromArgb(255, 90, 160, 255)
$Paint.SurroundColors = @([Drawing.Color]::FromArgb(255, 26, 86, 232))
$Graphics.FillEllipse($Paint, 2, 2, 67, 67)
$Font = New-Object Drawing.Font "Segoe UI", 28, ([Drawing.FontStyle]::Bold), ([Drawing.GraphicsUnit]::Pixel)
$Format = New-Object Drawing.StringFormat
$Format.Alignment = "Center"
$Format.LineAlignment = "Center"
$Graphics.DrawString("i", $Font, [Drawing.Brushes]::White, (New-Object Drawing.RectangleF 0, 2, 72, 72), $Format)
$Graphics.Dispose()
$Paint.Dispose()
$Path.Dispose()
$Font.Dispose()
Save-Bmp $Logo (Join-Path $Assets "logo.bmp")
$Logo.Dispose()

# Install button
$Button = New-Object Drawing.Bitmap 300, 48
$Graphics = [Drawing.Graphics]::FromImage($Button)
$Graphics.SmoothingMode = "AntiAlias"
$Graphics.TextRenderingHint = "ClearTypeGridFit"
$Graphics.Clear([Drawing.Color]::White)
$Round = New-RoundRect 300 48 8
$Gradient = New-Object Drawing.Drawing2D.LinearGradientBrush (
  [Drawing.Point]::new(0, 0),
  [Drawing.Point]::new(0, 48),
  [Drawing.Color]::FromArgb(255, 90, 160, 255),
  [Drawing.Color]::FromArgb(255, 64, 128, 255)
)
$Graphics.FillPath($Gradient, $Round)
$ButtonFont = New-Object Drawing.Font "Microsoft YaHei UI", 14, ([Drawing.FontStyle]::Bold), ([Drawing.GraphicsUnit]::Point)
$ButtonFormat = New-Object Drawing.StringFormat
$ButtonFormat.Alignment = "Center"
$ButtonFormat.LineAlignment = "Center"
$Graphics.DrawString("立即安装", $ButtonFont, [Drawing.Brushes]::White, (New-Object Drawing.RectangleF 0, 0, 300, 48), $ButtonFormat)
$Graphics.Dispose()
$Gradient.Dispose()
$Round.Dispose()
$ButtonFont.Dispose()
Save-Bmp $Button (Join-Path $Assets "btn-install.bmp")
$Button.Dispose()

# Welcome side + header (install/finish pages)
$Welcome = New-Object Drawing.Bitmap 164, 314
$Graphics = [Drawing.Graphics]::FromImage($Welcome)
$Graphics.SmoothingMode = "AntiAlias"
$Gradient = New-Object Drawing.Drawing2D.LinearGradientBrush (
  [Drawing.Point]::new(0, 0),
  [Drawing.Point]::new(0, 314),
  [Drawing.Color]::FromArgb(255, 155, 194, 255),
  [Drawing.Color]::FromArgb(255, 26, 86, 232)
)
$Graphics.FillRectangle($Gradient, 0, 0, 164, 314)
$Graphics.FillEllipse((New-Object Drawing.SolidBrush ([Drawing.Color]::FromArgb(40, 255, 255, 255))), -20, -10, 120, 120)
$Graphics.Dispose()
$Gradient.Dispose()
Save-Bmp $Welcome (Join-Path $Assets "welcome.bmp")
$Welcome.Dispose()

$Header = New-Object Drawing.Bitmap 150, 57
$Graphics = [Drawing.Graphics]::FromImage($Header)
$Graphics.Clear([Drawing.Color]::White)
$Graphics.FillRectangle((New-Object Drawing.SolidBrush ([Drawing.Color]::FromArgb(255, 64, 128, 255))), 0, 0, 150, 3)
$Graphics.FillEllipse((New-Object Drawing.SolidBrush ([Drawing.Color]::FromArgb(255, 64, 128, 255))), 14, 16, 26, 26)
$Graphics.Dispose()
Save-Bmp $Header (Join-Path $Assets "header.bmp")
$Header.Dispose()

Write-Host "assets done"
