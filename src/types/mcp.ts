/**
 * MCP Protocol Types
 * Type definitions for Model Context Protocol tool responses and errors
 */

/**
 * MCP Tool Response
 * Standard response format for MCP tool calls
 */
export interface ToolResponse<T = unknown> {
  content: Array<{
    type: "text" | "image" | "resource";
    text?: string;
    data?: string;
    mimeType?: string;
  }>;
  isError?: boolean;
  _meta?: T;
}

/**
 * MCP Error Response
 */
export interface ErrorResponse {
  content: Array<{
    type: "text";
    text: string;
  }>;
  isError: true;
  _meta?: {
    errorCode: string;
    errorType: string;
    timestamp: string;
    details?: unknown;
  };
}

/**
 * MCP Tool Definition
 */
export interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, PropertySchema>;
    required?: string[];
  };
}

/**
 * Property Schema for Tool Input
 */
export interface PropertySchema {
  type: "string" | "number" | "boolean" | "object" | "array";
  description: string;
  enum?: Array<string | number>;
  default?: unknown;
  items?: PropertySchema;
  properties?: Record<string, PropertySchema>;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
}

/**
 * Progress Update
 * For long-running operations (migrations, backups, deployments)
 */
export interface ProgressUpdate {
  /** Operation ID */
  operationId: string;
  /** Operation type */
  operationType: "migration" | "backup" | "restore" | "deployment" | "validation";
  /** Current progress percentage (0-100) */
  progress: number;
  /** Current stage/step */
  stage: string;
  /** Stage description */
  stageDescription: string;
  /** Estimated time remaining (ms) */
  estimatedTimeRemainingMs?: number;
  /** Items processed */
  itemsProcessed?: number;
  /** Total items */
  totalItems?: number;
  /** Can be cancelled */
  cancellable: boolean;
  /** Checkpoint data (for resumption) */
  checkpoint?: {
    lastCompletedStep: string;
    state: unknown;
  };
  /** Timestamp */
  timestamp: string;
}

/**
 * Operation Result
 * Standard result format for completed operations
 */
export interface OperationResult<T = unknown> {
  /** Operation succeeded */
  success: boolean;
  /** Result data */
  data?: T;
  /** Error if failed */
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  /** Duration (ms) */
  durationMs: number;
  /** Timestamp */
  timestamp: string;
  /** Warnings (non-blocking issues) */
  warnings?: string[];
}

/**
 * Confirmation Request
 * For destructive operations requiring user confirmation
 */
export interface ConfirmationRequest {
  /** Operation to confirm */
  operation: string;
  /** Operation description */
  description: string;
  /** Impact summary */
  impact: {
    type: "destructive" | "irreversible" | "risky";
    affectedResources: string[];
    estimatedDurationMs?: number;
  };
  /** Confirmation prompt */
  prompt: string;
  /** Default action if no response */
  defaultAction: "proceed" | "cancel";
}

/**
 * Alert
 * For monitoring and health check alerts
 */
export interface Alert {
  /** Alert ID */
  alertId: string;
  /** Alert severity */
  severity: "critical" | "high" | "medium" | "low" | "info";
  /** Alert title */
  title: string;
  /** Alert message */
  message: string;
  /** Alert source */
  source: {
    type: "database" | "container" | "connection" | "ssl" | "storage" | "system";
    name: string;
    identifier?: string;
  };
  /** Current value that triggered alert */
  currentValue?: string | number;
  /** Threshold value */
  threshold?: string | number;
  /** Recommended actions */
  recommendations: string[];
  /** Can be resolved automatically */
  autoResolvable: boolean;
  /** Auto-resolve action */
  autoResolveAction?: string;
  /** Timestamp */
  timestamp: string;
  /** Resolution timestamp (if resolved) */
  resolvedAt?: string;
}

/**
 * Audit Log Entry
 */
export interface AuditLogEntry {
  /** Log entry ID */
  entryId: string;
  /** Timestamp */
  timestamp: string;
  /** User or system that performed action */
  actor: {
    type: "user" | "system";
    id: string;
    name?: string;
  };
  /** Action performed */
  action: string;
  /** Action category */
  category: "database" | "deployment" | "configuration" | "security" | "migration" | "backup";
  /** Target resource */
  target: {
    type: string;
    id: string;
    name?: string;
  };
  /** Action result */
  result: "success" | "failure" | "partial";
  /** Changes made */
  changes?: Record<string, { before: unknown; after: unknown }>;
  /** Error (if failed) */
  error?: string;
  /** Duration (ms) */
  durationMs?: number;
  /** IP address (if applicable) */
  ipAddress?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Resource Usage Metrics
 */
export interface ResourceUsageMetrics {
  /** Timestamp */
  timestamp: string;
  /** CPU usage */
  cpu: {
    percentage: number;
    cores: number;
  };
  /** Memory usage */
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  /** Disk usage */
  disk?: {
    used: number;
    total: number;
    percentage: number;
  };
  /** Network I/O */
  network?: {
    rxBytes: number;
    txBytes: number;
    rxPackets: number;
    txPackets: number;
  };
  /** Database connections */
  connections?: {
    active: number;
    idle: number;
    total: number;
  };
}

/**
 * Tool Execution Context
 * Context information passed to tool handlers
 */
export interface ToolExecutionContext {
  /** Request ID for tracing */
  requestId: string;
  /** Tool name being executed */
  toolName: string;
  /** Execution start time */
  startTime: Date;
  /** User/system executing the tool */
  executor?: {
    type: "user" | "system";
    id: string;
  };
  /** Read-only mode enabled */
  readOnly: boolean;
  /** Require confirmation for destructive ops */
  requireConfirmation: boolean;
}
