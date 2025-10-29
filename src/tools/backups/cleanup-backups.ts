import fs from "node:fs/promises";
import type { ToolResponse } from "../../types/mcp.js";
import { logger } from "../../lib/utils/logger.js";

export async function cleanupBackups(
  backupPath: string,
  retentionDays: number
): Promise<ToolResponse> {
  try {
    const files = await fs.readdir(backupPath);
    const now = Date.now();
    const retentionMs = retentionDays * 24 * 60 * 60 * 1000;
    let deleted = 0;

    for (const file of files) {
      const filePath = `${backupPath}/${file}`;
      const stats = await fs.stat(filePath);
      const age = now - stats.mtimeMs;

      if (age > retentionMs) {
        await fs.unlink(filePath);
        deleted++;
      }
    }

    logger.info("Backup cleanup completed", { deleted, retentionDays });

    return {
      content: [{ type: "text", text: `✅ Cleaned up ${deleted} old backups (retention: ${retentionDays} days)` }],
      _meta: { deleted, retentionDays },
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Cleanup failed: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
}
