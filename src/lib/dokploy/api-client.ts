/**
 * Dokploy API Client
 * HTTP client for Dokploy API with authentication and rate limiting
 */

import axios, { AxiosInstance, AxiosError } from "axios";
import type { DokployConfig } from "../../types/config.js";
import type {
  DokployApplication,
  DeploymentRequest,
  DeploymentResponse,
  EnvironmentVariableUpdate,
  ContainerLogsRequest,
  ContainerLogsResponse,
  HealthCheckResponse,
  DomainConfig,
} from "../../types/dokploy.js";
import { DokployError } from "../errors/dokploy-error.js";
import { logger } from "../utils/logger.js";
import { Retry } from "../utils/retry.js";

/**
 * Rate Limiter for Dokploy API
 */
class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per second
  private readonly burstCapacity: number;

  constructor(requestsPerSecond = 10, burstCapacity = 20) {
    this.maxTokens = burstCapacity;
    this.tokens = burstCapacity;
    this.lastRefill = Date.now();
    this.refillRate = requestsPerSecond;
    this.burstCapacity = burstCapacity;
  }

  /**
   * Wait for available token (with backoff)
   */
  async acquire(): Promise<void> {
    this.refill();

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return;
    }

    // Calculate wait time
    const waitMs = (1 / this.refillRate) * 1000;
    logger.debug("Rate limit: waiting for token", { waitMs });

    await new Promise((resolve) => setTimeout(resolve, waitMs));
    return this.acquire(); // Recursive retry
  }

  /**
   * Refill tokens based on elapsed time
   */
  private refill(): void {
    const now = Date.now();
    const elapsedSeconds = (now - this.lastRefill) / 1000;
    const tokensToAdd = elapsedSeconds * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  /**
   * Handle 429 response (back off)
   */
  async backoff(retryAfterSeconds?: number): Promise<void> {
    const waitMs = (retryAfterSeconds || 60) * 1000;
    logger.warn("Rate limit exceeded (429), backing off", { waitMs });
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }
}

/**
 * Dokploy API Client
 */
export class DokployAPIClient {
  private client: AxiosInstance;
  private config: DokployConfig;
  private rateLimiter: RateLimiter;

  constructor(config: DokployConfig) {
    this.config = config;

    // Initialize rate limiter
    this.rateLimiter = new RateLimiter(
      config.rateLimit?.requestsPerSecond || 10,
      config.rateLimit?.burstCapacity || 20
    );

    // Create axios instance
    this.client = axios.create({
      baseURL: config.apiUrl,
      timeout: 30000,
      headers: {
        "x-api-key": config.apiKey,
        "Content-Type": "application/json",
      },
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        if (error.response?.status === 429) {
          // Rate limit exceeded
          const retryAfter = error.response.headers["retry-after"];
          await this.rateLimiter.backoff(retryAfter ? parseInt(retryAfter) : undefined);
        }
        throw this.handleError(error);
      }
    );

    logger.info("Dokploy API client initialized", {
      apiUrl: config.apiUrl,
      instanceName: config.instanceName,
    });
  }

