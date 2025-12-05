#!/bin/bash

# Fix Git setup on all swarm agents
# This script:
# 1. Fetches all branches from remote
# 2. Sets up Git credentials/SSH keys
# 3. Configures git user info
#
# Usage: ./scripts/swarm/fix-agent-git.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
AGENTS_FILE="$PROJECT_ROOT/.swarm/agents-ips.yaml"

SSH_USER="${SWARM_SSH_USER:-opc}"
SSH_KEY="${SWARM_SSH_KEY:-/Users/lawl3ss/Documents/ssh/ssh-key-2025-12-05.key}"
SSH_OPTS="-o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new -i $SSH_KEY"

# Repo details - will be set based on authentication method
REPO_URL_SSH="git@github.com:Pixl8studio/growth-mastery.git"
REPO_URL_HTTPS="https://github.com/Pixl8studio/growth-mastery.git"
WORKSPACE_DIR="${SWARM_WORKSPACE:-/home/opc/growth-mastery}"

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🔧 Fixing Git Setup on Swarm Agents${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if agents file exists
if [[ ! -f "$AGENTS_FILE" ]]; then
    echo -e "${YELLOW}⚠ Agents file not found: $AGENTS_FILE${NC}"
    echo "   Looking for alternatives..."

    # Try agents-direct.yaml first (has real IPs)
    if [[ -f "$PROJECT_ROOT/.swarm/agents-direct.yaml" ]]; then
        AGENTS_FILE="$PROJECT_ROOT/.swarm/agents-direct.yaml"
        echo -e "${GREEN}✓ Found: agents-direct.yaml${NC}"
    elif [[ -f "$PROJECT_ROOT/.swarm/agents.yaml" ]]; then
        AGENTS_FILE="$PROJECT_ROOT/.swarm/agents.yaml"
        echo -e "${YELLOW}⚠ Using: agents.yaml${NC}"
    else
        echo -e "${RED}❌ No agents configuration found${NC}"
        exit 1
    fi
fi

echo -e "${YELLOW}📋 Using agents file: $AGENTS_FILE${NC}"
echo ""

# Get agent IPs
get_agent_ips() {
    # Extract IP addresses from agents file
    grep -E "^\s*host:" "$AGENTS_FILE" | \
    awk '{print $2}' | \
    grep -v "localhost" | \
    grep -E "^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$" | \
    sort -u
}

AGENT_IPS=$(get_agent_ips)

if [[ -z "$AGENT_IPS" ]]; then
    echo -e "${RED}❌ No remote agent IPs found in $AGENTS_FILE${NC}"
    echo "   Agents file contains only localhost entries."
    echo "   Need agents-ips.yaml with actual remote IPs."
    exit 1
fi

echo -e "${GREEN}Found $(echo "$AGENT_IPS" | wc -l) remote agent(s)${NC}"
echo ""

# Process each agent
while IFS= read -r agent_ip; do
    [[ -z "$agent_ip" ]] && continue

    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}🔧 Configuring agent: $agent_ip${NC}"
    echo ""

    # Test SSH connection
    if ! ssh $SSH_OPTS "${SSH_USER}@${agent_ip}" "echo 'Connection OK'" &>/dev/null; then
        echo -e "${RED}❌ Cannot connect to $agent_ip${NC}"
        continue
    fi

    echo "  ✓ SSH connection established"

    # 1. Extract GitHub token from .env.local
    echo "  📋 Setting up GitHub authentication..."
    GITHUB_TOKEN=$(grep "^GITHUB_TOKEN=" "$PROJECT_ROOT/.env.local" 2>/dev/null | cut -d'=' -f2 | tr -d '"' | tr -d "'")

    if [[ -z "$GITHUB_TOKEN" ]]; then
        echo -e "  ${YELLOW}⚠ No GITHUB_TOKEN found in .env.local${NC}"
        echo "  Attempting SSH key fallback..."

        # Fallback to SSH keys
        ssh $SSH_OPTS "${SSH_USER}@${agent_ip}" "mkdir -p ~/.ssh && chmod 700 ~/.ssh"
        if [[ -f ~/.ssh/id_ed25519 ]]; then
            scp $SSH_OPTS ~/.ssh/id_ed25519 "${SSH_USER}@${agent_ip}:~/.ssh/"
            scp $SSH_OPTS ~/.ssh/id_ed25519.pub "${SSH_USER}@${agent_ip}:~/.ssh/"
            ssh $SSH_OPTS "${SSH_USER}@${agent_ip}" "chmod 600 ~/.ssh/id_ed25519"
            echo "  ✓ Copied ed25519 SSH key"
        elif [[ -f ~/.ssh/id_rsa ]]; then
            scp $SSH_OPTS ~/.ssh/id_rsa "${SSH_USER}@${agent_ip}:~/.ssh/"
            scp $SSH_OPTS ~/.ssh/id_rsa.pub "${SSH_USER}@${agent_ip}:~/.ssh/"
            ssh $SSH_OPTS "${SSH_USER}@${agent_ip}" "chmod 600 ~/.ssh/id_rsa"
            echo "  ✓ Copied RSA SSH key"
        else
            echo -e "  ${RED}❌ No authentication method available${NC}"
            continue
        fi
    else
        echo "  ✓ Found GitHub token in .env.local"
    fi

    # 2. Configure Git
    echo "  📋 Configuring Git..."
    if [[ -n "$GITHUB_TOKEN" ]]; then
        # Configure Git to use HTTPS with token
        ssh $SSH_OPTS "${SSH_USER}@${agent_ip}" bash <<EOF_GIT
            # Set git config
            git config --global user.name "Swarm Agent"
            git config --global user.email "swarm-agent@growth-mastery.local"

            # Configure credential helper to use token
            git config --global credential.helper store

            # Store GitHub credentials
            echo "https://${GITHUB_TOKEN}@github.com" > ~/.git-credentials
            chmod 600 ~/.git-credentials

            echo "✓ Configured Git with token authentication"
