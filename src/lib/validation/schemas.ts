/**
 * Zod Validation Schemas
 * Base schemas for validating configuration and inputs
 */

import { z } from "zod";

/**
 * Connection String Schemas
 */

// PostgreSQL connection URL format
export const postgresConnectionStringSchema = z
  .string()
  .regex(
    /^postgres(ql)?:\/\/([^:]+):([^@]+)@([^:\/]+):(\d+)\/([^\?]+)(\?.*)?$/,
    "Invalid PostgreSQL connection string format"
  );

// Component-based connection config
export const connectionComponentsSchema = z.object({
  host: z.string().min(1, "Host is required"),
  port: z.number().int().min(1).max(65535, "Port must be between 1 and 65535"),
  database: z.string().min(1, "Database name is required"),
  user: z.string().min(1, "User is required"),
  password: z.string().min(1, "Password is required"),
});

/**
 * URL Schemas
 */

// HTTP/HTTPS URL
export const httpUrlSchema = z
  .string()
  .url("Invalid URL format")
  .refine((url) => url.startsWith("http://") || url.startsWith("https://"), {
    message: "URL must start with http:// or https://",
  });

// HTTPS-only URL (for production)
export const httpsUrlSchema = z
  .string()
  .url("Invalid URL format")
  .refine((url) => url.startsWith("https://"), {
    message: "URL must use HTTPS in production",
  });

// Domain name
export const domainSchema = z
  .string()
  .min(1, "Domain is required")
  .regex(/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i, {
    message: "Invalid domain name format",
  });

/**
 * Project Name Schema
 */

export const projectNameSchema = z
  .string()
  .min(3, "Project name must be at least 3 characters")
  .max(32, "Project name must be at most 32 characters")
  .regex(/^[a-z0-9-]+$/, {
    message: "Project name must contain only lowercase letters, numbers, and hyphens",
  })
  .refine((name) => !name.startsWith("-") && !name.endsWith("-"), {
    message: "Project name cannot start or end with a hyphen",
  })
  .refine((name) => !name.includes("--"), {
    message: "Project name cannot contain consecutive hyphens",
  });

/**
 * Supabase Configuration Schemas
 */

export const supabaseConfigSchema = z.object({
  url: httpUrlSchema,
  anonKey: z.string().min(1, "Anon key is required"),
  serviceRoleKey: z.string().optional(),
  projectRef: z.string().optional(),
});

/**
 * Dokploy Configuration Schemas
 */

export const dokployConfigSchema = z.object({
  apiUrl: httpUrlSchema,
  apiKey: z.string().min(1, "API key is required"),
  instanceName: z.string().optional(),
  rateLimit: z
    .object({
      requestsPerSecond: z.number().int().min(1).max(1000).default(10),
      burstCapacity: z.number().int().min(1).max(2000).default(20),
    })
    .optional(),
});

/**
 * PostgreSQL Configuration Schema
 */

export const postgresConfigSchema = z.object({
  host: z.string().min(1, "Host is required"),
  port: z.number().int().min(1).max(65535).default(5432),
  database: z.string().min(1, "Database name is required").default("postgres"),
  user: z.string().min(1, "User is required").default("postgres"),
  password: z.string().min(1, "Password is required"),
  pooled: z.boolean().default(false),
  connectionString: z.string().optional(),
  ssl: z
    .object({
      rejectUnauthorized: z.boolean().default(true),
      ca: z.string().optional(),
      cert: z.string().optional(),
      key: z.string().optional(),
    })
    .optional(),
  pool: z
    .object({
      min: z.number().int().min(0).default(2),
      max: z.number().int().min(1).max(500).default(100),
      idleTimeoutMillis: z.number().int().min(0).default(10000),
      connectionTimeoutMillis: z.number().int().min(0).default(30000),
    })
    .optional(),
});

/**
 * Environment Variable Schema
 */

