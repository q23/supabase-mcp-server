# Real Dokploy Docker Environment

Complete Dokploy installation in Docker container for E2E testing of Supabase MCP Server.

## Quick Start

### Build & Run

```bash
# Build image (takes ~5 minutes)
docker build -t dokploy-dev docker/dokploy/

# Run container
./docker/dokploy/run.sh

# Access Dokploy UI
open http://localhost:3000
```

### Create Admin & API Key

1. Go to http://localhost:3000
2. Create admin account (email + password)
3. Navigate to Settings → API Keys
4. Generate new API key
5. Copy key for MCP server

### Configure MCP Server

```bash
# Add to .env
DOKPLOY_API_URL=http://localhost:3001
DOKPLOY_API_KEY=<your-key-from-ui>

# Test
bun run dev
```

### Deploy Supabase

Use MCP tool `dokploy_setup_wizard` with:
- dokployApiUrl: http://localhost:3001
- dokployApiKey: <your-key>
- projectName: test-supabase
- domain: supabase.local.test

Real Supabase deployed in ~3 minutes!

## Architecture

- **Base**: Ubuntu 22.04 LTS
- **Dokploy**: Installed via official script
- **Docker**: Host socket mounted
- **Ports**: 3000 (UI), 3001 (API), dynamic (apps)
- **Volumes**: dokploy-data (persistent)

## Testing All 32 MCP Tools

See [DOKPLOY-TESTING.md](../../docs/DOKPLOY-TESTING.md)
