#!/bin/bash

# SSH Tunnel Setup for Swarm Agents
# Creates SSH tunnels to access agents through firewall
# Usage: ./scripts/swarm/tunnel-agents.sh [start|stop|status]

set -e

SSH_KEY="/Users/lawl3ss/Documents/ssh/ssh-key-2025-12-05.key"
SSH_USER="opc"

# Agent configurations
AGENT1_HOST="170.9.226.213"
AGENT1_LOCAL_PORT="3847"
AGENT1_REMOTE_PORT="3847"

AGENT2_HOST="170.9.237.208"
AGENT2_LOCAL_PORT="3848"  # Different local port to avoid conflict
AGENT2_REMOTE_PORT="3847"

PID_FILE_1="/tmp/swarm-tunnel-agent1.pid"
PID_FILE_2="/tmp/swarm-tunnel-agent2.pid"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

start_tunnel() {
    local host=$1
    local local_port=$2
    local remote_port=$3
    local pid_file=$4
    local name=$5

    # Check if already running
    if [[ -f "$pid_file" ]]; then
        local pid=$(cat "$pid_file")
        if ps -p "$pid" > /dev/null 2>&1; then
            echo -e "${YELLOW}⚠  Tunnel for $name already running (PID: $pid)${NC}"
            return 0
        fi
    fi

    # Start tunnel
    echo -e "${BLUE}🔗 Starting tunnel for $name...${NC}"
    ssh -f -N -L "${local_port}:localhost:${remote_port}" \
        -i "$SSH_KEY" \
        -o ConnectTimeout=10 \
        -o ServerAliveInterval=60 \
        -o ServerAliveCountMax=3 \
        "${SSH_USER}@${host}"

    # Get PID of the SSH tunnel
    local pid=$(pgrep -f "ssh.*${local_port}:localhost:${remote_port}.*${host}" | tail -1)
    echo "$pid" > "$pid_file"

    echo -e "${GREEN}✓ Tunnel started: localhost:${local_port} -> ${host}:${remote_port} (PID: $pid)${NC}"
}

stop_tunnel() {
    local pid_file=$1
    local name=$2

    if [[ -f "$pid_file" ]]; then
        local pid=$(cat "$pid_file")
        if ps -p "$pid" > /dev/null 2>&1; then
            echo -e "${BLUE}🔗 Stopping tunnel for $name (PID: $pid)...${NC}"
            kill "$pid"
            rm "$pid_file"
            echo -e "${GREEN}✓ Tunnel stopped${NC}"
        else
            echo -e "${YELLOW}⚠  Tunnel for $name not running${NC}"
            rm "$pid_file"
        fi
    else
        echo -e "${YELLOW}⚠  No PID file found for $name${NC}"
    fi
}

status_tunnel() {
    local pid_file=$1
    local name=$2
    local local_port=$3
    local host=$4

    if [[ -f "$pid_file" ]]; then
        local pid=$(cat "$pid_file")
        if ps -p "$pid" > /dev/null 2>&1; then
            echo -e "${GREEN}✓ $name: Running (PID: $pid)${NC}"
            echo -e "   localhost:${local_port} -> ${host}:3847"

            # Test connectivity
            if curl -s --connect-timeout 2 "http://localhost:${local_port}/health" > /dev/null 2>&1; then
                echo -e "   ${GREEN}Health check: OK${NC}"
            else
                echo -e "   ${YELLOW}Health check: Failed${NC}"
            fi
            return 0
        else
            echo -e "${RED}✗ $name: Not running${NC}"
            rm "$pid_file"
            return 1
        fi
    else
        echo -e "${RED}✗ $name: Not running${NC}"
        return 1
    fi
}

case "${1:-status}" in
    start)
        echo -e "${BLUE}🚀 Starting SSH Tunnels for Swarm Agents${NC}"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""

        start_tunnel "$AGENT1_HOST" "$AGENT1_LOCAL_PORT" "$AGENT1_REMOTE_PORT" "$PID_FILE_1" "swarm-agent-1"
        start_tunnel "$AGENT2_HOST" "$AGENT2_LOCAL_PORT" "$AGENT2_REMOTE_PORT" "$PID_FILE_2" "swarm-agent-2"

        echo ""
        echo -e "${GREEN}✅ All tunnels started!${NC}"
        echo ""
        echo "Access agents at:"
        echo "  - Agent 1: http://localhost:${AGENT1_LOCAL_PORT}"
        echo "  - Agent 2: http://localhost:${AGENT2_LOCAL_PORT}"
        echo ""
        echo "Test with: curl http://localhost:${AGENT1_LOCAL_PORT}/health"
        ;;

    stop)
        echo -e "${BLUE}🛑 Stopping SSH Tunnels${NC}"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""

        stop_tunnel "$PID_FILE_1" "swarm-agent-1"
        stop_tunnel "$PID_FILE_2" "swarm-agent-2"

        echo ""
        echo -e "${GREEN}✅ All tunnels stopped${NC}"
        ;;

    status)
        echo -e "${BLUE}📊 SSH Tunnel Status${NC}"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo ""

        status_tunnel "$PID_FILE_1" "swarm-agent-1" "$AGENT1_LOCAL_PORT" "$AGENT1_HOST"
        echo ""
        status_tunnel "$PID_FILE_2" "swarm-agent-2" "$AGENT2_LOCAL_PORT" "$AGENT2_HOST"
        ;;

    restart)
        $0 stop
        sleep 1
        $0 start
        ;;

    *)
        echo "Usage: $0 {start|stop|status|restart}"
        exit 1
        ;;
esac