export const environmentVariablesSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).optional(),

  // Supabase
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // PostgreSQL
  POSTGRES_HOST: z.string().optional(),
  POSTGRES_PORT: z.string().regex(/^\d+$/).optional(),
  POSTGRES_DATABASE: z.string().optional(),
  POSTGRES_USER: z.string().optional(),
  POSTGRES_PASSWORD: z.string().optional(),
  POSTGRES_POOLED_PORT: z.string().regex(/^\d+$/).optional(),

  // Dokploy
  DOKPLOY_API_URL: z.string().url().optional(),
  DOKPLOY_API_KEY: z.string().optional(),
  DOKPLOY_INSTANCE_NAME: z.string().optional(),

  // Server
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).optional(),
  MAX_BUFFER_SIZE: z.string().regex(/^\d+$/).optional(),
  TEMP_FILE_PATH: z.string().optional(),
  CLEANUP_INTERVAL: z.string().regex(/^\d+$/).optional(),

  // Security
  READ_ONLY_MODE: z.string().regex(/^(true|false)$/).optional(),
  REQUIRE_CONFIRMATION: z.string().regex(/^(true|false)$/).optional(),
  AUDIT_LOG_RETENTION_DAYS: z.string().regex(/^\d+$/).optional(),

  // Backup
  BACKUP_PATH: z.string().optional(),
  BACKUP_RETENTION_DAYS: z.string().regex(/^\d+$/).optional(),
  BACKUP_ENCRYPTION_KEY: z.string().optional(),

  // S3
  S3_ENDPOINT: z.string().url().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_REGION: z.string().optional(),

  // Monitoring
  ALERT_WEBHOOK_URL: z.string().url().optional(),
  CONNECTION_POOL_WARNING_THRESHOLD: z.string().regex(/^\d+$/).optional(),

  // Rate limiting
  RATE_LIMIT_RPS: z.string().regex(/^\d+$/).optional(),
  RATE_LIMIT_BURST: z.string().regex(/^\d+$/).optional(),
});

/**
 * Backup Configuration Schema
 */

export const backupConfigSchema = z.object({
  storagePath: z.string().min(1, "Storage path is required"),
  retentionDays: z.number().int().min(1, "Retention days must be at least 1").default(30),
  encryptionKey: z.string().min(32, "Encryption key must be at least 32 characters").optional(),
  s3: z
    .object({
      endpoint: z.string().url("Invalid S3 endpoint"),
      bucket: z.string().min(1, "Bucket name is required"),
      accessKeyId: z.string().min(1, "Access key ID is required"),
      secretAccessKey: z.string().min(1, "Secret access key is required"),
      region: z.string().min(1, "Region is required"),
    })
    .optional(),
});

/**
 * Email/SMTP Configuration Schema
 */

export const smtpConfigSchema = z.object({
  host: z.string().min(1, "SMTP host is required"),
  port: z.number().int().min(1).max(65535),
  user: z.string().email("Invalid email address").optional(),
  password: z.string().optional(),
  from: z.string().email("Invalid from email address"),
  secure: z.boolean().default(true),
});

/**
 * JWT Payload Schema
 */

export const jwtPayloadSchema = z.object({
  role: z.enum(["anon", "authenticated", "service_role"]),
  iss: z.literal("supabase"),
  iat: z.number().int(),
  exp: z.number().int(),
});

/**
 * Tool Input Schemas
 * These are examples - actual tool schemas will be defined per tool
 */

export const healthCheckInputSchema = z.object({});

export const connectInputSchema = z.object({
  connectionString: z.string().optional(),
  host: z.string().optional(),
  port: z.number().int().optional(),
  database: z.string().optional(),
  user: z.string().optional(),
  password: z.string().optional(),
});

export const executeSqlInputSchema = z.object({
  query: z.string().min(1, "Query is required"),
  params: z.array(z.unknown()).optional(),
  timeout: z.number().int().min(0).optional(),
});
