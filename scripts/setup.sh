#!/usr/bin/env bash
set -euo pipefail

echo "Setting up AI Resume Builder workspace..."
mkdir -p frontend/src backend/src/main/java/com/airesumebuilder backend/src/main/resources database/migrations docker .github .vscode docs

echo "Setup complete."
