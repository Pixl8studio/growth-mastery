#!/bin/bash

# Deploy Swarm Agent to Remote VM
# Usage: ./deploy-agent.sh <agent-name> <ssh-host> <port>

set -e

AGENT_NAME="${1:-swarm-agent-1}"
SSH_HOST="${2:-ubuntu@132.145.99.215}"
AGENT_PORT="${3:-3847}"

echo "🚀 Deploying Swarm Agent: $AGENT_NAME"
echo "   Target: $SSH_HOST"
echo "   Port: $AGENT_PORT"
echo ""

# Get the repo name from git remote
REPO_NAME=$(basename -s .git $(git config --get remote.origin.url))

echo "📦 Step 1: Copying agent listener script to remote VM"
scp scripts/swarm/agent-listener.ts "$SSH_HOST:~/agent-listener.ts"

echo ""
echo "📦 Step 2: Setting up workspace on remote VM"
ssh "$SSH_HOST" bash <<EOF
set -e

WORKSPACE_PATH="\$HOME/swarm-workspace/$REPO_NAME"

echo "  → Creating workspace directory: \$WORKSPACE_PATH"
mkdir -p "\$WORKSPACE_PATH"
cd "\$WORKSPACE_PATH"

# Check if repo exists
if [ ! -d ".git" ]; then
    echo "  → Cloning repository"
    git clone $(git config --get remote.origin.url) .
else
    echo "  → Repository already cloned, pulling latest"
    git fetch --all
fi

# Install tsx globally if needed
if ! command -v tsx &> /dev/null; then
    echo "  → Installing tsx globally"
    npm install -g tsx
fi

# Install dependencies if needed
if [ -f "package.json" ]; then
    echo "  → Installing dependencies"
    if command -v pnpm &> /dev/null; then
        pnpm install
    elif command -v npm &> /dev/null; then
        npm install
    else
        echo "  ⚠️  Warning: No package manager found"
    fi
fi

# Move agent listener to workspace
echo "  → Moving agent listener script"
mkdir -p "\$WORKSPACE_PATH/scripts/swarm"
mv ~/agent-listener.ts "\$WORKSPACE_PATH/scripts/swarm/agent-listener.ts"
chmod +x "\$WORKSPACE_PATH/scripts/swarm/agent-listener.ts"

echo "  ✅ Workspace ready: \$WORKSPACE_PATH"
EOF

echo ""
echo "📦 Step 3: Creating systemd service"
ssh "$SSH_HOST" bash <<'OUTER_EOF'
# Get the actual user (not root)
ACTUAL_USER=$(who am i | awk '{print $1}')
WORKSPACE_PATH="/home/${ACTUAL_USER}/swarm-workspace/'$REPO_NAME'"

sudo bash <<EOF
set -e

# Create systemd service file
cat > /etc/systemd/system/swarm-agent-'$AGENT_NAME'.service <<SERVICE
[Unit]
Description=Swarm Agent - '$AGENT_NAME'
After=network.target

[Service]
Type=simple
User=${ACTUAL_USER}
WorkingDirectory=${WORKSPACE_PATH}
Environment="SWARM_AGENT_NAME='$AGENT_NAME'"
Environment="SWARM_AGENT_PORT='$AGENT_PORT'"
Environment="SWARM_WORKSPACE=${WORKSPACE_PATH}"
Environment="NODE_ENV=production"
ExecStart=/home/opc/.nvm/versions/node/v20.19.6/bin/npx tsx ${WORKSPACE_PATH}/scripts/swarm/agent-listener.ts
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
SERVICE

echo "  → Reloading systemd"
systemctl daemon-reload

echo "  → Enabling service"
systemctl enable swarm-agent-'$AGENT_NAME'

echo "  → Starting service"
systemctl start swarm-agent-'$AGENT_NAME'

echo "  ✅ Service started"
EOF
OUTER_EOF

echo ""
echo "📊 Step 4: Checking agent status"
sleep 2
ssh "$SSH_HOST" sudo systemctl status "swarm-agent-$AGENT_NAME" --no-pager || true

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Useful commands:"
echo "   Check status:  ssh $SSH_HOST sudo systemctl status swarm-agent-$AGENT_NAME"
echo "   View logs:     ssh $SSH_HOST sudo journalctl -u swarm-agent-$AGENT_NAME -f"
echo "   Restart:       ssh $SSH_HOST sudo systemctl restart swarm-agent-$AGENT_NAME"
echo "   Stop:          ssh $SSH_HOST sudo systemctl stop swarm-agent-$AGENT_NAME"
echo ""
echo "🧪 Test the agent:"
echo "   Start tunnel:  ssh -L $AGENT_PORT:localhost:$AGENT_PORT -N $SSH_HOST &"
echo "   Health check:  curl http://localhost:$AGENT_PORT/health"
echo "   Status check:  curl http://localhost:$AGENT_PORT/status"
