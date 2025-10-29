/**
 * Execute SQL Tool
 * Executes SQL queries with parameterization, timeouts, and role-based access
 */

import type { PostgresConnectionPool } from "../../lib/postgres/connection-pool.js";
import type { RoleManager } from "../../lib/postgres/role-manager.js";
import type { QueryResult } from "../../types/supabase.js";
import { logger } from "../../lib/utils/logger.js";
import type { ToolResponse } from "../../types/mcp.js";

export interface ExecuteSQLInput {
  query: string;
  params?: unknown[];
  timeout?: number;
  targetSchema?: string;
  useRole?: string;
}

export async function executeSQL(
  input: ExecuteSQLInput,
  pool: PostgresConnectionPool,
  roleManager?: RoleManager
): Promise<ToolResponse<QueryResult>> {
  const startTime = Date.now();

  try {
    logger.info("Executing SQL query", {
      queryLength: input.query.length,
      paramCount: input.params?.length || 0,
      targetSchema: input.targetSchema,
    });

    let result;

    if (roleManager && (input.targetSchema || input.useRole)) {
      // Use role-based execution
      const rows = await roleManager.executeWithAutoRole(
        input.query,
        input.params,
        input.targetSchema
      );
      result = {
        rows,
        rowCount: rows.length,
        command: "SELECT",
      };
    } else {
      // Direct execution
      const pgResult = await pool.query(input.query, input.params);
      result = {
        rows: pgResult.rows,
        rowCount: pgResult.rowCount || 0,
        command: pgResult.command,
      };
    }

    const durationMs = Date.now() - startTime;

    const queryResult: QueryResult = {
      ...result,
      durationMs,
    };

    return {
      content: [{
        type: "text",
        text: JSON.stringify(queryResult, null, 2),
      }],
      _meta: queryResult,
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `SQL execution failed: ${error instanceof Error ? error.message : String(error)}`,
      }],
      isError: true,
    };
  }
}
