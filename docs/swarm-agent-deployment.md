# Swarm Agent Deployment Guide

This guide walks you through deploying and testing the distributed swarm execution
system.

## Overview

The swarm system consists of:

1. **Orchestrator** (`scripts/swarm/orchestrator.ts`) - Runs on your local machine,
   distributes tasks
2. **Agent Listeners** (`scripts/swarm/agent-listener.ts`) - Run on remote VMs, execute
   tasks
3. **SSH Tunnels** - Securely connect orchestrator to agents through firewalls

## Architecture

```
Your Machine                    Remote VM 1                Remote VM 2
┌─────────────────┐            ┌─────────────────┐       ┌─────────────────┐
│  Orchestrator   │            │  Agent Listener │       │  Agent Listener │
│  (coordinator)  │            │  (task executor)│       │  (task executor)│
│                 │            │                 │       │                 │
│  localhost:3847 │◄─[tunnel]─►│  localhost:3847 │       │  localhost:3847 │
│  localhost:3848 │◄─[tunnel]──┼─────────────────┘       └─────────────────┘
└─────────────────┘            │  localhost:3848 │◄──[tunnel]───────────────┘
                               └─────────────────┘
```

## Prerequisites

### On Your Local Machine

- Node.js (v18+)
- pnpm or npm
- SSH access to remote VMs
- Git repository cloned locally

### On Remote VMs

Each VM needs:

- Ubuntu 22.04 or similar Linux distribution
- Node.js (v18+) and tsx installed globally
- Git configured with access to your repository
- SSH access (with your public key added)
- Sufficient disk space for repository and dependencies

### Quick VM Setup

If your VMs aren't set up yet, SSH into each one and run:

```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install tsx globally
sudo npm install -g tsx

# Install git if not present
sudo apt-get install -y git

# Configure git (use your info)
git config --global user.name "Your Name"
git config --global user.email "your-email@example.com"

# Generate SSH key for GitHub (if needed)
ssh-keygen -t ed25519 -C "your-email@example.com"
cat ~/.ssh/id_ed25519.pub  # Add this to GitHub

# Test GitHub access
ssh -T git@github.com
```

## Deployment Steps

### Step 1: Deploy Agent Listeners to VMs

Deploy to both agents at once:

```bash
./scripts/swarm/deploy-all-agents.sh
```

Or deploy individually:

```bash
# Deploy to agent 1
./scripts/swarm/deploy-agent.sh swarm-agent-1 ubuntu@132.145.99.215 3847

# Deploy to agent 2
./scripts/swarm/deploy-agent.sh swarm-agent-2 ubuntu@129.159.161.94 3847
```

This script will:

- Copy the agent listener to the VM
- Clone your repository to `~/swarm-workspace/`
- Install dependencies
- Create a systemd service
- Start the agent listener

### Step 2: Start SSH Tunnels

The tunnels forward agent ports to your local machine:

```bash
./scripts/swarm/tunnel-agents.sh start
```

This creates:

- `localhost:3847` → VM1:3847 (swarm-agent-1)
- `localhost:3848` → VM2:3847 (swarm-agent-2)

### Step 3: Verify Agent Health

Check that both agents are responding:

```bash
# Check agent 1
curl http://localhost:3847/health
# Expected: {"status":"healthy","agent":"swarm-agent-1"}

# Check agent 2
curl http://localhost:3848/health
# Expected: {"status":"healthy","agent":"swarm-agent-2"}
```

Check agent status (detailed info):

```bash
curl http://localhost:3847/status
curl http://localhost:3848/status
```

Expected response:

```json
{
  "agent_name": "swarm-agent-1",
  "status": "idle",
  "uptime_seconds": 123,
  "tasks_completed": 0,
  "tasks_failed": 0
}
```

## Running Distributed Tasks

### Basic Usage

Once agents are deployed and tunnels are running:

```bash
# Run with distributed execution (default)
pnpm swarm test-issues-120-121.yaml

# Run with verbose logging
pnpm swarm test-issues-120-121.yaml --verbose

# Force local execution (no agents)
pnpm swarm test-issues-120-121.yaml --local

# Dry run (plan only)
pnpm swarm test-issues-120-121.yaml --dry-run
```

### What Happens During Execution

1. **Orchestrator starts** and loads agent configuration from `.swarm/agents.yaml`
2. **Health checks** all agents to confirm availability
3. **Tasks are distributed**:
   - Orchestrator picks an idle agent
   - Sends task request via HTTP POST to agent's `/execute` endpoint
   - Agent clones branch, executes task, commits changes
   - Agent reports success/failure back
4. **Orchestrator continues** with next task, picking another idle agent
5. **Final report** generated in `.swarm/reports/`

## Monitoring & Troubleshooting

### Check Agent Logs (on remote VM)

```bash
# SSH into VM
ssh ubuntu@132.145.99.215

# View live logs
sudo journalctl -u swarm-agent-swarm-agent-1 -f

# View last 100 lines
sudo journalctl -u swarm-agent-swarm-agent-1 -n 100
```

### Check Agent Service Status

```bash
# From your machine via SSH
ssh ubuntu@132.145.99.215 sudo systemctl status swarm-agent-swarm-agent-1

# Or SSH in and check
ssh ubuntu@132.145.99.215
sudo systemctl status swarm-agent-swarm-agent-1
```

### Restart Agent Service

```bash
ssh ubuntu@132.145.99.215 sudo systemctl restart swarm-agent-swarm-agent-1
```

### Stop Agent Service

