/**
 * Buffer Manager
 * Manages 512KB memory buffer with automatic disk spillover
 */

import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { logger } from "../utils/logger.js";

/**
 * Buffer Manager Configuration
 */
export interface BufferManagerConfig {
  /** Maximum buffer size in bytes (default: 512KB) */
  maxBufferSize: number;
  /** Temp file path for spillover */
  tempFilePath: string;
  /** Auto-cleanup on finish */
  autoCleanup: boolean;
}

/**
 * Buffer State
 */
type BufferState = "memory" | "disk" | "hybrid";

/**
 * Buffer Manager Class
 * Automatically spills to disk when exceeding memory threshold
 */
export class BufferManager {
  private config: BufferManagerConfig;
  private buffer: Buffer[];
  private currentSize: number;
  private state: BufferState;
  private tempFilePath?: string;
  private tempFileHandle?: fs.FileHandle;

  constructor(config: Partial<BufferManagerConfig> = {}) {
    this.config = {
      maxBufferSize: config.maxBufferSize || 512 * 1024, // 512KB default
      tempFilePath: config.tempFilePath || "./.mcp-temp",
      autoCleanup: config.autoCleanup ?? true,
    };

    this.buffer = [];
    this.currentSize = 0;
    this.state = "memory";
  }

  /**
   * Write data to buffer (auto-spills to disk if needed)
   */
  async write(data: Buffer | string): Promise<void> {
    const chunk = typeof data === "string" ? Buffer.from(data, "utf8") : data;

    // Check if adding this chunk exceeds memory limit
    if (this.currentSize + chunk.length > this.config.maxBufferSize && this.state === "memory") {
      logger.debug("Buffer exceeds memory limit, spilling to disk", {
        currentSize: this.currentSize,
        chunkSize: chunk.length,
        maxBufferSize: this.config.maxBufferSize,
      });

      await this.spillToDisk();
    }

    if (this.state === "memory") {
      // Still in memory
      this.buffer.push(chunk);
      this.currentSize += chunk.length;
    } else {
      // Writing to disk
      if (!this.tempFileHandle) {
        throw new Error("Temp file not initialized for disk spillover");
      }
      await this.tempFileHandle.write(chunk);
      this.currentSize += chunk.length;
    }
  }

  /**
   * Read all data from buffer
   */
  async read(): Promise<Buffer> {
    if (this.state === "memory") {
      return Buffer.concat(this.buffer);
    }

    // Read from temp file
    if (!this.tempFilePath) {
      throw new Error("No temp file path available");
    }

    return await fs.readFile(this.tempFilePath);
  }

  /**
   * Get current buffer size
   */
  getSize(): number {
    return this.currentSize;
  }

  /**
   * Get buffer state
   */
  getState(): BufferState {
    return this.state;
  }

  /**
   * Check if buffer is in memory
   */
  isInMemory(): boolean {
    return this.state === "memory";
  }

  /**
   * Spill buffer contents to disk
   */
  private async spillToDisk(): Promise<void> {
    // Create temp directory if it doesn't exist
    await fs.mkdir(this.config.tempFilePath, { recursive: true });

    // Generate unique temp file name
    const filename = `buffer-${crypto.randomUUID()}.tmp`;
    this.tempFilePath = path.join(this.config.tempFilePath, filename);

    // Open file for writing
    this.tempFileHandle = await fs.open(this.tempFilePath, "w");

    // Write existing buffer to disk
    if (this.buffer.length > 0) {
      const data = Buffer.concat(this.buffer);
      await this.tempFileHandle.write(data);
    }

    // Clear memory buffer
    this.buffer = [];

    // Update state
    this.state = "disk";

    logger.info("Buffer spilled to disk", {
      tempFilePath: this.tempFilePath,
      size: this.currentSize,
    });
  }

  /**
   * Finish writing and return path (if spilled to disk)
   */
  async finish(): Promise<{ inMemory: boolean; data?: Buffer; filePath?: string }> {
    if (this.state === "memory") {
      const data = Buffer.concat(this.buffer);
      if (this.config.autoCleanup) {
        await this.cleanup();
      }
      return { inMemory: true, data };
    }

    // Close temp file handle
    if (this.tempFileHandle) {
      await this.tempFileHandle.close();
      this.tempFileHandle = undefined;
    }

    return { inMemory: false, filePath: this.tempFilePath };
  }

  /**
   * Cleanup temp file and reset buffer
   */
  async cleanup(): Promise<void> {
    // Close file handle if open
    if (this.tempFileHandle) {
      await this.tempFileHandle.close();
      this.tempFileHandle = undefined;
    }

    // Delete temp file if exists
    if (this.tempFilePath) {
      try {
        await fs.unlink(this.tempFilePath);
        logger.debug("Temp file deleted", { tempFilePath: this.tempFilePath });
      } catch (error) {
        logger.warn("Failed to delete temp file", {
          tempFilePath: this.tempFilePath,
          error: error instanceof Error ? error.message : String(error),
        });
      }
      this.tempFilePath = undefined;
    }

    // Clear memory
    this.buffer = [];
    this.currentSize = 0;
    this.state = "memory";
  }

  /**
   * Create a write stream that automatically handles spillover
   */
  createWriteStream(): NodeJS.WritableStream {
    const manager = this;

    return new (require("stream").Writable)({
      async write(
        chunk: Buffer,
        _encoding: string,
        callback: (error?: Error | null) => void
      ): Promise<void> {
        try {
          await manager.write(chunk);
          callback();
        } catch (error) {
          callback(error as Error);
        }
      },
    });
  }
}
