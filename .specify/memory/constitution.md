# Supabase-MCP-Server Constitution

## 1. Project Vision & Goals

This MCP server provides **comprehensive Supabase management capabilities** for both cloud and self-hosted instances, serving as a production-ready tool that fulfills ALL developer needs including database operations, migrations, backups, and cross-instance data transfers.

### Core Objectives
- **Universal Compatibility**: Seamless support for Supabase Cloud and self-hosted installations
- **Complete Feature Coverage**: All developer needs addressed (DB operations, migrations, backups, cross-instance transfers)
- **Production Readiness**: Enterprise-grade reliability, security, and performance
- **Memory Efficiency**: Intelligent handling of MCP's memory constraints through persistent storage strategies
- **Developer Experience**: Intuitive tool organization, clear error messages, comprehensive documentation

## 2. Architecture Principles

### 2.1 Dual-Mode Architecture

**Cloud Mode**
- OAuth authentication flow
- Supabase Management API integration
- Multi-project/organization support
- Feature parity with official `supabase-community/supabase-mcp`

**Self-Hosted Mode**
- Dual database access: RPC via HTTP + direct PostgreSQL connections
- Single-project focus with streamlined tooling
- Automatic helper function provisioning (`public.execute_sql`)
- Enhanced privileges for auth schema, storage, and system operations

### 2.2 Memory Constraint Management

**The 1MB Challenge**: MCP servers have strict memory limitations requiring intelligent state management.

**Solutions**:
1. **Persistent Backup Storage**: Large data (backups, migration snapshots) stored on filesystem, not in memory
2. **Streaming Operations**: Process large result sets in chunks rather than loading entirely into memory
3. **Lazy Loading**: Fetch metadata/schema information on-demand rather than caching
4. **Incremental Migrations**: Break large migrations into smaller, manageable batches
5. **Temp File Management**: Use temporary files for intermediate operations with automatic cleanup

**Implementation Requirements**:
- Maximum in-memory buffer size: 512KB for any single operation
- Automatic spill-to-disk for operations exceeding memory threshold
- Background cleanup processes for temporary storage
- Configurable storage paths for backups/migrations

### 2.3 Tool Organization

Tools must be organized into logical **feature groups** that can be selectively enabled/disabled:

1. **Core Database** (always enabled)
   - Schema inspection (tables, columns, indexes, constraints)
   - SQL query execution with safety controls
   - Connection pool management
   - Database statistics and monitoring

2. **Migrations**
   - Migration history tracking with versioning
   - Migration creation/application/rollback
   - Cross-instance migration (Supabase A → Supabase B)
   - Schema diff generation
   - Migration validation before application

3. **Backups & Restore**
   - Full database backups with compression
   - Incremental backup support
   - Point-in-time recovery preparation
   - Backup scheduling and retention policies
   - Restore with validation and rollback capability

4. **Development Tools**
   - TypeScript type generation from schema
   - API credential management
   - Local development environment sync
   - Database seeding utilities

5. **Authentication Management**
   - User CRUD operations
   - Provider configuration
   - Session management
   - Security audit logs

6. **Storage Operations**
   - Bucket management
   - Object operations
   - Policy configuration
   - Storage metrics

7. **Edge Functions** (cloud + self-hosted via CLI)
   - Function listing/deployment
   - Log retrieval
   - Environment variable management

8. **Realtime & Subscriptions**
   - Publication management
   - Replication monitoring
   - Channel configuration

9. **Debugging & Monitoring**
   - Log aggregation (Postgres, API, Edge Functions)
   - Performance metrics
   - Advisory notices
   - Health checks

10. **Knowledge Base**
    - Supabase documentation search
    - Schema documentation generation

11. **Dokploy Integration** (self-hosted deployments) 🚀 NEW
    - Automated Supabase deployment on Dokploy
    - Environment variable management via API
    - Template-based provisioning
    - Container health monitoring
    - Log aggregation from Dokploy
    - Domain & SSL certificate management
    - Rollback & disaster recovery
    - Multi-instance orchestration

## 3. Code Quality Standards

### 3.1 TypeScript Excellence

- **Strict Mode**: `"strict": true` in tsconfig.json with no exceptions
- **Type Safety**: Zero usage of `any`; prefer `unknown` with type guards
- **Zod Validation**: All external inputs validated with Zod schemas
- **Exhaustive Checking**: Use `never` type for unreachable code detection
- **Type Inference**: Leverage TypeScript's inference; explicit types only when clarity demands

### 3.2 Code Formatting & Linting

- **Biome.js**: Use Biome for both linting and formatting (replaces ESLint + Prettier)
- **Configuration**: Single `biome.json` config file at project root
- **Format on Save**: Enable in IDE settings for consistent formatting
- **Pre-commit Hooks**: Run `biome check --write` before commits
- **CI Integration**: Fail builds on linting/formatting violations
- **Rules**: Follow Biome's recommended ruleset with project-specific overrides in constitution

### 3.3 Code Organization

```
src/
├── tools/              # MCP tool implementations
│   ├── core/          # Core database operations
│   ├── migrations/    # Migration management
│   ├── backups/       # Backup/restore operations
│   ├── auth/          # Authentication tools
│   ├── storage/       # Storage operations
│   ├── functions/     # Edge Functions
│   ├── realtime/      # Realtime/subscriptions
│   └── monitoring/    # Debugging/monitoring
├── lib/               # Shared utilities
│   ├── supabase/      # Supabase client wrappers
│   ├── postgres/      # PostgreSQL direct access
│   ├── memory/        # Memory management utilities
│   ├── validation/    # Zod schemas
│   └── errors/        # Error handling
├── types/             # TypeScript type definitions
├── config/            # Configuration management
└── index.ts           # Server entry point
```

### 3.4 Naming Conventions

- **Files**: `kebab-case.ts` (e.g., `execute-sql.ts`)
- **Classes**: `PascalCase` (e.g., `BackupManager`)
- **Functions/Variables**: `camelCase` (e.g., `executeSqlQuery`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `MAX_MEMORY_BUFFER`)
- **Types/Interfaces**: `PascalCase` with descriptive suffixes (e.g., `ToolInputSchema`, `BackupConfig`)

### 3.5 Error Handling

- **Typed Errors**: Custom error classes extending `Error` with error codes
- **Graceful Degradation**: Partial success reporting (e.g., 80% of tables backed up)
- **User-Friendly Messages**: Technical details in logs, plain language for users
- **Recovery Suggestions**: Every error includes actionable next steps
- **No Silent Failures**: All errors must be surfaced or explicitly logged

