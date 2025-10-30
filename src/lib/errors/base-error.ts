/**
 * Base Error Class
 * Foundation for all custom errors with recovery suggestions
 */

/**
 * Error Severity Levels
 */
export type ErrorSeverity = "critical" | "high" | "medium" | "low";

/**
 * Error Category
 */
export type ErrorCategory =
  | "connection"
  | "validation"
  | "authentication"
  | "authorization"
  | "configuration"
  | "deployment"
  | "migration"
  | "backup"
  | "network"
  | "system"
  | "unknown";

/**
 * Base Error Options
 */
export interface BaseErrorOptions {
  /** Error code (machine-readable) */
  code: string;
  /** Error category */
  category: ErrorCategory;
  /** Error severity */
  severity: ErrorSeverity;
  /** Suggested recovery actions */
  suggestions?: string[];
  /** Original error (if wrapping another error) */
  cause?: Error;
  /** Additional context/metadata */
  context?: Record<string, unknown>;
  /** User-friendly message (overrides default) */
  userMessage?: string;
}

/**
 * Base Error Class
 * All custom errors extend this class
 */
export class BaseError extends Error {
  public readonly code: string;
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly suggestions: string[];
  public readonly context: Record<string, unknown>;
  public readonly userMessage: string;
  public readonly timestamp: Date;

  constructor(message: string, options: BaseErrorOptions) {
    super(message);

    // Maintain proper stack trace
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);

    this.code = options.code;
    this.category = options.category;
    this.severity = options.severity;
    this.suggestions = options.suggestions || [];
    this.context = options.context || {};
    this.userMessage = options.userMessage || message;
    this.timestamp = new Date();

    // Attach cause if provided
    if (options.cause) {
      this.cause = options.cause;
    }
  }

  /**
   * Convert error to JSON (safe for logging)
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      userMessage: this.userMessage,
      code: this.code,
      category: this.category,
      severity: this.severity,
      suggestions: this.suggestions,
      context: this.sanitizeContext(this.context),
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
      cause: this.cause instanceof Error ? this.cause.message : undefined,
    };
  }

  /**
   * Get formatted error message with suggestions
   */
  getFormattedMessage(): string {
    let formatted = `[${this.code}] ${this.userMessage}`;

    if (this.suggestions.length > 0) {
      formatted += "\n\nSuggested actions:";
      this.suggestions.forEach((suggestion, index) => {
        formatted += `\n  ${index + 1}. ${suggestion}`;
      });
    }

    if (this.cause && this.cause instanceof Error) {
      formatted += `\n\nCaused by: ${this.cause.message}`;
    }

    return formatted;
  }

  /**
   * Sanitize context to remove sensitive data
   */
  private sanitizeContext(context: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    const sensitiveKeys = [
      "password",
      "secret",
      "token",
      "key",
      "apiKey",
      "api_key",
      "serviceRoleKey",
      "service_role_key",
      "encryptionKey",
      "encryption_key",
    ];

    for (const [key, value] of Object.entries(context)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some((sensitive) => lowerKey.includes(sensitive))) {
        sanitized[key] = "[REDACTED]";
      } else if (typeof value === "object" && value !== null) {
        sanitized[key] = this.sanitizeContext(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Check if error is recoverable
   */
  isRecoverable(): boolean {
    return this.suggestions.length > 0 && this.severity !== "critical";
  }

  /**
   * Check if error should be logged
   */
  shouldLog(): boolean {
    return this.severity === "critical" || this.severity === "high";
  }
}
