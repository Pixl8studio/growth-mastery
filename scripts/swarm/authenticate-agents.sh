#!/bin/bash

# Authenticate Claude Code on all swarm agents
# Usage: ./scripts/swarm/authenticate-agents.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
AGENTS_FILE="$PROJECT_ROOT/.swarm/agents.yaml"

SSH_USER="${SWARM_SSH_USER:-opc}"
SSH_KEY="${SWARM_SSH_KEY:-/Users/lawl3ss/Documents/ssh/ssh-key-2025-12-05.key}"
SSH_OPTS="-o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new -i $SSH_KEY"

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}🔐 Authenticating Claude Code on Swarm Agents${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Get agents
get_agents() {
    grep -A2 "^\s*- name:" "$AGENTS_FILE" 2>/dev/null | \
    awk '
        /- name:/ { name=$3 }
        /host:/ { host=$2; print name","host }
    ' | grep -v "^,"
}

while IFS=',' read -r name host; do
    [[ -z "$name" ]] && continue

    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}🔐 Authenticating: $name ($host)${NC}"
    echo ""

    echo "  Starting interactive authentication..."
    echo ""
    echo -e "  ${YELLOW}You'll be prompted to log in to Claude Code${NC}"
    echo -e "  ${YELLOW}Follow the instructions in your browser${NC}"
    echo ""

    # Start authentication
    ssh $SSH_OPTS -t "${SSH_USER}@${host}" "source ~/.nvm/nvm.sh && claude auth login"

    # Start the agent service
    echo ""
    echo "  Starting swarm agent service..."
    ssh $SSH_OPTS "${SSH_USER}@${host}" "sudo systemctl start swarm-agent"
    sleep 2

    # Check status
    if ssh $SSH_OPTS "${SSH_USER}@${host}" "sudo systemctl is-active swarm-agent" | grep -q "active"; then
        echo -e "  ${GREEN}✓ Swarm agent is running${NC}"
    else
        echo -e "  ${YELLOW}⚠ Agent may not be running, check with: sudo systemctl status swarm-agent${NC}"
    fi

    echo ""

done <<< "$(get_agents)"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Authentication Complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Check agent health: pnpm swarm:health"
echo "  2. Run test swarm: pnpm swarm:dry-run test-issue-109.yaml"
echo "  3. Execute full swarm: pnpm swarm test-coverage-swarm.yaml --verbose"
