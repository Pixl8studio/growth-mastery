# SSH Configuration for Swarm Agents

## Overview

SSH keys for Oracle Cloud VMs are managed and configured for easy access to swarm
agents.

## SSH Key Location

**Original Location**: `~/Documents/ssh/ssh-key-2025-12-05.key`

**Active Location**: `~/.ssh/oracle-cloud-key`

The keys have been copied from Documents/ssh to the standard SSH directory and
configured for use.

## SSH Config

SSH configuration is stored in `~/.ssh/config` with the following hosts configured:

### Named Hosts (Easy Access)

```bash
# Connect using friendly names
ssh swarm-agent-1
ssh swarm-agent-2
```

### Direct IP Access

```bash
# Or use IP addresses directly
ssh opc@132.145.99.215
ssh opc@129.159.161.94
```

## VM Details

| Agent Name    | IP Address     | SSH Config Name | Purpose        |
| ------------- | -------------- | --------------- | -------------- |
| swarm-agent-1 | 132.145.99.215 | swarm-agent-1   | Task execution |
| swarm-agent-2 | 129.159.161.94 | swarm-agent-2   | Task execution |

## Configuration Details

The SSH config includes:

- **IdentityFile**: Points to `~/.ssh/oracle-cloud-key`
- **StrictHostKeyChecking**: Set to `accept-new` (auto-accepts host keys on first
  connection)
- **ServerAliveInterval**: 60 seconds (keeps connection alive)
- **ServerAliveCountMax**: 3 (retries before giving up)

## Important Notes

1. **Key Permissions**:
   - Private key: `600` (read/write for owner only)
   - Public key: `644` (readable by all)
   - SSH config: `600` (read/write for owner only)

2. **Backup Location**: Original keys remain in `~/Documents/ssh/` as backup

3. **Security**: Never commit these keys to git. They are personal credentials.

## Testing Connection

Test SSH access to each VM:

```bash
# Test Agent 1
ssh swarm-agent-1 "echo 'Connected to Agent 1'"

# Test Agent 2
ssh swarm-agent-2 "echo 'Connected to Agent 2'"
```

## Troubleshooting

### Permission Denied

If you get "Permission denied", check:

1. Key permissions: `chmod 600 ~/.ssh/oracle-cloud-key`
2. Public key is installed on VM: `cat ~/.ssh/oracle-cloud-key.pub`
3. VM's authorized_keys contains your public key

### Host Key Verification Failed

If you get host key errors:

```bash
# Remove old host key
ssh-keygen -R 132.145.99.215
ssh-keygen -R 129.159.161.94

# The config will accept new keys automatically on next connection
```

### Connection Timeout

If connection times out:

1. Check VM is running in Oracle Cloud Console
2. Verify firewall rules allow SSH (port 22)
3. Check your local network/firewall

## Deployment Scripts

The deployment scripts automatically use this SSH configuration:

```bash
# Deploy single agent
./scripts/swarm/deploy-agent.sh swarm-agent-1 ubuntu@132.145.99.215 3847

# Deploy all agents
./scripts/swarm/deploy-all-agents.sh
```

## SSH Tunnels

SSH tunnels for agent communication are managed by:

```bash
# Start all tunnels
./scripts/swarm/tunnel-agents.sh start

# Check tunnel status
./scripts/swarm/tunnel-agents.sh status

# Stop all tunnels
./scripts/swarm/tunnel-agents.sh stop
```

Tunnels forward:

- `localhost:3847` → VM1:3847 (swarm-agent-1)
- `localhost:3848` → VM2:3847 (swarm-agent-2)

## Maintenance

### Updating Keys

If you need to regenerate or update keys:

1. Generate new key pair:

   ```bash
   ssh-keygen -t ed25519 -C "swarm-agents-$(date +%Y-%m-%d)" -f ~/Documents/ssh/new-key
   ```

2. Copy to .ssh directory:

   ```bash
   cp ~/Documents/ssh/new-key ~/.ssh/oracle-cloud-key
   chmod 600 ~/.ssh/oracle-cloud-key
   ```

3. Install public key on VMs:
   ```bash
   ssh-copy-id -i ~/.ssh/oracle-cloud-key.pub ubuntu@132.145.99.215
   ssh-copy-id -i ~/.ssh/oracle-cloud-key.pub ubuntu@129.159.161.94
   ```

### Key Rotation Schedule

- **Current Key Created**: 2025-12-04
- **Recommended Rotation**: Every 90 days
- **Next Rotation Due**: 2025-03-04

## Related Documentation

- [Swarm Agent Deployment Guide](./swarm-agent-deployment.md)
- [Swarm Setup Guide](./swarm-setup-guide.md)

---

_Last Updated: 2025-12-05_
