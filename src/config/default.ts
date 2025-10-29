/**
 * Default Configuration
 * Default values for MCP server configuration
 */

import type { MCPServerConfig } from "../types/config.js";

/**
 * Default MCP Server Configuration
 */
export const defaultConfig: MCPServerConfig = {
  name: "supabase-mcp-server",
  version: "0.1.0",
  environment: "development",

  logging: {
    level: "info",
    suppressSecrets: true,
  },

  memory: {
    maxBufferSize: 512 * 1024, // 512KB
    tempFilePath: "./.mcp-temp",
    cleanupInterval: 3600, // 1 hour
  },

  security: {
    readOnlyMode: false,
    requireConfirmation: true,
    auditLogRetentionDays: 90,
  },

  backup: {
    storagePath: "./backups",
    retentionDays: 30,
  },

  monitoring: {
    connectionPoolWarningThreshold: 90, // 90%
  },
};

/**
 * Get configuration value from environment or default
 */
export function getEnvOrDefault<T>(envKey: string, defaultValue: T, parser?: (val: string) => T): T {
  const envValue = process.env[envKey];

  if (!envValue) {
    return defaultValue;
  }

  if (parser) {
    try {
      return parser(envValue);
    } catch {
      return defaultValue;
    }
  }

  return envValue as T;
}

/**
 * Parse boolean from environment variable
 */
export function parseBoolean(value: string): boolean {
  return value.toLowerCase() === "true" || value === "1";
}

/**
 * Parse integer from environment variable
 */
export function parseInteger(value: string): number {
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Build configuration from environment and defaults
 */
export function buildConfig(): MCPServerConfig {
  return {
    name: getEnvOrDefault("SERVER_NAME", defaultConfig.name),
    version: defaultConfig.version, // Always use package version
    environment: getEnvOrDefault(
      "NODE_ENV",
      defaultConfig.environment,
      (val) => val as "development" | "production" | "test"
    ),

    logging: {
      level: getEnvOrDefault(
        "LOG_LEVEL",
        defaultConfig.logging.level,
        (val) => val as "debug" | "info" | "warn" | "error"
      ),
      suppressSecrets: getEnvOrDefault(
        "SUPPRESS_SECRETS",
        defaultConfig.logging.suppressSecrets,
        parseBoolean
      ),
    },

    memory: {
      maxBufferSize: getEnvOrDefault(
        "MAX_BUFFER_SIZE",
        defaultConfig.memory.maxBufferSize,
        parseInteger
      ),
      tempFilePath: getEnvOrDefault("TEMP_FILE_PATH", defaultConfig.memory.tempFilePath),
      cleanupInterval: getEnvOrDefault(
        "CLEANUP_INTERVAL",
        defaultConfig.memory.cleanupInterval,
        parseInteger
      ),
    },

    security: {
      readOnlyMode: getEnvOrDefault(
        "READ_ONLY_MODE",
        defaultConfig.security.readOnlyMode,
        parseBoolean
      ),
      requireConfirmation: getEnvOrDefault(
        "REQUIRE_CONFIRMATION",
        defaultConfig.security.requireConfirmation,
        parseBoolean
      ),
      auditLogRetentionDays: getEnvOrDefault(
        "AUDIT_LOG_RETENTION_DAYS",
        defaultConfig.security.auditLogRetentionDays,
        parseInteger
      ),
    },

    backup: {
      storagePath: getEnvOrDefault("BACKUP_PATH", defaultConfig.backup!.storagePath),
      retentionDays: getEnvOrDefault(
        "BACKUP_RETENTION_DAYS",
        defaultConfig.backup!.retentionDays,
        parseInteger
      ),
      encryptionKey: process.env.BACKUP_ENCRYPTION_KEY,
      s3: process.env.S3_ENDPOINT
        ? {
            endpoint: process.env.S3_ENDPOINT,
            bucket: process.env.S3_BUCKET!,
            accessKeyId: process.env.S3_ACCESS_KEY_ID!,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
            region: process.env.S3_REGION || "us-east-1",
          }
        : undefined,
    },

    monitoring: {
      webhookUrl: process.env.ALERT_WEBHOOK_URL,
      connectionPoolWarningThreshold: getEnvOrDefault(
        "CONNECTION_POOL_WARNING_THRESHOLD",
        defaultConfig.monitoring!.connectionPoolWarningThreshold,
        parseInteger
      ),
    },
  };
}
