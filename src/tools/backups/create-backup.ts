import type { PostgresConnectionPool } from "../../lib/postgres/connection-pool.js";
import { BackupCreator } from "../../lib/backups/creator.js";
import type { ToolResponse } from "../../types/mcp.js";

export async function createBackup(
  pool: PostgresConnectionPool,
  outputPath: string,
  options?: { compress?: boolean; encrypt?: boolean; encryptionKey?: string }
): Promise<ToolResponse> {
  try {
    const creator = new BackupCreator(pool);
    const backup = await creator.createBackup({ outputPath, ...options });

    return {
      content: [{ type: "text", text: `✅ Backup created: ${backup.backupId}\nPath: ${outputPath}\nSize: ${backup.size} bytes` }],
      _meta: backup,
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Backup failed: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
}
