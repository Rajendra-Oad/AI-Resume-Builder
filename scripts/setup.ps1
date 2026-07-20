param(
  [switch]$InstallFrontendDependencies
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

Copy-Item "$root\backend\.env.example" "$root\backend\.env" -ErrorAction SilentlyContinue
Copy-Item "$root\docker\.env.example" "$root\docker\.env" -ErrorAction SilentlyContinue

if ($InstallFrontendDependencies) {
  Push-Location "$root\frontend"
  npm install
  Pop-Location
}

Write-Host "Setup files are ready. Update backend/.env and docker/.env with local-only values."
