# 安裝電腦端橋接：複製到隱藏資料夾、產生密鑰、註冊「使用者登入時」隱藏啟動的排程工作。
# 用法：powershell -ExecutionPolicy Bypass -File install.ps1 [-TaskName 名稱]
param(
  [string]$TaskName = "DeskSyncHelper",
  [string]$InstallDir = "$env:LOCALAPPDATA\$TaskName"
)
$ErrorActionPreference = "Stop"

$node = (Get-Command node.exe -ErrorAction SilentlyContinue).Source
if (-not $node) { throw "找不到 node.exe，請先安裝 Node.js" }

New-Item -ItemType Directory -Force $InstallDir | Out-Null
Copy-Item "$PSScriptRoot\server.mjs" $InstallDir -Force
(Get-Item $InstallDir).Attributes = 'Directory,Hidden'

$configPath = Join-Path $InstallDir "config.json"
if (-not (Test-Path $configPath)) {
  $bytes = New-Object byte[] 32
  (New-Object System.Security.Cryptography.RNGCryptoServiceProvider).GetBytes($bytes)
  $secret = -join ($bytes | ForEach-Object { $_.ToString("x2") })
  $cfg = Get-Content "$PSScriptRoot\config.example.json" -Raw -Encoding UTF8 | ConvertFrom-Json
  $cfg.sharedSecret = $secret
  $cfg | ConvertTo-Json | Out-File $configPath -Encoding utf8
  Write-Host ""
  Write-Host "已產生共享密鑰，請到 Cloudflare 設定成 PC_SHARED_SECRET：" -ForegroundColor Yellow
  Write-Host $secret
  Write-Host ""
  Write-Host "設定檔在 $configPath，請確認 claudePath、cloudflaredPath 正確。" -ForegroundColor Yellow
}

# conhost --headless：沒有視窗、工作列也不會出現
$action = New-ScheduledTaskAction -Execute "conhost.exe" `
  -Argument "--headless `"$node`" `"$InstallDir\server.mjs`"" -WorkingDirectory $InstallDir
$trigger = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"
$settings = New-ScheduledTaskSettingsSet -Hidden -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries `
  -ExecutionTimeLimit ([TimeSpan]::Zero) -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Force | Out-Null

Write-Host "排程「$TaskName」已註冊，下次登入會自動啟動。要立刻啟動：Start-ScheduledTask -TaskName $TaskName"
