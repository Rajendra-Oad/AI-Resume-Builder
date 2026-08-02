param(
    [ValidateSet("smoke", "normal", "medium", "high", "stress", "spike", "recovery")]
    [string]$Profile = "smoke"
)

$ErrorActionPreference = "Stop"
$repositoryRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
$reportsDirectory = Join-Path $repositoryRoot "performance\reports"
New-Item -ItemType Directory -Force -Path $reportsDirectory | Out-Null

if (-not (Get-Command k6 -ErrorAction SilentlyContinue)) {
    throw "k6 is required. Install it from https://grafana.com/docs/k6/latest/set-up/install-k6/."
}
if ([string]::IsNullOrWhiteSpace($env:PERF_USERS_JSON) -and
    ([string]::IsNullOrWhiteSpace($env:PERF_USER_EMAIL) -or [string]::IsNullOrWhiteSpace($env:PERF_USER_PASSWORD))) {
    throw "Set PERF_USERS_JSON or PERF_USER_EMAIL and PERF_USER_PASSWORD."
}

$timestamp = (Get-Date).ToUniversalTime().ToString("yyyyMMddTHHmmssZ")
$env:LOAD_PROFILE = $Profile
$env:SUMMARY_JSON = "performance/reports/$timestamp-$Profile-summary.json"
$env:SUMMARY_HTML = "performance/reports/$timestamp-$Profile-summary.html"
$rawJson = "performance/reports/$timestamp-$Profile-raw.json"
$csv = "performance/reports/$timestamp-$Profile-metrics.csv"

Push-Location $repositoryRoot
try {
    & k6 run --out "json=$rawJson" --out "csv=$csv" performance/k6/main.js
    if ($LASTEXITCODE -ne 0) { throw "k6 failed or a performance threshold was breached." }
} finally {
    Pop-Location
}

Write-Host "Performance reports created under $reportsDirectory"
