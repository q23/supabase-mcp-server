/**
 * Migration Version Tracker
 * Tracks migration history with version numbers
 */

import type { PostgresConnectionPool } from "../postgres/connection-pool.js";
import type { MigrationRecord } from "../../types/supabase.js";
// import { Encryption } from "../utils/encryption.js";

export class MigrationVersionTracker {
  private pool: PostgresConnectionPool;

  constructor(pool: PostgresConnectionPool) {
    this.pool = pool;
  }

  async initialize(): Promise<void> {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        version VARCHAR(255) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP DEFAULT NOW(),
        checksum VARCHAR(64) NOT NULL,
        duration_ms INTEGER,
        status VARCHAR(20) DEFAULT 'applied'
      )
    `);
  }

  async recordMigration(migration: MigrationRecord): Promise<void> {
    await this.pool.query(
      `INSERT INTO _migrations (version, name, checksum, duration_ms, status)
       VALUES ($1, $2, $3, $4, $5)`,
      [migration.version, migration.name, migration.checksum, migration.durationMs, migration.status]
    );
  }

  async getAppliedMigrations(): Promise<MigrationRecord[]> {
    const result = await this.pool.query<any>(
      `SELECT * FROM _migrations ORDER BY applied_at ASC`
    );

    return result.rows.map((row) => ({
      migrationId: row.id.toString(),
      version: row.version,
      name: row.name,
      timestamp: row.applied_at,
      direction: "up",
      status: row.status,
      sqlUp: "",
      checksum: row.checksum,
      durationMs: row.duration_ms,
      appliedAt: row.applied_at,
    }));
  }
}
