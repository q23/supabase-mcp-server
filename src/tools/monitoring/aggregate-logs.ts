import type { DokployAPIClient } from "../../lib/dokploy/api-client.js";
import { LogAggregator } from "../../lib/monitoring/log-aggregator.js";
import type { ToolResponse } from "../../types/mcp.js";

export async function aggregateLogs(
  containerIds: string[],
  dokployClient: DokployAPIClient,
  options?: { tail?: number; level?: string }
): Promise<ToolResponse> {
  try {
    const aggregator = new LogAggregator(dokployClient);
    const logs = await aggregator.aggregateLogs(containerIds, options);

    let allLogs: string[] = [];
    for (const container of logs) {
      allLogs = allLogs.concat(container.logs);
    }

    if (options?.level) {
      allLogs = aggregator.filterLogs(allLogs, { level: options.level });
    }

    return {
      content: [{ type: "text", text: `Aggregated ${allLogs.length} log entries from ${containerIds.length} containers` }],
      _meta: logs,
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Log aggregation failed: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
}
