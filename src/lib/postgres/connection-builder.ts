/**
 * Connection String Builder
 * Parses multiple PostgreSQL connection string formats and builds connections
 */

import type { ConnectionConfig } from "../../types/config.js";
import { ConnectionError } from "../errors/connection-error.js";
import { logger } from "../utils/logger.js";

/**
 * Connection String Format Types
 */
export type ConnectionStringFormat =
  | "url"
  | "components"
  | "supabase_url"
  | "docker_internal"
  | "pooled"
  | "environment";

/**
 * Connection Builder Class
 */
export class ConnectionBuilder {
  /**
   * Parse connection string into components
   */
  static parseConnectionString(connectionString: string): ConnectionConfig {
    try {
      // Format: postgresql://user:password@host:port/database?options
      const url = new URL(connectionString);

      return {
        host: url.hostname,
        port: parseInt(url.port) || 5432,
        database: url.pathname.slice(1) || "postgres",
        user: url.username,
        password: decodeURIComponent(url.password),
        pooled: false,
        connectionString,
      };
    } catch (error) {
      throw new ConnectionError(
        `Invalid connection string format: ${error instanceof Error ? error.message : String(error)}`,
        "connection_failed",
        {
          suggestions: [
            "Use format: postgresql://user:password@host:port/database",
            "Ensure special characters in password are URL-encoded",
            "Check that the connection string is complete",
          ],
        }
      );
    }
  }

  /**
   * Build connection string from components
   */
  static buildConnectionString(config: ConnectionConfig): string {
    const { host, port, database, user, password } = config;

    // URL-encode password to handle special characters
    const encodedPassword = encodeURIComponent(password);

    return `postgresql://${user}:${encodedPassword}@${host}:${port}/${database}`;
  }

  /**
   * Parse Supabase connection details
   * Format: Uses host, direct port (5432), pooled port (6543)
   */
  static parseSupabaseConnection(
    projectRef: string,
    password: string,
    region = "db"
  ): {
    direct: ConnectionConfig;
    pooled: ConnectionConfig;
  } {
    const host = `${region}.${projectRef}.supabase.co`;

    const direct: ConnectionConfig = {
      host,
      port: 5432,
      database: "postgres",
      user: "postgres",
      password,
      pooled: false,
      ssl: {
        rejectUnauthorized: true,
      },
    };

    const pooled: ConnectionConfig = {
      ...direct,
      port: 6543,
      pooled: true,
    };

    return { direct, pooled };
  }

  /**
   * Detect Docker internal networking
   * Returns 'db' hostname if inside Docker, otherwise uses provided host
   */
  static detectDockerNetworking(config: ConnectionConfig): ConnectionConfig {
    // Check if we're inside a Docker container
    const isDocker = this.isRunningInDocker();

    if (isDocker && (config.host === "localhost" || config.host === "127.0.0.1")) {
      logger.info("Docker environment detected, using internal hostname 'db'");

      return {
        ...config,
        host: "db",
      };
    }

    return config;
  }

  /**
   * Check if running inside Docker
   */
  private static isRunningInDocker(): boolean {
    try {
      // Check for .dockerenv file
      const fs = require("node:fs");
      if (fs.existsSync("/.dockerenv")) {
        return true;
      }

      // Check cgroup for docker
      const cgroup = fs.readFileSync("/proc/self/cgroup", "utf8");
      return cgroup.includes("docker");
    } catch {
      return false;
    }
  }

  /**
   * Build connection from environment variables
   */
  static fromEnvironment(): ConnectionConfig {
    const host = process.env.POSTGRES_HOST;
    const port = process.env.POSTGRES_PORT;
    const database = process.env.POSTGRES_DATABASE;
    const user = process.env.POSTGRES_USER;
    const password = process.env.POSTGRES_PASSWORD;

    if (!host || !password) {
      throw new ConnectionError(
        "Missing required PostgreSQL connection environment variables",
        "invalid_credentials",
        {
          context: {
            host: !!host,
            password: !!password,
            port: !!port,
            database: !!database,
            user: !!user,
          },
          suggestions: [
            "Set POSTGRES_HOST environment variable",
            "Set POSTGRES_PASSWORD environment variable",
            "Check .env file is loaded correctly",
            "See .env.example for required variables",
          ],
        }
      );
    }

    return {
      host,
      port: port ? parseInt(port) : 5432,
      database: database || "postgres",
      user: user || "postgres",
      password,
      pooled: false,
    };
  }