  /**
   * Make authenticated request with rate limiting
   */
  private async request<T>(method: string, path: string, data?: unknown): Promise<T> {
    // Acquire rate limit token
    await this.rateLimiter.acquire();

    try {
      const response = await this.client.request<T>({
        method,
        url: path,
        data,
      });

      return response.data;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  /**
   * Create Supabase application from template
   */
  async createApplication(config: {
    projectName: string;
    domain: string;
    env: Record<string, string>;
    projectId?: string;
  }): Promise<DokployApplication> {
    return Retry.execute(
      async () => {
        logger.info("Creating Dokploy application", {
          projectName: config.projectName,
          domain: config.domain,
        });

        const response = await this.request<DokployApplication>("POST", "/api/application.create", {
          name: config.projectName,
          appName: config.projectName,
          description: "Supabase instance deployed via MCP",
          projectId: config.projectId || "default",
          serverId: null,
        });

        logger.info("Dokploy application created", {
          applicationId: response.id,
          projectName: config.projectName,
        });

        return response;
      },
      {
        maxAttempts: 3,
        isRetryable: (error) => {
          if (error instanceof DokployError) {
            return error.isRetryable();
          }
          return Retry.isNetworkError(error);
        },
      }
    );
  }

  /**
   * Update environment variables
   */
  async updateEnvironment(
    applicationId: string,
    updates: EnvironmentVariableUpdate[]
  ): Promise<void> {
    return Retry.execute(
      async () => {
        logger.info("Updating environment variables", {
          applicationId,
          updateCount: updates.length,
        });

        await this.request("POST", "/api/application.saveEnvironment", {
          applicationId,
          environmentVariables: updates,
        });

        logger.info("Environment variables updated", { applicationId });
      },
      {
        maxAttempts: 3,
        isRetryable: (error) => {
          if (error instanceof DokployError) {
            return error.isRetryable();
          }
          return false;
        },
      }
    );
  }

  /**
   * Trigger deployment
   */
  async deploy(applicationId: string, options?: Partial<DeploymentRequest>): Promise<DeploymentResponse> {
    return Retry.execute(
      async () => {
        logger.info("Triggering deployment", { applicationId });

        const response = await this.request<DeploymentResponse>(
          "POST",
          "/api/application.deploy",
          {
            applicationId,
            titleLog: "MCP Server deployment",
            descriptionLog: options?.envUpdates ? "Deployment with env updates" : "Standard deployment",
          }
        );

        logger.info("Deployment triggered", {
          applicationId,
          deploymentId: response.deploymentId,
        });

        return response;
      },
      {
        maxAttempts: 3,
        isRetryable: (error) => {
          if (error instanceof DokployError) {
            return error.isRetryable();
          }
          return false;
        },
      }
    );
  }

  /**
   * Check health status
   */
  async checkHealth(applicationId: string): Promise<HealthCheckResponse> {
    try {
      const response = await this.request<HealthCheckResponse>(
        "GET",
        `/api/application.readAppMonitoring?applicationId=${applicationId}`
      );

      return response;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  /**
   * Get application details
   */
  async getApplication(applicationId: string): Promise<DokployApplication> {
    try {
      const response = await this.request<DokployApplication>(
        "GET",
        `/api/application.one?applicationId=${applicationId}`
      );

      return response;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  /**
   * Get container logs
   */
  async getLogs(request: ContainerLogsRequest): Promise<ContainerLogsResponse> {
    try {
      const params = new URLSearchParams();
      if (request.tail) params.append("tail", request.tail.toString());
      if (request.timestamps) params.append("timestamps", "true");
      if (request.since) params.append("since", request.since);
      if (request.until) params.append("until", request.until);

      const response = await this.request<ContainerLogsResponse>(
        "GET",
        `/api/container/${request.containerId}/logs?${params.toString()}`
      );

      return response;
    } catch (error) {
      throw this.handleError(error as AxiosError);
    }
  }

  /**
   * Configure domain
   */
  async configureDomain(applicationId: string, domain: DomainConfig): Promise<void> {
    return Retry.execute(
      async () => {
        logger.info("Configuring domain", { applicationId, domain: domain.domain });

        await this.request("PUT", `/api/application/${applicationId}/domain`, domain);

        logger.info("Domain configured", { applicationId, domain: domain.domain });
      },
      {
        maxAttempts: 3,
      }
    );
  }

  /**
   * Restart application containers
   */
  async restart(applicationId: string): Promise<void> {
    return Retry.execute(
      async () => {
        logger.info("Restarting application", { applicationId });

        await this.request("POST", "/api/application.stop", {
          applicationId,
        });

        await this.request("POST", "/api/application.start", {
          applicationId,
        });

        logger.info("Application restarted", { applicationId });
      },
      {
        maxAttempts: 2,
      }
    );
  }

  /**
   * Wait for deployment to complete
   */
  async waitForDeployment(
    deploymentId: string,
    timeoutMs = 600000, // 10 minutes
    pollIntervalMs = 5000 // 5 seconds
  ): Promise<DeploymentResponse> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      try {
        const deployment = await this.request<DeploymentResponse>(
          "GET",
          `/api/deployment/${deploymentId}`
        );

        if (deployment.status === "running") {
          logger.info("Deployment completed successfully", { deploymentId });
          return deployment;
        }

        if (deployment.status === "error") {
          throw new DokployError(
            `Deployment failed: ${deployment.error || "Unknown error"}`,
            "deployment_failed",
            {
              context: {
                deploymentId,
                error: deployment.error,
              },
            }
          );
        }

        // Still in progress
        logger.debug("Deployment in progress", {
          deploymentId,
          status: deployment.status,
        });

        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      } catch (error) {
        if (error instanceof DokployError) {
          throw error;
        }
        // Continue polling on transient errors
        await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      }
    }

    throw new DokployError(
      `Deployment timeout after ${timeoutMs / 1000}s`,
      "timeout",
      {
        context: { deploymentId, timeoutMs },
      }
    );
  }

  /**
   * Handle axios errors
   */
  private handleError(error: AxiosError): DokployError {
    if (error.response) {
      // HTTP error response
      return DokployError.fromHttpResponse(
        error.response.status,
        error.response.data,
        error.config?.url
      );
    }

    if (error.request) {
      // Network error
      return DokployError.fromNetworkError(error, error.config?.url);
    }

    // Other error
    return new DokployError(error.message, "api_error", {
      cause: error,
    });
  }
}
