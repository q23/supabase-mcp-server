#!/bin/bash
set -e

# Supabase MCP Server Deployment Script
# Handles Docker and bare-metal deployments with zero-downtime

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_ROOT"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."

    if [ ! -f ".env" ]; then
        log_error ".env file not found!"
        log_info "Copy .env.example to .env and configure it first"
        exit 1
    fi

    # Check Docker
    if command -v docker &> /dev/null; then
        log_info "Docker found: $(docker --version)"
    else
        log_warn "Docker not found - will use PM2 deployment"
    fi
}

# Docker deployment
deploy_docker() {
    log_info "Deploying with Docker..."

    # Build
    log_info "Building Docker image..."
    docker-compose -f docker-compose.prod.yml build

    # Stop old container gracefully
    if docker ps -q -f name=supabase-mcp-server &> /dev/null; then
        log_info "Stopping existing container..."
        docker-compose -f docker-compose.prod.yml down
    fi

    # Start new container
    log_info "Starting new container..."
    docker-compose -f docker-compose.prod.yml up -d

    # Wait for health check
    log_info "Waiting for health check..."
    for i in {1..30}; do
        if curl -sf http://localhost:3000/health > /dev/null; then
            log_info "✅ Service is healthy!"
            docker-compose -f docker-compose.prod.yml ps
            return 0
        fi
        sleep 1
    done

    log_error "Health check failed after 30 seconds"
    docker-compose -f docker-compose.prod.yml logs --tail=50
    exit 1
}

# PM2 deployment
deploy_pm2() {
    log_info "Deploying with PM2..."

    # Check if PM2 is installed
    if ! command -v pm2 &> /dev/null; then
        log_info "Installing PM2..."
        npm install -g pm2
    fi

    # Build
    log_info "Building project..."
    npm install
    npm run build

    # Deploy with PM2
    if pm2 list | grep -q "supabase-mcp-server"; then
        log_info "Reloading existing process..."
        pm2 reload ecosystem.config.js
    else
        log_info "Starting new process..."
        pm2 start ecosystem.config.js
        pm2 save
    fi

    # Show status
    pm2 list
    pm2 logs supabase-mcp-server --lines 20 --nostream
}

# systemd deployment
deploy_systemd() {
    log_info "Deploying with systemd..."

    # Build
    log_info "Building project..."
    npm install
    npm run build

    # Copy systemd service
    sudo cp deployment/systemd/supabase-mcp-server.service /etc/systemd/system/
    sudo systemctl daemon-reload

    # Restart service
    if systemctl is-active --quiet supabase-mcp-server; then
        log_info "Restarting service..."
        sudo systemctl restart supabase-mcp-server
    else
        log_info "Starting service..."
        sudo systemctl enable supabase-mcp-server
        sudo systemctl start supabase-mcp-server
    fi

    # Show status
    sudo systemctl status supabase-mcp-server
}

# Main
main() {
    log_info "🚀 Supabase MCP Server Deployment"
    echo ""

    check_prerequisites

    # Determine deployment method
    if [ "${1:-}" = "docker" ] || [ -f "/.dockerenv" ]; then
        deploy_docker
    elif [ "${1:-}" = "pm2" ]; then
        deploy_pm2
    elif [ "${1:-}" = "systemd" ]; then
        deploy_systemd
    else
        # Auto-detect
        if command -v docker &> /dev/null; then
            deploy_docker
        elif command -v pm2 &> /dev/null; then
            deploy_pm2
        elif command -v systemctl &> /dev/null; then
            deploy_systemd
        else
            log_error "No deployment method available!"
            log_info "Install Docker, PM2, or systemd to deploy"
            exit 1
        fi
    fi

    echo ""
    log_info "✅ Deployment complete!"
    log_info "Server running at: http://localhost:3000"
    log_info "Health check: curl http://localhost:3000/health"
}

main "$@"
