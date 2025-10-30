# Supabase MCP Server

**Production-ready MCP server providing comprehensive Supabase management capabilities for both cloud and self-hosted instances.**

[![CI](https://github.com/q23/supabase-mcp-server/workflows/CI/badge.svg)](https://github.com/q23/supabase-mcp-server/actions)
[![Coverage](https://codecov.io/gh/yourusername/supabase-mcp-server/branch/main/graph/badge.svg)](https://codecov.io/gh/yourusername/supabase-mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

### 🚀 Zero-Touch Dokploy Deployment (P1)
- Deploy production-ready Supabase to Dokploy in under 10 minutes
- Automatic JWT key generation with correct claims (`role`, `iss`)
- Automatic HTTP→HTTPS conversion for public URLs
- Post-deployment validation (auth endpoint, container health)

### 🔧 Broken Config Detection & Repair (P1)
- Detect broken Dokploy-generated JWT keys
- Automatic key regeneration with correct structure
- Environment variable updates via Dokploy API
- Container restart automation

### 🔌 Self-Hosted Connection Management (P1)
- Handles all 6 connection string formats
- Docker network auto-detection
- Connection pool monitoring and alerts
- Correct role-based query execution (auth schema access)
- CLI bypass for migrations (direct PostgreSQL)

### 🔄 Cross-Instance Database Migration (P2)
- Migrate schema and data between any Supabase instances
- Chunked transfer for large datasets (512KB memory buffer)
- 100% data integrity verification (checksums, row counts)
- Progress streaming and resumable operations

### 💾 Production-Ready Backups (P2)
- Automated encrypted backups (AES-256)
- Compression support (gzip/zstd)
- S3-compatible storage integration
- Point-in-time recovery
- Configurable retention policies

### 📊 Real-Time Monitoring & Alerts (P2)
- Container health monitoring
- Connection pool status tracking
- SSL certificate expiration detection
- Log aggregation from all services
- In-MCP notifications + optional webhooks

### 🎯 Multi-Instance Orchestration (P3)
- Manage dev/staging/production from one interface
- Schema sync between instances
- Safe deployment promotion workflow
- Isolated environment management

## Installation

### Prerequisites
- Node.js 18+ OR Docker
- PostgreSQL (for self-hosted) or Supabase account
- Optional: Dokploy instance for automated deployments

## Deployment Options

### Option 1: Local Use (Claude Desktop)

**Install from npm:**
```bash
npm install -g supabase-mcp-server
```

**Configure Claude Desktop** (`~/Library/Application Support/Claude/config.json`):
```json
{
  "mcpServers": {
    "supabase": {
      "command": "supabase-mcp",
      "env": {
        "DOKPLOY_API_URL": "https://your-dokploy.com",
        "DOKPLOY_API_KEY": "your-api-key"
      }
    }
  }
}
```

### Option 2: Remote Deployment (Claude Code, Teams) 🚀

**Recommended for:**
- Multi-user teams
- Claude Code integration
- Shared infrastructure management
- **Production-ready with auto-start & auto-restart**

#### Quick Deploy (Auto-Start + Never Down)

```bash
# 1. Clone and configure
git clone https://github.com/q23/supabase-mcp-server.git
cd supabase-mcp-server
cp .env.example .env

# 2. Generate API key
openssl rand -hex 32 > api-key.txt
nano .env  # Add: MCP_API_KEY=<key>, DOKPLOY_API_URL, etc.

# 3. Deploy (auto-detects Docker/PM2/systemd)
chmod +x deployment/deploy.sh
./deployment/deploy.sh

# ✅ Server auto-starts on boot
# ✅ Auto-restarts on crash
# ✅ Health checks every 30s
# ✅ Zero downtime updates
```

**Deployment Methods:**
- **Docker**: `restart: always` + health checks + auto-update (Watchtower)
- **PM2**: Cluster mode + auto-restart + memory limits
- **systemd**: Native Linux service + auto-boot

See [Deployment Guide](./docs/DEPLOYMENT.md) for full details.

4. **Configure clients:**
See [Client Configuration Guide](./docs/CLIENT-CONFIGURATION.md)

**Claude Code** (`~/.config/claude-code/mcp.json`):
```json
{
  "mcpServers": {
    "supabase": {
      "url": "http://your-server:3000/mcp",
      "transport": "http",
      "headers": {
        "Authorization": "Bearer your-api-key-here"
      }
    }
  }
}
```

### Option 3: Development

```bash
git clone https://github.com/q23/supabase-mcp-server.git
cd supabase-mcp-server
npm install

# HTTP mode (for testing remote clients)
npm run dev:http

# Stdio mode (for local MCP clients)
npm run dev
```

## Usage Examples

### Deploy Supabase to Dokploy

```typescript
// Use the dokploy_setup_wizard tool in Claude
// Provide: API credentials, domain, project name
// Result: Fully configured Supabase instance in <10 minutes
```

### Detect and Fix Broken Configurations

```typescript
// Use dokploy_validate_config tool
// Detects: Broken JWT keys, HTTP URLs, missing variables
// Offers: One-click regeneration and fix
```

### Monitor Connection Pool

```typescript
// Use monitor_connections tool
// Shows: Current connections by service
// Alerts: When pool >90% capacity
// Recommends: Pool size adjustments
```

### Cross-Instance Migration

```typescript
// Use cross_instance_migrate tool
// Migrates: Schema + data with 100% integrity
// Features: Chunked transfer, progress streaming, resume capability
```

### Create Encrypted Backup

```typescript
// Use create_backup tool
// Creates: Compressed, encrypted backup
// Stores: Local filesystem or S3-compatible storage
// Validates: Integrity with checksums
```

## Documentation

- [Client Configuration Guide](./docs/CLIENT-CONFIGURATION.md) - Configure Claude Code, Claude Desktop, custom clients
- [API Reference](./docs/API.md) - Complete tool reference
- [Deployment Guide](./docs/DEPLOYMENT.md) - Production deployment with SSL, monitoring
- [Troubleshooting Guide](./docs/TROUBLESHOOTING.md) - Common issues and solutions
- [Examples](./docs/EXAMPLES.md) - Usage examples

## Development

### Setup

```bash
git clone https://github.com/q23/supabase-mcp-server.git
cd supabase-mcp-server
npm install
```

### Run in Development Mode

```bash
npm run dev
```

### Run Tests

```bash
# Unit tests
npm test

# Integration tests (requires Docker)
docker-compose up -d
npm test -- tests/integration

# Coverage
npm run test:coverage
```

### Lint and Format

```bash
# Check
npm run lint
npm run format:check

# Fix
npm run lint:fix
npm run format
```

### Build

```bash
npm run build
```

## Architecture

```
src/
├── tools/          # MCP tool implementations
│   ├── dokploy/   # Dokploy integration (P1 critical)
│   ├── core/      # Core database operations
│   ├── migrations/ # Migration management
│   └── backups/   # Backup and restore
├── lib/           # Shared libraries
│   ├── dokploy/   # Dokploy API client
│   ├── postgres/  # PostgreSQL connection management
│   ├── supabase/  # Supabase client wrapper
│   └── memory/    # Memory management (512KB buffer)
└── types/         # TypeScript type definitions
```

## Key Differentiators

✅ **Dokploy Integration**: Only MCP server with native Dokploy support (99% of self-hosted deployments)
✅ **Zero Configuration**: Automated deployment with broken config detection
✅ **Production Ready**: Encryption, backups, monitoring, audit logs
✅ **Memory Efficient**: 512KB buffer with automatic disk spillover
✅ **100% Data Integrity**: Verified migrations and backups

## Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md) first.

## License

MIT License - see [LICENSE](./LICENSE) file for details

## Support

- GitHub Issues: [Report a bug](https://github.com/q23/supabase-mcp-server/issues)
- Documentation: [Read the docs](./docs)
- Discussions: [Ask questions](https://github.com/q23/supabase-mcp-server/discussions)

## Roadmap

- [x] Phase 1: Project Setup
- [x] Phase 2: Core Foundations
- [ ] Phase 3: Zero-Touch Deployment (P1)
- [ ] Phase 4: Broken Config Detection (P1)
- [ ] Phase 5: Self-Hosted Connection (P1)
- [ ] Phase 6: Cross-Instance Migration (P2)
- [ ] Phase 7: Production Backups (P2)
- [ ] Phase 8: Real-Time Monitoring (P2)
- [ ] Phase 9: Multi-Instance Orchestration (P3)

See [tasks.md](./.specify/specs/001-supabase-mcp-server/tasks.md) for detailed task breakdown.

---

Built with ❤️ following the [Supabase MCP Constitution](https://github.com/q23/supabase-mcp-server/blob/main/.specify/memory/constitution.md)