## 4. Testing Standards

### 4.1 Coverage Requirements

- **Minimum**: 85% code coverage across the project
- **Critical Paths**: 100% coverage for migrations, backups, auth operations
- **Edge Cases**: Explicit tests for memory limits, connection failures, timeout scenarios

### 4.2 Testing Strategy

**Unit Tests** (Vitest)
- All utility functions in `lib/`
- Validation schemas (valid + invalid inputs)
- Error handling logic

**Integration Tests**
- Tool execution with mock Supabase instances
- Database operation workflows (read, write, migrate)
- Backup/restore round-trips

**E2E Tests**
- Full workflows: backup → restore, migrate → rollback
- Cross-instance migrations
- Cloud and self-hosted mode switching

**Memory Tests**
- Operations exceeding memory limits trigger disk storage
- Large result sets stream correctly
- Cleanup of temporary files verified

### 4.3 Test Data

- Use Docker Compose to spin up local Postgres + Supabase stack
- Seed databases with representative schemas (small, medium, large)
- Anonymized production schema snapshots for realistic testing

## 5. Performance Standards

### 5.1 Benchmarks

- **Query Execution**: < 100ms for simple queries, < 5s for complex analytics
- **Backup Creation**: Streaming starts within 2s, throughput > 10MB/s
- **Migration Application**: < 1s per migration step (validated separately)
- **Type Generation**: < 3s for schemas up to 100 tables
- **Memory Footprint**: Server process < 100MB baseline, < 200MB under load

### 5.2 Optimization Priorities

1. **Lazy Loading**: Fetch only what's needed, when needed
2. **Connection Pooling**: Reuse connections, configurable pool size
3. **Parallel Operations**: Concurrent tool execution when safe (read-only operations)
4. **Caching Strategy**: Immutable data (schema at point in time) cached with TTL
5. **Resource Cleanup**: Immediate disposal of connections, file handles, streams

## 6. Security Practices

### 6.1 Authentication & Authorization

- **Credential Storage**: Secrets managed via environment variables or secure config files (never hardcoded)
- **Read-Only Mode**: Global flag to execute all operations as read-only Postgres user
- **Project Scoping**: Restrict server instance to specific projects/databases
- **Token Validation**: JWT verification for service role keys (self-hosted)
- **Audit Logging**: All write operations logged with timestamp, user, tool name

### 6.2 SQL Injection Prevention

- **Parameterized Queries**: Always use `$1, $2...` placeholders, never string concatenation
- **Input Validation**: Zod schemas validate structure; separate SQL identifier validation
- **Allowlists**: For dynamic table/column names, validate against schema catalog
- **Execution Limits**: Query timeout defaults (30s), configurable per tool

### 6.3 Prompt Injection Mitigation

- **User Approval**: LLM tool calls require explicit user confirmation (configurable)
- **Safe Defaults**: Destructive operations (DROP, DELETE) disabled unless explicitly enabled
- **Dry-Run Mode**: Migrations/backups preview changes before execution
- **Rate Limiting**: Per-tool invocation limits to prevent abuse

## 7. User Experience Principles

### 7.1 Tool Design

- **Single Responsibility**: Each tool does one thing exceptionally well
- **Descriptive Names**: Tool names clearly indicate purpose (e.g., `backup_database`, not `backup`)
- **Comprehensive Schemas**: Input schemas with descriptions, examples, validation rules
- **Output Consistency**: Standardized response format (status, data, warnings, errors)

### 7.2 Error Messages

**Bad Example**: `Error: Query failed`

**Good Example**:
```
Error: Query execution failed
Reason: Syntax error near "SELCT" (did you mean "SELECT"?)
Query: SELCT * FROM users
Suggestion: Verify SQL syntax or use the 'validate_sql' tool first
```

### 7.3 Documentation

- **Inline JSDoc**: All functions, classes, types documented with examples
- **Tool Descriptions**: Each tool's `description` field explains purpose, use cases, prerequisites
- **Migration Guides**: Clear upgrade paths when breaking changes occur
- **Troubleshooting**: Common errors and solutions in README

## 8. Migration & Backup Requirements

### 8.1 Migration Management

**Core Capabilities**:
- Version tracking with semantic versioning support
- Up/down migrations with automatic rollback on failure
- Dependency resolution between migrations
- Dry-run mode to preview changes
- Transaction wrapping (per migration or batch)

**Cross-Instance Migration**:
- Schema + data export from source Supabase instance
- Validation of compatibility with target instance (Postgres version, extensions)
- Incremental transfer for large datasets
- Progress reporting with pause/resume capability
- Conflict resolution strategies (overwrite, skip, merge)

**Implementation**:
- Use `pg_dump` for schema/data extraction (self-hosted)
- Supabase Management API for cloud migrations
- Chunked transfer to respect memory limits
- Integrity checks (row counts, checksums) post-migration

### 8.2 Backup & Restore

**Backup Types**:
1. **Full Backup**: Complete database snapshot (schema + data)
2. **Schema-Only**: Structure without data
3. **Data-Only**: Data without structure
4. **Incremental**: Changes since last backup (requires WAL archiving)

**Backup Features**:
- Compression (gzip, zstd) to minimize storage
- Encryption at rest (AES-256)
- Metadata tagging (timestamp, Supabase version, extensions)
- Retention policy enforcement (auto-delete old backups)
- Integrity verification on creation

**Restore Features**:
- Target selection (overwrite, new database, specific schema)
- Point-in-time recovery (PITR) preparation
- Pre-restore validation (compatible versions, required extensions)
- Progress tracking with interruption recovery
- Post-restore validation (schema diff, row count verification)

**Storage Strategy**:
- Default: Local filesystem with configurable path
- Optional: S3-compatible storage (MinIO, AWS S3, Backblaze B2)
- Manifest file tracking all backups with metadata

## 9. Technology-Specific Guidelines

### 9.1 MCP SDK (@modelcontextprotocol/sdk)

- **Server Configuration**: Use `Server` class with stdio transport for IDE integration
- **Tool Registration**: Register tools with detailed schemas, validation logic
- **Error Propagation**: Map internal errors to MCP error responses with codes
- **Resource Management**: Implement cleanup in shutdown handlers

### 9.2 Supabase Client (@supabase/supabase-js)

- **Client Initialization**: Lazy initialization per project/mode
- **Connection Reuse**: Single client instance per configuration
- **API Key Handling**: Service role key for privileged operations, anon key for safe defaults
- **RPC Functions**: Prefer RPC for complex operations to reduce memory overhead

