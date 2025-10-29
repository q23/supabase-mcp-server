import type { PostgresConnectionPool } from "../../lib/postgres/connection-pool.js";
import { MigrationVersionTracker } from "../../lib/migrations/version-tracker.js";
import type { ToolResponse } from "../../types/mcp.js";

export async function listMigrations(pool: PostgresConnectionPool): Promise<ToolResponse> {
  const tracker = new MigrationVersionTracker(pool);
  await tracker.initialize();
  const migrations = await tracker.getAppliedMigrations();

  return {
    content: [{ type: "text", text: `Migrations: ${migrations.length}\n${migrations.map(m => `${m.version}: ${m.name}`).join("\n")}` }],
    _meta: migrations,
  };
}
