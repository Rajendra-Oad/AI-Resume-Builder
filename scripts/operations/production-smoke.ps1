[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)] [string] $FrontendUrl,
    [Parameter(Mandatory = $true)] [string] $BackendHealthUrl,
    [switch] $AllowInsecureSmoke
)

$ErrorActionPreference = 'Stop'
$FrontendUrl = $FrontendUrl.TrimEnd('/')
$BackendHealthUrl = $BackendHealthUrl.TrimEnd('/')
$BackendUrl = $BackendHealthUrl -replace '/actuator/health/readiness$', ''

if (-not $AllowInsecureSmoke) {
    if (-not $FrontendUrl.StartsWith('https://')) { throw 'FrontendUrl must use HTTPS.' }
    if (-not $BackendUrl.StartsWith('https://')) { throw 'BackendHealthUrl must use HTTPS.' }
}

function Invoke-SmokeRequest {
    param([string] $Uri, [hashtable] $Headers = @{})
    try {
        $response = Invoke-WebRequest -Uri $Uri -Headers $Headers -MaximumRedirection 5 -TimeoutSec 30
        return $response
    } catch {
        if ($_.Exception.Response) { return $_.Exception.Response }
        throw
    }
}

function Assert-Status {
    param([string] $Label, [int] $Expected, $Response)
    $actual = [int]$Response.StatusCode
    if ($actual -ne $Expected) { throw "$Label failed: expected HTTP $Expected, received $actual." }
    Write-Host "PASS: $Label (HTTP $actual)"
}

$readiness = Invoke-SmokeRequest -Uri $BackendHealthUrl
Assert-Status -Label 'backend readiness' -Expected 200 -Response $readiness
if (($readiness.Content | ConvertFrom-Json).status -ne 'UP') { throw 'Backend readiness did not report UP.' }

$liveness = Invoke-SmokeRequest -Uri "$BackendUrl/actuator/health/liveness"
Assert-Status -Label 'backend liveness' -Expected 200 -Response $liveness
if (($liveness.Content | ConvertFrom-Json).status -ne 'UP') { throw 'Backend liveness did not report UP.' }

$metrics = Invoke-SmokeRequest -Uri "$BackendUrl/actuator/prometheus"
Assert-Status -Label 'unauthenticated metrics rejection' -Expected 401 -Response $metrics

$frontend = Invoke-SmokeRequest -Uri "$FrontendUrl/"
Assert-Status -Label 'frontend availability' -Expected 200 -Response $frontend
$requiredHeaders = @('Content-Security-Policy', 'X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'Permissions-Policy')
foreach ($header in $requiredHeaders) {
    if (-not $frontend.Headers.ContainsKey($header)) { throw "Frontend $header header is missing." }
}
if ($frontend.Headers['X-Content-Type-Options'] -notcontains 'nosniff') { throw 'Frontend nosniff header is invalid.' }
if ($frontend.Headers['X-Frame-Options'] -notcontains 'DENY') { throw 'Frontend frame-denial header is invalid.' }
if ($frontend.Content -notmatch '(?i)<!doctype html|<html') { throw 'Frontend response is not HTML.' }
Write-Host 'PASS: frontend security headers'

$proxy = Invoke-SmokeRequest -Uri "$FrontendUrl/api/v1/jobs/health"
Assert-Status -Label 'authenticated API proxy boundary' -Expected 401 -Response $proxy

Write-Host 'Production public smoke checks passed. Live authenticated, SMTP, AI, and device checks remain separate approval gates.'

