# Quick Start: Real Dokploy Docker Environment

**Feature**: 002-dokploy-docker-env
**Purpose**: Get Dokploy running locally for E2E MCP testing

## Prerequisites

- Docker Desktop or Docker Engine (v20.10+)
- 16GB RAM (8GB minimum)
- 30GB free disk space
- Internet connection (for Dokploy installation)

## Quick Start (15 Minutes)

### Step 1: Build Dokploy Container (5 minutes)

```bash
# Build the Docker image (includes Dokploy installation)
docker build -t dokploy-dev -f docker/dokploy/Dockerfile docker/dokploy/

# This takes ~5 minutes (downloads Ubuntu, installs Dokploy)
```

### Step 2: Start Dokploy (2 minutes)

```bash
# Start container with Docker socket mounted
docker run -d \
  --name dokploy-dev \
  -p 3000:3000 \
  -p 3001:3001 \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v dokploy-data:/home/dokploy \
  dokploy-dev

# Wait for Dokploy to be ready
sleep 60
```

### Step 3: Access Dokploy UI (3 minutes)

```bash
# Open browser
open http://localhost:3000

# Create admin account:
# - Email: admin@local.test
# - Password: (your choice)

# Navigate to Settings → API Keys
# Generate new API key
# Copy the key
```

### Step 4: Configure MCP Server (2 minutes)

```bash
# Update .env
echo "DOKPLOY_API_URL=http://localhost:3001" >> .env
echo "DOKPLOY_API_KEY=<your-api-key>" >> .env

# Test connection
bun run dev
# MCP server should connect to Dokploy successfully
```

### Step 5: Deploy Supabase (3 minutes)

```bash
# In Claude Desktop, use MCP tool:
dokploy_setup_wizard({
  dokployApiUrl: "http://localhost:3001",
  dokployApiKey: "<your-api-key>",
  projectName: "test-supabase",
  domain: "supabase.local.test"
})

# Wait ~3 minutes
# Dokploy deploys REAL Supabase instance!
```

## Usage Scenarios

### Test Bug Detection

```bash
# Dokploy template will generate broken JWT keys
# (just like in production!)

# Use MCP tool: dokploy_validate_config
# Input: { applicationId: "<from deployment>" }
# Expected: Detects REAL bugs (identical keys, HTTP URLs)

# Use MCP tool: dokploy_regenerate_keys
# Input: { applicationId: "<id>" }
# Expected: Actually fixes the bugs in real Dokploy!
```

### Test All 32 Tools

```bash
# Database tools against deployed Supabase
connect, execute_sql, inspect_schema, monitor_connections

# Migration tools
list_migrations, apply_migration, cross_instance_migrate

# Backup tools
create_backup, restore_backup

# Monitoring
dokploy_monitor_health, dokploy_get_logs

# All work against REAL deployments!
```

## Troubleshooting

### Dokploy Won't Start

```bash
# Check logs
docker logs dokploy-dev

# Retry installation
docker rm dokploy-dev
docker run ... (restart)
```

### Can't Access UI

```bash
# Check Dokploy is running
docker exec dokploy-dev ps aux | grep dokploy

# Check port mapping
docker port dokploy-dev 3000
```

### Deployment Fails

```bash
# Check Dokploy logs in container
docker exec dokploy-dev journalctl -u dokploy -n 100

# Check via MCP tool
dokploy_get_logs({ containerId: "<id>" })
```

## Cleanup

```bash
# Stop container (keep data)
docker stop dokploy-dev

# Remove container (keep volumes)
docker rm dokploy-dev

# Remove everything
docker rm -f dokploy-dev
docker volume rm dokploy-data dokploy-apps
```

## Next Steps

1. Deploy multiple Supabase instances
2. Test cross-instance migration
3. Test backup/restore workflows
4. Validate all MCP tools
5. Document any bugs discovered
