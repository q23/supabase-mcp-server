/**
 * Dokploy API Types
 * Type definitions for Dokploy API requests and responses
 */

/**
 * Deployment Status
 */
export type DeploymentStatus = "pending" | "building" | "running" | "stopped" | "error" | "unknown";

/**
 * Container Health Status
 */
export type HealthStatus = "healthy" | "unhealthy" | "starting" | "unknown";

/**
 * Container Information
 */
export interface ContainerInfo {
  /** Container ID */
  id: string;
  /** Container name */
  name: string;
  /** Container image */
  image: string;
  /** Container status */
  status: DeploymentStatus;
  /** Health status */
  health: HealthStatus;
  /** CPU usage percentage */
  cpuUsage?: number;
  /** Memory usage (bytes) */
  memoryUsage?: number;
  /** Memory limit (bytes) */
  memoryLimit?: number;
  /** Network I/O */
  networkIO?: {
    rx: number;
    tx: number;
  };
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
}

/**
 * Dokploy Application
 */
export interface DokployApplication {
  /** Application ID */
  id: string;
  /** Application name */
  name: string;
  /** Project ID */
  projectId: string;
  /** Application type */
  appType: "application" | "database" | "compose";
  /** Deployment status */
  status: DeploymentStatus;
  /** Domain name */
  domain?: string;
  /** Environment variables */
  env: Record<string, string>;
  /** Docker image or git repository */
  source: {
    type: "docker" | "git" | "github";
    repository?: string;
    image?: string;
    tag?: string;
    branch?: string;
  };
  /** Port mappings */
  ports?: Array<{
    published: number;
    target: number;
    protocol: "tcp" | "udp";
  }>;
  /** Volume mappings */
  volumes?: Array<{
    source: string;
    target: string;
  }>;
  /** Container information */
  containers?: ContainerInfo[];
  /** Creation timestamp */
  createdAt: string;
  /** Last deployment timestamp */
  lastDeployedAt?: string;
}

/**
 * Dokploy Project
 */
export interface DokployProject {
  /** Project ID */
  id: string;
  /** Project name */
  name: string;
  /** Project description */
  description?: string;
  /** Applications in project */
  applications: DokployApplication[];
  /** Creation timestamp */
  createdAt: string;
}

/**
 * Environment Variable Update Request
 */
export interface EnvironmentVariableUpdate {
  /** Variable name */
  name: string;
  /** Variable value */
  value: string;
  /** Mark as secret (encrypted) */
  secret?: boolean;
}

/**
 * Deployment Request
 */
export interface DeploymentRequest {
  /** Application ID */
  applicationId: string;
  /** Force rebuild */
  rebuild?: boolean;
  /** Restart containers */
  restart?: boolean;
  /** Environment variable updates */
  envUpdates?: EnvironmentVariableUpdate[];
}

/**
 * Deployment Response
 */
export interface DeploymentResponse {
  /** Deployment ID */
  deploymentId: string;
  /** Application ID */
  applicationId: string;
  /** Deployment status */
  status: DeploymentStatus;
  /** Start timestamp */
  startedAt: string;
  /** Completion timestamp */
  completedAt?: string;
  /** Error message (if failed) */
  error?: string;
  /** Build logs */
  logs?: string[];
}

/**
 * Container Logs Request
 */
export interface ContainerLogsRequest {
  /** Container ID or name */
  containerId: string;
  /** Number of lines to retrieve (tail) */
  tail?: number;
  /** Follow logs (streaming) */
  follow?: boolean;
  /** Show timestamps */
  timestamps?: boolean;
  /** Filter by time (ISO 8601) */
  since?: string;
  until?: string;
}

/**
 * Container Logs Response
 */
export interface ContainerLogsResponse {
  /** Container ID */
  containerId: string;
  /** Log lines */
  logs: Array<{
    timestamp: string;
    stream: "stdout" | "stderr";
    message: string;
  }>;
}

/**
 * Health Check Response
 */
export interface HealthCheckResponse {
  /** Application ID */
  applicationId: string;
  /** Overall health status */
  status: HealthStatus;
  /** Container health statuses */
  containers: Array<{
    name: string;
    status: HealthStatus;
    lastCheck: string;
    checks?: Array<{
      name: string;
      status: "passing" | "failing";
      message?: string;
    }>;
  }>;
  /** Timestamp */
  checkedAt: string;
}

/**
 * Dokploy API Error Response
 */
export interface DokployAPIError {
  /** HTTP status code */
  statusCode: number;
  /** Error message */
  message: string;
  /** Error code */
  code?: string;
  /** Detailed error information */
  details?: unknown;
  /** Timestamp */
  timestamp: string;
}

/**
 * Rollback Request
 */
export interface RollbackRequest {
  /** Application ID */
  applicationId: string;
  /** Target deployment ID (or previous if not specified) */
  targetDeploymentId?: string;
}

/**
 * Domain Configuration
 */
export interface DomainConfig {
  /** Domain name */
  domain: string;
  /** SSL enabled */
  ssl: boolean;
  /** SSL certificate path */
  certificatePath?: string;
  /** SSL key path */
  keyPath?: string;
  /** Let's Encrypt automatic SSL */
  letsEncrypt?: boolean;
  /** Force HTTPS redirect */
  forceHttps?: boolean;
}

/**
 * SSL Certificate Information
 */
export interface SSLCertificateInfo {
  /** Domain name */
  domain: string;
  /** Certificate issuer */
  issuer: string;
  /** Valid from date */
  validFrom: string;
  /** Valid until date */
  validUntil: string;
  /** Days until expiration */
  daysUntilExpiry: number;
  /** Certificate status */
  status: "valid" | "expiring_soon" | "expired" | "invalid";
}
