import type { ToolResponse } from "../../types/mcp.js";
import fs from "node:fs/promises";

export async function listBackups(backupPath: string): Promise<ToolResponse> {
  try {
    const files = await fs.readdir(backupPath);
    const backups = files.filter(f => f.endsWith(".sql") || f.endsWith(".gz"));

    return {
      content: [{ type: "text", text: `Backups: ${backups.length}\n${backups.join("\n")}` }],
      _meta: backups,
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `List backups failed: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
}