### 9.3 PostgreSQL (node-postgres)

- **Connection Pooling**: Use `pg.Pool` with max 10 connections default
- **Transaction Management**: Explicit `BEGIN/COMMIT/ROLLBACK` with error handling
- **Parameter Types**: Use correct type hints (`::text`, `::jsonb`) for complex types
- **Connection Lifecycle**: Always `client.release()` in `finally` blocks

### 9.4 Zod Validation

- **Schema Definition**: Colocate with tool implementations
- **Custom Validators**: Use `.refine()` for business logic (e.g., table exists in schema)
- **Error Messages**: Override default messages with user-friendly descriptions
- **Schema Composition**: Build complex schemas from reusable primitives

## 10. Development Workflow

### 10.1 Feature Development

1. **Specification**: Define tool in `.specify/spec/` with inputs, outputs, behavior
2. **Schema Design**: Create Zod schemas for validation
3. **Implementation**: Write tool in appropriate `src/tools/` subdirectory
4. **Testing**: Unit tests, integration tests, memory tests
5. **Documentation**: Update README, JSDoc, examples
6. **Review**: Code review focusing on security, memory usage, error handling

### 10.2 Git Practices

- **Conventional Commits**: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`
- **Feature Branches**: `feature/backup-encryption`, `fix/migration-rollback`
- **Small PRs**: Max 400 lines changed per PR when possible
- **Squash Merges**: Maintain clean main branch history

### 10.3 Release Process

- **Semantic Versioning**: MAJOR.MINOR.PATCH
- **Changelog**: Auto-generated from conventional commits
- **Pre-Release Testing**: Run full E2E suite against cloud + self-hosted
- **Backward Compatibility**: Deprecation warnings one minor version before removal
- **Migration Guides**: Breaking changes documented with migration steps

## 11. Cloud vs Self-Hosted Nuances

### 11.1 Detection & Configuration

**Automatic Detection**:
- Cloud: Presence of Management API endpoint
- Self-Hosted: Direct database URL provided without Management API

**Configuration Schema**:
```typescript
{
  mode: 'cloud' | 'self-hosted' | 'auto',
  supabaseUrl: string,
  anonKey: string,
  serviceRoleKey?: string,      // Required for write operations
  databaseUrl?: string,          // Self-hosted: direct Postgres access
  managementApiUrl?: string,     // Cloud: Management API endpoint
  oauthCredentials?: {           // Cloud: OAuth flow
    clientId: string,
    clientSecret: string
  }
}
```

### 11.2 Feature Availability Matrix

| Feature | Cloud | Self-Hosted | Notes |
|---------|-------|-------------|-------|
| SQL Execution | ✅ | ✅ | Self-hosted requires `execute_sql` helper or direct DB access |
| Migrations | ✅ | ✅ | Cloud via API, self-hosted via Supabase CLI integration |
| Backups | ✅ | ✅ | Cloud: Management API, Self-hosted: `pg_dump` |
| Cross-Instance Migration | ✅ | ✅ | Both directions supported |
| Edge Functions | ✅ | ✅ | Self-hosted requires Supabase CLI |
| Branching | ✅ | ❌ | Cloud-only feature (paid plans) |
| Organization Management | ✅ | ❌ | Cloud-only |
| Auth Schema Access | Limited | ✅ | Self-hosted has direct access to `auth` schema |

### 11.3 Self-Hosted Specific Considerations

**Direct Database Access**:
- Required for auth schema operations (`auth.users`, `auth.identities`)
- Needed for storage schema access (`storage.objects`, `storage.buckets`)
- Enables faster bulk operations (no HTTP overhead)

**Helper Function Fallback**:
- If direct DB access unavailable, use `public.execute_sql` RPC
- Automatic provisioning: attempt to create function if missing
- Graceful degradation: disable privileged tools if neither access method available

**Local Development**:
- Integration with `supabase start/stop` for local stack management
- Automatic detection of local instance (http://localhost:54321)

### 11.4 Self-Hosted Connection Issues & Solutions

Based on extensive research of production issues (2024-2025), the following are **critical problems** to address:

#### 11.4.1 Connection Pooling Issues

**Problem**: The `supabase_admin` role consumes 50+ connections even with Supavisor (connection pooler) in the stack.

**Root Causes**:
- Analytics container: ~15 idle connections
- Realtime container: ~5 idle connections
- Supavisor itself: 30+ idle connections
- Default pool size too large for self-hosted deployments

**Solutions Our MCP Must Implement**:
1. **Connection Monitoring Tool**: Real-time tracking of `pg_stat_activity` with alerts when approaching `max_connections`
2. **Smart Connection Limits**: Automatically detect and warn about excessive connections per role
3. **Supavisor Configuration Helper**: Tool to adjust pool size via `.env` based on deployment size
4. **Connection Audit**: Show which services/containers are consuming connections

**Implementation Strategy**:
```typescript
// Monitor connections and provide recommendations
tool: 'monitor_connections' {
  output: {
    current: 52,
    max: 100,
    by_service: {
      supavisor: 30,
      analytics: 15,
      realtime: 5
    },
    recommendation: "Reduce Supavisor pool size in .env: POOLER_DEFAULT_POOL_SIZE=10"
  }
}
```

#### 11.4.2 Auth Schema Permission Issues

**Problem**: Permission denied errors (`ERROR 42501`) when accessing `auth` schema.

**Root Causes**:
- `supabase_auth_admin` role lacks permissions to public schema
- PostgREST intentionally blocked from auth schema for security
- Search path order affects schema access
- Missing role grants in self-hosted setups

**Solutions Our MCP Must Implement**:
1. **Permission Validator**: Check and report missing grants before operations
2. **Safe Auth Access**: Provide tools that handle auth schema with correct roles
3. **Auto-Grant Helper**: Offer to fix common permission issues with user approval
4. **Schema Access Matrix**: Show which roles can access which schemas

**Security Considerations**:
- NEVER grant public access to auth schema
- Use `supabase_auth_admin` role specifically for auth operations
- Validate role before executing sensitive queries
- Audit all auth schema modifications

#### 11.4.3 CLI Connection Limitations

**Problem**: `supabase link` only works with cloud project-refs, not self-hosted.

**Root Causes**:
- Architectural difference: cloud stores config in middleware DB, self-hosted uses env vars
- `db remote set` command deprecated and removed
- No `--db-url` flag support for self-hosted

**Solutions Our MCP Must Implement**:
1. **Direct Connection Mode**: Bypass CLI limitations with direct PostgreSQL connections
2. **Configuration Import**: Read connection params from `.env` or `config.toml`
3. **Migration Management**: Independent of CLI, using `pg_dump` and node-postgres
4. **Type Generation**: Direct schema introspection without CLI dependency

**Implementation Requirements**:
- Support both `DATABASE_URL` connection string and component variables
- Parse `.env` file from Docker Compose setup
- Detect and handle different port configurations (5432 direct, 6543 pooled)
- Provide migration tools that work without `supabase` CLI

#### 11.4.4 Docker Environment Variable Issues

**Problem**: Container health failures, authentication errors, connection refused.

**Common Issues**:
1. **Password Mismatch**: Changing `POSTGRES_PASSWORD` after DB creation causes "authentication failed"
   - **Solution**: Detect volume conflicts, warn user to delete `/volumes/db/data`

2. **Invalid JWT Configuration**: Default keys not replaced with secure values
   - **Solution**: Validate JWT_SECRET length (min 32 chars), verify ANON_KEY/SERVICE_KEY format

3. **Network Misconfiguration**: Using `127.0.0.1` inside containers instead of `host.docker.internal`
   - **Solution**: Connection validator detects Docker context, recommends correct host

4. **Missing Required Variables**: LOGFLARE_SINGLE_TENANT, LOGFLARE_SUPABASE_MODE not set
   - **Solution**: Config checker validates all required env vars present

**Dokploy-Specific Issues** (99% of self-hosted deployments):

5. **HTTP to HTTPS Protocol Conversion** 🔴 CRITICAL
   - **Problem**: Dokploy template uses `http://` URLs that must be manually changed to `https://`
   - **Failure Mode**: API calls fail with mixed content errors, webhooks rejected, OAuth redirects broken
   - **Affected Variables**:
     - `SITE_URL` (must be https)
     - `API_EXTERNAL_URL` (must be https)
     - `SUPABASE_PUBLIC_URL` (must be https)
     - Auth redirect URLs
   - **Solution Our MCP Must Implement**:
     - Auto-detect protocol mismatch between deployment and config
     - Validate SSL certificate presence before accepting https URLs
     - Provide bulk HTTP→HTTPS converter tool
     - Warning system for mixed protocol configurations

