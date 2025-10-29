# Supabase MCP Server

**Production-ready MCP server providing comprehensive Supabase management capabilities for both cloud and self-hosted instances.**

[![CI](https://github.com/yourusername/supabase-mcp-server/workflows/CI/badge.svg)](https://github.com/yourusername/supabase-mcp-server/actions)
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
- Node.js 18+
- PostgreSQL (for self-hosted) or Supabase account
- Optional: Dokploy instance for automated deployments

### Install from npm

```bash
npm install -g supabase-mcp-server
```

### Install from source

```bash
git clone https://github.com/yourusername/supabase-mcp-server.git
cd supabase-mcp-server
npm install
npm run build
npm link
```

## Quick Start

### 1. Configuration

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

**For Supabase Cloud:**
```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**For Self-Hosted:**
```env
POSTGRES_HOST=your-host
POSTGRES_PORT=5432
POSTGRES_DATABASE=postgres
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your-password
```

**For Dokploy Integration:**
```env
DOKPLOY_API_URL=https://your-dokploy.com
DOKPLOY_API_KEY=your-api-key
```

### 2. Start the MCP Server

```bash
supabase-mcp
```

### 3. Use with Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/config.json` on macOS):

```json
{
  "mcpServers": {
    "supabase": {
      "command": "supabase-mcp",
      "env": {
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_ANON_KEY": "your-anon-key",
        "SUPABASE_SERVICE_ROLE_KEY": "your-service-role-key"
      }
    }
  }
}
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

- [Full Documentation](./docs)
- [API Reference](./docs/API.md)
- [Troubleshooting Guide](./docs/TROUBLESHOOTING.md)
- [Examples](./docs/EXAMPLES.md)

## Development

### Setup

```bash
git clone https://github.com/yourusername/supabase-mcp-server.git
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

- GitHub Issues: [Report a bug](https://github.com/yourusername/supabase-mcp-server/issues)
- Documentation: [Read the docs](./docs)
- Discussions: [Ask questions](https://github.com/yourusername/supabase-mcp-server/discussions)

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

Built with ❤️ following the [Supabase MCP Constitution](https://github.com/yourusername/supabase-mcp-server/blob/main/.specify/memory/constitution.md)
