/**
 * Configuration Types
 * Core configuration structures for MCP server, Dokploy, and database connections
 */

/**
 * Dokploy API Configuration
 */
export interface DokployConfig {
  /** Dokploy API base URL (e.g., https://dokploy.example.com) */
  apiUrl: string;
  /** Dokploy API authentication key */
  apiKey: string;
  /** Optional instance name for multi-instance management */
  instanceName?: string;
  /** Rate limit configuration */
  rateLimit?: {
    /** Requests per second (default: 10) */
    requestsPerSecond: number;
    /** Burst capacity (default: 20) */
    burstCapacity: number;
  };
}

/**
 * Supabase Instance Configuration
 */
export interface SupabaseConfig {
  /** Supabase project URL */
  url: string;
  /** Anonymous (public) API key */
  anonKey: string;
  /** Service role key (admin access) */
  serviceRoleKey?: string;
  /** Project reference ID */
  projectRef?: string;
}

/**
 * PostgreSQL Connection Configuration
 */
export interface ConnectionConfig {
  /** Database host (domain or IP) */
  host: string;
  /** Database port (5432 for direct, 6543 for pooled) */
  port: number;
  /** Database name */
  database: string;
  /** Database user */
  user: string;
  /** Database password */
  password: string;
  /** Use pooled connection (PgBouncer/Supavisor) */
  pooled: boolean;
  /** Constructed connection string */
  connectionString?: string;
  /** SSL/TLS configuration */
  ssl?: {
    rejectUnauthorized: boolean;
    ca?: string;
    cert?: string;
    key?: string;
  };
  /** Connection pool settings */
  pool?: {
    min: number;
    max: number;
    idleTimeoutMillis: number;
    connectionTimeoutMillis: number;
  };
}

/**
 * MCP Server Configuration
 */
export interface MCPServerConfig {
  /** Server name */
  name: string;
  /** Server version */
  version: string;
  /** Environment (development | production | test) */
  environment: "development" | "production" | "test";
  /** Logging configuration */
  logging: {
    level: "debug" | "info" | "warn" | "error";
    /** Suppress sensitive data in logs */
    suppressSecrets: boolean;
  };
  /** Memory management */
  memory: {
    /** Maximum in-memory buffer size (bytes) */
    maxBufferSize: number;
    /** Temporary file path for disk spillover */
    tempFilePath: string;
    /** Cleanup interval (seconds) */
    cleanupInterval: number;
  };
  /** Security settings */
  security: {
    /** Enable read-only mode (no write operations) */
    readOnlyMode: boolean;
    /** Require confirmation for destructive operations */
    requireConfirmation: boolean;
    /** Audit log retention (days) */
    auditLogRetentionDays: number;
  };
  /** Backup configuration */
  backup?: {
    /** Backup storage path */
    storagePath: string;
    /** Retention policy (days) */
    retentionDays: number;
    /** Encryption key for backups */
    encryptionKey?: string;
    /** S3-compatible storage config */
    s3?: {
      endpoint: string;
      bucket: string;
      accessKeyId: string;
      secretAccessKey: string;
      region: string;
    };
  };
  /** Monitoring & alerts */
  monitoring?: {
    /** Webhook URL for alerts */
    webhookUrl?: string;
    /** Connection pool warning threshold (percentage) */
    connectionPoolWarningThreshold: number;
  };
}

/**
 * Complete Application Configuration
 */
export interface AppConfig {
  server: MCPServerConfig;
  supabase?: SupabaseConfig;
  postgres?: ConnectionConfig;
  dokploy?: DokployConfig;
}

/**
 * Environment Variable Schema
 */
export interface EnvironmentVariables {
  // Node environment
  NODE_ENV?: "development" | "production" | "test";

  // Supabase
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;

  // PostgreSQL
  POSTGRES_HOST?: string;
  POSTGRES_PORT?: string;
  POSTGRES_DATABASE?: string;
  POSTGRES_USER?: string;
  POSTGRES_PASSWORD?: string;
  POSTGRES_POOLED_PORT?: string;

  // Dokploy
  DOKPLOY_API_URL?: string;
  DOKPLOY_API_KEY?: string;
  DOKPLOY_INSTANCE_NAME?: string;

  // Server
  LOG_LEVEL?: "debug" | "info" | "warn" | "error";
  MAX_BUFFER_SIZE?: string;
  TEMP_FILE_PATH?: string;
  CLEANUP_INTERVAL?: string;

  // Security
  READ_ONLY_MODE?: string;
  REQUIRE_CONFIRMATION?: string;
  AUDIT_LOG_RETENTION_DAYS?: string;

  // Backup
  BACKUP_PATH?: string;
  BACKUP_RETENTION_DAYS?: string;
  BACKUP_ENCRYPTION_KEY?: string;

  // S3
  S3_ENDPOINT?: string;
  S3_BUCKET?: string;
  S3_ACCESS_KEY_ID?: string;
  S3_SECRET_ACCESS_KEY?: string;
  S3_REGION?: string;

  // Monitoring
  ALERT_WEBHOOK_URL?: string;
  CONNECTION_POOL_WARNING_THRESHOLD?: string;

  // Rate limiting
  RATE_LIMIT_RPS?: string;
  RATE_LIMIT_BURST?: string;
}
