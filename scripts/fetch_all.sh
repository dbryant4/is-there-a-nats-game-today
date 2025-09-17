#!/usr/bin/env bash
set -euo pipefail

# Move to repo root
cd "$(dirname "$0")/.."

if ! command -v node >/dev/null 2>&1; then
  echo "Error: node is not installed or not on PATH" >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is not installed or not on PATH" >&2
  exit 1
fi

# Install dependencies if package.json exists and node_modules is missing
if [[ -f "package.json" && ! -d "node_modules" ]]; then
  echo "Installing Node.js dependencies..."
  npm install
fi

mkdir -p data

echo "[1/2] Fetching Washington Nationals data…"
node scripts/fetch_nats.js

echo "[2/2] Fetching Audi Field events…"
node scripts/fetch_audi.js

echo "Done. Wrote:"
echo "  $(pwd)/data/nats.json"
echo "  $(pwd)/data/audi.json"


