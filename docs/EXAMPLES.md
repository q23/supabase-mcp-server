# Usage Examples

## Deployment

### Deploy Fresh Supabase Instance
```typescript
dokploy_setup_wizard({
  dokployApiUrl: "https://dokploy.example.com",
  dokployApiKey: "your-api-key",
  projectName: "my-app",
  domain: "supabase.example.com",
  useLetsEncrypt: true
})
```

### Validate Existing Deployment
```typescript
dokploy_validate_config({
  applicationId: "app-123"
})
```

### Fix Broken Configuration
```typescript
dokploy_regenerate_keys({
  applicationId: "app-123",
  keepExistingSecret: true,
  autoRestart: true
})
```

## Database Operations

### Monitor Connections
```typescript
monitor_connections()
```

### Execute SQL
```typescript
execute_sql({
  query: "SELECT * FROM users WHERE email = $1",
  params: ["user@example.com"],
  targetSchema: "auth"
})
```

### Inspect Schema
```typescript
inspect_schema({
  schemaName: "public",
  includeTables: true
})
```

## Migrations

### Cross-Instance Migration
```typescript
cross_instance_migrate({
  sourceConnection: "postgresql://user:pass@source:5432/db",
  targetConnection: "postgresql://user:pass@target:5432/db",
  verifyIntegrity: true
})
```

### Generate Schema Diff
```typescript
generate_diff(
  "postgresql://user:pass@dev:5432/db",
  "postgresql://user:pass@prod:5432/db"
)
```

## Backups

### Create Encrypted Backup
```typescript
create_backup(
  "./backups/backup-2025-10-29.sql",
  {
    compress: true,
    encrypt: true,
    encryptionKey: process.env.BACKUP_ENCRYPTION_KEY
  }
)
```

### Restore Backup
```typescript
restore_backup(backupRecord, {
  decryptionKey: process.env.BACKUP_ENCRYPTION_KEY,
  dryRun: false
})
```

## Monitoring

### Check Health
```typescript
dokploy_monitor_health("app-123")
```

### Get Logs
```typescript
dokploy_get_logs({
  containerId: "container-123",
  tail: 100,
  timestamps: true
})
```

## Multi-Instance

### List All Instances
```typescript
dokploy_list_instances({
  environment: "production"
})
```

### Sync Schema
```typescript
dokploy_sync_schema(
  "postgresql://dev-connection",
  "postgresql://staging-connection"
)
```

### Promote Deployment
```typescript
dokploy_promote_deployment(
  "postgresql://staging-connection",
  "postgresql://prod-connection",
  { createBackup: true }
)
```
