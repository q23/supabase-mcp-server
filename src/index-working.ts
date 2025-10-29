#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { config } from "dotenv";

// @ts-ignore - Load implementations
import { DokployAPIClient } from "./lib/dokploy/api-client.js";
import { SetupWizard } from "./tools/dokploy/setup-wizard.js";
import { ConfigValidator } from "./tools/dokploy/validate-config.js";
import { RegenerateKeysTool } from "./tools/dokploy/regenerate-keys.js";

config();

const SERVER_NAME = "supabase-mcp-server";
const SERVER_VERSION = "0.1.0";

class SupabaseMCPServer {
  private server: Server;

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
        { name: "health_check", description: "Check server health", inputSchema: { type: "object", properties: {} } },
        { name: "dokploy_setup_wizard", description: "Deploy Supabase to Dokploy", inputSchema: { type: "object", properties: {} } },
        { name: "dokploy_validate_config", description: "Detect broken configs", inputSchema: { type: "object", properties: {} } },
        { name: "dokploy_regenerate_keys", description: "Fix broken JWT keys", inputSchema: { type: "object", properties: {} } },
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

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error(`${SERVER_NAME} v${SERVER_VERSION} started`);
  }
}

async function main() {
  const server = new SupabaseMCPServer();
  await server.start();
}

main();
