# Baseline Specification: Supabase MCP Server

**Feature Branch**: `main`
**Created**: 2025-10-29
**Status**: Draft
**Constitution Version**: 2.1.0

## Project Overview

A production-ready MCP server providing comprehensive Supabase management capabilities for both cloud and self-hosted instances. This specification defines the baseline functionality required to achieve the project's vision of a complete deployment automation platform.

**Key Differentiator**: Dokploy integration (99% of self-hosted deployments) with automated resolution of all documented pain points.

## Clarifications

### Session 2025-10-29

- Q: When the system detects critical issues (connection pool exhaustion, SSL expiration, unhealthy containers), how should alerts be delivered to users? → A: In-MCP notifications with optional webhook support (hybrid approach)
- Q: What rate limiting strategy should be implemented for Dokploy API calls to prevent throttling or API bans? → A: Adaptive rate limiting with burst support (default 10 req/sec, burst 20, auto-backoff on 429)
- Q: What should be the default retention policy for audit logs, migration history, and temp files? → A: Configurable retention (default: audit logs 90 days, migration history indefinite, temp files 24 hours)
- Q: How should progress updates be delivered for long-running operations, and what happens when a user cancels? → A: Streaming progress via MCP responses + checkpoint-based resumption (save state every 10%, allow cancel with cleanup)
- Q: How should encryption keys be managed for AES-256 encryption of backups and sensitive data? → A: User-provided keys with optional auto-generation (keys stored encrypted in config, support key rotation, never log keys)

## User Scenarios & Testing *(Phase 1: Critical Path)*

### User Story 1 - Zero-Touch Supabase Deployment via Dokploy (Priority: P1)

**Description**: As a developer, I want to deploy a production-ready Supabase instance to Dokploy in under 10 minutes without manual configuration, so that I can focus on building my application instead of fighting with environment variables and broken JWT generators.

**Why this priority**: This solves the #1 pain point (99% of use cases). Currently takes 2-4 hours with multiple errors. This is the killer feature that justifies the entire MCP server.

**Independent Test**: Can be fully tested by providing Dokploy API credentials and domain, then verifying a working Supabase instance is deployed with valid authentication.

**Acceptance Scenarios**:

1. **Given** I have Dokploy API credentials and a domain
   **When** I run the `dokploy_setup_wizard` tool
   **Then** I receive a fully configured, healthy Supabase instance with connection details in under 10 minutes

2. **Given** The wizard generates JWT keys
   **When** Keys are validated
   **Then** Both ANON_KEY and SERVICE_ROLE_KEY have correct `role` claims, different values, and `iss: "supabase"`

3. **Given** Template uses HTTP URLs by default
   **When** Wizard processes configuration
   **Then** All public-facing URLs (SITE_URL, API_EXTERNAL_URL, SUPABASE_PUBLIC_URL, ADDITIONAL_REDIRECT_URLS) are automatically converted to HTTPS

4. **Given** User provides project name "My Project"
   **When** Name validation runs
   **Then** System suggests "my-project" and validates it meets DNS requirements (lowercase, no special chars)

5. **Given** Deployment completes
   **When** Post-deployment validation runs
   **Then** Auth endpoint responds successfully with generated keys, database accepts connections, all containers are healthy

---

### User Story 2 - Detect and Fix Broken Dokploy Deployments (Priority: P1)

**Description**: As a developer who deployed Supabase using Dokploy's template, I want the MCP to detect broken JWT configurations and offer to fix them, so that my authentication works without me having to debug cryptic JWT errors.

**Why this priority**: Existing Dokploy deployments (100% of them) have broken JWT keys. This provides immediate value to current users.

**Independent Test**: Connect to existing Dokploy Supabase instance with broken keys, detect issues, regenerate keys, verify auth works.

**Acceptance Scenarios**:

1. **Given** Existing Supabase deployment with Dokploy-generated keys
   **When** I run `dokploy_validate_config`
   **Then** System detects: (a) ANON_KEY == SERVICE_ROLE_KEY, (b) missing `role` claim, (c) wrong `iss` value

2. **Given** Broken configuration detected
   **When** System offers to regenerate keys
   **Then** New keys are generated with correct structure, updated via Dokploy API, containers restarted, auth endpoint validated

3. **Given** Mixed HTTP/HTTPS URLs detected
   **When** Validation runs
   **Then** System reports exactly which variables need HTTPS and offers bulk conversion

