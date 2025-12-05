#!/bin/bash
# Setup script for Claude Code swarm agents on cloud VMs
# Tested on: Ubuntu 22.04 LTS, Oracle Linux 8, Debian 12
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/TechNickAI/ai-coding-config/main/scripts/setup-remote-agent.sh | bash
#
# What this script does:
#   1. Installs Node.js via nvm
#   2. Installs Claude Code CLI
#   3. Clones ai-coding-config for standards
#   4. Creates systemd service for agent listener
#   5. Opens firewall port for orchestrator communication
#
# After running:
#   1. Run 'claude auth login' to authenticate
#   2. Add SSH key for git operations
#   3. Start the agent: sudo systemctl start swarm-agent

set -e

echo "🚀 Setting up Claude Code Swarm Agent"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    echo "❌ Cannot detect OS"
    exit 1
fi

echo "📦 Detected OS: $OS"

# Install dependencies based on OS
echo "📦 Installing system dependencies..."
case $OS in
    ubuntu|debian)
        sudo apt-get update
        sudo apt-get install -y curl git build-essential
        ;;
    ol|rhel|centos|fedora)
        sudo dnf install -y curl git gcc-c++ make
        ;;
    *)
        echo "⚠️  Unknown OS, assuming dependencies are installed"
        ;;
esac

# Install nvm and Node.js
echo "📦 Installing Node.js via nvm..."
if [ ! -d "$HOME/.nvm" ]; then
    curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
fi

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

nvm install 20
nvm use 20
nvm alias default 20

echo "✅ Node.js $(node --version) installed"

# Install Claude Code CLI
echo "📦 Installing Claude Code CLI..."
npm install -g @anthropic-ai/claude-code

echo "✅ Claude Code CLI installed"

# Clone ai-coding-config
echo "📦 Cloning ai-coding-config..."
if [ ! -d "$HOME/.ai_coding_config" ]; then
    git clone https://github.com/TechNickAI/ai-coding-config.git "$HOME/.ai_coding_config"
else
    echo "   Already exists, pulling latest..."
    cd "$HOME/.ai_coding_config" && git pull
fi

echo "✅ ai-coding-config installed"

# Create agent listener script
echo "📦 Creating agent listener..."
mkdir -p "$HOME/.swarm"

cat > "$HOME/.swarm/agent-listener.js" << 'LISTENER_EOF'
#!/usr/bin/env node
/**
 * Swarm Agent Listener
 * 
 * Simple HTTP server that receives tasks from the swarm orchestrator
 * and executes them using Claude Code in headless mode.
 */

const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const PORT = process.env.SWARM_AGENT_PORT || 3847;
const STATE_FILE = path.join(process.env.HOME, '.swarm', 'agent-state.json');

let currentTask = null;
let taskProcess = null;

function loadState() {
    try {
        if (fs.existsSync(STATE_FILE)) {
            return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
        }
    } catch (e) {
        console.error('Failed to load state:', e.message);
    }
    return { status: 'idle', currentTask: null, completedTasks: [] };
}

function saveState(state) {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function getStatus() {
    const state = loadState();
    return {
        status: currentTask ? 'busy' : 'idle',
        currentTask: currentTask?.id || null,
        progress: currentTask?.progress || null,
        completedTasks: state.completedTasks?.length || 0
    };
}

async function executeTask(task) {
    const { id, prompt, branch, repo, baseBranch } = task;
    
    currentTask = { id, progress: 0, stage: 'starting' };
    saveState({ status: 'busy', currentTask: id });
    
    console.log(`\n🚀 Starting task: ${id}`);
    console.log(`   Branch: ${branch}`);
    console.log(`   Base: ${baseBranch || 'main'}`);
    
    // Create working directory
    const workDir = path.join(process.env.HOME, '.swarm', 'work', id);
    fs.mkdirSync(workDir, { recursive: true });
    
    try {
        // Clone repo if provided, otherwise assume current directory setup
        if (repo) {
            currentTask.stage = 'cloning';
            currentTask.progress = 10;
            
            await runCommand('git', ['clone', '--depth', '1', repo, workDir]);
        }
        
        // Create branch
        currentTask.stage = 'branching';
        currentTask.progress = 20;
        
        await runCommand('git', ['checkout', '-b', branch, baseBranch || 'main'], workDir);
        
        // Run Claude Code in headless mode
        currentTask.stage = 'executing';
        currentTask.progress = 30;
        
        const claudePrompt = `Execute this task autonomously and create a PR when done:\n\n${prompt}\n\nBranch: ${branch}`;
        
        taskProcess = spawn('claude', ['-p', claudePrompt, '--output-format', 'json'], {
            cwd: workDir,
            env: { ...process.env, CLAUDE_CODE_HEADLESS: 'true' }
        });
        
        let output = '';
        
        taskProcess.stdout.on('data', (data) => {
            output += data.toString();
            // Update progress based on output patterns
            if (output.includes('Writing')) currentTask.progress = 50;
            if (output.includes('Testing')) currentTask.progress = 70;
            if (output.includes('Committing')) currentTask.progress = 85;
            if (output.includes('Creating PR')) currentTask.progress = 95;
        });
        
        taskProcess.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
        });
        
        await new Promise((resolve, reject) => {
            taskProcess.on('close', (code) => {
                if (code === 0) resolve();
                else reject(new Error(`Claude exited with code ${code}`));
            });
        });
        
        currentTask.progress = 100;
        currentTask.stage = 'complete';
        
        // Extract PR URL from output if present
        const prMatch = output.match(/https:\/\/github\.com\/[^\s]+\/pull\/\d+/);
        const prUrl = prMatch ? prMatch[0] : null;
        
        const state = loadState();
        state.completedTasks = state.completedTasks || [];
        state.completedTasks.push({ id, prUrl, completedAt: new Date().toISOString() });
        saveState(state);
        
        console.log(`✅ Task complete: ${id}`);
        if (prUrl) console.log(`   PR: ${prUrl}`);
        
        currentTask = null;
        taskProcess = null;
        
        return { success: true, prUrl };
        
    } catch (error) {
        console.error(`❌ Task failed: ${id}`, error.message);
        
        currentTask = null;
        taskProcess = null;
        
        return { success: false, error: error.message };
    }
}

