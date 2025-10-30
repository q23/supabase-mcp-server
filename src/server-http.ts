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
import { OAuthServer } from "./lib/auth/oauth-server.js";

config();

const SERVER_NAME = "supabase-mcp-server";
const SERVER_VERSION = "0.1.0";
const MCP_PORT = parseInt(process.env["MCP_PORT"] || "3000");

// OAuth or API Key authentication
const OAUTH_ENABLED = process.env["OAUTH_ENABLED"] === "true";
const OAUTH_CLIENT_ID = process.env["OAUTH_CLIENT_ID"] || "";
const OAUTH_CLIENT_SECRET = process.env["OAUTH_CLIENT_SECRET"] || "";
const OAUTH_JWT_SECRET = process.env["OAUTH_JWT_SECRET"] || "";
const API_KEY = process.env["MCP_API_KEY"]; // Fallback to simple API key

interface TransportMap {
  [sessionId: string]: StreamableHTTPServerTransport;
}

class SupabaseMCPServer {
  private server: Server;
  private transports: TransportMap = {};
  private oauthServer?: OAuthServer;

  constructor() {
    this.server = new Server(
      { name: SERVER_NAME, version: SERVER_VERSION },
      { capabilities: { tools: {} } }
    );
    this.setupHandlers();

    // Initialize OAuth if enabled
    if (OAUTH_ENABLED && OAUTH_CLIENT_ID && OAUTH_CLIENT_SECRET && OAUTH_JWT_SECRET) {
      this.oauthServer = new OAuthServer({
        clientId: OAUTH_CLIENT_ID,
        clientSecret: OAUTH_CLIENT_SECRET,
        jwtSecret: OAUTH_JWT_SECRET,
        tokenExpiry: 3600, // 1 hour
      });

      // Cleanup expired codes every 5 minutes
      setInterval(() => this.oauthServer?.cleanupExpiredCodes(), 5 * 60 * 1000);
    }
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

    // Health endpoint (NO AUTH REQUIRED - must be before auth middleware!)
    app.get("/health", (_req, res) => {
      res.json({
        status: "healthy",
        server: SERVER_NAME,
        version: SERVER_VERSION,
        sessions: Object.keys(this.transports).length,
        auth: OAUTH_ENABLED ? "oauth" : (API_KEY ? "api-key" : "none"),
      });
    });

    // OAuth endpoints (if enabled)
    if (this.oauthServer) {
      // Dynamic Client Registration (RFC 7591)
      app.post("/oauth/register", (req, res) => {
        try {
          const result = this.oauthServer!.registerClient({
            clientName: req.body.client_name,
            redirectUris: req.body.redirect_uris,
          });

          res.json({
            client_id: result.clientId,
            client_secret: result.clientSecret,
            client_id_issued_at: result.clientIdIssuedAt,
          });
        } catch (err: any) {
          res.status(400).json({ error: err.message });
        }
      });

      // OAuth metadata endpoint
      app.get("/.well-known/oauth-authorization-server", (_req, res) => {
        const baseUrl = `https://${_req.get('host') || 'localhost'}`;
        res.json({
          issuer: baseUrl,
          authorization_endpoint: `${baseUrl}/oauth/authorize`,
          token_endpoint: `${baseUrl}/oauth/token`,
          registration_endpoint: `${baseUrl}/oauth/register`,
          response_types_supported: ["code"],
          grant_types_supported: ["authorization_code"],
          token_endpoint_auth_methods_supported: ["client_secret_post"],
          code_challenge_methods_supported: ["S256", "plain"],
        });
      });

      // Authorization endpoint
      app.get("/oauth/authorize", (req, res) => {
        try {
          const clientId = req.query["client_id"] as string;
          const redirectUri = req.query["redirect_uri"] as string;
          const state = req.query["state"] as string;
          const codeChallenge = req.query["code_challenge"] as string;
          const codeChallengeMethod = req.query["code_challenge_method"] as string;

          if (!clientId || !redirectUri) {
            res.status(400).json({ error: "Missing required parameters" });
            return;
          }

          const result = this.oauthServer!.authorize({
            clientId,
            redirectUri,
            state,
            codeChallenge,
            codeChallengeMethod,
          });

          // Redirect back to client with authorization code
          res.redirect(result.redirectUri);
        } catch (err: any) {
          res.status(400).json({ error: err.message });
        }
      });

      // Token endpoint
      app.post("/oauth/token", (req, res) => {
        try {
          const result = this.oauthServer!.token({
            grantType: req.body.grant_type,
            code: req.body.code,
            clientId: req.body.client_id,
            clientSecret: req.body.client_secret,
            redirectUri: req.body.redirect_uri,
            codeVerifier: req.body.code_verifier,
          });

          res.json({
            access_token: result.accessToken,
            token_type: result.tokenType,
            expires_in: result.expiresIn,
          });
        } catch (err: any) {
          res.status(400).json({ error: err.message });
        }
      });
    }

    // Authentication middleware (OAuth or API Key)
    const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
      // Skip auth if neither OAuth nor API key is configured
      if (!OAUTH_ENABLED && !API_KEY) {
        return next();
      }

      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Missing or invalid Authorization header" });
      }

      const token = authHeader.substring(7);

      // OAuth token validation
      if (OAUTH_ENABLED && this.oauthServer) {
        if (this.oauthServer.validateToken(token)) {
          return next();
        }
        return res.status(403).json({ error: "Invalid OAuth token" });
      }

      // Fallback to API key validation
      if (API_KEY && token === API_KEY) {
        return next();
      }

      return res.status(403).json({ error: "Invalid credentials" });
    };

    // Apply auth to all routes EXCEPT /health (which is already defined above)
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

    // Health endpoint was moved before auth middleware (line 148)

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
