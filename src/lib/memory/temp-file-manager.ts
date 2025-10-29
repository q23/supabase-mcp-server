/**
 * Temp File Manager
 * Manages temporary files with automatic cleanup
 */

import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { logger } from "../utils/logger.js";

/**
 * Temp File Info
 */
export interface TempFileInfo {
  /** File path */
  path: string;
  /** Creation timestamp */
  createdAt: Date;
  /** File size (bytes) */
  size: number;
  /** File purpose/context */
  purpose?: string;
}

/**
 * Temp File Manager Class
 */
export class TempFileManager {
  private tempDir: string;
  private cleanupIntervalMs: number;
  private retentionMs: number;
  private trackedFiles: Map<string, TempFileInfo>;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(
    tempDir = "./.mcp-temp",
    cleanupIntervalMs = 3600000, // 1 hour
    retentionMs = 86400000 // 24 hours
  ) {
    this.tempDir = tempDir;
    this.cleanupIntervalMs = cleanupIntervalMs;
    this.retentionMs = retentionMs;
    this.trackedFiles = new Map();
  }

  /**
   * Initialize temp file manager
   */
  async initialize(): Promise<void> {
    // Create temp directory
    await fs.mkdir(this.tempDir, { recursive: true });

    // Start cleanup timer
    this.startCleanupTimer();

    // Scan for orphaned files
    await this.scanOrphanedFiles();

    logger.info("Temp file manager initialized", {
      tempDir: this.tempDir,
      cleanupIntervalMs: this.cleanupIntervalMs,
      retentionMs: this.retentionMs,
    });
  }

  /**
   * Create a temp file
   */
  async createTempFile(purpose?: string, extension = ".tmp"): Promise<TempFileInfo> {
    const filename = `${crypto.randomUUID()}${extension}`;
    const filePath = path.join(this.tempDir, filename);

    const info: TempFileInfo = {
      path: filePath,
      createdAt: new Date(),
      size: 0,
      purpose,
    };

    this.trackedFiles.set(filePath, info);

    logger.debug("Temp file created", { path: filePath, purpose });

    return info;
  }

  /**
   * Delete a temp file
   */
  async deleteTempFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
      this.trackedFiles.delete(filePath);
      logger.debug("Temp file deleted", { path: filePath });
    } catch (error) {
      logger.warn("Failed to delete temp file", undefined, {
        path: filePath,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Cleanup old temp files
   */
  async cleanup(): Promise<{ deleted: number; errors: number }> {
    const now = Date.now();
    let deleted = 0;
    let errors = 0;

    for (const [filePath, info] of this.trackedFiles.entries()) {
      const age = now - info.createdAt.getTime();

      if (age > this.retentionMs) {
        try {
          await this.deleteTempFile(filePath);
          deleted++;
        } catch {
          errors++;
        }
      }
    }

    if (deleted > 0) {
      logger.info("Temp file cleanup completed", { deleted, errors });
    }

    return { deleted, errors };
  }

  /**
   * Scan for orphaned files (files not tracked)
   */
  private async scanOrphanedFiles(): Promise<void> {
    try {
      const files = await fs.readdir(this.tempDir);
      const now = Date.now();
      let orphaned = 0;

      for (const file of files) {
        const filePath = path.join(this.tempDir, file);

        // Skip if already tracked
        if (this.trackedFiles.has(filePath)) {
          continue;
        }

        // Check file age
        const stats = await fs.stat(filePath);
        const age = now - stats.mtimeMs;

        if (age > this.retentionMs) {
          await fs.unlink(filePath);
          orphaned++;
        }
      }

      if (orphaned > 0) {
        logger.info("Orphaned temp files cleaned up", { count: orphaned });
      }
    } catch (error) {
      logger.warn("Failed to scan orphaned files", error as Error);
    }
  }

  /**
   * Start automatic cleanup timer
   */
  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup().catch((error) => {
        logger.error("Temp file cleanup failed", error as Error);
      });
    }, this.cleanupIntervalMs);

    // Unref timer so it doesn't keep process alive
    this.cleanupTimer.unref();
  }

  /**
   * Stop cleanup timer
   */
  stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Get stats
   */
  getStats(): {
    trackedFiles: number;
    totalSize: number;
    oldestFile?: Date;
  } {
    let totalSize = 0;
    let oldestFile: Date | undefined;

    for (const info of this.trackedFiles.values()) {
      totalSize += info.size;
      if (!oldestFile || info.createdAt < oldestFile) {
        oldestFile = info.createdAt;
      }
    }

    return {
      trackedFiles: this.trackedFiles.size,
      totalSize,
      oldestFile,
    };
  }

  /**
   * Shutdown and cleanup
   */
  async shutdown(): Promise<void> {
    this.stopCleanupTimer();
    await this.cleanup();
    logger.info("Temp file manager shut down");
  }
}

/**
 * Global temp file manager instance
 */
export const tempFileManager = new TempFileManager();
