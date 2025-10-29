/**
 * Configuration Schema
 * Zod validation schemas for server configuration
 */

import { z } from "zod";

/**
 * Logging Configuration Schema
 */
export const loggingConfigSchema = z.object({
  level: z.enum(["debug", "info", "warn", "error"]).default("info"),
  suppressSecrets: z.boolean().default(true),
});

/**
 * Memory Configuration Schema
 */
export const memoryConfigSchema = z.object({
  maxBufferSize: z.number().int().min(1024).max(10 * 1024 * 1024).default(512 * 1024), // 1KB - 10MB
  tempFilePath: z.string().min(1).default("./.mcp-temp"),
  cleanupInterval: z.number().int().min(60).max(86400).default(3600), // 1min - 24h
});

/**
 * Security Configuration Schema
 */
export const securityConfigSchema = z.object({
  readOnlyMode: z.boolean().default(false),
  requireConfirmation: z.boolean().default(true),
  auditLogRetentionDays: z.number().int().min(1).max(3650).default(90), // 1 day - 10 years
});

/**
 * S3 Configuration Schema
 */
export const s3ConfigSchema = z.object({
  endpoint: z.string().url(),
  bucket: z.string().min(1),
  accessKeyId: z.string().min(1),
  secretAccessKey: z.string().min(1),
  region: z.string().min(1).default("us-east-1"),
});

/**
 * Backup Configuration Schema
 */
export const backupConfigSchema = z.object({
  storagePath: z.string().min(1).default("./backups"),
  retentionDays: z.number().int().min(1).max(3650).default(30), // 1 day - 10 years
  encryptionKey: z.string().min(32).optional(),
  s3: s3ConfigSchema.optional(),
});

/**
 * Monitoring Configuration Schema
 */
export const monitoringConfigSchema = z.object({
  webhookUrl: z.string().url().optional(),
  connectionPoolWarningThreshold: z.number().int().min(50).max(100).default(90), // 50% - 100%
});

/**
 * MCP Server Configuration Schema
 */
export const mcpServerConfigSchema = z.object({
  name: z.string().min(1).default("supabase-mcp-server"),
  version: z.string().regex(/^\d+\.\d+\.\d+$/).default("0.1.0"),
  environment: z.enum(["development", "production", "test"]).default("development"),
  logging: loggingConfigSchema,
  memory: memoryConfigSchema,
  security: securityConfigSchema,
  backup: backupConfigSchema.optional(),
  monitoring: monitoringConfigSchema.optional(),
});

/**
 * Validate configuration
 */
export function validateConfig(config: unknown): {
  valid: boolean;
  config?: z.infer<typeof mcpServerConfigSchema>;
  errors?: z.ZodError;
} {
  const result = mcpServerConfigSchema.safeParse(config);

  if (result.success) {
    return {
      valid: true,
      config: result.data,
    };
  }

  return {
    valid: false,
    errors: result.error,
  };
}

/**
 * Validate and throw on error
 */
export function validateConfigStrict(config: unknown): z.infer<typeof mcpServerConfigSchema> {
  return mcpServerConfigSchema.parse(config);
}

/**
 * Get default configuration (validated)
 */
export function getDefaultConfig(): z.infer<typeof mcpServerConfigSchema> {
  return mcpServerConfigSchema.parse({
    name: "supabase-mcp-server",
    version: "0.1.0",
    environment: "development",
    logging: {},
    memory: {},
    security: {},
  });
}
