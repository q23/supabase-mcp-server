/**
 * Structured Logger
 * Logging utility that never logs sensitive data
 */

import type { ErrorSeverity } from "../errors/base-error.js";

/**
 * Log Level
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Log Entry
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    code?: string;
    stack?: string;
  };
}

/**
 * Logger Configuration
 */
export interface LoggerConfig {
  level: LogLevel;
  suppressSecrets: boolean;
  outputFormat: "json" | "text";
}

/**
 * Structured Logger Class
 */
export class Logger {
  private config: LoggerConfig;
  private static instance: Logger;

  // Sensitive key patterns to redact
  private static readonly SENSITIVE_PATTERNS = [
    /password/i,
    /secret/i,
    /token/i,
    /key/i,
    /apikey/i,
    /api[_-]?key/i,
    /service[_-]?role/i,
    /anon[_-]?key/i,
    /jwt[_-]?secret/i,
    /encryption/i,
    /credential/i,
    /auth/i,
  ];

  private constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: config.level || (process.env['LOG_LEVEL'] as LogLevel) || "info",
      suppressSecrets: config.suppressSecrets ?? true,
      outputFormat: config.outputFormat || "text",
    };
  }

  /**
   * Get singleton logger instance
   */
  static getInstance(config?: Partial<LoggerConfig>): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(config);
    }
    return Logger.instance;
  }

  /**
   * Set log level
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Debug log
   */
  debug(message: string, context?: Record<string, unknown>): void {
    this.log("debug", message, context);
  }

  /**
   * Info log
   */
  info(message: string, context?: Record<string, unknown>): void {
    this.log("info", message, context);
  }

  /**
   * Warning log
   */
  warn(message: string, context?: Record<string, unknown>): void {
    this.log("warn", message, context);
  }

  /**
   * Error log
   */
  error(message: string, error?: Error, context?: Record<string, unknown>): void {
    const errorContext = error
      ? {
          ...context,
          error: {
            name: error.name,
            message: error.message,
            code: (error as Error & { code?: string }).code,
            stack: error.stack,
          },
        }
      : context;

    this.log("error", message, errorContext);
  }

  /**
   * Core logging method
   */
  private log(level: LogLevel, message: string, context?: Record<string, unknown>): void {
    // Check if this log level should be output
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
    };

    // Add sanitized context
    if (context) {
      entry.context = this.sanitize(context) as Record<string, unknown>;
    }

    // Output to stderr (stdout is reserved for MCP protocol)
    const output = this.format(entry);
    console.error(output);
  }

  /**
   * Check if log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ["debug", "info", "warn", "error"];
    const currentLevelIndex = levels.indexOf(this.config.level);
    const targetLevelIndex = levels.indexOf(level);
    return targetLevelIndex >= currentLevelIndex;
  }

  /**
   * Format log entry
   */
  private format(entry: LogEntry): string {
    if (this.config.outputFormat === "json") {
      return JSON.stringify(entry);
    }

    // Text format
    let output = `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}`;

    if (entry.context) {
      output += `\n  Context: ${JSON.stringify(entry.context, null, 2)}`;
    }

    if (entry.error) {
      output += `\n  Error: ${entry.error.name}: ${entry.error.message}`;
      if (entry.error.stack) {
        output += `\n${entry.error.stack}`;
      }
    }

    return output;
  }

  /**
   * Sanitize data to remove sensitive information
   */
  private sanitize(data: unknown): unknown {
    if (typeof data === "string") {
      return this.sanitizeString(data);
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitize(item));
    }

    if (data && typeof data === "object") {
      const sanitized: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data)) {
        if (this.isSensitiveKey(key)) {
          sanitized[key] = "[REDACTED]";
        } else {
          sanitized[key] = this.sanitize(value);
        }
      }
      return sanitized;
    }

    return data;
  }

  /**
   * Check if key contains sensitive information
   */
  private isSensitiveKey(key: string): boolean {
    if (!this.config.suppressSecrets) {
      return false;
    }

    return Logger.SENSITIVE_PATTERNS.some((pattern) => pattern.test(key));
  }

  /**
   * Sanitize string (redact potential secrets in strings)
   */
  private sanitizeString(str: string): string {
    if (!this.config.suppressSecrets) {
      return str;
    }

    // Redact connection strings
    if (str.includes("postgresql://") || str.includes("postgres://")) {
      return str.replace(/:([^@]+)@/, ":[REDACTED]@");
    }

    // Redact JWT tokens
    if (str.match(/^eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/)) {
      return "[REDACTED_JWT]";
    }

    // Redact long base64 strings (likely secrets)
    if (str.length > 32 && /^[A-Za-z0-9+/=]+$/.test(str)) {
      return `[REDACTED_BASE64_${str.length}chars]`;
    }

    return str;
  }

  /**
   * Log operation start
   */
  startOperation(operationName: string, context?: Record<string, unknown>): () => void {
    const startTime = Date.now();
    this.info(`Starting operation: ${operationName}`, context);

    // Return completion function
    return () => {
      const duration = Date.now() - startTime;
      this.info(`Completed operation: ${operationName}`, {
        ...context,
        durationMs: duration,
      });
    };
  }

  /**
   * Log with severity (for errors with severity levels)
   */
  logWithSeverity(severity: ErrorSeverity, message: string, context?: Record<string, unknown>): void {
    const levelMap: Record<ErrorSeverity, LogLevel> = {
      critical: "error",
      high: "error",
      medium: "warn",
      low: "info",
    };

    this.log(levelMap[severity], message, context);
  }
}

/**
 * Get default logger instance
 */
export const logger = Logger.getInstance();

/**
 * Create scoped logger with context
 */
export function createLogger(scope: string, context?: Record<string, unknown>): {
  debug: (message: string, additionalContext?: Record<string, unknown>) => void;
  info: (message: string, additionalContext?: Record<string, unknown>) => void;
  warn: (message: string, additionalContext?: Record<string, unknown>) => void;
  error: (message: string, error?: Error, additionalContext?: Record<string, unknown>) => void;
} {
  const scopedContext = { scope, ...context };

  return {
    debug: (message: string, additionalContext?: Record<string, unknown>) =>
      logger.debug(message, { ...scopedContext, ...additionalContext }),
    info: (message: string, additionalContext?: Record<string, unknown>) =>
      logger.info(message, { ...scopedContext, ...additionalContext }),
    warn: (message: string, additionalContext?: Record<string, unknown>) =>
      logger.warn(message, { ...scopedContext, ...additionalContext }),
    error: (message: string, error?: Error, additionalContext?: Record<string, unknown>) =>
      logger.error(message, error, { ...scopedContext, ...additionalContext }),
  };
}
