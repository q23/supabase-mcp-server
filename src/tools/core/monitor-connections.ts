/**
 * Monitor Connections Tool
 * Monitors PostgreSQL connection pool and provides recommendations
 */

import type { PostgresConnectionPool } from "../../lib/postgres/connection-pool.js";
import type { ConnectionPoolStatus } from "../../types/supabase.js";
import { logger } from "../../lib/utils/logger.js";
import type { ToolResponse, Alert } from "../../types/mcp.js";

export interface MonitorConnectionsResult {
  status: ConnectionPoolStatus;
  alerts: Alert[];
  recommendations: string[];
  byService: Record<string, number>;
}

export async function monitorConnections(
  pool: PostgresConnectionPool
): Promise<ToolResponse<MonitorConnectionsResult>> {
  try {
    const metrics = await pool.getMetrics();

    // Query connection breakdown by service
    const byServiceResult = await pool.query<{ application_name: string; count: string }>(
      `SELECT application_name, COUNT(*) as count
       FROM pg_stat_activity
       WHERE state = 'active'
       GROUP BY application_name`
    );

    const byService: Record<string, number> = {};
    for (const row of byServiceResult.rows) {
      byService[row.application_name || "unknown"] = parseInt(row.count);
    }

    const status: ConnectionPoolStatus = {
      current: metrics.activeConnections,
      max: metrics.maxConnections,
      idle: metrics.idleConnections,
      waiting: metrics.waitingConnections,
      usagePercentage: metrics.usagePercentage,
      byService,
      timestamp: new Date().toISOString(),
    };

    const alerts: Alert[] = [];
    const recommendations: string[] = [];

    // Alert if pool usage is high
    if (metrics.usagePercentage >= 90) {
      alerts.push({
        alertId: crypto.randomUUID(),
        severity: "critical",
        title: "Connection pool exhaustion",
        message: `Connection pool at ${metrics.usagePercentage.toFixed(1)}% capacity`,
        source: { type: "connection", name: "PostgreSQL" },
        currentValue: metrics.activeConnections,
        threshold: metrics.maxConnections * 0.9,
        recommendations: [
          `Increase max_connections in PostgreSQL (current: ${metrics.maxConnections})`,
          "Audit connection usage by service",
          "Implement connection pooling with PgBouncer/Supavisor",
        ],
        autoResolvable: false,
        timestamp: new Date().toISOString(),
      });
    }

    // Generate recommendations
    if (metrics.usagePercentage > 70) {
      recommendations.push(`Consider increasing pool size from ${metrics.maxConnections} to ${Math.ceil(metrics.maxConnections * 1.5)}`);
    }

    if (Object.keys(byService).length > 5) {
      recommendations.push("Many services connected - review connection efficiency");
    }

    return {
      content: [{
        type: "text",
        text: formatConnectionStatus(status, alerts, recommendations),
      }],
      _meta: { status, alerts, recommendations, byService },
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Connection monitoring failed: ${error instanceof Error ? error.message : String(error)}`,
      }],
      isError: true,
    };
  }
}

function formatConnectionStatus(
  status: ConnectionPoolStatus,
  alerts: Alert[],
  recommendations: string[]
): string {
  const lines: string[] = [];

  lines.push("📊 Connection Pool Status\n");
  lines.push(`Active: ${status.current}/${status.max} (${status.usagePercentage.toFixed(1)}%)`);
  lines.push(`Idle: ${status.idle}`);
  lines.push(`Waiting: ${status.waiting}\n`);

  if (Object.keys(status.byService).length > 0) {
    lines.push("By Service:");
    for (const [service, count] of Object.entries(status.byService)) {
      lines.push(`  ${service}: ${count}`);
    }
  }

  if (alerts.length > 0) {
    lines.push("\n🚨 Alerts:");
    for (const alert of alerts) {
      lines.push(`  ${alert.severity.toUpperCase()}: ${alert.message}`);
    }
  }

  if (recommendations.length > 0) {
    lines.push("\n💡 Recommendations:");
    for (const rec of recommendations) {
      lines.push(`  • ${rec}`);
    }
  }

  return lines.join("\n");
}
