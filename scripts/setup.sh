#!/usr/bin/env bash
set -euo pipefail

root_dir="$(cd "$(dirname "$0")/.." && pwd)"

cp -n "$root_dir/backend/.env.example" "$root_dir/backend/.env" 2>/dev/null || true
cp -n "$root_dir/docker/.env.example" "$root_dir/docker/.env" 2>/dev/null || true

echo "Setup files are ready. Update backend/.env and docker/.env with local-only values."
