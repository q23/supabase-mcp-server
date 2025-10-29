import type { DokployAPIClient } from "../../lib/dokploy/api-client.js";
import type { ContainerLogsRequest } from "../../types/dokploy.js";
import type { ToolResponse } from "../../types/mcp.js";

export async function dokployGetLogs(
  request: ContainerLogsRequest,
  dokployClient: DokployAPIClient
): Promise<ToolResponse> {
  try {
    const logs = await dokployClient.getLogs(request);

    return {
      content: [{
        type: "text",
        text: `Logs for ${request.containerId}:\n${logs.logs.map(l => l.message).join("\n")}`,
      }],
      _meta: logs,
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Get logs failed: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
}
