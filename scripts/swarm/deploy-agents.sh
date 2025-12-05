#!/bin/bash

# Deploy and configure all swarm agents from agents.yaml
# Usage: ./scripts/swarm/deploy-agents.sh [--ssh-user username]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
AGENTS_FILE="$PROJECT_ROOT/.swarm/agents.yaml"

# Default SSH user and key (can be overridden)
SSH_USER="${SWARM_SSH_USER:-ubuntu}"
SSH_KEY="${SWARM_SSH_KEY:-}"
SSH_OPTS="-o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new"

# Add key if specified
if [[ -n "$SSH_KEY" ]]; then
    SSH_OPTS="$SSH_OPTS -i $SSH_KEY"
fi

# Parse command line args
while [[ $# -gt 0 ]]; do
  case $1 in
    --ssh-user)
      SSH_USER="$2"
      shift 2
      ;;
    --ssh-key)
      SSH_KEY="$2"
      SSH_OPTS="$SSH_OPTS -i $SSH_KEY"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--ssh-user username] [--ssh-key /path/to/key]"
      exit 1
      ;;
  esac
done

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

if [[ ! -f "$AGENTS_FILE" ]]; then
    echo -e "${RED}❌ No agents.yaml found${NC}"
    echo "Run: pnpm swarm:config"
    exit 1
fi

echo -e "${BLUE}🚀 Deploying Swarm Agents${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "SSH User: $SSH_USER"
echo "Setup Script: $SCRIPT_DIR/setup-remote-agent.sh"
echo ""

# Extract agent hosts from YAML
get_agents() {
    grep -A2 "^\s*- name:" "$AGENTS_FILE" 2>/dev/null | \
    awk '
        /- name:/ { name=$3 }
        /host:/ { host=$2; print name","host }
    ' | grep -v "^,"
}

# Function to test SSH connection
test_ssh() {
    local host=$1
    local user=$2

    if ssh $SSH_OPTS -o BatchMode=yes "${user}@${host}" "echo 'SSH OK'" &>/dev/null; then
        return 0
    else
        return 1
    fi
}

# Function to deploy to one agent
deploy_agent() {
    local name=$1
    local host=$2
    local user=$3

    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📦 Deploying: $name ($host)${NC}"
    echo ""

    # Test SSH connection
    echo "  Testing SSH connection..."
    if ! test_ssh "$host" "$user"; then
        echo -e "  ${RED}✗ Cannot connect via SSH${NC}"
        echo -e "  ${YELLOW}→ Add your SSH key: ssh-copy-id ${user}@${host}${NC}"
        return 1
    fi
    echo -e "  ${GREEN}✓ SSH connection OK${NC}"

    # Copy setup script
    echo "  Copying setup script..."
    if scp $SSH_OPTS "$SCRIPT_DIR/setup-remote-agent.sh" "${user}@${host}:/tmp/" &>/dev/null; then
        echo -e "  ${GREEN}✓ Setup script copied${NC}"
    else
        echo -e "  ${RED}✗ Failed to copy setup script${NC}"
        return 1
    fi

    # Run setup script
    echo "  Running setup script (this may take a few minutes)..."
    if ssh $SSH_OPTS "${user}@${host}" "bash /tmp/setup-remote-agent.sh" 2>&1 | tee "/tmp/swarm-setup-${name}.log"; then
        echo -e "  ${GREEN}✓ Setup completed${NC}"
    else
        echo -e "  ${RED}✗ Setup failed${NC}"
        echo -e "  ${YELLOW}→ Check log: /tmp/swarm-setup-${name}.log${NC}"
        return 1
    fi

    # Test agent health endpoint
    echo "  Testing agent health endpoint..."
    sleep 2
    if curl -s --connect-timeout 5 "http://${host}:3000/health" | grep -q '"healthy":true'; then
        echo -e "  ${GREEN}✓ Agent is responding${NC}"
    else
        echo -e "  ${YELLOW}⚠ Agent not responding yet${NC}"
        echo -e "  ${YELLOW}→ SSH in and check: ssh ${user}@${host}${NC}"
        echo -e "  ${YELLOW}→ Check service: sudo systemctl status swarm-agent${NC}"
    fi

    echo ""
    echo -e "${GREEN}✅ Deployment complete for $name${NC}"
    echo ""

    return 0
}

# Main deployment loop
successful=0
failed=0
agents=()

while IFS=',' read -r name host; do
    [[ -z "$name" ]] && continue
    agents+=("$name:$host")
done <<< "$(get_agents)"

total=${#agents[@]}

echo -e "${BLUE}Found $total agents to deploy${NC}"
echo ""

for agent in "${agents[@]}"; do
    name="${agent%%:*}"
    host="${agent##*:}"

    if deploy_agent "$name" "$host" "$SSH_USER"; then
        ((successful++))
    else
        ((failed++))
    fi
done

# Summary
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${BLUE}📊 Deployment Summary${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Total agents: $total"
echo -e "${GREEN}Successful: $successful${NC}"
if [[ $failed -gt 0 ]]; then
    echo -e "${RED}Failed: $failed${NC}"
fi
echo ""

if [[ $failed -eq 0 ]]; then
    echo -e "${GREEN}🎉 All agents deployed successfully!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Check agent health: pnpm swarm:health"
    echo "  2. Run a test swarm: pnpm swarm:dry-run test-coverage-swarm.yaml"
    echo "  3. Execute real swarm: pnpm swarm test-coverage-swarm.yaml --verbose"
    exit 0
else
    echo -e "${YELLOW}⚠️  Some agents failed to deploy${NC}"
    echo ""
    echo "Troubleshooting:"
    echo "  - Verify SSH access: ssh ${SSH_USER}@<agent-ip>"
    echo "  - Check firewall rules on agents (port 3000)"
    echo "  - Review setup logs in /tmp/swarm-setup-*.log"
    exit 1
fi
