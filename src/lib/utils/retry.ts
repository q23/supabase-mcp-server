/**
 * Retry Utility
 * Exponential backoff retry logic for network operations
 */

import { logger } from "./logger.js";

/**
 * Retry Options
 */
export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  /** Initial delay in milliseconds */
  initialDelayMs: number;
  /** Maximum delay in milliseconds */
  maxDelayMs: number;
  /** Backoff multiplier */
  backoffMultiplier: number;
  /** Jitter factor (0-1) for randomization */
  jitter: number;
  /** Function to determine if error is retryable */
  isRetryable?: (error: Error) => boolean;
  /** Callback on retry attempt */
  onRetry?: (attempt: number, error: Error, delayMs: number) => void;
}

/**
 * Default Retry Options
 */
const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitter: 0.1,
};

/**
 * Retry Result
 */
export interface RetryResult<T> {
  /** Result value (if successful) */
  value?: T;
  /** Error (if all attempts failed) */
  error?: Error;
  /** Number of attempts made */
  attempts: number;
  /** Total time spent retrying (ms) */
  totalTimeMs: number;
  /** Whether operation succeeded */
  success: boolean;
}

/**
 * Retry Utility Class
 */
export class Retry {
  /**
   * Execute function with retry logic
   */
  static async execute<T>(
    fn: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<T> {
    const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
    const startTime = Date.now();
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= opts.maxAttempts; attempt++) {
      try {
        const result = await fn();
        const totalTimeMs = Date.now() - startTime;

        if (attempt > 1) {
          logger.info(`Operation succeeded after ${attempt} attempts`, {
            attempts: attempt,
            totalTimeMs,
          });
        }

        return result;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if we should retry
        const shouldRetry =
          attempt < opts.maxAttempts &&
          (!opts.isRetryable || opts.isRetryable(lastError));

        if (!shouldRetry) {
          throw lastError;
        }

        // Calculate delay with exponential backoff and jitter
        const delayMs = this.calculateDelay(attempt, opts);

        // Call onRetry callback if provided
        if (opts.onRetry) {
          opts.onRetry(attempt, lastError, delayMs);
        } else {
          logger.warn(`Retry attempt ${attempt}/${opts.maxAttempts}`, {
            error: lastError.message,
            delayMs,
            nextAttempt: attempt + 1,
          });
        }

        // Wait before retrying
        await this.delay(delayMs);
      }
    }

    // All attempts failed
    throw lastError;
  }

  /**
   * Execute function with retry and return result object
   */
  static async executeWithResult<T>(
    fn: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): Promise<RetryResult<T>> {
    const startTime = Date.now();
    let attempts = 0;

    try {
      const value = await this.execute(fn, {
        ...options,
        onRetry: (attempt, error, delayMs) => {
          attempts = attempt;
          options.onRetry?.(attempt, error, delayMs);
        },
      });

      return {
        value,
        attempts: attempts + 1,
        totalTimeMs: Date.now() - startTime,
        success: true,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error : new Error(String(error)),
        attempts: options.maxAttempts || DEFAULT_RETRY_OPTIONS.maxAttempts,
        totalTimeMs: Date.now() - startTime,
        success: false,
      };
    }
  }

  /**
   * Calculate delay with exponential backoff and jitter
   */
  private static calculateDelay(attempt: number, options: RetryOptions): number {
    // Exponential backoff: delay = initialDelay * (multiplier ^ (attempt - 1))
    const exponentialDelay =
      options.initialDelayMs * Math.pow(options.backoffMultiplier, attempt - 1);

    // Cap at max delay
    const cappedDelay = Math.min(exponentialDelay, options.maxDelayMs);

    // Add jitter: randomize delay by ±jitter%
    const jitterAmount = cappedDelay * options.jitter;
    const jitter = (Math.random() * 2 - 1) * jitterAmount;

    return Math.max(0, Math.round(cappedDelay + jitter));
  }

  /**
   * Delay execution
   */
  private static delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if error is network-related (usually retryable)
   */
  static isNetworkError(error: Error): boolean {
    const networkCodes = [
      "ECONNREFUSED",
      "ECONNRESET",
      "ETIMEDOUT",
      "ENOTFOUND",
      "ENETUNREACH",
      "EHOSTUNREACH",
      "ECONNABORTED",
      "EPIPE",
    ];

    const errorCode = (error as Error & { code?: string }).code;
    return networkCodes.includes(errorCode || "");
  }

