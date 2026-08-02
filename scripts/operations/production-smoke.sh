#!/usr/bin/env bash
set -euo pipefail

: "${FRONTEND_URL:?FRONTEND_URL is required}"
: "${BACKEND_HEALTH_URL:?BACKEND_HEALTH_URL is required}"

ALLOW_INSECURE_SMOKE="${ALLOW_INSECURE_SMOKE:-false}"
FRONTEND_URL="${FRONTEND_URL%/}"
BACKEND_HEALTH_URL="${BACKEND_HEALTH_URL%/}"
BACKEND_URL="${BACKEND_HEALTH_URL%/actuator/health/readiness}"

if [[ "$ALLOW_INSECURE_SMOKE" != "true" ]]; then
  [[ "$FRONTEND_URL" == https://* ]] || { echo "FRONTEND_URL must use HTTPS." >&2; exit 1; }
  [[ "$BACKEND_URL" == https://* ]] || { echo "BACKEND_HEALTH_URL must use HTTPS." >&2; exit 1; }
fi

tmp_dir="$(mktemp -d)"
trap 'rm -rf -- "$tmp_dir"' EXIT

request_status() {
  local url="$1" output="$2"
  curl --silent --show-error --location --retry 6 --retry-delay 5 --retry-all-errors \
    --output "$output" --write-out '%{http_code}' "$url"
}

assert_status() {
  local label="$1" expected="$2" actual="$3"
  if [[ "$actual" != "$expected" ]]; then
    echo "$label failed: expected HTTP $expected, received $actual." >&2
    exit 1
  fi
  echo "PASS: $label (HTTP $actual)"
}

readiness_status="$(request_status "$BACKEND_HEALTH_URL" "$tmp_dir/readiness.json")"
assert_status "backend readiness" "200" "$readiness_status"
grep -Eq '"status"[[:space:]]*:[[:space:]]*"UP"' "$tmp_dir/readiness.json" || {
  echo "Backend readiness did not report UP." >&2
  exit 1
}

liveness_status="$(request_status "$BACKEND_URL/actuator/health/liveness" "$tmp_dir/liveness.json")"
assert_status "backend liveness" "200" "$liveness_status"
grep -Eq '"status"[[:space:]]*:[[:space:]]*"UP"' "$tmp_dir/liveness.json" || {
  echo "Backend liveness did not report UP." >&2
  exit 1
}

metrics_status="$(request_status "$BACKEND_URL/actuator/prometheus" "$tmp_dir/metrics.txt")"
assert_status "unauthenticated metrics rejection" "401" "$metrics_status"

curl --silent --show-error --location --retry 6 --retry-delay 5 --retry-all-errors \
  --dump-header "$tmp_dir/frontend.headers" --output "$tmp_dir/frontend.html" "$FRONTEND_URL/"
grep -Eqi '^content-security-policy:' "$tmp_dir/frontend.headers" || { echo "Frontend CSP header is missing." >&2; exit 1; }
grep -Eqi '^x-content-type-options:[[:space:]]*nosniff' "$tmp_dir/frontend.headers" || { echo "Frontend nosniff header is missing." >&2; exit 1; }
grep -Eqi '^x-frame-options:[[:space:]]*DENY' "$tmp_dir/frontend.headers" || { echo "Frontend frame-denial header is missing." >&2; exit 1; }
grep -Eqi '^referrer-policy:' "$tmp_dir/frontend.headers" || { echo "Frontend Referrer-Policy header is missing." >&2; exit 1; }
grep -Eqi '^permissions-policy:' "$tmp_dir/frontend.headers" || { echo "Frontend Permissions-Policy header is missing." >&2; exit 1; }
grep -Eqi '<!doctype html|<html' "$tmp_dir/frontend.html" || { echo "Frontend response is not HTML." >&2; exit 1; }
echo "PASS: frontend availability and security headers"

proxy_status="$(request_status "$FRONTEND_URL/api/v1/jobs/health" "$tmp_dir/proxy.json")"
assert_status "authenticated API proxy boundary" "401" "$proxy_status"

echo "Production public smoke checks passed. Live authenticated, SMTP, AI, and device checks remain separate approval gates."

