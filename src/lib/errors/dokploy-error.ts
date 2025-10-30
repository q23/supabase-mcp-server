/**
 * Dokploy Error
 * Errors related to Dokploy API interactions and deployments
 */

import { BaseError, type BaseErrorOptions } from "./base-error.js";
import type { DokployAPIError } from "../../types/dokploy.js";

/**
 * Dokploy Error Type
 */
export type DokployErrorType =
  | "api_error"
  | "authentication_failed"
  | "rate_limit_exceeded"
  | "deployment_failed"
  | "container_unhealthy"
  | "configuration_invalid"
  | "resource_not_found"
  | "network_error"
  | "timeout";

/**
 * Dokploy Error Class
 */
export class DokployError extends BaseError {
  public readonly errorType: DokployErrorType;
  public readonly statusCode?: number;
  public readonly apiResponse?: DokployAPIError;

  constructor(
    message: string,
    errorType: DokployErrorType,
    options?: Partial<BaseErrorOptions> & {
      statusCode?: number;
      apiResponse?: DokployAPIError;
    }
  ) {
    const code = `DOKPLOY_${errorType.toUpperCase()}`;
    const suggestions = DokployError.getSuggestionsForType(errorType, options);

    super(message, {
      code,
      category: "deployment",
      severity: errorType === "deployment_failed" ? "high" : "medium",
      suggestions,
      ...options,
      context: {
        ...options?.context,
        statusCode: options?.statusCode,
        errorType,
      },
    });

    this.errorType = errorType;
    this.statusCode = options?.statusCode;
    this.apiResponse = options?.apiResponse;
  }

  /**
   * Generate suggestions based on error type
   */
  private static getSuggestionsForType(
    errorType: DokployErrorType,
    options?: Record<string, unknown>
  ): string[] {
    const suggestions: string[] = [];

    switch (errorType) {
      case "api_error":
        suggestions.push(
          "Check Dokploy API URL is correct and accessible",
          "Verify Dokploy service is running",
          "Review Dokploy API logs for more details"
        );
        if (options?.['statusCode'] === 500) {
          suggestions.push("Dokploy internal server error - check Dokploy server logs");
        }
        break;

      case "authentication_failed":
        suggestions.push(
          "Verify DOKPLOY_API_KEY environment variable is set correctly",
          "Check that API key has not expired or been revoked",
          "Ensure API key has correct permissions",
          "Try regenerating API key in Dokploy dashboard"
        );
        break;

      case "rate_limit_exceeded":
        suggestions.push(
          "Wait a few minutes before retrying",
          "Reduce request frequency (current rate limiter will auto-backoff)",
          "Check RATE_LIMIT_RPS and RATE_LIMIT_BURST settings",
          "Consider implementing request batching"
        );
        break;

      case "deployment_failed":
        suggestions.push(
          "Check deployment logs in Dokploy dashboard",
          "Verify Docker image exists and is accessible",
          "Ensure environment variables are correctly set",
          "Check for port conflicts or resource constraints",
          "Try deploying manually in Dokploy to debug"
        );
        break;

      case "container_unhealthy":
        suggestions.push(
          "Check container logs for errors",
          "Verify health check endpoints are responding",
          "Ensure all required services are running",
          "Check resource limits (CPU, memory)",
          "Restart the container and monitor startup logs"
        );
        break;

      case "configuration_invalid":
        suggestions.push(
          "Verify environment variable format is correct",
          "Check that all required variables are set",
          "Validate domain name and SSL configuration",
          "Use dokploy_validate_config tool to identify issues"
        );
        break;

      case "resource_not_found":
        suggestions.push(
          "Verify the application/project ID exists in Dokploy",
          "Check that resource has not been deleted",
          "List all applications to find correct ID",
          "Ensure you're connected to the correct Dokploy instance"
        );
        break;

      case "network_error":
        suggestions.push(
          "Check internet connectivity",
          "Verify Dokploy URL is accessible from this network",
          "Check firewall rules and proxy settings",
          "Try pinging Dokploy server: ping <dokploy-host>"
        );
        break;

      case "timeout":
        suggestions.push(
          "Increase timeout value if operation is expected to take longer",
          "Check network latency to Dokploy server",
          "Verify Dokploy is not overloaded (check resource usage)",
          "Operation may be running - check Dokploy dashboard for status"
        );
        break;

      default:
        suggestions.push(
          "Check Dokploy dashboard for more details",
          "Review Dokploy API documentation",
          "Contact Dokploy support if issue persists"
        );
    }

    return suggestions;
  }

  /**
   * Create DokployError from HTTP response
   */
  static fromHttpResponse(statusCode: number, body: unknown, requestUrl?: string): DokployError {
    let errorType: DokployErrorType = "api_error";
    let message = `Dokploy API error: HTTP ${statusCode}`;

    // Determine error type from status code
    if (statusCode === 401 || statusCode === 403) {
      errorType = "authentication_failed";
      message = "Dokploy API authentication failed";
    } else if (statusCode === 404) {
      errorType = "resource_not_found";
      message = "Dokploy resource not found";
    } else if (statusCode === 429) {
      errorType = "rate_limit_exceeded";
      message = "Dokploy API rate limit exceeded";
    } else if (statusCode >= 500) {
      errorType = "api_error";
      message = "Dokploy internal server error";
    } else if (statusCode === 408 || statusCode === 504) {
      errorType = "timeout";
      message = "Dokploy API request timeout";
    }

    // Parse API error response if available
    const apiResponse = body as DokployAPIError | undefined;
    if (apiResponse?.message) {
      message = `Dokploy API error: ${apiResponse.message}`;
    }

    return new DokployError(message, errorType, {
      statusCode,
      apiResponse,
      context: {
        requestUrl,
        responseBody: body,
      },
    });
  }

  /**
   * Create DokployError from network error
   */
  static fromNetworkError(error: Error, requestUrl?: string): DokployError {
    let errorType: DokployErrorType = "network_error";
    const message = error.message;

    if (message.includes("timeout") || message.includes("ETIMEDOUT")) {
      errorType = "timeout";
    } else if (message.includes("ECONNREFUSED")) {
      errorType = "api_error";
    } else if (message.includes("ENOTFOUND")) {
      errorType = "api_error";
    }

    return new DokployError(`Network error: ${message}`, errorType, {
      cause: error,
      context: {
        requestUrl,
      },
    });
  }

  /**
   * Check if error is retryable
   */
  isRetryable(): boolean {
    const retryableTypes: DokployErrorType[] = [
      "network_error",
      "timeout",
      "api_error",
      "rate_limit_exceeded",
    ];

    return (
      retryableTypes.includes(this.errorType) &&
      (!this.statusCode || this.statusCode >= 500 || this.statusCode === 429)
    );
  }

  /**
   * Get retry delay in milliseconds (exponential backoff)
   */
  getRetryDelay(attempt: number): number {
    if (this.errorType === "rate_limit_exceeded") {
      // For rate limits, use longer delay
      return Math.min(1000 * Math.pow(2, attempt), 60000); // Max 60s
    }

    // Standard exponential backoff
    return Math.min(100 * Math.pow(2, attempt), 30000); // Max 30s
  }
}
