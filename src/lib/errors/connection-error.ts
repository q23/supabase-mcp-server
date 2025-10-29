/**
 * Connection Error
 * Errors related to database and network connections
 */

import { BaseError, type BaseErrorOptions } from "./base-error.js";

/**
 * Connection Error Type
 */
export type ConnectionErrorType =
  | "connection_failed"
  | "connection_timeout"
  | "connection_refused"
  | "authentication_failed"
  | "ssl_error"
  | "pool_exhausted"
  | "network_unreachable"
  | "dns_resolution_failed"
  | "invalid_credentials"
  | "permission_denied";

/**
 * Connection Error Class
 */
export class ConnectionError extends BaseError {
  public readonly errorType: ConnectionErrorType;
  public readonly host?: string;
  public readonly port?: number;
  public readonly database?: string;

  constructor(
    message: string,
    errorType: ConnectionErrorType,
    options?: Partial<BaseErrorOptions> & {
      host?: string;
      port?: number;
      database?: string;
    }
  ) {
    // Build code from error type
    const code = `CONNECTION_${errorType.toUpperCase()}`;

    // Generate suggestions based on error type
    const suggestions = ConnectionError.getSuggestionsForType(errorType, options);

    super(message, {
      code,
      category: "connection",
      severity: errorType === "authentication_failed" ? "high" : "medium",
      suggestions,
      ...options,
    });

    this.errorType = errorType;
    this.host = options?.host;
    this.port = options?.port;
    this.database = options?.database;
  }

  /**
   * Generate suggestions based on error type
   */
  private static getSuggestionsForType(
    errorType: ConnectionErrorType,
    options?: Record<string, unknown>
  ): string[] {
    const suggestions: string[] = [];

    switch (errorType) {
      case "connection_failed":
        suggestions.push(
          "Verify that the database server is running",
          "Check that the host and port are correct",
          "Ensure network connectivity to the database server",
          "Check firewall rules and security groups"
        );
        break;

      case "connection_timeout":
        suggestions.push(
          "Increase the connection timeout value",
          "Check network latency and stability",
          "Verify that the database server is responsive",
          "Consider using a connection pooler (PgBouncer/Supavisor)"
        );
        break;

      case "connection_refused":
        suggestions.push(
          "Verify that PostgreSQL is listening on the specified port",
          `Check PostgreSQL configuration: listen_addresses and port`,
          "Ensure the database server is accepting connections",
          "Check Docker networking if using containers"
        );
        break;

      case "authentication_failed":
        suggestions.push(
          "Verify username and password are correct",
          "Check PostgreSQL pg_hba.conf authentication settings",
          "Ensure the user exists in the database",
          "Try using the full connection string format"
        );
        break;

      case "ssl_error":
        suggestions.push(
          "Verify SSL certificate validity",
          "Try setting ssl.rejectUnauthorized to false (development only)",
          "Check that the database server supports SSL",
          "Ensure SSL certificate paths are correct"
        );
        break;

      case "pool_exhausted":
        suggestions.push(
          "Increase the connection pool max size",
          "Check for connection leaks (unclosed connections)",
          "Monitor active connections: pg_stat_activity",
          `Current pool max: ${options?.maxConnections || "unknown"} - consider increasing`
        );
        break;

      case "network_unreachable":
        suggestions.push(
          "Check internet connectivity",
          "Verify the database host is accessible from this network",
          "Check VPN connection if using private network",
          "Verify DNS resolution is working"
        );
        break;

      case "dns_resolution_failed":
        suggestions.push(
          `Verify hostname "${options?.host || "unknown"}" is correct`,
          "Check DNS server configuration",
          "Try using IP address instead of hostname",
          "Ensure /etc/hosts or DNS records are correct"
        );
        break;

      case "invalid_credentials":
        suggestions.push(
          "Verify POSTGRES_PASSWORD environment variable is set",
          "Check that credentials match the database configuration",
          "Try connecting with psql to test credentials",
          "Reset password if necessary"
        );
        break;

      case "permission_denied":
        suggestions.push(
          "Verify user has required permissions on the database",
          `For auth schema access, use role: supabase_auth_admin`,
          "Check GRANT statements for the user",
          "Consider using a user with elevated privileges"
        );
        break;

      default:
        suggestions.push(
          "Check database logs for more details",
          "Verify connection configuration",
          "Test connection with psql command line tool"
        );
    }

    return suggestions;
  }

  /**
   * Create connection error from PostgreSQL error
   */
  static fromPostgresError(error: Error & { code?: string }): ConnectionError {
    const pgCode = error.code;
    let errorType: ConnectionErrorType = "connection_failed";
    let message = error.message;

    // Map PostgreSQL error codes to connection error types
    switch (pgCode) {
      case "ECONNREFUSED":
        errorType = "connection_refused";
        break;
      case "ETIMEDOUT":
      case "ESOCKETTIMEDOUT":
        errorType = "connection_timeout";
        break;
      case "ENOTFOUND":
        errorType = "dns_resolution_failed";
        break;
      case "ENETUNREACH":
      case "EHOSTUNREACH":
        errorType = "network_unreachable";
        break;
      case "28P01": // Invalid password
      case "28000": // Invalid authorization specification
        errorType = "authentication_failed";
        break;
      case "42501": // Insufficient privilege
        errorType = "permission_denied";
        break;
      case "53300": // Too many connections
        errorType = "pool_exhausted";
        break;
      default:
        if (message.includes("SSL")) {
          errorType = "ssl_error";
        }
    }

    return new ConnectionError(message, errorType, {
      cause: error,
      context: {
        postgresCode: pgCode,
      },
    });
  }
}
