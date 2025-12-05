#!/bin/bash

# Swarm Orchestrator CLI Wrapper
# Makes it easy to run: ./scripts/swarm/swarm.sh <manifest.yaml> [options]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$PROJECT_ROOT"

# Check if tsx is available
if ! command -v tsx &> /dev/null; then
    echo "Error: tsx not found. Installing..."
    pnpm add -D tsx
fi

# Run the TypeScript orchestrator
exec tsx "$SCRIPT_DIR/orchestrator.ts" "$@"
