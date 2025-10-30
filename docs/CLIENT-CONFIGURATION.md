# Client Configuration Guide

This guide shows how to connect different MCP clients to your Supabase MCP Server.

## Prerequisites

1. MCP Server running in HTTP mode:
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

2. Server accessible at: `http://your-server:3000` (or `https://` with SSL)

3. API Key generated and configured in `.env`:
   ```bash
   openssl rand -hex 32
   ```

## Client Configurations

### 1. Claude Desktop

**File**: `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)

**Local Mode (stdio)**:
```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "supabase-mcp-server"],
      "env": {
        "DOKPLOY_API_URL": "https://your-dokploy.com",
        "DOKPLOY_API_KEY": "your-dokploy-key",
        "SUPABASE_URL": "https://your-project.supabase.co",
        "SUPABASE_SERVICE_ROLE_KEY": "your-key"
      }
    }
  }
}
```

**Remote Mode (HTTP/SSE)**:
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

---

### 2. Claude Code (VSCode/CLI)

**File**: `~/.config/claude-code/mcp.json` or project-specific `.claude/mcp.json`

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

**Alternative: Environment-based**
```bash
export SUPABASE_MCP_URL="http://your-server:3000/mcp"
export SUPABASE_MCP_API_KEY="your-api-key-here"
```

---

### 3. MCP Inspector (Development/Testing)

```bash
npx @modelcontextprotocol/inspector \
  --transport http \
  --url http://localhost:3000/mcp \
  --header "Authorization: Bearer your-api-key-here"
```

---

### 4. Custom TypeScript Client

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const client = new Client({
  name: "my-client",
  version: "1.0.0"
}, {
  capabilities: {}
});

const transport = new StreamableHTTPClientTransport({
  endpoint: "http://your-server:3000/mcp",
  headers: {
    "Authorization": "Bearer your-api-key-here"
  }
});

await client.connect(transport);

// List available tools
const tools = await client.listTools();
console.log("Available tools:", tools);

// Call a tool
const result = await client.callTool({
  name: "health_check",
  arguments: {}
});
console.log("Health check:", result);
```

---

### 5. Python Client

```python
from mcp import ClientSession, StdioServerParameters
from mcp.client.sse import sse_client
import os

# HTTP/SSE client
headers = {
    "Authorization": f"Bearer {os.getenv('MCP_API_KEY')}"
}

async with sse_client(
    "http://your-server:3000/mcp",
    headers=headers
) as (read, write):
    async with ClientSession(read, write) as session:
        await session.initialize()

        # List tools
        tools = await session.list_tools()
        print(f"Available tools: {tools}")

        # Call tool
        result = await session.call_tool("health_check", {})
        print(f"Health check: {result}")
```

---

### 6. cURL (Testing)

**Health Check**:
```bash
curl http://localhost:3000/health
```

**Initialize Session**:
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key-here" \
  -H "mcp-session-id: test-session" \
  -d '{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "initialize",
    "params": {
      "protocolVersion": "2024-11-05",
      "capabilities": {},
      "clientInfo": {
        "name": "test-client",
        "version": "1.0.0"
      }
    }
  }'
```

**List Tools**:
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key-here" \
  -H "mcp-session-id: test-session" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/list",
    "params": {}
  }'
```

**Call Tool**:
```bash
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key-here" \
  -H "mcp-session-id: test-session" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "health_check",
      "arguments": {}
    }
  }'
```

---

## Team Deployment

### Shared Server Setup

1. **Deploy to Cloud/VPS**:
   ```bash
   # On server
   git clone https://github.com/your-org/supabase-mcp-server.git
   cd supabase-mcp-server

   # Configure
   cp .env.example .env
   nano .env  # Add MCP_API_KEY, DOKPLOY_API_URL, etc.

   # Start
   docker-compose -f docker-compose.prod.yml up -d
   ```

2. **Enable SSL** (recommended for production):
   ```bash
   # Get SSL certificate (Let's Encrypt)
   certbot certonly --standalone -d mcp.your-domain.com

   # Copy certificates
   mkdir ssl
   cp /etc/letsencrypt/live/mcp.your-domain.com/fullchain.pem ssl/
   cp /etc/letsencrypt/live/mcp.your-domain.com/privkey.pem ssl/

   # Start with SSL
   docker-compose -f docker-compose.prod.yml --profile with-ssl up -d
   ```

3. **Share with team**:
   ```
   Server URL: https://mcp.your-domain.com/mcp
   API Key: [shared securely via 1Password/Vault]
   ```

### Per-User API Keys (Advanced)

Modify `src/server-http.ts` to support multiple API keys:

```typescript
// In .env
MCP_API_KEYS=user1:key1,user2:key2,user3:key3

// In authMiddleware
const apiKeys = new Map(
  process.env.MCP_API_KEYS?.split(',').map(pair => pair.split(':')) || []
);

const token = authHeader.substring(7);
const [username] = [...apiKeys.entries()]
  .find(([_, key]) => key === token) || [];

if (!username) {
  return res.status(403).json({ error: "Invalid API key" });
}

req.user = username; // Track usage per user
```

---

## Troubleshooting

### Connection Refused
```bash
# Check server is running
docker ps | grep mcp-server

# Check logs
docker logs supabase-mcp-server

# Test locally
curl http://localhost:3000/health
```

### Unauthorized (401/403)
- Verify `Authorization: Bearer <key>` header
- Check API key matches `.env` MCP_API_KEY
- Ensure no extra whitespace in key

### Session Not Found
- Client must send `mcp-session-id` header
- Session expires after inactivity
- Use same session ID for all requests in a conversation

---

## Security Best Practices

1. **Always use HTTPS in production**
2. **Rotate API keys regularly**
3. **Use firewall to restrict access**:
   ```bash
   # Allow only your office IP
   ufw allow from 203.0.113.0/24 to any port 3000
   ```
4. **Monitor access logs**:
   ```bash
   docker logs -f supabase-mcp-server | grep "POST /mcp"
   ```
5. **Use environment-specific keys** (dev/staging/prod)

---

## Next Steps

- [API Reference](./API.md) - Complete list of available tools
- [Examples](./EXAMPLES.md) - Common usage patterns
- [Troubleshooting](./TROUBLESHOOTING.md) - Common issues and solutions
