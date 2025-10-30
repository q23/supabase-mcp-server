/**
 * Health Checker
 * Monitors container and system health via Dokploy API
 */

import type { DokployAPIClient } from "../dokploy/api-client.js";
import type { HealthStatus } from "../../types/dokploy.js";
import type { Alert } from "../../types/mcp.js";

export class HealthChecker {
  private dokployClient: DokployAPIClient;

  constructor(dokployClient: DokployAPIClient) {
    this.dokployClient = dokployClient;
  }

  async checkHealth(applicationId: string): Promise<{
    status: HealthStatus;
    alerts: Alert[];
  }> {
    const health = await this.dokployClient.checkHealth(applicationId);
    const alerts: Alert[] = [];

    // Check for unhealthy containers
    for (const container of health.containers) {
      if (container.status !== "healthy") {
        alerts.push({
          alertId: crypto.randomUUID(),
          severity: "high",
          title: `Container ${container.name} unhealthy`,
          message: `Container status: ${container.status}`,
          source: { type: "container", name: container.name },
          recommendations: [
            "Check container logs",
            "Restart container",
            "Review health check configuration",
          ],
          autoResolvable: true,
          autoResolveAction: "restart_container",
          timestamp: new Date().toISOString(),
        });
      }
    }

    return {
      status: health.status,
      alerts,
    };
  }

  async checkResourceUsage(_applicationId: string): Promise<Alert[]> {
    const alerts: Alert[] = [];
    // Would check CPU, memory, disk usage here
    return alerts;
  }
}