EOF_GIT
    else
        # Configure Git to use SSH
        ssh $SSH_OPTS "${SSH_USER}@${agent_ip}" bash <<'EOF_GIT'
            # Set git config
            git config --global user.name "Swarm Agent"
            git config --global user.email "swarm-agent@growth-mastery.local"

            # Add GitHub to known hosts
            ssh-keyscan github.com >> ~/.ssh/known_hosts 2>/dev/null || true

            echo "✓ Configured Git with SSH authentication"
EOF_GIT
    fi
    echo "  ✓ Git configuration complete"

    # 3. Clone or update repository
    echo "  📋 Setting up repository..."

    # Choose repo URL based on authentication method
    if [[ -n "$GITHUB_TOKEN" ]]; then
        REPO_URL="$REPO_URL_HTTPS"
    else
        REPO_URL="$REPO_URL_SSH"
    fi

    ssh $SSH_OPTS "${SSH_USER}@${agent_ip}" bash <<EOF_REPO
        WORKSPACE="$WORKSPACE_DIR"
        REPO_URL="$REPO_URL"

        if [[ -d "\$WORKSPACE/.git" ]]; then
            echo "    Repository exists, updating..."
            cd "\$WORKSPACE"

            # Fetch all branches
            git fetch --all --prune

            # List all remote branches
            echo "    Available branches:"
            git branch -r | head -5

            # Try to get development branch
            if git ls-remote --heads origin development | grep -q development; then
                echo "    Development branch exists on remote"
                git checkout development 2>/dev/null || git checkout -b development origin/development
                git pull origin development || true
            else
                echo "    No development branch on remote, checking main"
                git checkout main 2>/dev/null || git checkout -b main origin/main
                git pull origin main || true
            fi
        else
            echo "    Cloning repository..."
            mkdir -p "\$(dirname "\$WORKSPACE")"
            git clone "\$REPO_URL" "\$WORKSPACE"
            cd "\$WORKSPACE"

            # Fetch all branches
            git fetch --all

            # Checkout development if it exists
            if git ls-remote --heads origin development | grep -q development; then
                git checkout development
            fi
        fi

        # Create .swarm directory
        mkdir -p "\$WORKSPACE/.swarm"

        echo "    ✓ Repository ready"
EOF_REPO

    echo -e "  ${GREEN}✓ Agent $agent_ip is ready${NC}"
    echo ""

done <<< "$AGENT_IPS"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo -e "${GREEN}✅ Git Setup Complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Verify: ./scripts/swarm/swarm-health.sh"
echo "  2. Retry failed tasks: pnpm exec tsx scripts/swarm/orchestrator.ts .swarm/issues-127-128.yaml --retry 127,128"
echo ""
