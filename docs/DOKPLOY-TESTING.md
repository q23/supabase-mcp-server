# Dokploy E2E Testing Guide

Complete guide for testing all 32 MCP tools against real Dokploy deployments.

## Prerequisites

- Dokploy container running (`docker/dokploy/run.sh`)
- Admin account created in Dokploy UI
- API key generated
- MCP server configured with API key

## Setup

```bash
# 1. Start Dokploy
./docker/dokploy/run.sh

# 2. Create admin in UI (http://localhost:3000)

# 3. Generate API key (Settings → API Keys)

# 4. Configure MCP
export DOKPLOY_API_URL=http://localhost:3001
export DOKPLOY_API_KEY=<your-key>
```

## Testing Strategy

### Phase 1: Deploy Supabase (US1 + US2)

**Tool**: `dokploy_setup_wizard`

Tests:
- Real Dokploy deployment ✅
- Real JWT key generation (will have bugs!) ✅
- Real container orchestration ✅

Expected: Supabase deployed in <15 min

### Phase 2: Validate & Fix (US1 + US2)

**Tools**: `dokploy_validate_config`, `dokploy_regenerate_keys`

Tests:
- Detect REAL Dokploy template bugs ✅
- Fix bugs in REAL deployment ✅
- Validate fix actually works ✅

Expected: Bugs detected and fixed successfully

### Phase 3: Database Operations (US3)

**Tools**: `connect`, `execute_sql`, `inspect_schema`, `monitor_connections`

Tests against deployed Supabase:
- Connection to real PostgreSQL ✅
- SQL execution with role management ✅
- Schema inspection ✅
- Pool monitoring ✅

Expected: All database operations work

### Phase 4: All Remaining Tools

Test all 32 tools systematically against the deployed instance.

## Troubleshooting

### Dokploy Not Accessible

```bash
docker logs dokploy-dev
docker exec -it dokploy-dev bash
# Check if Dokploy service is running
```

### Deployment Fails

Check Dokploy UI for error messages
Use `dokploy_get_logs` tool for details

### Port Conflicts

Change ports in run.sh:
```bash
-p 13000:3000 -p 13001:3001
```

## Cleanup

```bash
# Stop Dokploy
docker stop dokploy-dev

# Remove container (keeps data)
docker rm dokploy-dev

# Remove everything
docker rm -f dokploy-dev
docker volume rm dokploy-data
```