  /**
   * Create pooled connection config
   */
  static toPooled(config: ConnectionConfig): ConnectionConfig {
    const pooledPort = parseInt(process.env.POSTGRES_POOLED_PORT || "6543");

    return {
      ...config,
      port: pooledPort,
      pooled: true,
    };
  }

  /**
   * Test connection configuration
   */
  static async testConnection(config: ConnectionConfig): Promise<{
    success: boolean;
    latencyMs: number;
    error?: string;
  }> {
    const pg = require("pg");
    const startTime = Date.now();

    try {
      const client = new pg.Client({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.user,
        password: config.password,
        ssl: config.ssl,
        connectionTimeoutMillis: 5000,
      });

      await client.connect();
      await client.query("SELECT 1");
      await client.end();

      const latencyMs = Date.now() - startTime;

      logger.info("Connection test successful", {
        host: config.host,
        port: config.port,
        database: config.database,
        latencyMs,
      });

      return { success: true, latencyMs };
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      return {
        success: false,
        latencyMs,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Auto-detect best connection format
   */
  static autoDetect(): ConnectionConfig {
    // Priority order:
    // 1. Full connection string (SUPABASE_URL or DATABASE_URL)
    // 2. Component variables (POSTGRES_HOST, etc.)
    // 3. Supabase-specific (SUPABASE_URL + password)

    // Check for full connection string
    const connectionString = process.env.DATABASE_URL || process.env.CONNECTION_STRING;
    if (connectionString) {
      logger.info("Using connection string from DATABASE_URL");
      return this.parseConnectionString(connectionString);
    }

    // Check for Supabase URL
    const supabaseUrl = process.env.SUPABASE_URL;
    if (supabaseUrl && process.env.POSTGRES_PASSWORD) {
      logger.info("Using Supabase URL connection");
      // Extract project ref from URL (e.g., https://abc123.supabase.co)
      const match = supabaseUrl.match(/https?:\/\/([^.]+)\.supabase\.co/);
      if (match) {
        const projectRef = match[1];
        const { direct } = this.parseSupabaseConnection(projectRef, process.env.POSTGRES_PASSWORD);
        return direct;
      }
    }

    // Fall back to component variables
    logger.info("Using component-based connection");
    return this.fromEnvironment();
  }

  /**
   * Parse all common formats
   */
  static parseFormat(format: ConnectionStringFormat, input: string | Record<string, string>): ConnectionConfig {
    switch (format) {
      case "url":
        if (typeof input !== "string") {
          throw new Error("URL format requires string input");
        }
        return this.parseConnectionString(input);

      case "components":
        if (typeof input !== "object") {
          throw new Error("Components format requires object input");
        }
        return {
          host: input.host || "localhost",
          port: parseInt(input.port || "5432"),
          database: input.database || "postgres",
          user: input.user || "postgres",
          password: input.password,
          pooled: false,
        };

      case "supabase_url":
        if (typeof input !== "object") {
          throw new Error("Supabase format requires object with projectRef and password");
        }
        const { direct } = this.parseSupabaseConnection(input.projectRef, input.password);
        return direct;

      case "docker_internal":
        if (typeof input !== "object") {
          throw new Error("Docker format requires base config object");
        }
        const baseConfig = this.parseFormat("components", input);
        return this.detectDockerNetworking(baseConfig);

      case "pooled":
        if (typeof input !== "object") {
          throw new Error("Pooled format requires base config object");
        }
        const directConfig = this.parseFormat("components", input);
        return this.toPooled(directConfig);

      case "environment":
        return this.fromEnvironment();

      default:
        throw new Error(`Unknown connection string format: ${format}`);
    }
  }
}
