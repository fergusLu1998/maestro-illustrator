param([string]$SchrodingerPath = $env:SCHRODINGER)
$ErrorActionPreference = 'Stop'
if (-not $SchrodingerPath) {
  $locations = Get-ItemProperty 'HKLM:/Software/Microsoft/Windows/CurrentVersion/Uninstall/*','HKLM:/Software/WOW6432Node/Microsoft/Windows/CurrentVersion/Uninstall/*' -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -like 'Schrodinger Maestro*' } | Select-Object -ExpandProperty InstallLocation -Unique
  $SchrodingerPath = $locations | Sort-Object -Descending | Select-Object -First 1
}
if (-not $SchrodingerPath) { $SchrodingerPath = Read-Host 'Enter your Schrodinger installation directory (containing run.exe)' }
if (-not $SchrodingerPath) { throw 'Schrodinger installation directory is required.' }
$runnerPath = Join-Path $SchrodingerPath 'run.exe'
if (-not (Test-Path -LiteralPath $runnerPath)) { throw 'Schrodinger run.exe not found. Specify -SchrodingerPath or SCHRODINGER.' }
Write-Host 'Start npm run dev in a separate terminal before opening localhost:3000.'
Write-Host 'Keep this engine window open; Ctrl+C stops the service.'
& $runnerPath python3 (Join-Path $PSScriptRoot 'schrodinger_bridge.py') --connection-file (Join-Path $PSScriptRoot 'schrodinger-connection.json') --open-site
exit $LASTEXITCODE
