/**
 * Connect Tool
 * Tests database connection and returns connection info
 */

import { ConnectionBuilder } from "../../lib/postgres/connection-builder.js";
import { PostgresConnectionPool } from "../../lib/postgres/connection-pool.js";
import type { ToolResponse } from "../../types/mcp.js";

export interface ConnectInput {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  pooled?: boolean;
}

export async function connect(input: ConnectInput): Promise<ToolResponse> {
  try {
    let config;

    if (input.connectionString) {
      config = ConnectionBuilder.parseConnectionString(input.connectionString);
    } else if (input.host && input.password) {
      config = {
        host: input.host,
        port: input.port || 5432,
        database: input.database || "postgres",
        user: input.user || "postgres",
        password: input.password,
        pooled: input.pooled || false,
      };
    } else {
      config = ConnectionBuilder.autoDetect();
    }

    const pool = new PostgresConnectionPool(config);
    await pool.testConnection();

    const metrics = await pool.getMetrics();

    await pool.close();

    return {
      content: [{
        type: "text",
        text: `✅ Connection successful!\nHost: ${config.host}:${config.port}\nDatabase: ${config.database}\nPool: ${metrics.maxConnections} max`,
      }],
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Connection failed: ${error instanceof Error ? error.message : String(error)}`,
      }],
      isError: true,
    };
  }
}
