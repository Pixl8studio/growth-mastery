#!/bin/bash
# Swarm Monitor - Watch all your agents in real-time
# Usage: ./swarm-monitor.sh [--once]
#
# Reads agents from ~/.swarm/agents.yaml and displays status

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Config
AGENTS_FILE="${HOME}/.swarm/agents.yaml"
REFRESH_INTERVAL=5

# Parse arguments
ONCE=false
if [[ "$1" == "--once" ]]; then
    ONCE=true
fi

# Check for agents config
if [[ ! -f "$AGENTS_FILE" ]]; then
    echo -e "${RED}Error: No agents configured${NC}"
    echo "Create ~/.swarm/agents.yaml with your agent definitions"
    echo ""
    echo "Example:"
    echo "  agents:"
    echo "    - name: oracle-arm-1"
    echo "      host: 129.153.42.100"
    echo "      port: 3847"
    exit 1
fi

# Extract agents from YAML (simple parsing)
get_agents() {
    grep -A2 "^\s*- name:" "$AGENTS_FILE" 2>/dev/null | \
    awk '
        /- name:/ { name=$3 }
        /host:/ { host=$2 }
        /port:/ { port=$2; if(port=="") port=3847; print name","host","port }
    ' | grep -v "^,,"
}

# Query agent status
query_agent() {
    local name=$1
    local host=$2
    local port=$3
    
    local url="http://${host}:${port}/status"
    local response
    
    response=$(curl -s --connect-timeout 3 --max-time 5 "$url" 2>/dev/null) || {
        echo "offline|||"
        return
    }
    
    # Parse JSON response (simple parsing)
    local status=$(echo "$response" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
    local task=$(echo "$response" | grep -o '"currentTask":"[^"]*"' | cut -d'"' -f4)
    local progress=$(echo "$response" | grep -o '"progress":[0-9]*' | cut -d':' -f2)
    
    echo "${status:-unknown}|${task:-}|${progress:-}"
}

# Display dashboard
display_dashboard() {
    clear
    
    echo -e "${BOLD}${CYAN}"
    echo "┌─────────────────────────────────────────────────────────────┐"
    echo "│                    🚀 SWARM MONITOR                         │"
    echo "└─────────────────────────────────────────────────────────────┘"
    echo -e "${NC}"
    
    local agents=$(get_agents)
    local total=0
    local online=0
    local busy=0
    
    echo -e "${BOLD}AGENTS${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    printf "%-15s %-20s %-10s %-20s %s\n" "NAME" "HOST" "STATUS" "TASK" "PROGRESS"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    while IFS=',' read -r name host port; do
        [[ -z "$name" ]] && continue
        
        ((total++))
        
        local result=$(query_agent "$name" "$host" "$port")
        local status=$(echo "$result" | cut -d'|' -f1)
        local task=$(echo "$result" | cut -d'|' -f2)
        local progress=$(echo "$result" | cut -d'|' -f3)
        
        local status_color=$RED
        local status_icon="❌"
        
        case "$status" in
            "idle")
                status_color=$GREEN
                status_icon="🟢"
                ((online++))
                ;;
            "busy")
                status_color=$YELLOW
                status_icon="🔵"
                ((online++))
                ((busy++))
                ;;
            "offline")
                status_color=$RED
                status_icon="🔴"
                ;;
            *)
                status_color=$RED
                status_icon="❓"
                ;;
        esac
        
        local progress_bar=""
        if [[ -n "$progress" && "$progress" -gt 0 ]]; then
            local filled=$((progress / 5))
            local empty=$((20 - filled))
            progress_bar="["
            for ((i=0; i<filled; i++)); do progress_bar+="█"; done
            for ((i=0; i<empty; i++)); do progress_bar+="░"; done
            progress_bar+="] ${progress}%"
        fi
        
        printf "%-15s %-20s ${status_color}%-10s${NC} %-20s %s\n" \
            "$name" "$host:$port" "$status_icon $status" "${task:--}" "$progress_bar"
            
    done <<< "$agents"
    
    echo ""
    echo -e "${BOLD}SUMMARY${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "Total Agents: ${BOLD}$total${NC}  |  Online: ${GREEN}$online${NC}  |  Busy: ${YELLOW}$busy${NC}  |  Available: ${GREEN}$((online - busy))${NC}"
    echo ""
    
    if [[ "$ONCE" == "false" ]]; then
        echo -e "${CYAN}Refreshing every ${REFRESH_INTERVAL}s... Press Ctrl+C to exit${NC}"
    fi
}

# Main loop
if [[ "$ONCE" == "true" ]]; then
    display_dashboard
else
    while true; do
        display_dashboard
        sleep $REFRESH_INTERVAL
    done
fi
