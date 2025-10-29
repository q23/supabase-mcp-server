import type { PostgresConnectionPool } from "../../lib/postgres/connection-pool.js";
import { MigrationRunner } from "../../lib/migrations/runner.js";
import type { MigrationRecord } from "../../types/supabase.js";
import type { ToolResponse } from "../../types/mcp.js";

export async function rollbackMigration(
  migration: MigrationRecord,
  pool: PostgresConnectionPool
): Promise<ToolResponse> {
  try {
    const runner = new MigrationRunner(pool);
    await runner.rollback(migration);

    return {
      content: [{ type: "text", text: `✅ Migration ${migration.version} rolled back` }],
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Rollback failed: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
}