---

### User Story 3 - Self-Hosted Connection Management (Priority: P1)

**Description**: As a developer working with self-hosted Supabase, I want the MCP to automatically handle connection pooling, schema permissions, and CLI limitations, so that I don't encounter "permission denied" or "connection exhausted" errors.

**Why this priority**: These are the top 3 reported issues (from Section 11.4 research). Solving these makes self-hosted actually usable.

**Independent Test**: Connect to self-hosted instance, monitor connections, access auth schema, perform migrations without CLI.

**Acceptance Scenarios**:

1. **Given** Self-hosted Supabase with 50+ connections used
   **When** I run `monitor_connections`
   **Then** System shows breakdown by service (supavisor, analytics, realtime) and recommends pool size adjustments

2. **Given** I need to access `auth.users` table
   **When** MCP executes query
   **Then** System automatically uses correct role (`supabase_auth_admin`), not blocked by permissions

3. **Given** `supabase link` doesn't work (self-hosted limitation)
   **When** I need to run migrations
   **Then** MCP bypasses CLI, uses direct PostgreSQL connection with `pg_dump` and node-postgres

4. **Given** Connection string format is unclear (6 different formats possible)
   **When** I provide `POSTGRES_HOST`, `POSTGRES_PORT`, `POSTGRES_PASSWORD`
   **Then** MCP constructs both direct (5432) and pooled (6543) connection strings, tests connectivity

---

### User Story 4 - Cross-Instance Database Migration (Priority: P2)

**Description**: As a developer, I want to migrate my database schema and data from dev Supabase to production Supabase (potentially different hosting types), so that I can promote changes confidently without data loss.

**Why this priority**: Essential for production workflows. Currently requires manual `pg_dump` + restore with high risk of errors.

**Independent Test**: Create test schema in dev instance, migrate to staging, verify 100% data integrity.

**Acceptance Scenarios**:

1. **Given** Dev and prod Supabase instances (cloud or self-hosted)
   **When** I run `cross_instance_migrate`
   **Then** Schema and data are copied with verification (row counts, checksums), transaction rollback on failure

2. **Given** Large database (100+ tables, 10GB data)
   **When** Migration runs
   **Then** Data is transferred in chunks (<512KB memory buffer), progress streamed via MCP response (every 10% checkpoint), cancellation allowed with cleanup, resume capability from last checkpoint

3. **Given** Target instance has incompatible Postgres version
   **When** Pre-migration validation runs
   **Then** System warns about compatibility issues and suggests fixes before starting transfer

---

### User Story 5 - Production-Ready Backups (Priority: P2)

**Description**: As a developer, I want automated, encrypted backups with point-in-time recovery capability, so that I can recover from disasters without losing data or violating compliance requirements.

**Why this priority**: Production requirement. No backup = not production-ready.

**Independent Test**: Create backup, corrupt database, restore, verify 100% data integrity.

**Acceptance Scenarios**:

1. **Given** Production Supabase instance
   **When** I run `backup_database` with encryption enabled (user-provided or auto-generated key)
   **Then** Backup is created with gzip compression, AES-256 encryption using specified key, metadata tagging, integrity verification, key version recorded

2. **Given** Backup file exists
   **When** I run `restore_database`
   **Then** Pre-restore validation checks compatibility, shows preview, requires confirmation, performs restore, validates schema diff and row counts

3. **Given** Backup retention policy (30 days)
   **When** Cleanup runs
   **Then** Old backups are deleted automatically, manifest updated, S3 storage option supported

---

### User Story 6 - Real-Time Monitoring & Alerts (Priority: P2)

**Description**: As a DevOps engineer, I want real-time monitoring of Supabase health (database connections, container status, error rates) with actionable alerts, so that I can prevent outages before they happen.

**Why this priority**: Production monitoring essential. Currently users only know about issues when app fails.

**Independent Test**: Simulate connection pool exhaustion, verify alert triggers and recovery suggestions.

**Acceptance Scenarios**:

1. **Given** Supabase instance running
   **When** Connection pool reaches 90% capacity
   **Then** System returns alert via MCP tool response with: current count, max, by-service breakdown, recommended POOLER_DEFAULT_POOL_SIZE adjustment (optionally sends webhook if configured)

