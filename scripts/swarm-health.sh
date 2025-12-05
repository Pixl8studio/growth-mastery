#!/bin/bash
# Swarm Health Check - Quick status of all agents
# Usage: ./swarm-health.sh
#
# Returns exit code 0 if all agents healthy, 1 if any issues

set -e

AGENTS_FILE="${HOME}/.swarm/agents.yaml"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [[ ! -f "$AGENTS_FILE" ]]; then
    echo -e "${RED}✗ No agents configured${NC}"
    exit 1
fi

# Extract agents from YAML
get_agents() {
    grep -A2 "^\s*- name:" "$AGENTS_FILE" 2>/dev/null | \
    awk '
        /- name:/ { name=$3 }
        /host:/ { host=$2 }
        /port:/ { port=$2; if(port=="") port=3847; print name","host","port }
    ' | grep -v "^,,"
}

echo "🔍 Checking swarm agents..."
echo ""

total=0
healthy=0
issues=()

while IFS=',' read -r name host port; do
    [[ -z "$name" ]] && continue
    ((total++))
    
    url="http://${host}:${port}/health"
    
    if response=$(curl -s --connect-timeout 3 --max-time 5 "$url" 2>/dev/null); then
        if echo "$response" | grep -q '"healthy":true'; then
            echo -e "${GREEN}✓${NC} $name ($host:$port) - healthy"
            ((healthy++))
        else
            echo -e "${YELLOW}⚠${NC} $name ($host:$port) - unhealthy response"
            issues+=("$name: unhealthy response")
        fi
    else
        echo -e "${RED}✗${NC} $name ($host:$port) - unreachable"
        issues+=("$name: unreachable")
    fi
done <<< "$(get_agents)"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Healthy: $healthy / $total"

if [[ ${#issues[@]} -gt 0 ]]; then
    echo ""
    echo -e "${YELLOW}Issues:${NC}"
    for issue in "${issues[@]}"; do
        echo "  - $issue"
    done
    exit 1
else
    echo -e "${GREEN}All agents healthy!${NC}"
    exit 0
fi
