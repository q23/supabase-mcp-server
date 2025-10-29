import type { DokployAPIClient } from "../../lib/dokploy/api-client.js";
import { HealthChecker } from "../../lib/monitoring/health-checker.js";
import type { ToolResponse } from "../../types/mcp.js";

export async function dokployMonitorHealth(
  applicationId: string,
  dokployClient: DokployAPIClient
): Promise<ToolResponse> {
  try {
    const checker = new HealthChecker(dokployClient);
    const health = await checker.checkHealth(applicationId);

    return {
      content: [{
        type: "text",
        text: `Health: ${health.status}\nAlerts: ${health.alerts.length}`,
      }],
      _meta: health,
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Health check failed: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
}
