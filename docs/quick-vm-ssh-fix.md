# Quick VM SSH Access Fix

## The Issue

SSH key at `~/Documents/ssh/ssh-key-2025-12-05.key` is not authorized on the Oracle
Cloud VMs yet.

## Key Information

**Fingerprint**: `SHA256:sO5aqURgDVKAqlysaNDVzRdTSzBdoyoSYHNjNbS1agY`

**Public Key** (needs to be on VMs):

```
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC9C8ndTiHCvmtlvLXvXvYHjScSytSH9eLFr8Iju7q6yl0kog4mPluQss/mZKtNFpudxUta+8u53FIUkogH9oSEHmvBjBrwGiZ1Jl6Kw8ht+5aeb8EaIUE4NkSY1gnx+4gQfKB4JkHKLqSXAPpEZbynIgTF4HSHUSexmW6oHuh1DV+9PBZRcJO539kVfsHyZN2G1s6v+CpGYzSl0nEvEktic71FZmZWYc/xK3MFo9JwFBsA/rKe4+suV8iRnBfhQl7BbsgvyCrgwa+nblThRxP2eVBaZ3Hat6ap8jwhyo9/BCr+RSy8MWsuglvyqa//jp8+eKb7wezlOyoxtwCI5ngj ssh-key-2025-12-05
```

## Quick Fix via Oracle Cloud Console

### For Each VM (132.145.99.215 and 129.159.161.94):

1. **Open Oracle Cloud Console** → Compute → Instances
2. **Click on the instance**
3. **Click "Console Connection"** (under Resources)
4. **Launch Cloud Shell Connection** or use the serial console
5. **Log in** as `opc`
6. **Run these commands**:

```bash
# Create .ssh directory if it doesn't exist
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Add the public key to authorized_keys
echo "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQC9C8ndTiHCvmtlvLXvXvYHjScSytSH9eLFr8Iju7q6yl0kog4mPluQss/mZKtNFpudxUta+8u53FIUkogH9oSEHmvBjBrwGiZ1Jl6Kw8ht+5aeb8EaIUE4NkSY1gnx+4gQfKB4JkHKLqSXAPpEZbynIgTF4HSHUSexmW6oHuh1DV+9PBZRcJO539kVfsHyZN2G1s6v+CpGYzSl0nEvEktic71FZmZWYc/xK3MFo9JwFBsA/rKe4+suV8iRnBfhQl7BbsgvyCrgwa+nblThRxP2eVBaZ3Hat6ap8jwhyo9/BCr+RSy8MWsuglvyqa//jp8+eKb7wezlOyoxtwCI5ngj ssh-key-2025-12-05" >> ~/.ssh/authorized_keys

# Set correct permissions
chmod 600 ~/.ssh/authorized_keys

# Verify it was added
cat ~/.ssh/authorized_keys
```

7. **Exit the console**
8. **Test SSH from your machine**:

```bash
ssh opc@132.145.99.215 "echo 'VM1 Connected'"
ssh opc@129.159.161.94 "echo 'VM2 Connected'"
```

## Alternative: Use Oracle's Instance Metadata

If console access isn't working, you can add the key via Oracle Cloud Console UI:

1. Go to your Instance details page
2. Click "Edit" at the top
3. Scroll to "Add SSH Keys"
4. Paste the public key above
5. Click "Save Changes"
6. Wait 1-2 minutes for it to propagate

## After SSH Works

Once SSH is working, deploy the agents:

```bash
# Deploy all agents at once
./scripts/swarm/deploy-all-agents.sh

# Or deploy individually
./scripts/swarm/deploy-agent.sh swarm-agent-1 opc@132.145.99.215 3847
./scripts/swarm/deploy-agent.sh swarm-agent-2 opc@129.159.161.94 3847
```

## Troubleshooting

If it still doesn't work:

1. **Check VMs are running** in Oracle Cloud Console
2. **Verify firewall allows SSH** (port 22)
3. **Check instance has public IP** assigned
4. **Try from different network** (some networks block outbound SSH)

## Quick Test

After adding the key, run this to test everything:

```bash
# Test SSH access
ssh swarm-agent-1 "echo 'Agent 1 OK'"
ssh swarm-agent-2 "echo 'Agent 2 OK'"

# If both work, proceed with deployment!
./scripts/swarm/deploy-all-agents.sh
```
