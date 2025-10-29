# API Documentation

## MCP Tools

### Deployment & Configuration

#### `dokploy_setup_wizard`
Deploy production-ready Supabase to Dokploy in <10 minutes.

**Input:**
- `dokployApiUrl`: Dokploy API URL
- `dokployApiKey`: API authentication key
- `projectName`: Project name (will be sanitized)
- `domain`: Domain for Supabase
- `useLetsEncrypt`: Enable Let's Encrypt SSL (default: true)
- `smtp`: Optional SMTP configuration

**Output:**
- Application ID
- Supabase URL
- Generated credentials (save these!)
- Health check status
- Step-by-step completion log

#### `dokploy_validate_config`
Detect broken configurations in existing deployments.

**Input:**
- `applicationId`: Dokploy application ID
- `offerFix`: Offer automatic fixes (default: true)

**Output:**
- Validation result (valid/invalid)
- Detected issues by category
- Suggested fixes with commands

#### `dokploy_regenerate_keys`
Fix broken JWT keys automatically.

**Input:**
- `applicationId`: Dokploy application ID
- `keepExistingSecret`: Keep JWT_SECRET (default: true)
- `autoRestart`: Restart containers (default: true)

**Output:**
- New JWT keys (different, with correct structure!)
- Issues detected and fixed
- Auth endpoint validation result

### Connection Management

#### `connect`
Test database connection.

**Input:**
- `connectionString` OR connection components

**Output:**
- Connection status
- Latency
- Pool configuration

#### `monitor_connections`
Monitor connection pool status.

**Output:**
- Current/max connections
- Usage percentage
- Breakdown by service
- Recommendations

#### `execute_sql`
Execute SQL with role-based access.

**Input:**
- `query`: SQL query
- `params`: Parameterized values
- `targetSchema`: Schema name (auto-selects correct role)

**Output:**
- Query results
- Execution time
- Row count

#### `inspect_schema`
Inspect database schema.

**Input:**
- `schemaName`: Schema to inspect (default: public)

**Output:**
- Tables, columns, indexes
- Constraints, views, functions

### Migrations

#### `cross_instance_migrate`
Migrate data between Supabase instances.

**Input:**
- `sourceConnection`: Source database URL
- `targetConnection`: Target database URL
- `tables`: Tables to migrate
- `verifyIntegrity`: Verify checksums (default: true)

**Output:**
- Rows migrated
- Tables processed
- Integrity check result

#### `generate_diff`
Generate schema diff between instances.

**Input:**
- `sourceConnection`: Source database
- `targetConnection`: Target database

**Output:**
- SQL diff script
- Change summary

### Backups

#### `create_backup`
Create encrypted backup.

**Input:**
- `outputPath`: Backup file path
- `compress`: Enable gzip compression
- `encrypt`: Enable AES-256 encryption
- `encryptionKey`: Encryption key

**Output:**
- Backup ID
- File size
- Checksum

#### `restore_backup`
Restore from backup.

**Input:**
- `backupRecord`: Backup metadata
- `decryptionKey`: Decryption key (if encrypted)
- `dryRun`: Preview only (default: false)

**Output:**
- Restore status
- Rows restored
- Validation result

### Monitoring

#### `dokploy_monitor_health`
Monitor container health.

**Input:**
- `applicationId`: Dokploy application ID

**Output:**
- Overall health status
- Container statuses
- Alerts

#### `dokploy_get_logs`
Get container logs.

**Input:**
- `containerId`: Container ID
- `tail`: Number of lines
- `timestamps`: Include timestamps

**Output:**
- Log entries

### Multi-Instance

#### `dokploy_list_instances`
List all Supabase instances.

**Input:**
- `environment`: Filter by environment (dev/staging/prod)

**Output:**
- Instance list with status

#### `dokploy_sync_schema`
Sync schema between instances.

**Input:**
- `sourceConnection`: Source instance
- `targetConnection`: Target instance

**Output:**
- Migrations applied
- Schema changes

#### `dokploy_promote_deployment`
Promote deployment to next environment.

**Input:**
- `sourceConnection`: Source (e.g., staging)
- `targetConnection`: Target (e.g., production)
- `createBackup`: Backup before promotion

**Output:**
- Promotion status
- Backup ID (if created)

## Error Codes

- `CONNECTION_*`: Database connection errors
- `DOKPLOY_*`: Dokploy API errors
- `VALIDATION_*`: Input validation errors
- `CONFIGURATION_*`: Configuration errors

All errors include recovery suggestions.
