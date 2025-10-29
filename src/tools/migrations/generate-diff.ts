import { ConnectionBuilder } from "../../lib/postgres/connection-builder.js";
import { PostgresConnectionPool } from "../../lib/postgres/connection-pool.js";
import { DiffGenerator } from "../../lib/migrations/diff-generator.js";
import type { ToolResponse } from "../../types/mcp.js";

export async function generateDiff(
  sourceConnection: string,
  targetConnection: string
): Promise<ToolResponse> {
  try {
    const sourceConfig = ConnectionBuilder.parseConnectionString(sourceConnection);
    const targetConfig = ConnectionBuilder.parseConnectionString(targetConnection);

    const sourcePool = new PostgresConnectionPool(sourceConfig);
    const targetPool = new PostgresConnectionPool(targetConfig);

    const diffGen = new DiffGenerator();
    const diff = await diffGen.generateDiff(sourcePool, targetPool);

    await sourcePool.close();
    await targetPool.close();

    return {
      content: [{ type: "text", text: `Schema Diff:\n${diff.changes.join("\n")}\n\nSQL:\n${diff.sql}` }],
      _meta: diff,
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Diff generation failed: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
}
