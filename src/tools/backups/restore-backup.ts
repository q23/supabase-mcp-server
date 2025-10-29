import type { PostgresConnectionPool } from "../../lib/postgres/connection-pool.js";
import { BackupRestorer } from "../../lib/backups/restorer.js";
import type { BackupRecord } from "../../types/supabase.js";
import type { ToolResponse } from "../../types/mcp.js";

export async function restoreBackup(
  backup: BackupRecord,
  pool: PostgresConnectionPool,
  options?: { decryptionKey?: string; dryRun?: boolean }
): Promise<ToolResponse> {
  try {
    const restorer = new BackupRestorer(pool);
    const compatibility = await restorer.validateCompatibility(backup);

    if (!compatibility.compatible) {
      return {
        content: [{ type: "text", text: `⚠️ Compatibility issues:\n${compatibility.issues.join("\n")}` }],
        isError: true,
      };
    }

    const result = await restorer.restore(backup, options || {});

    return {
      content: [{ type: "text", text: `✅ Backup restored: ${backup.backupId}\nRows: ${result.rowsRestored}` }],
      _meta: result,
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Restore failed: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
}
