#!/usr/bin/env sh
set -eu

PROFILE="${1:-smoke}"
case "$PROFILE" in
  smoke|normal|medium|high|stress|spike|recovery) ;;
  *) echo "Unsupported profile: $PROFILE" >&2; exit 2 ;;
esac

if [ -z "${PERF_USERS_JSON:-}" ] && { [ -z "${PERF_USER_EMAIL:-}" ] || [ -z "${PERF_USER_PASSWORD:-}" ]; }; then
  echo "Set PERF_USERS_JSON or PERF_USER_EMAIL and PERF_USER_PASSWORD." >&2
  exit 2
fi

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
mkdir -p "$ROOT/performance/reports"
TIMESTAMP=$(date -u +%Y%m%dT%H%M%SZ)
export LOAD_PROFILE="$PROFILE"
export SUMMARY_JSON="performance/reports/$TIMESTAMP-$PROFILE-summary.json"
export SUMMARY_HTML="performance/reports/$TIMESTAMP-$PROFILE-summary.html"

cd "$ROOT"
k6 run \
  --out "json=performance/reports/$TIMESTAMP-$PROFILE-raw.json" \
  --out "csv=performance/reports/$TIMESTAMP-$PROFILE-metrics.csv" \
  performance/k6/main.js
