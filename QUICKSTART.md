# Quick Start Guide

## TL;DR

```bash
# 1. Clone and setup
git clone https://github.com/q23/supabase-mcp-server.git
cd supabase-mcp-server
cp .env.example .env

# 2. Generate API key
openssl rand -hex 32

# 3. Edit .env (add MCP_API_KEY, DOKPLOY_API_URL, DOKPLOY_API_KEY)
nano .env

# 4. Start server
docker-compose -f docker-compose.prod.yml up -d

# 5. Test
curl http://localhost:3000/health

# 6. Share with team
# URL: http://your-server:3000/mcp
# API Key: (from .env MCP_API_KEY)
```

## Use Cases

### I want to use it LOCALLY (just me)

**Best option**: Install npm package + Claude Desktop
```bash
npm install -g supabase-mcp-server
```

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:
```json
{
  "mcpServers": {
    "supabase": {
      "command": "supabase-mcp",
      "env": {
        "DOKPLOY_API_URL": "https://your-dokploy.com",
        "DOKPLOY_API_KEY": "your-key"
      }
    }
  }
}
```

### I want to use it with CLAUDE CODE

**Best option**: Deploy HTTP server (Docker recommended)

1. Deploy server (see TL;DR above)
2. Add to `~/.config/claude-code/mcp.json`:
```json
{
  "mcpServers": {
    "supabase": {
      "url": "http://your-server:3000/mcp",
      "transport": "http",
      "headers": {
        "Authorization": "Bearer your-api-key"
      }
    }
  }
}
```

### I want to SHARE with my TEAM

**Best option**: Central Docker deployment

1. Deploy to server (VPS, cloud, internal server)
2. Share credentials:
   - URL: `https://mcp.your-domain.com/mcp`
   - API Key: `<from MCP_API_KEY>`
3. Team members configure their clients (Claude Code/Desktop)

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    MCP Server Modes                     │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  STDIO MODE               HTTP/SSE MODE                 │
│  (Local only)             (Remote access)               │
│                                                         │
│  ┌──────────┐             ┌──────────┐                 │
│  │  Claude  │             │  Docker  │                 │
│  │ Desktop  │────stdio────▶  Server  │                 │
│  └──────────┘             │  :3000   │                 │
│                           └────┬─────┘                 │
│                                │                        │
│                                │ HTTP/SSE               │
│                           ┌────┴─────┬──────────┐      │
│                           │          │          │      │
│                    ┌──────▼────┐ ┌──▼──────┐ ┌─▼────┐ │
│                    │  Claude   │ │ Claude  │ │ cURL │ │
│                    │   Code    │ │ Desktop │ │      │ │
│                    └───────────┘ └─────────┘ └──────┘ │
│                                                         │
│                        ▼                                │
│                  ┌─────────────┐                        │
│                  │   Dokploy   │                        │
│                  │   (Self-    │                        │
│                  │   hosted    │                        │
│                  │  Supabase)  │                        │
│                  └─────────────┘                        │
└─────────────────────────────────────────────────────────┘
```

## What This Server Does

1. **Zero-Touch Deployment**: Deploy Supabase to Dokploy in <10 minutes
2. **Fix Broken Configs**: Auto-detect and fix broken JWT keys
3. **Manage Connections**: Monitor and optimize database connections
4. **Migrations**: Move data between Supabase instances safely
5. **Backups**: Encrypted, compressed backups with S3 support
6. **Monitoring**: Real-time health checks and alerts

## Next Steps

- [Client Configuration](./docs/CLIENT-CONFIGURATION.md) - Detailed client setup
- [API Reference](./docs/API.md) - All available tools
- [Examples](./docs/EXAMPLES.md) - Common workflows

## Need Help?

- Issues: https://github.com/q23/supabase-mcp-server/issues
- Docs: [./docs](./docs)
