/**
 * Supabase Types
 * Type definitions for Supabase-specific data structures
 */

/**
 * Backup Record
 */
export interface BackupRecord {
  /** Unique backup ID */
  backupId: string;
  /** Backup timestamp */
  timestamp: string;
  /** Backup file size (bytes) */
  size: number;
  /** Compression type */
  compressionType: "gzip" | "zstd" | "none";
  /** Encryption enabled */
  encrypted: boolean;
  /** Encryption key version (for key rotation) */
  encryptionKeyVersion?: string;
  /** Integrity checksum (SHA-256) */
  checksum: string;
  /** Backup metadata */
  metadata: {
    /** Supabase version */
    supabaseVersion?: string;
    /** PostgreSQL version */
    postgresVersion: string;
    /** Installed extensions */
    extensions: string[];
    /** Database name */
    database: string;
    /** Schema names included */
    schemas: string[];
    /** Total row count */
    totalRows?: number;
    /** Backup duration (ms) */
    durationMs?: number;
  };
  /** Storage location */
  storageLocation: {
    type: "local" | "s3";
    path: string;
    bucket?: string;
  };
  /** Creation timestamp */
  createdAt: string;
  /** Expiration date (based on retention policy) */
  expiresAt?: string;
}

/**
 * Migration Record
 */
export interface MigrationRecord {
  /** Unique migration ID */
  migrationId: string;
  /** Migration version number */
  version: string;
  /** Migration name/description */
  name: string;
  /** Execution timestamp */
  timestamp: string;
  /** Migration direction */
  direction: "up" | "down";
  /** Migration status */
  status: "pending" | "applied" | "failed" | "rolled_back";
  /** SQL content (up migration) */
  sqlUp: string;
  /** SQL content (down/rollback migration) */
  sqlDown?: string;
  /** Execution duration (ms) */
  durationMs?: number;
  /** Error message (if failed) */
  error?: string;
  /** Checksum for integrity verification */
  checksum: string;
  /** Applied by (user/system) */
  appliedBy?: string;
  /** Applied at timestamp */
  appliedAt?: string;
}

/**
 * Validation Result
 */
export interface ValidationResult {
  /** Overall validation status */
  valid: boolean;
  /** List of errors (blocking issues) */
  errors: ValidationError[];
  /** List of warnings (non-blocking issues) */
  warnings: ValidationWarning[];
  /** Validation timestamp */
  validatedAt: string;
  /** Context of what was validated */
  context: string;
}

/**
 * Validation Error
 */
export interface ValidationError {
  /** Error code */
  code: string;
  /** Error message */
  message: string;
  /** Field or location of error */
  field?: string;
  /** Suggested fix */
  suggestion?: string;
  /** Severity level */
  severity: "critical" | "high" | "medium";
}

/**
 * Validation Warning
 */
export interface ValidationWarning {
  /** Warning code */
  code: string;
  /** Warning message */
  message: string;
  /** Field or location of warning */
  field?: string;
  /** Recommended action */
  recommendation?: string;
}

/**
 * Database Schema Information
 */
export interface SchemaInfo {
  /** Schema name */
  schemaName: string;
  /** Tables in schema */
  tables: TableInfo[];
  /** Views in schema */
  views: ViewInfo[];
  /** Functions in schema */
  functions: FunctionInfo[];
  /** Extensions in schema */
  extensions: string[];
}

/**
 * Table Information
 */
export interface TableInfo {
  /** Table name */
  tableName: string;
  /** Schema name */
  schemaName: string;
  /** Columns */
  columns: ColumnInfo[];
  /** Indexes */
  indexes: IndexInfo[];
  /** Constraints */
  constraints: ConstraintInfo[];
  /** Row count estimate */
  estimatedRows?: number;
  /** Table size (bytes) */
  tableSize?: number;
}

/**
 * Column Information
 */
export interface ColumnInfo {
  /** Column name */
  columnName: string;
  /** Data type */
  dataType: string;
  /** Nullable */
  isNullable: boolean;
  /** Default value */
  defaultValue?: string;
  /** Is primary key */
  isPrimaryKey: boolean;
  /** Is unique */
  isUnique: boolean;
  /** Is foreign key */
  isForeignKey: boolean;
  /** Foreign key reference */
  foreignKeyReference?: {
    table: string;
    column: string;
  };
}

/**
 * Index Information
 */
export interface IndexInfo {
  /** Index name */
  indexName: string;
  /** Columns in index */
  columns: string[];
  /** Is unique index */
  isUnique: boolean;
  /** Is primary key index */
  isPrimary: boolean;
  /** Index type (btree, hash, gin, etc.) */
  indexType: string;
}

/**
 * Constraint Information
 */
export interface ConstraintInfo {
  /** Constraint name */
  constraintName: string;
  /** Constraint type */
  constraintType: "PRIMARY KEY" | "FOREIGN KEY" | "UNIQUE" | "CHECK" | "EXCLUDE";
  /** Columns involved */
  columns: string[];
  /** Constraint definition */
  definition?: string;
}

/**
 * View Information
 */
export interface ViewInfo {
  /** View name */
  viewName: string;
  /** Schema name */
  schemaName: string;
  /** View definition (SQL) */
  definition: string;
  /** Is materialized view */
  isMaterialized: boolean;
}

/**
 * Function Information
 */
export interface FunctionInfo {
  /** Function name */
  functionName: string;
  /** Schema name */
  schemaName: string;
  /** Function signature */
  signature: string;
  /** Return type */
  returnType: string;
  /** Function language */
  language: string;
  /** Function definition */
  definition: string;
}

/**
 * Connection Pool Status
 */
export interface ConnectionPoolStatus {
  /** Current active connections */
  current: number;
  /** Maximum connections allowed */
  max: number;
  /** Idle connections */
  idle: number;
  /** Waiting connections */
  waiting: number;
  /** Usage percentage */
  usagePercentage: number;
  /** Connections by service */
  byService: Record<string, number>;
  /** Timestamp */
  timestamp: string;
}

/**
 * Query Execution Result
 */
export interface QueryResult<T = unknown> {
  /** Result rows */
  rows: T[];
  /** Number of rows */
  rowCount: number;
  /** Execution duration (ms) */
  durationMs: number;
  /** Query command (SELECT, INSERT, UPDATE, etc.) */
  command: string;
  /** Fields metadata */
  fields?: Array<{
    name: string;
    dataTypeID: number;
  }>;
}

/**
 * Migration Plan
 */
export interface MigrationPlan {
  /** Source instance */
  source: {
    type: "cloud" | "self-hosted";
    url: string;
    version: string;
  };
  /** Target instance */
  target: {
    type: "cloud" | "self-hosted";
    url: string;
    version: string;
  };
  /** Migrations to apply */
  migrations: MigrationRecord[];
  /** Estimated duration (ms) */
  estimatedDurationMs: number;
  /** Compatibility issues */
  compatibilityIssues: ValidationWarning[];
  /** Total data size (bytes) */
  totalDataSize: number;
}
