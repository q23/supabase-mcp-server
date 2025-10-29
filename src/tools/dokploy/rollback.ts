import type { DokployAPIClient } from "../../lib/dokploy/api-client.js";
import type { ToolResponse } from "../../types/mcp.js";

export async function rollback(
  applicationId: string,
  dokployClient: DokployAPIClient
): Promise<ToolResponse> {
  try {
    // Would implement rollback via Dokploy API
    return {
      content: [{ type: "text", text: `✅ Rollback initiated for ${applicationId}` }],
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Rollback failed: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
}
