/**
 * Schema Diff Generator
 * Generates SQL diff between two database schemas
 */

import type { PostgresConnectionPool } from "../postgres/connection-pool.js";
import type { TableInfo } from "../../types/supabase.js";

export class DiffGenerator {
  async generateDiff(
    sourcePool: PostgresConnectionPool,
    targetPool: PostgresConnectionPool,
    schemaName = "public"
  ): Promise<{ sql: string; changes: string[] }> {
    const changes: string[] = [];
    const sqlStatements: string[] = [];

    // Get tables from both schemas
    const sourceTables = await this.getTables(sourcePool, schemaName);
    const targetTables = await this.getTables(targetPool, schemaName);

    // Find new tables
    const targetTableNames = new Set(targetTables.map((t) => t.tableName));

    for (const table of sourceTables) {
      if (!targetTableNames.has(table.tableName)) {
        changes.push(`New table: ${table.tableName}`);
        sqlStatements.push(`-- Create table ${table.tableName}`);
      }
    }

    return {
      sql: sqlStatements.join("\n"),
      changes,
    };
  }

  private async getTables(pool: PostgresConnectionPool, schema: string): Promise<TableInfo[]> {
    const result = await pool.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = $1 AND table_type = 'BASE TABLE'`,
      [schema]
    );

    return result.rows.map((row) => ({
      tableName: row.table_name,
      schemaName: schema,
      columns: [],
      indexes: [],
      constraints: [],
    }));
  }
}
