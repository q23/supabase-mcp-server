/**
 * Migration Runner
 * Executes migrations with rollback support
 */

import type { PostgresConnectionPool } from "../postgres/connection-pool.js";
import type { MigrationRecord } from "../../types/supabase.js";
import { MigrationVersionTracker } from "./version-tracker.js";
import { logger } from "../utils/logger.js";

export class MigrationRunner {
  private pool: PostgresConnectionPool;
  private tracker: MigrationVersionTracker;

  constructor(pool: PostgresConnectionPool) {
    this.pool = pool;
    this.tracker = new MigrationVersionTracker(pool);
  }

  async runMigration(migration: MigrationRecord): Promise<void> {
    const client = await this.pool.getClient();
    const startTime = Date.now();

    try {
      await client.query("BEGIN");
      await client.query(migration.sqlUp);
      await client.query("COMMIT");

      const durationMs = Date.now() - startTime;
      await this.tracker.recordMigration({ ...migration, durationMs, status: "applied" });

      logger.info("Migration applied", { version: migration.version, durationMs });
    } catch (error) {
      await client.query("ROLLBACK");
      logger.error("Migration failed", error as Error);
      throw error;
    } finally {
      client.release();
    }
  }

  async rollback(migration: MigrationRecord): Promise<void> {
    if (!migration.sqlDown) {
      throw new Error("No rollback SQL provided");
    }

    const client = await this.pool.getClient();

    try {
      await client.query("BEGIN");
      await client.query(migration.sqlDown);
      await client.query("COMMIT");

      logger.info("Migration rolled back", { version: migration.version });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