6. **Official Secret Generator Failures** 🔴 CRITICAL - CONFIRMED WITH REAL DATA
   - **Problem**: Dokploy's JWT generator produces BROKEN keys that fail in production
   - **Real-World Evidence from supabase-env-example.md**:
     ```bash
     # Standard Template (BROKEN):
     ANON_KEY=eyJ...D70       # Identical to SERVICE_ROLE_KEY!
     SERVICE_ROLE_KEY=eyJ...D70  # Identical to ANON_KEY!

     # Decoded payload (BOTH keys):
     {
       "iat": 1761309376,
       "exp": 1893456000,
       "iss": "dokploy"
       # ❌ MISSING: "role" claim completely absent!
     }

     # Production (FIXED by AI agent):
     ANON_KEY=eyJ...CV9g        # Different from SERVICE_ROLE_KEY ✅
     SERVICE_ROLE_KEY=eyJ...hE0  # Different from ANON_KEY ✅

     # Decoded ANON_KEY:
     {
       "role": "anon",         # ✅ PRESENT
       "iss": "supabase",
       "iat": 1761641458,
       "exp": 1919321458
     }

     # Decoded SERVICE_ROLE_KEY:
     {
       "role": "service_role", # ✅ PRESENT
       "iss": "supabase",
       "iat": 1761641458,
       "exp": 1919321458
     }
     ```

   - **Root Causes CONFIRMED**:
     1. Dokploy generator creates IDENTICAL keys (same JWT for both roles!)
     2. Missing `role` claim in JWT payload
     3. Wrong `iss` (issuer) - uses "dokploy" instead of "supabase"
     4. Keys will fail Supabase auth validation

   - **Solution Our MCP Must Implement**:
     - **Independent JWT Generator**: NEVER rely on Dokploy's broken generator
     - **Correct JWT Structure**:
       ```typescript
       // ANON_KEY payload:
       {
         role: "anon",
         iss: "supabase",
         iat: Math.floor(Date.now() / 1000),
         exp: Math.floor(Date.now() / 1000) + (157680000) // ~5 years
       }

       // SERVICE_ROLE_KEY payload:
       {
         role: "service_role",
         iss: "supabase",
         iat: Math.floor(Date.now() / 1000),
         exp: Math.floor(Date.now() / 1000) + (157680000)
       }
       ```
     - **Validation Before Deployment**:
       1. Decode both keys
       2. Verify `role` claim exists and is correct
       3. Verify `iss` is "supabase"
       4. Verify keys are DIFFERENT
       5. Test against Supabase auth endpoint
     - **Automatic Fix Detection**: Detect broken Dokploy-generated keys and offer to regenerate

7. **Project Name Criticality** 🔴 CRITICAL
   - **Problem**: Project name affects:
     - Database naming conventions
     - Container networking (DNS resolution)
     - Volume mount paths
     - Service discovery
     - Certificate subject names (if using custom SSL)
   - **Failure Modes**:
     - Special characters break DNS resolution
     - Uppercase letters cause case-sensitivity issues
     - Spaces or underscores cause path errors
     - Names too long truncate in logs/metrics
   - **Solution Our MCP Must Implement**:
     - **Project Name Validator**:
       - Lowercase only (a-z)
       - Numbers allowed (0-9)
       - Hyphens allowed (-)
       - Max length 32 chars
       - Must start with letter
       - No reserved names (postgres, supabase, etc.)
     - **Name Sanitizer**: Auto-convert invalid names to valid format
     - **Impact Analyzer**: Show what will be affected by name change

8. **Dokploy Template Configuration Flow** 🟡 FREQUENT
   - **Problem**: Standard template requires specific modification order or config fails
   - **Correct Order**:
     1. Set project name (MUST be first!)
     2. Generate new JWT_SECRET (32+ chars)
     3. Generate ANON_KEY and SERVICE_ROLE_KEY using JWT_SECRET
     4. Update POSTGRES_PASSWORD
     5. Convert ALL http:// to https://
     6. Update domain-specific variables (SITE_URL, etc.)
     7. Validate all variables before deployment
   - **Solution Our MCP Must Implement**:
     - **Dokploy Setup Wizard**: Step-by-step guided configuration
     - **Order Validator**: Warn if steps done out of order
     - **Rollback System**: Undo incorrect configurations
     - **Template Diff Tool**: Compare current config to working template

