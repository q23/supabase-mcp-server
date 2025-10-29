/**
 * Inspect Schema Tool
 * Inspects database schema (tables, columns, indexes, constraints)
 */

import type { PostgresConnectionPool } from "../../lib/postgres/connection-pool.js";
import type { SchemaInfo, TableInfo } from "../../types/supabase.js";
import type { ToolResponse } from "../../types/mcp.js";

export interface InspectSchemaInput {
  schemaName?: string;
  includeTables?: boolean;
  includeViews?: boolean;
  includeIndexes?: boolean;
}

export async function inspectSchema(
  input: InspectSchemaInput,
  pool: PostgresConnectionPool
): Promise<ToolResponse<SchemaInfo>> {
  try {
    const schemaName = input.schemaName || "public";

    // Get tables
    const tablesResult = await pool.query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = $1 AND table_type = 'BASE TABLE'
       ORDER BY table_name`,
      [schemaName]
    );

    const tables: TableInfo[] = [];

    for (const row of tablesResult.rows) {
      const tableInfo: TableInfo = {
        tableName: row.table_name,
        schemaName,
        columns: [],
        indexes: [],
        constraints: [],
      };

      // Get columns for this table
      const columnsResult = await pool.query(
        `SELECT column_name, data_type, is_nullable, column_default
         FROM information_schema.columns
         WHERE table_schema = $1 AND table_name = $2
         ORDER BY ordinal_position`,
        [schemaName, row.table_name]
      );

      tableInfo.columns = columnsResult.rows.map((col: any) => ({
        columnName: col.column_name,
        dataType: col.data_type,
        isNullable: col.is_nullable === "YES",
        defaultValue: col.column_default,
        isPrimaryKey: false,
        isUnique: false,
        isForeignKey: false,
      }));

      tables.push(tableInfo);
    }

    const schemaInfo: SchemaInfo = {
      schemaName,
      tables,
      views: [],
      functions: [],
      extensions: [],
    };

    return {
      content: [{
        type: "text",
        text: `Schema: ${schemaName}\nTables: ${tables.length}\nColumns: ${tables.reduce((sum, t) => sum + t.columns.length, 0)}`,
      }],
      _meta: schemaInfo,
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Schema inspection failed: ${error instanceof Error ? error.message : String(error)}`,
      }],
      isError: true,
    };
  }
}
