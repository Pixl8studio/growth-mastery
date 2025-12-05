#!/bin/bash

# Deploy Swarm Agents to All Remote VMs
# This script deploys the agent listener service to all configured agents

set -e

echo "🚀 Deploying Swarm Agents to All VMs"
echo ""

# Read agents from config
AGENTS_FILE=".swarm/agents.yaml"

if [ ! -f "$AGENTS_FILE" ]; then
    echo "❌ Error: agents.yaml not found at $AGENTS_FILE"
    exit 1
fi

# Agent 1
echo "═══════════════════════════════════════════════════════════"
echo "Deploying Agent 1"
echo "═══════════════════════════════════════════════════════════"
./scripts/swarm/deploy-agent.sh swarm-agent-1 ubuntu@132.145.99.215 3847

echo ""
echo "Waiting 5 seconds before deploying next agent..."
sleep 5
echo ""

# Agent 2
echo "═══════════════════════════════════════════════════════════"
echo "Deploying Agent 2"
echo "═══════════════════════════════════════════════════════════"
./scripts/swarm/deploy-agent.sh swarm-agent-2 ubuntu@129.159.161.94 3847

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "🎉 All Agents Deployed!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📝 Next steps:"
echo ""
echo "1. Start SSH tunnels:"
echo "   ./scripts/swarm/tunnel-agents.sh start"
echo ""
echo "2. Verify agents are healthy:"
echo "   curl http://localhost:3847/health  # Agent 1"
echo "   curl http://localhost:3848/health  # Agent 2"
echo ""
echo "3. Check agent status:"
echo "   curl http://localhost:3847/status  # Agent 1"
echo "   curl http://localhost:3848/status  # Agent 2"
echo ""
echo "4. Run your first distributed swarm:"
echo "   pnpm swarm test-issues-120-121.yaml --verbose"
echo ""
