param(
    [Parameter(Mandatory = $true)]
    [string] $Password
)

$ErrorActionPreference = "Stop"

if ($Password.Length -lt 12) {
    throw "The development seed password must contain at least 12 characters."
}

$projectRoot = Split-Path -Parent $PSScriptRoot
$backendPath = Join-Path $projectRoot "backend"
$previousProfile = $env:SPRING_PROFILES_ACTIVE
$previousEnabled = $env:DEV_SEED_ENABLED
$previousPassword = $env:DEV_SEED_PASSWORD

try {
    $env:SPRING_PROFILES_ACTIVE = "dev"
    $env:DEV_SEED_ENABLED = "true"
    $env:DEV_SEED_PASSWORD = $Password
    Push-Location $backendPath
    mvn spring-boot:run
} finally {
    Pop-Location
    $env:SPRING_PROFILES_ACTIVE = $previousProfile
    $env:DEV_SEED_ENABLED = $previousEnabled
    $env:DEV_SEED_PASSWORD = $previousPassword
}