```bash
ssh ubuntu@132.145.99.215 sudo systemctl stop swarm-agent-swarm-agent-1
```

### Check Tunnel Status

```bash
./scripts/swarm/tunnel-agents.sh status
```

### Restart Tunnels

```bash
./scripts/swarm/tunnel-agents.sh stop
./scripts/swarm/tunnel-agents.sh start
```

### Common Issues

#### "Agent is offline" in orchestrator

**Cause**: Tunnel not running or agent service not started

**Fix**:

```bash
# Check tunnel
./scripts/swarm/tunnel-agents.sh status

# Start tunnel if needed
./scripts/swarm/tunnel-agents.sh start

# Check agent service
ssh ubuntu@132.145.99.215 sudo systemctl status swarm-agent-swarm-agent-1

# Start service if needed
ssh ubuntu@132.145.99.215 sudo systemctl start swarm-agent-swarm-agent-1
```

#### "Connection refused" when testing health

**Cause**: Agent service not running

**Fix**:

```bash
# Check service
ssh ubuntu@132.145.99.215 sudo systemctl status swarm-agent-swarm-agent-1

# View logs for errors
ssh ubuntu@132.145.99.215 sudo journalctl -u swarm-agent-swarm-agent-1 -n 50

# Restart service
ssh ubuntu@132.145.99.215 sudo systemctl restart swarm-agent-swarm-agent-1
```

#### "Not a git repository" error in agent logs

**Cause**: Workspace not properly initialized

**Fix**:

```bash
ssh ubuntu@132.145.99.215

# Check if repo exists
ls -la ~/swarm-workspace/Growth-Mastery

# If not, clone it
cd ~/swarm-workspace
git clone git@github.com:yourusername/Growth-Mastery.git

# Update agent service with correct path
sudo systemctl restart swarm-agent-swarm-agent-1
```

#### Task execution timeout

**Cause**: Task taking longer than 30 minutes

**Fix**: Edit `agent-listener.ts` and increase `MAX_TASK_TIMEOUT`:

```typescript
const MAX_TASK_TIMEOUT = 60 * 60 * 1000; // 60 minutes
```

Then redeploy:

```bash
./scripts/swarm/deploy-agent.sh swarm-agent-1 ubuntu@132.145.99.215 3847
```

## Testing the Full System

### Test 1: Manual Task Execution

Send a test task to an agent:

```bash
curl -X POST http://localhost:3847/execute \
  -H "Content-Type: application/json" \
  -d '{
    "task_id": "test-1",
    "prompt": "Add a comment to README.md saying this was tested",
    "branch": "test/agent-execution-1",
    "base_branch": "main"
  }'
```

Expected response (after task completes):

```json
{
  "success": true,
  "duration_ms": 12500
}
```

### Test 2: Run Simple Manifest

Create a test manifest:

```yaml
# test-simple.yaml
name: "Simple Test"
base_branch: main
tasks:
  - id: "test-task-1"
    prompt: "Add a test file at test-output-1.txt with content 'Hello from swarm!'"
    branch: "test/swarm-output-1"
```

Run it:

```bash
pnpm swarm test-simple.yaml --verbose
```

### Test 3: Run Your Real Manifest

```bash
pnpm swarm test-issues-120-121.yaml --verbose
```

Watch the orchestrator distribute tasks across agents!

## Performance Expectations

With 2 agents running in parallel:

- **2 tasks**: ~2x faster than local (both run simultaneously)
- **4 tasks**: ~2x faster than local (2 batches of 2)
- **10 tasks**: ~2x faster than local (5 batches of 2)

With more agents (if you add more VMs):

- **4 agents**: ~4x faster for 4+ tasks
- **8 agents**: ~8x faster for 8+ tasks

## Scaling Up

### Adding More Agents

1. **Get another VM** (Oracle Cloud, AWS, etc.)

2. **Add to `.swarm/agents.yaml`**:

```yaml
agents:
  - name: swarm-agent-3
    host: localhost
    port: 3849
    status_endpoint: /status
    execute_endpoint: /execute
    enabled: true
```

3. **Deploy the agent**:

```bash
./scripts/swarm/deploy-agent.sh swarm-agent-3 ubuntu@NEW-VM-IP 3847
```

4. **Add tunnel to `tunnel-agents.sh`**:

```bash
# Add this line in the start section
ssh -f -N -L 3849:localhost:3847 ubuntu@NEW-VM-IP
```

5. **Restart everything**:

```bash
./scripts/swarm/tunnel-agents.sh restart
pnpm swarm your-manifest.yaml --verbose
```

## Cost Analysis

### Free Tier Options

- **Oracle Cloud**: 2 free VMs forever (ARM-based, 4 OCPU, 24 GB RAM each)
- **AWS**: 12 months free (t2.micro, less powerful)
- **Google Cloud**: $300 credit, 90 days

### Recommended Setup

For most projects:

- **2-4 agents**: Good balance of speed and cost
- **Oracle Cloud Free Tier**: Best value (powerful + free)
- **Run when needed**: Start/stop services to save resources

## Next Steps

1. ✅ Deploy agents (you're here!)
2. ✅ Test with simple manifest
3. 🚀 Run your real workload
4. 📊 Monitor performance and logs
5. 🎯 Scale up as needed

## Support

If you encounter issues:

1. Check agent logs: `ssh VM sudo journalctl -u swarm-agent-NAME -f`
2. Check tunnel status: `./scripts/swarm/tunnel-agents.sh status`
3. Test health endpoints: `curl localhost:3847/health`
4. Review this guide's troubleshooting section

Happy swarming! 🐝
