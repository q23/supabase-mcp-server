/**
 * PostgreSQL Connection Pool
 * Wrapper around pg.Pool with monitoring and error handling
 */

import pg from "pg";
import type { ConnectionConfig } from "../../types/config.js";
import { ConnectionError } from "../errors/connection-error.js";
import { logger } from "../utils/logger.js";

const { Pool } = pg;

/**
 * Connection Pool Wrapper
 */
export class PostgresConnectionPool {
  private pool: pg.Pool;
  private config: ConnectionConfig;
  private connected: boolean = false;

  constructor(config: ConnectionConfig) {
    this.config = config;

    // Create pool configuration
    const poolConfig: pg.PoolConfig = {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl,
      min: config.pool?.min ?? 2,
      max: config.pool?.max ?? 100,
      idleTimeoutMillis: config.pool?.idleTimeoutMillis ?? 10000,
      connectionTimeoutMillis: config.pool?.connectionTimeoutMillis ?? 30000,
    };

    // Use connection string if provided
    if (config.connectionString) {
      this.pool = new Pool({ connectionString: config.connectionString, ...poolConfig });
    } else {
      this.pool = new Pool(poolConfig);
    }

    // Set up error handling
    this.pool.on("error", (err) => {
      logger.error("Unexpected error on idle client", err, {
        host: config.host,
        database: config.database,
      });
    });

    this.pool.on("connect", () => {
      if (!this.connected) {
        this.connected = true;
        logger.info("PostgreSQL connection pool established", {
          host: config.host,
          database: config.database,
          poolSize: config.pool?.max ?? 100,
        });
      }
    });

    this.pool.on("remove", () => {
      logger.debug("Client removed from pool");
    });
  }

  /**
   * Get pool instance
   */
  getPool(): pg.Pool {
    return this.pool;
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<void> {
    try {
      const client = await this.pool.connect();
      try {
        await client.query("SELECT 1");
        logger.info("PostgreSQL connection test successful", {
          host: this.config.host,
          database: this.config.database,
        });
      } finally {
        client.release();
      }
    } catch (error) {
      throw ConnectionError.fromPostgresError(error as Error & { code?: string });
    }
  }

  /**
   * Execute query
   */
  async query<T = unknown>(text: string, values?: unknown[]): Promise<pg.QueryResult<T>> {
    const startTime = Date.now();

    try {
      const result = await this.pool.query<T>(text, values);
      const duration = Date.now() - startTime;

      logger.debug("Query executed", {
        command: result.command,
        rowCount: result.rowCount,
        durationMs: duration,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error("Query failed", error as Error, {
        durationMs: duration,
        query: text.substring(0, 100), // Log first 100 chars
      });

      throw ConnectionError.fromPostgresError(error as Error & { code?: string });
    }
  }

  /**
   * Get a client from the pool (for transactions)
   */
  async getClient(): Promise<pg.PoolClient> {
    try {
      return await this.pool.connect();
    } catch (error) {
      throw ConnectionError.fromPostgresError(error as Error & { code?: string });
    }
  }

  /**
   * Get connection pool status
   */
  getPoolStatus(): {
    totalCount: number;
    idleCount: number;
    waitingCount: number;
  } {
    return {
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount,
    };
  }

  /**
   * Check pool health
   */
  isHealthy(): boolean {
    const status = this.getPoolStatus();
    const maxConnections = this.config.pool?.max ?? 100;
    const usagePercentage = (status.totalCount / maxConnections) * 100;

    // Healthy if usage is below 90%
    return usagePercentage < 90;
  }

  /**
   * Get pool metrics
   */
  async getMetrics(): Promise<{
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    waitingConnections: number;
    usagePercentage: number;
    maxConnections: number;
  }> {
    const status = this.getPoolStatus();
    const maxConnections = this.config.pool?.max ?? 100;

    return {
      totalConnections: status.totalCount,
      activeConnections: status.totalCount - status.idleCount,
      idleConnections: status.idleCount,
      waitingConnections: status.waitingCount,
      usagePercentage: (status.totalCount / maxConnections) * 100,
      maxConnections,
    };
  }

  /**
   * Close pool
   */
  async close(): Promise<void> {
    await this.pool.end();
    this.connected = false;
    logger.info("PostgreSQL connection pool closed");
  }
}
