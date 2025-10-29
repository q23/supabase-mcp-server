import { ConnectionBuilder } from "../../lib/postgres/connection-builder.js";
import { PostgresConnectionPool } from "../../lib/postgres/connection-pool.js";
import { SchemaSync } from "../../lib/orchestration/schema-sync.js";
import type { ToolResponse } from "../../types/mcp.js";

export async function dokploySyncSchema(
  sourceConnection: string,
  targetConnection: string
): Promise<ToolResponse> {
  try {
    const sourceConfig = ConnectionBuilder.parseConnectionString(sourceConnection);
    const targetConfig = ConnectionBuilder.parseConnectionString(targetConnection);

    const sourcePool = new PostgresConnectionPool(sourceConfig);
    const targetPool = new PostgresConnectionPool(targetConfig);

    const sync = new SchemaSync();
    const result = await sync.syncSchema(sourcePool, targetPool);

    await sourcePool.close();
    await targetPool.close();

    return {
      content: [{ type: "text", text: `✅ Schema synced\nApplied: ${result.applied}\nSkipped: ${result.skipped}` }],
      _meta: result,
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Schema sync failed: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
}

export async function dokployPromoteDeployment(
  sourceConnection: string,
  targetConnection: string,
  options?: { createBackup?: boolean }
): Promise<ToolResponse> {
  try {
    const sourceConfig = ConnectionBuilder.parseConnectionString(sourceConnection);
    const targetConfig = ConnectionBuilder.parseConnectionString(targetConnection);

    const sourcePool = new PostgresConnectionPool(sourceConfig);
    const targetPool = new PostgresConnectionPool(targetConfig);

    const { DeploymentPromotion } = await import("../../lib/orchestration/promotion.js");
    const promotion = new DeploymentPromotion();
    const result = await promotion.promote(sourcePool, targetPool, options || {});

    await sourcePool.close();
    await targetPool.close();

    return {
      content: [{ type: "text", text: `✅ Deployment promoted\nBackup ID: ${result.backupId || "none"}` }],
      _meta: result,
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Promotion failed: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
}
