# Data Model: Real Dokploy Docker Environment

**Feature**: 002-dokploy-docker-env
**Date**: 2025-10-29

## Entities

### DokployContainer

**Purpose**: Docker container running complete Dokploy installation

**Attributes**:
- Container name: `dokploy-dev`
- Base image: Ubuntu 22.04 LTS
- Exposed ports: 3000 (UI), 3001 (API), dynamic (deployed apps)
- Volumes: dokploy-data, dokploy-apps
- Docker socket: Mounted from host

**State Transitions**:
```
[Start] → installing (Dokploy setup runs)
installing → ready (Dokploy accessible)
ready → [Deploy App] → deploying
deploying → running (App deployed)
```

---

### DokployInstallation

**Purpose**: Represents Dokploy installation state

**Attributes**:
- Version: Latest stable from dokploy.com
- Installation status: pending, installing, ready, failed
- Web UI URL: http://localhost:3000
- API URL: http://localhost:3001
- Database: PostgreSQL (Dokploy's internal DB)

**Setup Process**:
1. Install Docker + Docker Compose
2. Install Git, Node.js
3. Run Dokploy install script
4. Configure admin user
5. Start Dokploy services

---

### DokployUser

**Purpose**: Admin user in Dokploy

**Attributes**:
- Email: Admin email
- API Keys: Generated keys for MCP access
- Permissions: Full admin access
- Projects: Owned projects

**Creation**: Via Dokploy web UI or API

---

### DeployedSupabaseInstance

**Purpose**: Real Supabase deployed by Dokploy

**Attributes**:
- Dokploy Application ID
- Project name
- Domain/subdomain
- Services: All Supabase services running in containers
- Environment variables: Real JWT keys, passwords
- Status: running, stopped, error

**Services**:
- PostgreSQL (port assigned by Dokploy)
- Auth, REST, Storage, Realtime, Studio
- Kong gateway
- All managed by Dokploy

---

## Data Flow

### Flow 1: Environment Startup

```
docker run dokploy-dev
↓
Ubuntu starts
↓
Dokploy install script runs automatically
↓
Dokploy services start (UI, API, database)
↓
Dokploy ready at localhost:3000
↓
User creates admin account in UI
↓
User generates API key
↓
MCP server configured with API key
```

### Flow 2: Supabase Deployment via MCP

```
MCP tool: dokploy_setup_wizard
Input: API key, project name, domain
↓
MCP connects to localhost:3001 (Dokploy API)
↓
Dokploy receives deployment request
↓
Dokploy uses Supabase template
↓
Dokploy creates containers for all Supabase services
↓
Dokploy assigns ports dynamically
↓
Supabase instance running
↓
MCP validates deployment
↓
Returns: Supabase URL + credentials
```

### Flow 3: Testing MCP Tools

```
Deployed Supabase at http://localhost:[port]
↓
MCP tool: connect (test PostgreSQL)
↓
MCP tool: execute_sql (run queries)
↓
MCP tool: dokploy_validate_config (check real config)
↓
MCP tool: dokploy_regenerate_keys (fix real bugs!)
↓
MCP tool: create_backup (backup real data)
↓
All 32 tools tested against real instance
```

---

## Persistence

### Dokploy Data
- Volume: `dokploy-data`
- Contains: Dokploy database, config, user data
- Persists across container restarts

### Deployed Applications
- Volume: `dokploy-apps`
- Contains: Application data, logs
- Managed by Dokploy

### Database Data
- Volume: Part of dokploy-apps
- PostgreSQL data for deployed Supabase
- Persists as long as Dokploy app exists

---

## Summary

Real Dokploy in Docker enables true E2E testing. All entities represent actual services, not mocks. MCP server tests against real deployments with real bugs and real fixes.
