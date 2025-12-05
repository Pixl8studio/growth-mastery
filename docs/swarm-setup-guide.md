# Swarm Setup Guide

Complete guide to setting up distributed Claude Code agents for parallel task execution.

## Overview

The swarm system consists of:
1. **Orchestrator** - Runs on your machine, distributes tasks
2. **Agents** - Claude Code instances on cloud VMs, execute tasks
3. **Configuration** - `~/.swarm/agents.yaml` defines your agents

```
Your Machine                    Cloud VMs
┌─────────────┐                ┌─────────────┐
│ /swarm cmd  │───────────────→│  Agent 1    │
│             │                └─────────────┘
│ Reads       │                ┌─────────────┐
│ agents.yaml │───────────────→│  Agent 2    │
│             │                └─────────────┘
│ Distributes │                ┌─────────────┐
│ tasks       │───────────────→│  Agent 3    │
└─────────────┘                └─────────────┘
```

## Quick Start

### 1. Choose Your Cloud Provider

**Oracle Cloud (Recommended)** - 4 ARM VMs free forever
- Best free tier available
- 24GB total RAM across 4 VMs
- Plenty for running Claude Code

**Other Options:**
- Google Cloud: 1 e2-micro VM (always free)
- AWS: 750 hours t2.micro/month (12 months)
- GitHub Codespaces: 60 hours/month

### 2. Provision VMs

#### Oracle Cloud Setup

1. Create Oracle Cloud account at cloud.oracle.com
2. Go to Compute → Instances → Create Instance
3. Choose:
   - **Image**: Oracle Linux 8 or Ubuntu 22.04
   - **Shape**: VM.Standard.A1.Flex (Ampere ARM)
   - **OCPUs**: 1 (can use up to 4 total across free tier)
   - **Memory**: 6 GB (can use up to 24 GB total)
4. Add your SSH key
5. Create instance
6. Note the public IP address
7. Repeat for additional instances (up to 4 free)

#### Security Group / Firewall

Open port 3847 for swarm communication:

**Oracle Cloud:**
```
VCN → Security Lists → Add Ingress Rule
- Source CIDR: 0.0.0.0/0 (or your IP for security)
- Destination Port: 3847
- Protocol: TCP
```

**Or on the VM:**
```bash
sudo firewall-cmd --permanent --add-port=3847/tcp
sudo firewall-cmd --reload
```

### 3. Install Agent on Each VM

SSH into each VM and run:

```bash
curl -fsSL https://raw.githubusercontent.com/TechNickAI/ai-coding-config/main/scripts/setup-remote-agent.sh | bash
```

This installs:
- Node.js via nvm
- Claude Code CLI
- ai-coding-config (for standards)
- Agent listener service

### 4. Authenticate Claude on Each VM

```bash
claude auth login
```

Follow the prompts to authenticate with your Anthropic account.

### 5. Set Up Git Access

Each agent needs to push to your repos. Choose one:

**Option A: SSH Key (Recommended)**
```bash
ssh-keygen -t ed25519 -C "swarm-agent-$(hostname)"
cat ~/.ssh/id_ed25519.pub
# Add this key to GitHub: Settings → SSH Keys
```

**Option B: GitHub Token**
```bash
gh auth login
# Follow prompts
```

### 6. Start the Agent

```bash
sudo systemctl start swarm-agent
sudo systemctl status swarm-agent
```

Verify it's running:
```bash
curl http://localhost:3847/status
# Should return: {"status":"idle","currentTask":null}
```

### 7. Configure Your Local Machine

Create `~/.swarm/agents.yaml`:

```bash
mkdir -p ~/.swarm
cp ~/.ai_coding_config/templates/swarm/agents.yaml.example ~/.swarm/agents.yaml
```

Edit with your VM IPs:

```yaml
agents:
  - name: oracle-arm-1
    host: 129.153.42.100    # Your VM's public IP
    
  - name: oracle-arm-2
    host: 129.153.42.101    # Your VM's public IP
```

### 8. Test the Connection

