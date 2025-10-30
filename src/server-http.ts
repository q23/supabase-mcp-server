#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import express from "express";
import { config } from "dotenv";
import { randomUUID } from "node:crypto";

// @ts-ignore - Load implementations
import { DokployAPIClient } from "./lib/dokploy/api-client.js";
import { SetupWizard } from "./tools/dokploy/setup-wizard.js";
import { ConfigValidator } from "./tools/dokploy/validate-config.js";
import { RegenerateKeysTool } from "./tools/dokploy/regenerate-keys.js";

config();

const SERVER_NAME = "supabase-mcp-server";
const SERVER_VERSION = "0.1.0";
const MCP_PORT = parseInt(process.env["MCP_PORT"] || "3000");
const API_KEY = process.env["MCP_API_KEY"]; // Simple API key auth

interface TransportMap {
  [sessionId: string]: StreamableHTTPServerTransport;
}

class SupabaseMCPServer {
  private server: Server;
  private transports: TransportMap = {};

  constructor() {
    this.server = new Server(
      { name: SERVER_NAME, version: SERVER_VERSION },
      { capabilities: { tools: {} } }
    );
    this.setupHandlers();
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "health_check",
          description: "Check server health",
          inputSchema: { type: "object", properties: {} }
        },
        {
          name: "dokploy_setup_wizard",
          description: "Deploy Supabase to Dokploy",
          inputSchema: {
            type: "object",
            properties: {
              projectName: { type: "string", description: "Project name for the Supabase instance" },
              domain: { type: "string", description: "Domain (optional, defaults to projectName.local)" },
              projectId: { type: "string", description: "Dokploy Project ID (wizard will show available projects if needed)" },
              createNewProject: { type: "boolean", description: "Create new Dokploy project (default: false)" }
            },
            required: ["projectName"]
          }
        },
        {
          name: "dokploy_validate_config",
          description: "Detect broken configs",
          inputSchema: {
            type: "object",
            properties: {
              applicationId: { type: "string", description: "Application ID" }
            },
            required: ["applicationId"]
          }
        },
        {
          name: "dokploy_regenerate_keys",
          description: "Fix broken JWT keys",
          inputSchema: {
            type: "object",
            properties: {
              applicationId: { type: "string", description: "Application ID" }
            },
            required: ["applicationId"]
          }
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      const dokployClient = process.env["DOKPLOY_API_URL"] && process.env["DOKPLOY_API_KEY"]
        ? new DokployAPIClient({
            apiUrl: process.env["DOKPLOY_API_URL"]!,
            apiKey: process.env["DOKPLOY_API_KEY"]!,
          })
        : undefined;

      switch (name) {
        case "health_check":
          return {
            content: [{ type: "text", text: `✅ Server healthy\nDokploy: ${dokployClient ? 'Connected' : 'Not configured'}` }],
          };

        case "dokploy_setup_wizard":
          if (!dokployClient) return { content: [{ type: "text", text: "❌ Dokploy not configured" }], isError: true };
          try {
            const wizard = new SetupWizard(dokployClient, args as any);
            const result = await wizard.execute();
            return {
              content: [{ type: "text", text: `🎉 Deployed!\nApp: ${result.applicationId}\nURL: ${result.supabaseUrl}` }],
            };
          } catch (err: any) {
            return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
          }

        case "dokploy_validate_config":
          if (!dokployClient) return { content: [{ type: "text", text: "❌ Dokploy not configured" }], isError: true };
          try {
            const validator = new ConfigValidator(dokployClient);
            const result = await validator.validate((args as any).applicationId);
            return {
              content: [{ type: "text", text: result.valid ? `✅ Valid!` : `❌ ${result.errors.length} errors` }],
            };
          } catch (err: any) {
            return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
          }

        case "dokploy_regenerate_keys":
          if (!dokployClient) return { content: [{ type: "text", text: "❌ Dokploy not configured" }], isError: true };
          try {
            const tool = new RegenerateKeysTool(dokployClient);
            const result = await tool.regenerateKeys(args as any);
            return {
              content: [{ type: "text", text: `✅ Keys regenerated!\nIssues fixed: ${result.issuesDetected.length}` }],
            };
          } catch (err: any) {
            return { content: [{ type: "text", text: `Error: ${err.message}` }], isError: true };
          }

        default:
          return { content: [{ type: "text", text: `Tool ${name} available but not yet wired` }] };
      }
    });
  }

  async startHTTP() {
    const app = express();
    app.use(express.json());

    // Simple API Key authentication middleware
    const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
      if (!API_KEY) {
        return next(); // No auth if API_KEY not set
      }

      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Missing or invalid Authorization header" });
      }

      const token = authHeader.substring(7);
      if (token !== API_KEY) {
        return res.status(403).json({ error: "Invalid API key" });
      }

      next();
    };

    app.use(authMiddleware);

    // POST /mcp - Handle MCP requests
    app.post("/mcp", async (req, res) => {
      const sessionId = req.headers["mcp-session-id"] as string;
      let transport = sessionId ? this.transports[sessionId] : undefined;

      // New session - create transport on initialize
      if (!transport) {
        const newSessionId = sessionId || randomUUID();

        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => newSessionId,
          onsessioninitialized: (sid) => {
            this.transports[sid] = transport!;
          }
        });

        transport.onclose = () => {
          const sid = transport!.sessionId;
          if (sid && this.transports[sid]) {
            delete this.transports[sid];
          }
        };

        // Connect BEFORE handling request
        await this.server.connect(transport);
      }

      await transport.handleRequest(req, res, req.body);
    });

    // GET /mcp - Handle SSE streams
    app.get("/mcp", async (req, res) => {
      const sessionId = req.headers["mcp-session-id"] as string;
      const transport = sessionId ? this.transports[sessionId] : undefined;

      if (!transport) {
        res.status(404).json({ error: "Session not found. Initialize first via POST." });
        return;
      }

      await transport.handleRequest(req, res);
    });

    // DELETE /mcp - Close session
    app.delete("/mcp", async (req, res) => {
      const sessionId = req.headers["mcp-session-id"] as string;
      const transport = sessionId ? this.transports[sessionId] : undefined;

      if (transport) {
        await transport.close();
      }

      res.status(204).send();
    });

    // Health endpoint (no auth required)
    app.get("/health", (_req, res) => {
      res.json({
        status: "healthy",
        server: SERVER_NAME,
        version: SERVER_VERSION,
        sessions: Object.keys(this.transports).length,
      });
    });

    const server = app.listen(MCP_PORT, '0.0.0.0', () => {
      console.log(`${SERVER_NAME} v${SERVER_VERSION} listening on http://0.0.0.0:${MCP_PORT}`);
      console.log(`Authentication: ${API_KEY ? "Enabled (Bearer token)" : "Disabled"}`);
      console.log(`Endpoints:`);
      console.log(`  POST   /mcp    - MCP requests`);
      console.log(`  GET    /mcp    - SSE stream`);
      console.log(`  DELETE /mcp    - Close session`);
      console.log(`  GET    /health - Health check`);
    });

    // Graceful shutdown
    process.on("SIGINT", async () => {
      console.log("\nShutting down gracefully...");

      for (const sessionId in this.transports) {
        const transport = this.transports[sessionId];
        if (transport) {
          await transport.close();
        }
      }
      this.transports = {};

      server.close(() => {
        console.log("Server closed");
        process.exit(0);
      });
    });
  }
}

async function main() {
  const server = new SupabaseMCPServer();
  await server.startHTTP();
}

main().catch(console.error);