  /**
   * Check if HTTP status code is retryable
   */
  static isRetryableHttpStatus(statusCode: number): boolean {
    // Retry on:
    // - 408 Request Timeout
    // - 429 Too Many Requests
    // - 500 Internal Server Error
    // - 502 Bad Gateway
    // - 503 Service Unavailable
    // - 504 Gateway Timeout
    return [408, 429, 500, 502, 503, 504].includes(statusCode);
  }

  /**
   * Create a retryable function with default options
   */
  static wrap<T>(
    fn: () => Promise<T>,
    options: Partial<RetryOptions> = {}
  ): () => Promise<T> {
    return () => this.execute(fn, options);
  }

  /**
   * Retry with adaptive rate limiting (for API rate limits)
   */
  static async executeWithRateLimit<T>(
    fn: () => Promise<T>,
    options: Partial<RetryOptions> & {
      /** Check if error is rate limit error */
      isRateLimitError?: (error: Error) => boolean;
      /** Extract retry-after header value (seconds) */
      getRetryAfter?: (error: Error) => number | undefined;
    } = {}
  ): Promise<T> {
    const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };

    return this.execute(fn, {
      ...opts,
      isRetryable: (error) => {
        // Check if it's a rate limit error
        if (options.isRateLimitError?.(error)) {
          return true;
        }

        // Fall back to default retryable check
        return opts.isRetryable ? opts.isRetryable(error) : this.isNetworkError(error);
      },
      onRetry: (attempt, error, delayMs) => {
        // Check for Retry-After header
        const retryAfter = options.getRetryAfter?.(error);
        const actualDelay = retryAfter ? retryAfter * 1000 : delayMs;

        logger.warn(`Rate limit hit, retrying after ${actualDelay}ms`, {
          attempt,
          maxAttempts: opts.maxAttempts,
          retryAfterSeconds: retryAfter,
        });

        // Call original onRetry if provided
        options.onRetry?.(attempt, error, actualDelay);
      },
    });
  }

  /**
   * Retry with circuit breaker pattern
   */
  static createCircuitBreaker<T>(
    fn: () => Promise<T>,
    options: {
      /** Failure threshold before opening circuit */
      failureThreshold: number;
      /** Reset timeout (ms) */
      resetTimeoutMs: number;
      /** Retry options */
      retryOptions?: Partial<RetryOptions>;
    }
  ): () => Promise<T> {
    let failures = 0;
    let lastFailureTime = 0;
    let circuitOpen = false;

    return async () => {
      // Check if circuit should be reset
      if (circuitOpen && Date.now() - lastFailureTime > options.resetTimeoutMs) {
        logger.info("Circuit breaker: Attempting to close circuit");
        circuitOpen = false;
        failures = 0;
      }

      // If circuit is open, fail fast
      if (circuitOpen) {
        throw new Error(
          `Circuit breaker is open. Too many failures (${failures}). Try again later.`
        );
      }

      try {
        const result = await this.execute(fn, options.retryOptions);

        // Success - reset failure count
        if (failures > 0) {
          logger.info("Circuit breaker: Operation succeeded, resetting failure count");
          failures = 0;
        }

        return result;
      } catch (error) {
        failures++;
        lastFailureTime = Date.now();

        if (failures >= options.failureThreshold) {
          circuitOpen = true;
          logger.error(`Circuit breaker: Opening circuit after ${failures} failures`, error as Error);
        }

        throw error;
      }
    };
  }
}

/**
 * Decorator for async functions with retry logic
 */
export function retryable(options: Partial<RetryOptions> = {}) {
  return function <T>(
    target: unknown,
    propertyKey: string,
    descriptor: TypedPropertyDescriptor<(...args: unknown[]) => Promise<T>>
  ) {
    const originalMethod = descriptor.value;

    if (!originalMethod) {
      return descriptor;
    }

    descriptor.value = async function (this: unknown, ...args: unknown[]): Promise<T> {
      return Retry.execute(() => originalMethod.apply(this, args), options);
    };

    return descriptor;
  };
}
