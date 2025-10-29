/**
 * Log Aggregator
 * Aggregates logs from all Supabase services
 */

import type { DokployAPIClient } from "../dokploy/api-client.js";
import type { ContainerLogsRequest } from "../../types/dokploy.js";

export class LogAggregator {
  private dokployClient: DokployAPIClient;

  constructor(dokployClient: DokployAPIClient) {
    this.dokployClient = dokployClient;
  }

  async aggregateLogs(
    containerIds: string[],
    options?: { tail?: number; since?: string }
  ): Promise<Array<{ container: string; logs: string[] }>> {
    const aggregated = [];

    for (const containerId of containerIds) {
      const request: ContainerLogsRequest = {
        containerId,
        tail: options?.tail || 100,
        timestamps: true,
        since: options?.since,
      };

      const logs = await this.dokployClient.getLogs(request);
      aggregated.push({
        container: containerId,
        logs: logs.logs.map((l) => l.message),
      });
    }

    return aggregated;
  }

  filterLogs(
    logs: string[],
    filters: { level?: string; service?: string; searchTerm?: string }
  ): string[] {
    return logs.filter((log) => {
      if (filters.level && !log.toLowerCase().includes(filters.level.toLowerCase())) {
        return false;
      }
      if (filters.searchTerm && !log.includes(filters.searchTerm)) {
        return false;
      }
      return true;
    });
  }
}
