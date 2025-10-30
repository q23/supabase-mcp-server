#!/bin/bash

# Supabase MCP Server Monitoring Script
# Checks server health and sends alerts if down

# Configuration
HEALTH_URL="${HEALTH_URL:-http://localhost:3000/health}"
ALERT_WEBHOOK="${ALERT_WEBHOOK:-}"  # Slack/Discord webhook
MAX_RETRIES=3
RETRY_DELAY=5

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

log_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

# Send alert
send_alert() {
    local message="$1"
    local severity="${2:-warning}"

    log_error "$message"

    if [ -n "$ALERT_WEBHOOK" ]; then
        curl -X POST "$ALERT_WEBHOOK" \
            -H 'Content-Type: application/json' \
            -d "{
                \"text\": \"🚨 MCP Server Alert\",
                \"blocks\": [{
                    \"type\": \"section\",
                    \"text\": {
                        \"type\": \"mrkdwn\",
                        \"text\": \"*Severity:* $severity\n*Message:* $message\n*Time:* $(date)\"
                    }
                }]
            }" 2>/dev/null
    fi
}

# Check health
check_health() {
    local retries=0

    while [ $retries -lt $MAX_RETRIES ]; do
        response=$(curl -sf "$HEALTH_URL" 2>&1)
        exit_code=$?

        if [ $exit_code -eq 0 ]; then
            # Parse JSON response
            if echo "$response" | grep -q '"status":"healthy"'; then
                log_info "✅ Server is healthy"

                # Extract metrics
                sessions=$(echo "$response" | grep -o '"sessions":[0-9]*' | cut -d: -f2)
                log_info "Active sessions: $sessions"

                return 0
            else
                log_error "❌ Server responded but not healthy: $response"
                retries=$((retries + 1))
            fi
        else
            log_error "❌ Health check failed (attempt $((retries + 1))/$MAX_RETRIES)"
            retries=$((retries + 1))
        fi

        if [ $retries -lt $MAX_RETRIES ]; then
            sleep $RETRY_DELAY
        fi
    done

    return 1
}

# Attempt restart
attempt_restart() {
    log_info "Attempting to restart server..."

    # Try Docker first
    if docker ps -q -f name=supabase-mcp-server &> /dev/null; then
        log_info "Restarting Docker container..."
        docker restart supabase-mcp-server
        sleep 10
        return 0
    fi

    # Try PM2
    if command -v pm2 &> /dev/null && pm2 list | grep -q "supabase-mcp-server"; then
        log_info "Restarting PM2 process..."
        pm2 restart supabase-mcp-server
        sleep 5
        return 0
    fi

    # Try systemd
    if systemctl is-active --quiet supabase-mcp-server; then
        log_info "Restarting systemd service..."
        sudo systemctl restart supabase-mcp-server
        sleep 5
        return 0
    fi

    log_error "Could not find running server to restart"
    return 1
}

# Main monitoring loop
main() {
    log_info "🔍 MCP Server Health Monitor"
    log_info "Checking: $HEALTH_URL"
    echo ""

    if ! check_health; then
        send_alert "Server health check failed after $MAX_RETRIES attempts" "critical"

        # Auto-restart if enabled
        if [ "${AUTO_RESTART:-false}" = "true" ]; then
            if attempt_restart; then
                log_info "Restart initiated, waiting 10s..."
                sleep 10

                if check_health; then
                    send_alert "Server successfully restarted" "info"
                else
                    send_alert "Server restart failed - manual intervention required" "critical"
                    exit 1
                fi
            else
                send_alert "Could not restart server - manual intervention required" "critical"
                exit 1
            fi
        else
            exit 1
        fi
    fi

    log_info "✅ All checks passed"
}

# Run as cron job or continuous monitoring
if [ "${CONTINUOUS:-false}" = "true" ]; then
    log_info "Starting continuous monitoring (interval: ${INTERVAL:-60}s)"
    while true; do
        main
        sleep "${INTERVAL:-60}"
    done
else
    main
fi
