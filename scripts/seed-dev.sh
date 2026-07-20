#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 || ${#1} -lt 12 ]]; then
  echo "Usage: ./scripts/seed-dev.sh '<password-with-at-least-12-characters>'" >&2
  exit 1
fi

project_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

export SPRING_PROFILES_ACTIVE=dev
export DEV_SEED_ENABLED=true
export DEV_SEED_PASSWORD="$1"

cd "$project_root/backend"
exec mvn spring-boot:run