**Solutions Our MCP Must Implement**:
1. **Environment Validator Tool**: Parse and validate `.env` against requirements
   - Support both generic self-hosted and Dokploy-specific templates
   - Validate protocol consistency (http vs https)
   - Check project name format
   - Verify JWT key validity

2. **Connection String Builder**: Generate correct connection strings for Docker context
   - Auto-detect Dokploy deployment
   - Handle custom domain configurations

3. **Health Check Diagnostics**: Analyze Docker container logs to identify config issues
   - Detect protocol mismatch errors
   - Identify JWT validation failures
   - Report project name conflicts

4. **Dokploy Setup Wizard**: Interactive tool to generate secure `.env` from Dokploy template
   - Enforce correct configuration order
   - Generate cryptographically secure secrets (independent of official tools)
   - Automatic HTTP→HTTPS conversion
   - Project name validation and sanitization
   - Template comparison with working production examples

5. **JWT Key Generator & Validator**: Independent secret generation
   - Generate JWT_SECRET (32+ chars, cryptographically secure)
   - Generate ANON_KEY with correct claims (role: anon)
   - Generate SERVICE_ROLE_KEY with correct claims (role: service_role)
   - Test keys against actual Supabase auth validation
   - Provide multiple generation methods (fallback if primary fails)

6. **Protocol Converter Tool**: Bulk HTTP→HTTPS conversion
   - Identify all URL variables
   - Convert protocols consistently
   - Validate SSL certificates
   - Check for mixed content issues

**Validation Rules** (Based on Real Production Data):
```typescript
interface SelfHostedConfigValidation {
  // Core Security
  jwt_secret: {
    min_length: 32,
    secure_random: true,
    test_generation: true,
    // Real example: "T6Y/v7FU+HqPS3gd/TgeNpC3YnULnFxDfZJdv2JsbG4="
  },
  postgres_password: {
    not_default: true,
    min_length: 32,  // Production uses 32 chars
    pattern: '^[a-z0-9]{32}$',  // Lowercase alphanumeric
    no_special_chars_that_break_urls: true
    // Real example: "jg0tkxzjrh7lzhca9x0hfg1zim5fhkct"
  },

  // JWT Keys (CRITICAL validation based on broken Dokploy generator)
  api_keys: {
    anon_key: {
      must_be_valid_jwt: true,
      required_claims: {
        role: 'anon',        // MUST be present!
        iss: 'supabase',     // NOT "dokploy"!
        iat: 'number',
        exp: 'number'
      },
      must_differ_from_service_role_key: true,  // Dokploy bug: identical keys!
      test_auth_endpoint: true
    },
    service_role_key: {
      must_be_valid_jwt: true,
      required_claims: {
        role: 'service_role',  // MUST be present!
        iss: 'supabase',       // NOT "dokploy"!
        iat: 'number',
        exp: 'number'
      },
      must_differ_from_anon_key: true,  // Dokploy bug: identical keys!
      test_auth_endpoint: true
    },
    // Detect broken Dokploy-generated keys
    broken_dokploy_keys: {
      check_identical: true,
      check_missing_role_claim: true,
      check_wrong_issuer: true,
      auto_offer_regeneration: true
    }
  },

  // HTTP→HTTPS Protocol Validation (from production diff)
  protocols: {
    required_https_vars: [
      'SITE_URL',                      // ❌ Default: http://localhost → ✅ Must: https://domain
      'API_EXTERNAL_URL',              // ❌ Default: http://supabase.dokploy → ✅ Must: https://
      'SUPABASE_PUBLIC_URL',           // ❌ Default: http://supabase.dokploy → ✅ Must: https://
      'ADDITIONAL_REDIRECT_URLS'       // ❌ Default: http:// → ✅ Must: https://
    ],
    allow_http_localhost: true,  // SITE_URL can be http://localhost:3000
    validate_ssl_cert: true,
    check_mixed_content: true
  },

  // Dokploy Specific
  project_name: {
    pattern: '^[a-z][a-z0-9-]{0,31}$',
    not_reserved: ['postgres', 'supabase', 'admin', 'root'],
    max_length: 32,
    must_start_with_letter: true
  },

  container_prefix: {
    pattern: '^[a-z][a-z0-9-]+-supabase-[a-z0-9]{6}-supabase$',
    // Real examples:
    // "tools-supabase-rkhivy-supabase"
    // "facilitation-academy-supabase-dxrl5v-supabase"
  },

  // SMTP Validation (critical for auth)
  smtp: {
    required_changes: {
      SMTP_ADMIN_EMAIL: { not: 'admin@example.com' },
      SMTP_HOST: { not: 'supabase-mail' },  // Fake test server!
      SMTP_PORT: { not: 2500 },             // Fake port!
      SMTP_USER: { not: 'fake_mail_user' },
      SMTP_PASS: { not: 'fake_mail_password' },
      SMTP_SENDER_NAME: { not: 'fake_sender' }
    },
    production_smtp_port: [587, 465, 25],  // Real SMTP ports
    warn_if_fake_smtp: true
  },

  // Other secrets
  dashboard_password: {
    min_length: 32,
    pattern: '^[a-z0-9]{32}$'
    // Real example: "afzgyo7hdwctl67wplmusgtgauwrpcx5"
  },
  secret_key_base: {
    min_length: 64,
    pattern: '^[a-z0-9]{64}$'
    // Real example: "q2cfpdv7odqu5up3akspn5htncl9ew7tjggdebnuzogmps8o7kpb7m6wpufzwkac"
  },
  vault_enc_key: {
    min_length: 32,
    pattern: '^[a-z0-9]{32}$'
    // Real example: "mnafidh3vtxoaw0ib7ztdqwvlnldq9wt"
  },

  // Infrastructure (MUST NOT change)
  immutable_vars: {
    POSTGRES_HOST: 'db',
    POSTGRES_DB: 'postgres',
    POSTGRES_PORT: 5432,
    POOLER_PROXY_PORT_TRANSACTION: 6543,
    KONG_HTTP_PORT: 8000,
    KONG_HTTPS_PORT: 8443,
    STUDIO_PORT: 3000
  },

  // Configuration Order (Dokploy)
  setup_order: {
    enforce: true,
    steps: [
      'project_name',
      'jwt_secret',
      'api_keys',          // REGENERATE (Dokploy broken!)
      'postgres_password',
      'smtp_config',       // Must configure for production
      'protocol_conversion',  // HTTP → HTTPS
      'domain_config',
      'final_validation'
    ]
  }
}
```