```bash
# Test each agent
curl http://129.153.42.100:3847/health
curl http://129.153.42.100:3847/status
```

### 9. Run Your First Swarm!

```bash
# From any project
/swarm-issues --dry-run

# Or with a manifest
/swarm work.yaml --local  # Test locally first
/swarm work.yaml          # Then distributed!
```

## Configuration Reference

### ~/.swarm/agents.yaml

```yaml
defaults:
  port: 3847              # Default agent port
  timeout: 60m            # Max task execution time
  health_check_interval: 30s

agents:
  - name: agent-1         # Unique identifier
    host: 1.2.3.4         # IP address or hostname
    port: 3847            # Optional, uses default if omitted
    description: "..."    # Human-readable description
    tags: [frontend]      # For task routing (optional)
    timeout: 120m         # Override default (optional)

preferences:
  strategy: least-busy    # round-robin, least-busy, random
```

### Agent Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/status` | GET | Returns idle/busy status |
| `/health` | GET | Health check |
| `/progress` | GET | Current task progress |
| `/execute` | POST | Submit a task |
| `/cancel` | POST | Cancel current task |

### Environment Variables (on agents)

| Variable | Default | Description |
|----------|---------|-------------|
| `SWARM_AGENT_PORT` | 3847 | Port to listen on |
| `CLAUDE_CODE_HEADLESS` | true | Run Claude in headless mode |

## Troubleshooting

### Agent won't start

```bash
# Check logs
sudo journalctl -u swarm-agent -f

# Common issues:
# - Node.js not in PATH: source ~/.bashrc
# - Port already in use: sudo lsof -i :3847
# - Claude not authenticated: claude auth login
```

### Can't connect to agent

```bash
# Check firewall
sudo firewall-cmd --list-ports

# Check if listening
sudo netstat -tlnp | grep 3847

# Check from your machine
curl -v http://AGENT_IP:3847/status
```

### Task fails with git error

```bash
# On the agent, verify git access:
ssh -T git@github.com

# If using HTTPS:
gh auth status
```

### Agent shows busy but stuck

```bash
# On the agent:
curl http://localhost:3847/cancel

# Or restart:
sudo systemctl restart swarm-agent
```

## Security Considerations

### Restrict Access

Don't expose agents to the entire internet. Options:

1. **IP Whitelist**: Only allow your IP in security group
2. **VPN**: Put agents on private network
3. **SSH Tunnel**: Access through SSH port forwarding

### API Key Security

- Claude API key is stored in agent's Claude config
- Git credentials stored in agent's git config
- Consider using separate Anthropic accounts for agents

### Audit Logging

Agent logs all tasks to `/var/log/swarm-agent.log` (when running via systemd).

## Cost Optimization

### Oracle Cloud Free Tier Limits

- 4 OCPUs total (use 1 per VM = 4 VMs)
- 24 GB RAM total (use 6 GB per VM)
- 200 GB block storage
- 10 TB/month outbound

### Minimize API Costs

- Agents use your Claude API credits
- Each task = one /autotask session
- Monitor usage at console.anthropic.com

### Pause When Not in Use

If using non-free tiers, stop VMs when not swarming:

```bash
# Oracle CLI
oci compute instance action --action STOP --instance-id <id>
```

## Advanced: Multiple Environments

### Production vs Development Agents

```yaml
# ~/.swarm/agents.yaml
agents:
  - name: prod-agent-1
    host: ...
    tags: [production]
    
  - name: dev-agent-1
    host: ...
    tags: [development]
```

Then in manifests:
```yaml
tasks:
  - id: prod-fix
    agent_hint: production
```

### Team Shared Agents

Point multiple team members at same agents:
1. Set up agents with shared credentials
2. Distribute `agents.yaml` to team
3. Coordinate usage (or use `least-busy` strategy)

## See Also

- [Swarm Command Reference](../commands/swarm.md)
- [Work Manifest Format](../context/swarm-work-manifest.md)
- [Agent Listener Source](../scripts/setup-remote-agent.sh)