function runCommand(cmd, args, cwd) {
    return new Promise((resolve, reject) => {
        const proc = spawn(cmd, args, { cwd: cwd || process.env.HOME });
        let output = '';
        
        proc.stdout.on('data', (data) => { output += data.toString(); });
        proc.stderr.on('data', (data) => { output += data.toString(); });
        
        proc.on('close', (code) => {
            if (code === 0) resolve(output);
            else reject(new Error(`${cmd} failed: ${output}`));
        });
    });
}

const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    
    // CORS headers for dashboard
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // GET /status - Return agent status
    if (req.method === 'GET' && url.pathname === '/status') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(getStatus()));
        return;
    }
    
    // GET /progress - Return current task progress
    if (req.method === 'GET' && url.pathname === '/progress') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(currentTask || { status: 'idle' }));
        return;
    }
    
    // POST /execute - Execute a task
    if (req.method === 'POST' && url.pathname === '/execute') {
        if (currentTask) {
            res.writeHead(409, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Agent busy', currentTask: currentTask.id }));
            return;
        }
        
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
            try {
                const task = JSON.parse(body);
                
                if (!task.id || !task.prompt || !task.branch) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Missing required fields: id, prompt, branch' }));
                    return;
                }
                
                res.writeHead(202, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ accepted: true, taskId: task.id }));
                
                // Execute async (don't await - we already responded)
                executeTask(task).then(result => {
                    console.log(`Task ${task.id} result:`, result);
                });
                
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
        return;
    }
    
    // POST /cancel - Cancel current task
    if (req.method === 'POST' && url.pathname === '/cancel') {
        if (taskProcess) {
            taskProcess.kill('SIGTERM');
            currentTask = null;
            taskProcess = null;
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ cancelled: true }));
        } else {
            res.writeHead(404, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'No task running' }));
        }
        return;
    }
    
    // GET /health - Health check
    if (req.method === 'GET' && url.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ healthy: true, uptime: process.uptime() }));
        return;
    }
    
    // 404 for everything else
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🤖 Swarm Agent Listener`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`   Port: ${PORT}`);
    console.log(`   Status: http://localhost:${PORT}/status`);
    console.log(`   Health: http://localhost:${PORT}/health`);
    console.log(`\n   Waiting for tasks...`);
});
LISTENER_EOF

chmod +x "$HOME/.swarm/agent-listener.js"

echo "✅ Agent listener created"

# Create systemd service
echo "📦 Creating systemd service..."
sudo tee /etc/systemd/system/swarm-agent.service > /dev/null << SERVICE_EOF
[Unit]
Description=Claude Code Swarm Agent
After=network.target

[Service]
Type=simple
User=$USER
Environment=PATH=$HOME/.nvm/versions/node/v20.*/bin:/usr/local/bin:/usr/bin:/bin
Environment=NVM_DIR=$HOME/.nvm
Environment=HOME=$HOME
ExecStart=$HOME/.nvm/versions/node/v20.18.0/bin/node $HOME/.swarm/agent-listener.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
SERVICE_EOF

sudo systemctl daemon-reload
sudo systemctl enable swarm-agent

echo "✅ Systemd service created"

# Open firewall port
echo "📦 Configuring firewall..."
case $OS in
    ubuntu|debian)
        if command -v ufw &> /dev/null; then
            sudo ufw allow 3847/tcp
            echo "   Opened port 3847 (ufw)"
        fi
        ;;
    ol|rhel|centos|fedora)
        if command -v firewall-cmd &> /dev/null; then
            sudo firewall-cmd --permanent --add-port=3847/tcp
            sudo firewall-cmd --reload
            echo "   Opened port 3847 (firewalld)"
        fi
        ;;
esac

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Swarm Agent Setup Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Next steps:"
echo ""
echo "1. Authenticate Claude Code:"
echo "   claude auth login"
echo ""
echo "2. Add SSH key for git operations:"
echo "   ssh-keygen -t ed25519 -C 'swarm-agent'"
echo "   # Add public key to GitHub/GitLab"
echo ""
echo "3. Start the agent:"
echo "   sudo systemctl start swarm-agent"
echo ""
echo "4. Check status:"
echo "   curl http://localhost:3847/status"
echo ""
echo "5. Add to orchestrator (~/.swarm/agents.yaml):"
echo "   agents:"
echo "     - name: $(hostname)"
echo "       host: <this-vm-public-ip>"
echo "       port: 3847"
echo ""