2. **Given** Container becomes unhealthy
   **When** Health check runs
   **Then** System detects unhealthy container, returns alert via MCP with logs, offers restart via Dokploy API (optionally sends webhook if configured)

3. **Given** SSL certificate expires in 7 days
   **When** Certificate check runs
   **Then** System returns alert via MCP with renewal instructions (optionally sends webhook if configured)

---

### User Story 7 - Multi-Instance Orchestration (Priority: P3)

**Description**: As a development team, I want to manage dev/staging/production Supabase instances from one interface, promoting changes safely between environments.

**Why this priority**: Nice-to-have for teams. Individual developers can skip this.

**Independent Test**: Deploy dev instance, make schema changes, promote to staging, verify isolation between environments.

**Acceptance Scenarios**:

1. **Given** Dev, staging, prod instances on Dokploy
   **When** I run `dokploy_list_instances`
   **Then** System shows all instances with status, health, resource usage, filterable by tag

2. **Given** Schema changes in dev
   **When** I run `dokploy_sync_schema` dev→staging
   **Then** Migration diff is generated, applied to staging, data is NOT migrated (schema only)

3. **Given** Staging validated
   **When** I run `dokploy_promote_deployment` staging→prod
   **Then** Production is backed up first, schema migrated, optional data migration with confirmation, rollback capability if failures

---

### Edge Cases

**Dokploy-Specific**:
- What happens when Dokploy API returns 500 error during deployment?
  - Retry with exponential backoff (3 attempts), rollback to previous config, report error with Dokploy logs
- How does system handle Dokploy instance unavailable during health check?
  - Cache last known state, mark as "unknown", retry every 60s, alert after 5 minutes