#### 11.4.5 Connection String Format Variations

**Problem**: Multiple valid formats cause confusion and connection failures.

**Supported Formats**:
1. **Standard Postgres**: `postgres://user:pass@host:port/db`
2. **Component Variables**: `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_DB`, `POSTGRES_PASSWORD`
3. **Connection Pooling**: Port 6543 (pooled) vs 5432 (direct)
4. **Docker Internal**: `host.docker.internal` vs container name vs IP

**Solutions Our MCP Must Implement**:
1. **Connection String Parser**: Normalize all formats to standard internal representation
2. **Auto-Detection**: Try multiple connection methods in priority order
3. **Connection Test Tool**: Validate connectivity before operations
4. **Format Converter**: Transform between different connection string formats

**Priority Order for Connection Attempts**:
1. Explicit `DATABASE_URL` if provided
2. Direct connection via component variables (POSTGRES_HOST, etc.)
3. Pooled connection (port 6543) for read operations
4. Docker internal networking detection
5. Fallback to RPC via `public.execute_sql`

#### 11.4.5.1 Real-World Connection Examples from Production

**From supabase-env-example.md**:
```bash
# Database Access (Standard across all deployments)
POSTGRES_HOST=db                # Docker container name
POSTGRES_DB=postgres            # Always "postgres"
POSTGRES_PORT=5432              # Direct connection
POSTGRES_PASSWORD=<generated>   # 32 chars, random

# Connection Pooling (Supavisor)
POOLER_PROXY_PORT_TRANSACTION=6543   # Pooled connection port
POOLER_DEFAULT_POOL_SIZE=20          # Default 20 (can cause issues!)
POOLER_MAX_CLIENT_CONN=100           # Max 100 clients
```

**Connection String Construction**:
```typescript
// Direct connection (for migrations, admin operations)
const directUrl = `postgres://postgres:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}`;

