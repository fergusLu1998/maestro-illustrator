param(
  [string]$SchrodingerPath,
  [switch]$Configure,
  [string]$SiteUrl = 'https://pocket-atlas.ferguslu.chatgpt.site/'
)
$ErrorActionPreference = 'Stop'
$settingsDir = Join-Path $env:LOCALAPPDATA 'PocketAtlas'
$settingsFile = Join-Path $settingsDir 'settings.json'
$bridge = Join-Path $PSScriptRoot 'schrodinger_bridge.py'
$logFile = Join-Path $settingsDir 'schrodinger-bridge.log'
$errorLogFile = Join-Path $settingsDir 'schrodinger-bridge-error.log'

function Test-Schrodinger([string]$candidate) {
  return $candidate -and (Test-Path -LiteralPath (Join-Path $candidate 'run.exe'))
}

function Save-Settings([string]$path, [bool]$skip) {
  New-Item -ItemType Directory -Path $settingsDir -Force | Out-Null
  @{ schrodingerPath = $path; skipSchrodinger = $skip } |
    ConvertTo-Json | Set-Content -LiteralPath $settingsFile -Encoding UTF8
}

function Select-SchrodingerFolder {
  Add-Type -AssemblyName System.Windows.Forms
  $dialog = New-Object System.Windows.Forms.FolderBrowserDialog
  $dialog.Description = 'Select the Schrödinger installation folder containing run.exe'
  $dialog.ShowNewFolderButton = $false
  if ($dialog.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
    return $dialog.SelectedPath
  }
  return $null
}

$saved = $null
if (Test-Path -LiteralPath $settingsFile) {
  try { $saved = Get-Content -LiteralPath $settingsFile -Raw | ConvertFrom-Json } catch { $saved = $null }
}
if (-not $SchrodingerPath -and -not $Configure -and (Test-Schrodinger $saved.schrodingerPath)) {
  $SchrodingerPath = $saved.schrodingerPath
}
if (-not $SchrodingerPath -and (Test-Schrodinger $env:SCHRODINGER)) {
  $SchrodingerPath = $env:SCHRODINGER
}
if (-not $SchrodingerPath -and -not $Configure -and $saved.skipSchrodinger) {
  Start-Process $SiteUrl
  exit 0
}
if (-not $SchrodingerPath) {
  $registryKeys = @(
    'HKLM:/Software/Microsoft/Windows/CurrentVersion/Uninstall/*'
    'HKLM:/Software/WOW6432Node/Microsoft/Windows/CurrentVersion/Uninstall/*'
  )
  $registryPaths = Get-ItemProperty $registryKeys -ErrorAction SilentlyContinue |
    Where-Object { $_.DisplayName -like 'Schrodinger*' -or $_.DisplayName -like 'Maestro*' } |
    Select-Object -ExpandProperty InstallLocation -Unique
  $SchrodingerPath = $registryPaths | Where-Object { Test-Schrodinger $_ } | Select-Object -First 1
}
if (-not $SchrodingerPath) {
  Add-Type -AssemblyName System.Windows.Forms
  $answer = [System.Windows.Forms.MessageBox]::Show(
    'Pocket Atlas can automatically connect to a licensed Schrödinger installation. Select Yes to locate it. Select No to use molecular clustering without Schrödinger. You can configure it later by running: Start Pocket Atlas.cmd -Configure',
    'Pocket Atlas first-time setup',
    [System.Windows.Forms.MessageBoxButtons]::YesNoCancel,
    [System.Windows.Forms.MessageBoxIcon]::Information
  )
  if ($answer -eq [System.Windows.Forms.DialogResult]::Cancel) { exit 0 }
  if ($answer -eq [System.Windows.Forms.DialogResult]::No) {
    Save-Settings '' $true
    Start-Process $SiteUrl
    exit 0
  }
  $SchrodingerPath = Select-SchrodingerFolder
}
if (-not (Test-Schrodinger $SchrodingerPath)) {
  Add-Type -AssemblyName System.Windows.Forms
  [System.Windows.Forms.MessageBox]::Show(
    'run.exe was not found in the selected folder. Pocket Atlas will open in clustering-only mode. Run Start Pocket Atlas.cmd -Configure to try again.',
    'Schrödinger not configured',
    [System.Windows.Forms.MessageBoxButtons]::OK,
    [System.Windows.Forms.MessageBoxIcon]::Warning
  ) | Out-Null
  Start-Process $SiteUrl
  exit 0
}

Save-Settings $SchrodingerPath $false
New-Item -ItemType Directory -Path $settingsDir -Force | Out-Null
$runner = Join-Path $SchrodingerPath 'run.exe'
$arguments = @('python3', ('"' + $bridge + '"'), '--open-site', '--site-url', ('"' + $SiteUrl + '"'))
Start-Process -FilePath $runner -ArgumentList $arguments -WindowStyle Hidden -RedirectStandardOutput $logFile -RedirectStandardError $errorLogFile

$connected = $false
for ($attempt = 0; $attempt -lt 12; $attempt++) {
  Start-Sleep -Milliseconds 500
  try {
    $health = Invoke-RestMethod -Uri 'http://127.0.0.1:8765/handshake' -TimeoutSec 1
    if ($health.format -eq 'pocket-atlas-connection-v1') { $connected = $true; break }
  } catch {}
}
if (-not $connected) { Start-Process $SiteUrl }
exit 0