- What if JWT_SECRET changes after keys are generated?
  - Detect mismatch (keys won't validate against secret), warn user, offer to regenerate keys
- What happens when Dokploy API rate limit is exceeded (HTTP 429)?
  - Adaptive rate limiter automatically backs off (exponential delay), queues requests, retries with reduced rate until success

**Memory Constraints**:
- What happens when database backup exceeds 512KB buffer?
  - Automatic spill-to-disk with streaming, temp file cleanup (24 hours retention), progress reporting
- How does system handle 1000-table schema introspection?
  - Lazy loading, fetch schemas on-demand, cache with TTL, pagination for large result sets
- When are temporary files cleaned up?
  - Automatic cleanup after 24 hours (configurable), immediate cleanup on successful operation completion, orphaned file detection on startup

**Connection Issues**:
- What if all 100 connection pool slots are used?
  - Alert immediately, show which services consume connections, recommend pool size increase or connection audit
- How does system handle intermittent network failures?
  - Retry with exponential backoff, connection pooling with keep-alive, fallback to alternative ports (6543→5432)

**Permission Errors**:
- What if `supabase_auth_admin` role doesn't exist (custom setup)?
  - Detect missing role, offer to create with correct grants, document manual setup steps
- How does system handle PostgREST blocking auth schema access?
  - Fallback to direct PostgreSQL connection, use correct role, clear error message if still blocked

**Data Integrity**:
- What if cross-instance migration fails at 80% complete?
  - Transaction rollback (if using --atomic flag), partial data flag, offer resume from last 10% checkpoint (70%)
- How does system verify backup integrity before restore?
  - Checksum validation, schema compatibility check, dry-run mode, row count pre-check
- What happens when user cancels a long-running operation (migration, backup)?
  - Graceful cancellation: complete current chunk, save checkpoint state, cleanup temp resources, return summary of completed work

## Requirements *(mandatory)*

### Functional Requirements

**Dokploy Integration (Feature Group 11)**:
- **FR-001**: System MUST authenticate to Dokploy API using JWT token in `x-api-key` header
- **FR-002**: System MUST deploy Supabase from Dokploy template with correct environment variables
- **FR-003**: System MUST generate cryptographically secure JWT keys with correct claims (`role`, `iss`)
- **FR-004**: System MUST automatically convert HTTP URLs to HTTPS for all public-facing variables
- **FR-005**: System MUST validate project names against DNS requirements (lowercase, no special chars, max 32 chars)
- **FR-006**: System MUST detect broken Dokploy-generated keys (identical keys, missing role claim, wrong issuer)
- **FR-007**: System MUST wait for container health status before marking deployment complete
- **FR-008**: System MUST validate auth endpoint with generated keys before returning success
- **FR-009**: System MUST support SMTP configuration validation (detect fake test servers)
- **FR-010**: System MUST update environment variables via Dokploy API with restart if needed
- **FR-011**: System MUST aggregate logs from all containers (Postgres, Kong, Studio, Auth, Realtime, Storage)
- **FR-012**: System MUST manage SSL certificates (detect expiration, provide renewal instructions)
- **FR-013**: System MUST support rollback to previous deployment configuration
- **FR-014**: System MUST support multi-instance orchestration (list, sync schema, promote)

**Monitoring & Alerting (Feature Group 9)**:
- **FR-049**: System MUST return alerts via MCP tool responses for critical issues (connection pool exhaustion, unhealthy containers, SSL expiration)
- **FR-050**: System MUST support optional webhook configuration for external alert delivery (HTTP POST with JSON payload)
- **FR-051**: System MUST implement adaptive rate limiting for Dokploy API calls (default 10 req/sec, burst capacity 20, automatic backoff on HTTP 429)

**Core Database (Feature Group 1)**:
- **FR-015**: System MUST connect to PostgreSQL using direct (5432) and pooled (6543) connections
- **FR-016**: System MUST handle connection strings in multiple formats (URL, component variables)
- **FR-017**: System MUST detect Docker networking (use `db` hostname within containers, domain/IP externally)
- **FR-018**: System MUST provide schema inspection (tables, columns, indexes, constraints, extensions)
- **FR-019**: System MUST execute SQL queries with parameterized inputs (prevent SQL injection)
- **FR-020**: System MUST implement query timeouts (default 30s, configurable)
- **FR-021**: System MUST monitor connection pool status (current, max, by-service breakdown)
- **FR-022**: System MUST use correct PostgreSQL roles for privileged operations (e.g., `supabase_auth_admin` for auth schema)

**Migrations (Feature Group 2)**:
- **FR-023**: System MUST track migration history with version numbers (retained indefinitely for rollback capability)
- **FR-024**: System MUST support up/down migrations with automatic rollback on failure
- **FR-025**: System MUST generate schema diffs between two instances
- **FR-026**: System MUST support cross-instance migration (cloud→self-hosted, self-hosted→cloud, etc.)
- **FR-027**: System MUST validate target instance compatibility (Postgres version, extensions) before migration
- **FR-028**: System MUST use chunked transfer for large datasets (<512KB memory buffer)
- **FR-029**: System MUST perform integrity checks (row counts, checksums) post-migration
- **FR-030**: System MUST bypass Supabase CLI limitations (self-hosted doesn't support `supabase link`)
- **FR-052**: System MUST stream progress updates via MCP responses for long-running operations (migrations, backups, deployments)
- **FR-053**: System MUST save checkpoint state every 10% of progress for resumable operations
- **FR-054**: System MUST support graceful cancellation with cleanup (complete current chunk, save state, cleanup temp resources)

**Backups & Restore (Feature Group 3)**:
- **FR-031**: System MUST create full backups (schema + data) with compression (gzip or zstd)
- **FR-032**: System MUST support encryption at rest (AES-256) with user-provided or auto-generated keys
- **FR-033**: System MUST tag backups with metadata (timestamp, Supabase version, Postgres version, extensions, key version)
- **FR-034**: System MUST verify backup integrity on creation (checksums)
- **FR-035**: System MUST support backup retention policies (auto-delete old backups)
- **FR-036**: System MUST validate pre-restore compatibility (versions, extensions)
- **FR-037**: System MUST perform post-restore validation (schema diff, row count verification)
- **FR-038**: System MUST support S3-compatible storage (MinIO, AWS S3, Backblaze B2)

**Memory Management (All Features)**:
- **FR-039**: System MUST respect 512KB maximum in-memory buffer for any single operation
- **FR-040**: System MUST automatically spill to disk when memory threshold exceeded
- **FR-041**: System MUST cleanup temporary files on completion or error (default retention: 24 hours for orphaned files, configurable)
- **FR-042**: System MUST support configurable storage paths for temp files and backups

**Security (All Features)**:
- **FR-043**: System MUST store sensitive data (API keys, passwords, JWT secrets) encrypted using encryption keys from key management system
- **FR-044**: System MUST NEVER log sensitive data (API keys, passwords, service role keys, encryption keys)
- **FR-045**: System MUST require user confirmation for destructive operations (DROP, DELETE, deployment changes affecting POSTGRES_PASSWORD)
- **FR-046**: System MUST validate all external inputs with Zod schemas
- **FR-047**: System MUST support read-only mode (disable all write operations)
- **FR-048**: System MUST audit log all Dokploy API calls and destructive database operations (default retention: 90 days, configurable)

**Encryption Key Management (All Features)**:
- **FR-055**: System MUST support user-provided encryption keys for AES-256 encryption
- **FR-056**: System MUST support auto-generation of cryptographically secure encryption keys when user does not provide keys
- **FR-057**: System MUST store encryption keys encrypted in configuration (keys encrypted at rest)
- **FR-058**: System MUST support key rotation with versioning (new backups use new key version, old backups remain decryptable with old key version)
- **FR-059**: System MUST NEVER log encryption keys in any context (audit logs, error messages, debug output)

### Key Entities

**DokployConfig**:
- Represents connection to Dokploy instance
- Attributes: apiUrl, apiKey, instanceName (optional)
- Relationships: One-to-many with SupabaseDeployment

**SupabaseDeployment**:
- Represents deployed Supabase instance
- Attributes: projectId (Dokploy), projectName, domain, health status, environment variables, container status
- Relationships: Belongs to DokployConfig, has many BackupRecords, has many MigrationRecords

**BackupRecord**:
- Represents database backup
- Attributes: backupId, timestamp, size, compression type, encryption enabled, integrity checksum, metadata (Supabase version, Postgres version, extensions), storage location
- Relationships: Belongs to SupabaseDeployment

**MigrationRecord**:
- Represents migration execution
- Attributes: migrationId, version, timestamp, direction (up/down), status (pending/applied/failed), sql content, rollback sql
- Relationships: Belongs to SupabaseDeployment

**ConnectionConfig**:
- Represents database connection
- Attributes: host, port, database, user, password, pooled (boolean), connectionString
- Relationships: Belongs to SupabaseDeployment

**ValidationResult**:
- Represents config validation output
- Attributes: valid (boolean), errors (array), warnings (array)
- Relationships: Associated with SupabaseDeployment

## Success Criteria *(mandatory)*

### Measurable Outcomes

**Deployment Automation**:
- **SC-001**: Users can deploy production-ready Supabase to Dokploy in under 10 minutes (currently 2-4 hours)
- **SC-002**: 100% of deployments have valid JWT keys (currently 0% with Dokploy template)
- **SC-003**: 100% of deployments use HTTPS for public URLs (currently requires manual changes)
- **SC-004**: Zero manual environment variable editing required for standard deployments

**Reliability**:
- **SC-005**: Cross-instance migrations achieve 100% data integrity (verified with checksums and row counts)
- **SC-006**: Backup→restore round-trip achieves 100% data integrity
- **SC-007**: System handles connection pool exhaustion without crashes (alert + graceful degradation)
- **SC-008**: No operation exceeds 512KB memory buffer without disk spillover

**Performance**:
- **SC-009**: Simple SQL queries execute in <100ms
- **SC-010**: Backup creation starts streaming within 2s, throughput >10MB/s
- **SC-011**: Migration application <1s per migration step
- **SC-012**: Health monitoring checks complete in <5s

**User Experience**:
- **SC-013**: 90% of users successfully complete Dokploy deployment on first attempt
- **SC-014**: Error messages include actionable recovery steps (not just "query failed")
- **SC-015**: Broken config detection provides exact fix command (e.g., "Run dokploy_regenerate_keys")

**Testing**:
- **SC-016**: 85%+ code coverage across project
- **SC-017**: 100% coverage for migrations, backups, auth operations
- **SC-018**: All 17 Dokploy-specific test scenarios pass
- **SC-019**: All 9 connection failure test scenarios pass

**Production Readiness**:
- **SC-020**: Successfully deploy and manage Supabase in 3+ real production projects
- **SC-021**: Zero critical security vulnerabilities in audit
- **SC-022**: Complete documentation (README, API docs, troubleshooting guide)

---

**Next Steps**:
1. Create implementation plan with task breakdown
2. Set up project infrastructure (TypeScript, Biome, Zod, testing frameworks)
3. Implement P1 features first (Dokploy Integration, Self-Hosted Connection Management)
4. Continuous validation against Constitution v2.1.0 requirements
