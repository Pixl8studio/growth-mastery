#!/bin/bash
# Swarm Environment Loader
# ========================
# Loads agent configuration from .env.local and generates agents.yaml
#
# Usage:
#   source swarm-env-loader.sh        # Load env vars
#   swarm-env-loader.sh --generate    # Generate agents.yaml from env
#   swarm-env-loader.sh --list        # List configured agents

set -e

# Find .env.local (check current dir, then project root)
find_env_file() {
    if [[ -f ".env.local" ]]; then
        echo ".env.local"
    elif [[ -f "../.env.local" ]]; then
        echo "../.env.local"
    elif [[ -f "$(git rev-parse --show-toplevel 2>/dev/null)/.env.local" ]]; then
        echo "$(git rev-parse --show-toplevel)/.env.local"
    else
        echo ""
    fi
}

# Load environment variables from .env.local
load_env() {
    local env_file=$(find_env_file)
    
    if [[ -z "$env_file" ]]; then
        echo "No .env.local found" >&2
        return 1
    fi
    
    # Export variables (only CLAUDE_SWARM_* ones)
    while IFS='=' read -r key value; do
        # Skip comments and empty lines
        [[ "$key" =~ ^#.*$ ]] && continue
        [[ -z "$key" ]] && continue
        
        # Only load CLAUDE_SWARM_* variables
        if [[ "$key" == CLAUDE_SWARM_* ]]; then
            # Remove quotes from value
            value="${value%\"}"
            value="${value#\"}"
            value="${value%\'}"
            value="${value#\'}"
            
            export "$key=$value"
        fi
    done < "$env_file"
    
    echo "Loaded swarm config from: $env_file" >&2
}

# Get list of configured agent IPs
get_agent_ips() {
    local ips=()
    
    for i in {1..8}; do
        local var="CLAUDE_SWARM_${i}_IP"
        local ip="${!var}"
        
        if [[ -n "$ip" && "$ip" != "xx.xx.xx.xx" ]]; then
            ips+=("$ip")
        fi
    done
    
    echo "${ips[@]}"
}

# Get agent name for index
get_agent_name() {
    local index=$1
    local var="CLAUDE_SWARM_${index}_NAME"
    local name="${!var}"
    
    if [[ -n "$name" ]]; then
        echo "$name"
    else
        echo "swarm-agent-${index}"
    fi
}

# List all configured agents
list_agents() {
    load_env || return 1
    
    local port="${CLAUDE_SWARM_PORT:-3847}"
    
    echo "Configured Swarm Agents:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    printf "%-20s %-20s %-10s\n" "NAME" "IP" "PORT"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    local count=0
    for i in {1..8}; do
        local var="CLAUDE_SWARM_${i}_IP"
        local ip="${!var}"
        
        if [[ -n "$ip" && "$ip" != "xx.xx.xx.xx" ]]; then
            local name=$(get_agent_name $i)
            printf "%-20s %-20s %-10s\n" "$name" "$ip" "$port"
            ((count++))
        fi
    done
    
    echo ""
    echo "Total agents: $count"
}

# Generate agents.yaml from environment
generate_yaml() {
    load_env || return 1
    
    local port="${CLAUDE_SWARM_PORT:-3847}"
    local output="${1:-.swarm/agents.yaml}"
    
    # Create directory if needed
    mkdir -p "$(dirname "$output")"
    
    cat > "$output" << EOF
# Auto-generated from .env.local
# Generated: $(date -Iseconds)
# Regenerate with: swarm-env-loader.sh --generate

defaults:
  port: ${port}
  timeout: 60m

agents:
EOF

    for i in {1..8}; do
        local var="CLAUDE_SWARM_${i}_IP"
        local ip="${!var}"
        
        if [[ -n "$ip" && "$ip" != "xx.xx.xx.xx" ]]; then
            local name=$(get_agent_name $i)
            cat >> "$output" << EOF
  - name: ${name}
    host: ${ip}
    port: ${port}
EOF
        fi
    done

    echo "Generated: $output"
    echo ""
    cat "$output"
}

# Output agents as JSON (for scripts)
to_json() {
    load_env || return 1
    
    local port="${CLAUDE_SWARM_PORT:-3847}"
    
    echo "["
    local first=true
    for i in {1..8}; do
        local var="CLAUDE_SWARM_${i}_IP"
        local ip="${!var}"
        
        if [[ -n "$ip" && "$ip" != "xx.xx.xx.xx" ]]; then
            local name=$(get_agent_name $i)
            
            if [[ "$first" == "true" ]]; then
                first=false
            else
                echo ","
            fi
            
            echo -n "  {\"name\": \"${name}\", \"host\": \"${ip}\", \"port\": ${port}}"
        fi
    done
    echo ""
    echo "]"
}

# Main
case "${1:-}" in
    --generate|-g)
        generate_yaml "${2:-}"
        ;;
    --list|-l)
        list_agents
        ;;
    --json|-j)
        to_json
        ;;
    --help|-h)
        echo "Swarm Environment Loader"
        echo ""
        echo "Usage:"
        echo "  source swarm-env-loader.sh     # Load env vars into shell"
        echo "  swarm-env-loader.sh --list     # List configured agents"
        echo "  swarm-env-loader.sh --generate # Generate agents.yaml"
        echo "  swarm-env-loader.sh --json     # Output as JSON"
        echo ""
        echo "Environment Variables (in .env.local):"
        echo "  CLAUDE_SWARM_1_IP through CLAUDE_SWARM_8_IP"
        echo "  CLAUDE_SWARM_PORT (default: 3847)"
        echo "  CLAUDE_SWARM_N_NAME (optional custom names)"
        ;;
    "")
        # When sourced, just load env
        load_env
        ;;
    *)
        echo "Unknown option: $1"
        echo "Use --help for usage"
        exit 1
        ;;
esac
