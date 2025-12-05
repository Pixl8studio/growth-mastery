#!/bin/bash

# Generate agents.yaml from .env.local swarm configuration
# Usage: ./scripts/swarm/generate-agents-config.sh [--global]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Determine output location
if [[ "$1" == "--global" ]]; then
  OUTPUT_DIR="$HOME/.swarm"
  OUTPUT_FILE="$OUTPUT_DIR/agents.yaml"
  echo "📝 Generating global swarm agents config: $OUTPUT_FILE"
else
  OUTPUT_DIR="$PROJECT_ROOT/.swarm"
  OUTPUT_FILE="$OUTPUT_DIR/agents.yaml"
  echo "📝 Generating project swarm agents config: $OUTPUT_FILE"
fi

# Ensure output directory exists
mkdir -p "$OUTPUT_DIR"

# Load .env.local
ENV_FILE="$PROJECT_ROOT/.env.local"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "❌ Error: .env.local not found at $ENV_FILE"
  exit 1
fi

# Extract swarm IPs
SWARM_IPS=()
SWARM_NAMES=()

while IFS='=' read -r key value; do
  if [[ $key =~ ^CLAUDE_SWARM_([0-9]+)_IP$ ]]; then
    num="${BASH_REMATCH[1]}"
    # Skip placeholder IPs (xx.xx.xx.xx)
    if [[ "$value" != "xx.xx.xx.xx" ]] && [[ -n "$value" ]]; then
      SWARM_IPS+=("$value")
      SWARM_NAMES+=("swarm-agent-$num")
    fi
  fi
done < <(grep "^CLAUDE_SWARM_" "$ENV_FILE" | grep -v "^#")

if [[ ${#SWARM_IPS[@]} -eq 0 ]]; then
  echo "❌ Error: No valid swarm IPs found in .env.local"
  echo "   Expected format: CLAUDE_SWARM_1_IP=1.2.3.4"
  exit 1
fi

# Generate agents.yaml
cat > "$OUTPUT_FILE" << 'YAML_HEADER'
# Swarm Agents Configuration
# Auto-generated from .env.local
# DO NOT EDIT - Run scripts/swarm/generate-agents-config.sh to regenerate

# Agent endpoints (default ports and paths for Claude Code agents)
defaults:
  port: 3000
  status_endpoint: /api/swarm/status
  execute_endpoint: /api/swarm/execute
  health_check_interval: 30s
  timeout: 300s

# Remote agents
agents:
YAML_HEADER

# Add each agent
for i in "${!SWARM_IPS[@]}"; do
  name="${SWARM_NAMES[$i]}"
  ip="${SWARM_IPS[$i]}"

  cat >> "$OUTPUT_FILE" << YAML_AGENT
  - name: $name
    host: $ip
    port: 3000
    status_endpoint: /api/swarm/status
    execute_endpoint: /api/swarm/execute
    enabled: true
YAML_AGENT
done

# Add metadata
cat >> "$OUTPUT_FILE" << YAML_FOOTER

# Metadata
generated_at: $(date -u +"%Y-%m-%dT%H:%M:%SZ")
generated_from: .env.local
agent_count: ${#SWARM_IPS[@]}
YAML_FOOTER

echo "✅ Generated swarm config with ${#SWARM_IPS[@]} agents"
echo ""
echo "Configured agents:"
for i in "${!SWARM_IPS[@]}"; do
  echo "  - ${SWARM_NAMES[$i]}: ${SWARM_IPS[$i]}"
done
echo ""
echo "📁 Config file: $OUTPUT_FILE"
echo ""
echo "Next steps:"
echo "  1. Verify agents are running: ./scripts/swarm/swarm-health.sh"
echo "  2. Test with dry-run: pnpm swarm:dry-run test-coverage-swarm.yaml"
echo "  3. Execute swarm: pnpm swarm test-coverage-swarm.yaml --verbose"
