/**
 * Cross-Instance Migration Tool
 * Migrates data between Supabase instances
 */

import { ConnectionBuilder } from "../../lib/postgres/connection-builder.js";
import { PostgresConnectionPool } from "../../lib/postgres/connection-pool.js";
import { CrossInstanceMigration } from "../../lib/migrations/cross-instance.js";
import type { ToolResponse } from "../../types/mcp.js";

export interface CrossInstanceMigrateInput {
  sourceConnection: string;
  targetConnection: string;
  tables?: string[];
  verifyIntegrity?: boolean;
}

export async function crossInstanceMigrate(
  input: CrossInstanceMigrateInput
): Promise<ToolResponse> {
  try {
    const sourceConfig = ConnectionBuilder.parseConnectionString(input.sourceConnection);
    const targetConfig = ConnectionBuilder.parseConnectionString(input.targetConnection);

    const sourcePool = new PostgresConnectionPool(sourceConfig);
    const targetPool = new PostgresConnectionPool(targetConfig);

    await sourcePool.testConnection();
    await targetPool.testConnection();

    const migration = new CrossInstanceMigration(sourcePool, targetPool);

    const tables = input.tables || ["public.*"];
    const result = await migration.migrate(tables);

    let integrityCheck: { valid: boolean; differences: string[] } = { valid: true, differences: [] };
    if (input.verifyIntegrity !== false) {
      integrityCheck = await migration.verifyIntegrity(tables);
    }

    await sourcePool.close();
    await targetPool.close();

    return {
      content: [{
        type: "text",
        text: `✅ Migration complete!\nRows: ${result.rowsMigrated}\nTables: ${result.tablesProcessed}\nIntegrity: ${integrityCheck.valid ? "✅ Valid" : "❌ Failed"}`,
      }],
      _meta: { ...result, integrityCheck },
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `Migration failed: ${error instanceof Error ? error.message : String(error)}`,
      }],
      isError: true,
    };
  }
}