// Pooled connection (for application queries)
const pooledUrl = `postgres://postgres:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POOLER_PROXY_PORT_TRANSACTION}/${POSTGRES_DB}`;
```

**IMPORTANT**: In Dokploy, `POSTGRES_HOST=db` is the Docker container name. This only works within Docker network. External connections need domain/IP.

#### 11.4.6 Storage & Realtime Schema Access

**Problem**: Direct access to `storage` and `realtime` schemas often fails.

**Root Causes**:
- Schema restrictions prevent third-party tools from altering schemas
- Services rely on specific schemas with protected access
- Permission models differ from public schema

**Solutions Our MCP Must Implement**:
1. **Schema Detection**: Identify accessible schemas before operations
2. **Service-Aware Tools**: Different tools for storage vs database operations
3. **API Fallback**: Use Supabase REST API when direct schema access blocked
4. **Permission Reporter**: Clear error messages explaining restrictions

**Design Pattern**:
```typescript
// Try direct schema access, fall back to API
async function accessStorage(operation) {
  try {
    // Attempt direct schema query
    return await directSchemaQuery('storage', operation);
  } catch (permissionError) {
    // Fall back to Storage API
    return await storageApiCall(operation);
  }
}
```

#### 11.4.7 Critical Variables That Must Be Changed (Production Checklist)

Based on `supabase-env-example.md` analysis, these variables **MUST** be changed from template defaults:

**🔴 CRITICAL (Security)**:
```bash
POSTGRES_PASSWORD=<must-change>      # Never use default!
JWT_SECRET=<must-change>             # Min 32 chars
ANON_KEY=<must-regenerate>          # Dokploy version is BROKEN!
SERVICE_ROLE_KEY=<must-regenerate>  # Dokploy version is BROKEN!
DASHBOARD_PASSWORD=<must-change>     # Secures Studio UI
SECRET_KEY_BASE=<must-change>        # Rails secret
VAULT_ENC_KEY=<must-change>          # Encryption key
```

**🔴 CRITICAL (HTTP→HTTPS)**:
```bash
SITE_URL=https://your-app.com                    # Change from http://localhost
ADDITIONAL_REDIRECT_URLS=https://domain/*        # Change from http://
API_EXTERNAL_URL=https://supabase.your-domain    # Change from http://
SUPABASE_PUBLIC_URL=https://supabase.your-domain # Change from http://
```

**🟡 IMPORTANT (SMTP - Required for Auth)**:
```bash
SMTP_ADMIN_EMAIL=real@email.com       # Change from admin@example.com
SMTP_HOST=smtp.provider.com           # Change from supabase-mail
SMTP_PORT=587                         # Change from 2500 (fake)
SMTP_USER=real@email.com              # Change from fake_mail_user
SMTP_PASS=<real-password>             # Change from fake_mail_password
SMTP_SENDER_NAME=Your App Name        # Change from fake_sender
```

**🟢 OPTIONAL (Customization)**:
```bash
STUDIO_DEFAULT_ORGANIZATION=Your Org   # Change from "Default Organization"
ENABLE_EMAIL_AUTOCONFIRM=true         # Consider enabling for production
FUNCTIONS_VERIFY_JWT=true             # Enable JWT verification
CONTAINER_PREFIX=<unique-prefix>      # Generated by Dokploy
```

**✅ LEAVE UNCHANGED (Infrastructure)**:
```bash
POSTGRES_HOST=db                      # Docker container name
POSTGRES_DB=postgres                  # Always "postgres"
POSTGRES_PORT=5432                    # Standard port
POOLER_PROXY_PORT_TRANSACTION=6543    # Supavisor port
KONG_HTTP_PORT=8000                   # Kong ports
KONG_HTTPS_PORT=8443
STUDIO_PORT=3000                      # Studio UI port
```

#### 11.4.8 Testing & Validation Strategy

To ensure robust self-hosted support:

1. **Docker Compose Test Environment**: Replicate common self-hosted setups
2. **Connection Failure Scenarios**: Test all known failure modes
3. **Permission Boundary Tests**: Verify proper schema access restrictions
4. **Environment Variable Mutations**: Test config changes and their effects
5. **Multi-Container Networking**: Validate Docker internal communication
6. **Volume Persistence Issues**: Test database recreation scenarios

**Test Matrix**:
- ✅ Fresh Docker installation
- ✅ Password change after DB creation
- ✅ Invalid JWT configuration
- ✅ Missing environment variables
- ✅ Port conflicts (5432, 6543, 54321)
- ✅ Network isolation scenarios
- ✅ Connection pool exhaustion
- ✅ Auth schema permission denied
- ✅ CLI unavailable scenarios

## 12. Dokploy Integration Architecture

### 12.1 Overview

Dokploy is the **primary deployment platform** for self-hosted Supabase instances (99% of use cases). This integration transforms the MCP server from a database management tool into a **complete deployment automation platform**.

**Key Capabilities**:
- Zero-touch Supabase deployment from template
- Automated environment configuration (fixes all documented pain points)
- Real-time health monitoring across Dokploy instances
- Multi-instance orchestration (dev, staging, production)
- Disaster recovery and rollback automation

### 12.2 Authentication & Configuration

**API Authentication**:
```typescript
interface DokployConfig {
  apiUrl: string;           // e.g., https://dokploy.example.com
  apiKey: string;           // JWT token from /settings/profile
  instanceName?: string;    // Optional: Label for multi-instance setups
}
```

**Header Format**:
```typescript
headers: {
  'x-api-key': 'YOUR-GENERATED-API-KEY',
  'Content-Type': 'application/json'
}
```

**Configuration Storage**:
- Store API keys securely (environment variables or encrypted config)
- Support multiple Dokploy instances (dev, staging, prod)
- Validate API connectivity on initialization

### 12.3 Core Dokploy Tools

#### Tool: `dokploy_deploy_supabase`
**Purpose**: Deploy complete Supabase instance from template

**Inputs**:
- `project_name`: Validated name (see Section 11.4.4, Issue #7)
- `domain`: Custom domain (e.g., supabase.example.com)
- `postgres_password`: Secure password (auto-generated if not provided)
- `jwt_secret`: Auto-generated (32+ chars)
- `enable_ssl`: Boolean (default: true)
- `template_version`: Supabase version to deploy

**Process**:
1. Validate project name (lowercase, no special chars)
2. Generate secure JWT_SECRET
3. Generate ANON_KEY and SERVICE_ROLE_KEY from JWT_SECRET
4. Create Dokploy application via API
5. Set environment variables (ALL with https://)
6. Deploy from Supabase template
7. Wait for containers to be healthy
8. Validate deployment (test auth endpoint)
9. Return connection details

**Output**:
```typescript
{
  status: 'deployed',
  project_id: 'dokploy-app-id',
  database_url: 'postgres://...',
  api_url: 'https://supabase.example.com',
  anon_key: 'eyJ...',
  service_role_key: 'eyJ...',
  health: {
    postgres: 'healthy',
    studio: 'healthy',
    kong: 'healthy'
  }
}
```

#### Tool: `dokploy_update_env`
**Purpose**: Update environment variables safely

**Features**:
- Bulk update multiple vars
- Validate changes before applying
- Automatic HTTP→HTTPS conversion
- JWT key validation
- Restart containers if needed

**Safety Checks**:
- Warn about breaking changes (e.g., POSTGRES_PASSWORD)
- Backup current config before changes
- Rollback capability if deployment fails

#### Tool: `dokploy_monitor_health`
**Purpose**: Real-time container health monitoring

**Monitors**:
- Container status (running, stopped, unhealthy)
- Resource usage (CPU, memory, disk)
- Connection pool status (via Supabase DB query)
- API response times
- Error rates from logs

**Alerts**:
- Unhealthy containers
- Connection pool near limit
- High error rates
- SSL certificate expiration

#### Tool: `dokploy_get_logs`
**Purpose**: Aggregate logs from all Supabase containers

**Log Sources**:
- Postgres logs
- Kong (API gateway) logs
- Studio logs
- Auth service logs
- Realtime service logs
- Storage service logs

**Features**:
- Filter by service
- Filter by log level (error, warn, info)
- Time range selection
- Full-text search
- Export to file

#### Tool: `dokploy_manage_domain`
**Purpose**: Domain and SSL certificate management

**Capabilities**:
- Add custom domain to Dokploy
- Automatic SSL certificate provisioning (Let's Encrypt)
- Certificate renewal monitoring
- HTTPS redirect configuration
- Update all SITE_URL, API_EXTERNAL_URL to new domain

#### Tool: `dokploy_rollback`
**Purpose**: Rollback to previous working configuration

**Process**:
1. Fetch previous deployment history
2. Show differences between current and previous config
3. Confirm rollback with user
4. Apply previous environment variables
5. Redeploy containers
6. Validate health

#### Tool: `dokploy_clone_instance`
**Purpose**: Clone Supabase instance (dev → staging, staging → prod)

**Process**:
1. Create backup of source database
2. Deploy new Supabase instance via template
3. Restore database to new instance
4. Update environment variables for new domain
5. Generate new JWT keys (do NOT reuse!)
6. Validate new instance

#### Tool: `dokploy_validate_config`
**Purpose**: Validate Dokploy environment before/after deployment

**Validates**:
- Project name format (Section 11.4.4, Issue #7)
- All URLs use https:// (Section 11.4.4, Issue #5)
- JWT keys valid format and claims (Section 11.4.4, Issue #6)
- POSTGRES_PASSWORD not default
- Required variables present (LOGFLARE_*, etc.)
- SSL certificate valid
- Domain DNS resolution

**Output**:
```typescript
{
  valid: false,
  errors: [
    {
      severity: 'critical',
      issue: 'project_name_invalid',
      current: 'My_Project',
      expected: 'my-project',
      fix: 'Use lowercase letters, numbers, and hyphens only'
    },
    {
      severity: 'critical',
      issue: 'http_url_detected',
      variable: 'SITE_URL',
      current: 'http://example.com',
      expected: 'https://example.com',
      fix: 'Run dokploy_convert_protocols tool'
    }
  ],
  warnings: [
    {
      severity: 'warning',
      issue: 'default_postgres_password',
      recommendation: 'Generate secure password'
    }
  ]
}
```

#### Tool: `dokploy_setup_wizard`
**Purpose**: Interactive guided setup (fixes all documented pain points)

**Wizard Steps**:
1. **Connect to Dokploy**
   - Enter API URL and Key
   - Validate connectivity
   - List available servers

2. **Project Name** (CRITICAL: Must be first!)
   - Input project name
   - Validate format (lowercase, no special chars)
   - Check for conflicts
   - Confirm

3. **Generate Secrets** (Independent, reliable generation)
   - Generate JWT_SECRET (32 chars)
   - Generate ANON_KEY (with role: anon)
   - Generate SERVICE_ROLE_KEY (with role: service_role)
   - Test keys immediately
   - Show keys (user must save securely)

4. **Database Configuration**
   - Generate secure POSTGRES_PASSWORD
   - Choose Postgres version
   - Set max_connections

5. **Domain & SSL**
   - Enter custom domain
   - Confirm HTTPS configuration
   - Convert all URLs to https://
   - Enable SSL certificate provisioning

6. **Review Configuration**
   - Show complete .env preview
   - Highlight differences from template
   - Run dokploy_validate_config
   - Fix any issues

7. **Deploy**
   - Create Dokploy application via API
   - Set environment variables
   - Deploy from template
   - Monitor deployment progress
   - Wait for healthy status

8. **Post-Deployment Validation**
   - Test database connection
   - Test auth endpoint with generated keys
   - Verify HTTPS redirects
   - Check SSL certificate
   - Show connection details

9. **Success**
   - Save configuration to MCP memory (encrypted)
   - Provide connection strings
   - Show next steps

### 12.4 Multi-Instance Orchestration

**Use Case**: Manage dev, staging, and production Supabase instances

**Tool: `dokploy_list_instances`**
- Show all Supabase instances across Dokploy
- Display status, health, resource usage
- Filter by project tag

**Tool: `dokploy_sync_schema`**
- Sync database schema from one instance to another
- Migrations only (not data)
- Generate migration diff
- Apply to target instance

**Tool: `dokploy_promote_deployment`**
- Workflow: dev → staging → production
- Backup production before promotion
- Schema migration
- Data migration (optional, with confirmation)
- Rollback capability

### 12.5 Error Handling & Recovery

**Automatic Recovery Scenarios**:
1. **Unhealthy Container**: Restart via Dokploy API
2. **Failed Deployment**: Automatic rollback to previous config
3. **SSL Certificate Expiration**: Alert + renewal instructions
4. **Connection Pool Exhaustion**: Alert + Supavisor config recommendations

**Manual Recovery Tools**:
- `dokploy_restart_service`: Restart specific Supabase service
- `dokploy_rebuild`: Full rebuild of Supabase stack
- `dokploy_emergency_backup`: Immediate database backup

### 12.6 Security Considerations

**API Key Management**:
- NEVER log API keys
- Store encrypted in MCP config
- Support key rotation
- Validate key scope (admin only)

**Sensitive Data**:
- JWT secrets stored encrypted
- Database passwords encrypted
- Service role keys never logged
- Backup files encrypted at rest

**Access Control**:
- Require user confirmation for destructive operations
- Read-only mode option (no deployments/updates)
- Audit log all Dokploy API calls

### 12.7 Integration with Existing Features

**Backups**:
- Use `dokploy_get_logs` to identify backup timing
- Trigger backups before deployments
- Store backup metadata in Dokploy tags

**Migrations**:
- Deploy migrations via Dokploy environment variables
- Rollback migrations if deployment fails
- Cross-instance migration via dokploy_clone_instance

**Monitoring**:
- Combine Dokploy health with database metrics
- Unified dashboard view
- Alert aggregation

### 12.8 Testing Strategy

**Dokploy-Specific Tests**:
- ✅ API authentication (valid/invalid keys)
- ✅ Template deployment from scratch
- ✅ Environment variable updates (no restart required)
- ✅ Environment variable updates (restart required)
- ✅ HTTP→HTTPS conversion
- ✅ Project name validation (all invalid formats)
- ✅ JWT key generation and validation
- ✅ Rollback to previous deployment
- ✅ Multi-instance orchestration
- ✅ Health monitoring across instances
- ✅ Log aggregation and filtering
- ✅ Domain and SSL management
- ✅ Disaster recovery scenarios

**Integration Tests**:
- ✅ Deploy Supabase → Run migrations → Backup → Rollback
- ✅ Clone instance → Sync schema → Validate
- ✅ Update env vars → Validate → Restart → Health check

## 13. Success Criteria

This project will be considered production-ready when:

1. **Feature Completeness**: All 11 feature groups implemented and tested (including Dokploy Integration)
2. **Cross-Instance Migration**: Successful migration of 100+ table schema + data between instances
3. **Backup/Restore**: Round-trip backup → restore with 100% data integrity
4. **Memory Compliance**: No operation exceeds memory limits without disk spillover
5. **Test Coverage**: 85%+ coverage with all critical paths at 100%
6. **Performance**: All benchmarks met under load testing
7. **Security Audit**: No critical vulnerabilities in security review
8. **Documentation**: Complete README, API docs, troubleshooting guide
9. **Real-World Validation**: Successfully used in 3+ production projects
10. **Dokploy Integration**: Zero-touch deployment wizard working, multi-instance orchestration validated, all documented pain points resolved

## 14. Non-Goals

To maintain focus, the following are explicitly **out of scope**:

- **Multi-Database Support**: Only Postgres/Supabase (no MySQL, MongoDB, etc.)
- **GUI/Web Interface**: CLI/MCP-only; no web dashboard
- **Real-Time Replication**: One-time migrations only; no continuous sync
- **Custom Extensions**: Standard Supabase extensions only; no custom Postgres extension management
- **Performance Tuning Automation**: Manual query optimization; no auto-indexing

## 15. Governance

### Amendment Process
- Constitution changes require documented justification with impact analysis
- All amendments must be reviewed by project maintainers
- Breaking changes to principles require migration plan for existing code
- Version bump required for all amendments (minor for additions, major for breaking changes)

### Compliance Verification
- All PRs must reference constitution sections that apply
- Code reviews must verify alignment with principles
- Automated linting rules enforce naming conventions, structure
- Test coverage gates block merges below thresholds

### Conflict Resolution
- Constitution supersedes all other documentation
- When principles conflict, prioritize in order: Security → Correctness → Performance → Developer Experience
- Ambiguities resolved through team discussion and documented as amendments

---

**Version**: 2.1.0 | **Ratified**: 2025-10-29 | **Last Amended**: 2025-10-29

**Changelog**:
- v2.1.0: **Real-World Data Integration** - Added supabase-env-example.md analysis with PROOF of Dokploy JWT generator failures (identical keys, missing role claims), comprehensive validation rules based on production data, production checklist (Section 11.4.7), updated critical findings with real examples
- v2.0.0: **MAJOR UPDATE** - Added complete Dokploy Integration architecture (Section 12), 11 core tools, multi-instance orchestration, automated deployment wizard, transforms MCP from database tool to complete deployment platform
- v1.2.0: Added Dokploy-specific critical issues (HTTP→HTTPS, JWT generator failures, project name validation), expanded validation rules, created comprehensive .gitignore
- v1.1.0: Added Biome.js for linting/formatting, extensive self-hosted connection issues documentation (Section 11.4)
- v1.0.0: Initial constitution
