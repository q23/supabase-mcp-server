# Implementation Plan: Supabase MCP Server

**Branch**: `main` | **Date**: 2025-10-29 | **Spec**: [spec.md](./spec.md)
**Constitution Version**: 2.1.0

## Summary

Build a production-ready MCP server that provides comprehensive Supabase management capabilities for both cloud and self-hosted instances. Primary focus: Dokploy integration with automated deployment wizard that resolves all documented pain points (broken JWT generators, HTTP→HTTPS conversion, connection management).

**Technical Approach**: TypeScript-based MCP server using `@modelcontextprotocol/sdk`, with specialized tools for Dokploy API integration, PostgreSQL direct access (node-postgres), Supabase client wrapper, and intelligent memory management (disk spillover for large operations).

## Technical Context

**Language/Version**: TypeScript 5.3+ with strict mode enabled
**Primary Dependencies**:
- `@modelcontextprotocol/sdk` - MCP server framework
- `@supabase/supabase-js` - Supabase client for API operations
- `pg` (node-postgres) - Direct PostgreSQL access
- `zod` - Input validation and schema definition
- `jsonwebtoken` - JWT generation and validation
- `dotenv` - Environment configuration
- `axios` - HTTP client for Dokploy API

**Development Dependencies**:
- `@biomejs/biome` - Linting and formatting (replaces ESLint + Prettier)
- `vitest` - Testing framework
- `tsx` - TypeScript execution
- `typescript` - TypeScript compiler

**Storage**:
- Local filesystem for backups and temp files (configurable path)
- Optional S3-compatible storage for backups
- In-memory cache with disk spillover (512KB threshold)

**Testing**: Vitest with Docker Compose for integration tests
**Target Platform**: Node.js 18+ (cross-platform: macOS, Linux, Windows)
**Project Type**: Single TypeScript project (MCP server library + CLI)

**Performance Goals** (from Constitution Section 5.1):
- Query execution: <100ms simple, <5s complex
- Backup streaming: start within 2s, >10MB/s throughput
- Migration application: <1s per step
- Type generation: <3s for 100 tables
- Memory footprint: <100MB baseline, <200MB under load

**Constraints**:
- MCP memory limit: 512KB max buffer for single operation
- Connection pool: Monitor and prevent exhaustion (default max 100)
- Network: Handle Docker internal networking vs external access
- Security: Never log sensitive data (API keys, passwords, service role keys)

**Scale/Scope**:
- Support databases with 1000+ tables
- Handle 100+ concurrent connections
- Manage 10GB+ database backups
- Support 3+ Dokploy instances simultaneously

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Constitution Compliance**:
- ✅ Section 3.1: TypeScript Excellence (strict mode, no `any`, Zod validation)
- ✅ Section 3.2: Biome.js for linting/formatting
- ✅ Section 3.3: Code organization (src/tools/, src/lib/, src/types/)
- ✅ Section 4: Testing standards (85%+ coverage, Vitest, Docker for integration tests)
- ✅ Section 5: Performance benchmarks defined
- ✅ Section 6: Security practices (encrypted secrets, parameterized queries, audit logs)
- ✅ Section 10.1: Feature development workflow (Spec → Schema → Implementation → Testing)
- ✅ Section 11.4: Self-hosted connection issues documented and solutions planned
- ✅ Section 12: Dokploy integration architecture defined

**No Constitution Violations**: Project aligns with all defined principles.

## Project Structure

### Documentation

```text
.specify/
├── memory/
│   └── constitution.md          # v2.1.0
├── spec/
│   ├── 001-baseline-specification.md
│   ├── 002-implementation-plan.md (this file)
│   └── 003-tasks.md             # Phase 2 output (next step)
└── templates/                    # Specify templates
```

### Source Code

```text
src/
├── index.ts                      # MCP server entry point
├── tools/                        # MCP tool implementations
│   ├── dokploy/                 # Feature Group 11: Dokploy Integration
│   │   ├── deploy-supabase.ts
│   │   ├── update-env.ts
│   │   ├── monitor-health.ts
│   │   ├── get-logs.ts
│   │   ├── manage-domain.ts
│   │   ├── rollback.ts
│   │   ├── clone-instance.ts
│   │   ├── validate-config.ts
│   │   ├── setup-wizard.ts      # P1 Critical
│   │   ├── list-instances.ts
│   │   └── sync-schema.ts
│   ├── core/                    # Feature Group 1: Core Database
│   │   ├── connect.ts
│   │   ├── execute-sql.ts
│   │   ├── inspect-schema.ts
│   │   └── monitor-connections.ts
│   ├── migrations/              # Feature Group 2: Migrations
│   │   ├── list-migrations.ts
│   │   ├── apply-migration.ts
│   │   ├── rollback-migration.ts
│   │   ├── generate-diff.ts
│   │   └── cross-instance-migrate.ts
│   ├── backups/                 # Feature Group 3: Backups & Restore
│   │   ├── create-backup.ts
│   │   ├── restore-backup.ts
│   │   ├── list-backups.ts
│   │   └── cleanup-backups.ts
│   ├── auth/                    # Feature Group 5: Auth Management
│   │   ├── list-users.ts
│   │   └── manage-providers.ts
│   ├── storage/                 # Feature Group 6: Storage Operations
│   │   └── manage-buckets.ts
│   ├── functions/               # Feature Group 7: Edge Functions
│   │   └── manage-functions.ts
│   ├── monitoring/              # Feature Group 9: Debugging & Monitoring
│   │   └── aggregate-logs.ts
│   └── knowledge/               # Feature Group 10: Knowledge Base
│       └── search-docs.ts
├── lib/                         # Shared utilities
│   ├── supabase/
│   │   ├── client.ts            # Supabase client wrapper
│   │   └── auth-helper.ts
│   ├── postgres/
│   │   ├── connection-pool.ts   # pg.Pool wrapper
│   │   ├── connection-builder.ts # Handle multiple connection formats
│   │   └── role-manager.ts      # Correct role selection
│   ├── dokploy/
│   │   ├── api-client.ts        # Dokploy API wrapper
│   │   ├── jwt-generator.ts     # Independent JWT generation
│   │   └── env-parser.ts        # Parse .env files
│   ├── memory/
│   │   ├── buffer-manager.ts    # 512KB buffer with disk spillover
│   │   └── temp-file-manager.ts # Temp file cleanup
│   ├── validation/
│   │   ├── schemas.ts           # Zod schemas
│   │   ├── jwt-validator.ts     # Validate JWT structure
│   │   ├── url-validator.ts     # HTTP→HTTPS validation
│   │   └── project-name-validator.ts
│   ├── errors/
│   │   ├── base-error.ts
│   │   ├── connection-error.ts
│   │   ├── validation-error.ts
│   │   └── dokploy-error.ts
│   └── utils/
│       ├── logger.ts            # Structured logging (no secrets!)
│       ├── encryption.ts        # Encrypt secrets at rest
│       └── retry.ts             # Exponential backoff
├── types/                       # TypeScript type definitions
│   ├── dokploy.ts
│   ├── supabase.ts
│   ├── mcp.ts
│   └── config.ts
└── config/                      # Configuration management
    ├── default.ts
    └── schema.ts

tests/
├── unit/                        # Unit tests (Vitest)
│   ├── lib/
│   ├── tools/
│   └── validation/
├── integration/                 # Integration tests (Docker Compose)
│   ├── dokploy/
│   ├── postgres/
│   └── supabase/
├── e2e/                         # End-to-end tests
│   ├── deployment-workflow.test.ts
│   ├── migration-workflow.test.ts
│   └── backup-restore.test.ts
└── fixtures/                    # Test data
    ├── env-examples/
    ├── sql-dumps/
    └── docker-compose/

.github/
└── workflows/
    ├── ci.yml                   # Run tests, linting
    └── release.yml              # Automated releases

# Root files
├── package.json
├── tsconfig.json
├── biome.json
├── vitest.config.ts
├── .gitignore
├── .env.example
├── README.md
├── CHANGELOG.md
└── supabase-env-example.md     # Real-world examples (gitignored)
```

**Structure Decision**: Single TypeScript project with modular tool organization. Each feature group gets its own directory under `src/tools/`. Shared functionality in `src/lib/` organized by domain (Supabase, Postgres, Dokploy, memory management).

## Milestones

### Milestone 1: Project Infrastructure (Week 1)
**Goal**: Fully configured TypeScript project with testing and development environment ready.

**Deliverables**:
- ✅ `package.json` with all dependencies
- ✅ `tsconfig.json` (strict mode, paths)
- ✅ `biome.json` configuration
- ✅ `vitest.config.ts` setup
- ✅ Docker Compose for integration tests (Postgres + Supabase)
- ✅ CI/CD pipeline (GitHub Actions)
- ✅ Project structure scaffolded

**Success Criteria**:
- `npm test` runs successfully (even if no tests yet)
- `npm run lint` passes
- `npm run format` works
- `npm run build` compiles TypeScript
- Docker Compose starts Supabase locally

---

### Milestone 2: Core Foundations (Week 2)
**Goal**: Essential libraries and utilities that all features depend on.

**Deliverables**:
- ✅ Connection management (Postgres, Supabase client)
- ✅ Zod validation schemas
- ✅ Error handling framework
- ✅ Memory buffer manager (512KB threshold)
- ✅ Logging utility (structured, no secrets)
- ✅ Basic MCP server scaffold

**Success Criteria**:
- Can connect to Postgres (direct + pooled)
- Can connect to Supabase (cloud + self-hosted)
- Memory manager spills to disk when threshold exceeded
- Errors have proper types and recovery suggestions
- MCP server responds to tool calls (even if tools are stubs)

---

### Milestone 3: P1 - Dokploy Integration MVP (Week 3-4)
**Goal**: Zero-touch Supabase deployment via Dokploy works end-to-end.

**Deliverables**:
- ✅ Dokploy API client
- ✅ Independent JWT generator (correct structure!)
- ✅ Environment variable parser/validator
- ✅ HTTP→HTTPS converter
- ✅ Project name validator
- ✅ `dokploy_setup_wizard` tool (full 9-step workflow)
- ✅ `dokploy_validate_config` tool
- ✅ Post-deployment validation (test auth endpoint)

**Success Criteria**:
- Deploy Supabase to Dokploy in <10 minutes
- 100% of deployments have valid JWT keys (different, with role claims)
- 100% of deployments use HTTPS for public URLs
- Auth endpoint responds with generated keys
- All containers healthy after deployment

**User Story Validated**: User Story 1 (Zero-Touch Deployment)

---

### Milestone 4: P1 - Self-Hosted Connection Management (Week 5)
**Goal**: Robust connection handling for self-hosted instances.

**Deliverables**:
- ✅ Connection string parser (all formats)
- ✅ Docker network detection
- ✅ Connection pool monitor
- ✅ Role-based query execution (correct roles for auth schema)
- ✅ CLI bypass (direct PostgreSQL for migrations)
- ✅ `monitor_connections` tool
- ✅ `execute_sql` tool with safety controls

**Success Criteria**:
- Handles all 6 connection string formats
- Detects Docker vs external networking
- Alerts when pool >90% capacity
- Can access `auth.users` without permission errors
- Runs migrations without Supabase CLI

**User Story Validated**: User Story 3 (Self-Hosted Connection Management)

---

### Milestone 5: P1 - Broken Config Detection (Week 6)
**Goal**: Detect and fix existing Dokploy deployments with broken configs.

**Deliverables**:
- ✅ JWT decoder and validator
- ✅ Broken key detector (identical keys, missing claims, wrong issuer)
- ✅ Automatic key regeneration
- ✅ Dokploy env update via API
- ✅ Container restart automation
- ✅ `dokploy_update_env` tool
- ✅ `dokploy_regenerate_keys` tool

**Success Criteria**:
- Detects 100% of broken Dokploy-generated keys
- Offers regeneration with correct structure
- Updates env vars via Dokploy API
- Restarts containers if needed
- Validates auth endpoint after fix

**User Story Validated**: User Story 2 (Detect and Fix Broken Deployments)

---

### Milestone 6: P2 - Migrations & Backups (Week 7-8)
**Goal**: Production-ready data migration and backup capabilities.

**Deliverables**:
- ✅ Migration versioning system
- ✅ Schema diff generator
- ✅ Cross-instance migration (with chunking)
- ✅ Backup creation (compression, encryption)
- ✅ Backup restoration (with validation)
- ✅ Integrity checks (checksums, row counts)
- ✅ S3 storage support

**Success Criteria**:
- Migrate 100+ tables with 100% data integrity
- Backup→restore achieves 100% data integrity
- Large databases (10GB+) handled with streaming
- Memory never exceeds 512KB buffer

**User Story Validated**: User Story 4 (Cross-Instance Migration), User Story 5 (Production Backups)

---

### Milestone 7: P2 - Monitoring & Alerts (Week 9)
**Goal**: Real-time health monitoring with actionable alerts.

**Deliverables**:
- ✅ Container health checker (Dokploy API)
- ✅ Connection pool monitoring
- ✅ Log aggregation (all services)
- ✅ SSL certificate expiration detection
- ✅ `dokploy_monitor_health` tool
- ✅ `dokploy_get_logs` tool

**Success Criteria**:
- Detects unhealthy containers within 30s
- Alerts at 90% connection pool capacity
- Aggregates logs from 6+ services
- Warns 7 days before SSL expiration

**User Story Validated**: User Story 6 (Real-Time Monitoring)

---

### Milestone 8: P3 - Multi-Instance Orchestration (Week 10)
**Goal**: Manage multiple Supabase instances from single interface.

**Deliverables**:
- ✅ Instance registry
- ✅ Schema sync between instances
- ✅ Deployment promotion workflow
- ✅ `dokploy_list_instances` tool
- ✅ `dokploy_sync_schema` tool
- ✅ `dokploy_promote_deployment` tool

**Success Criteria**:
- List all instances with status
- Sync schema (migrations only, not data)
- Promote dev→staging→prod with backups

**User Story Validated**: User Story 7 (Multi-Instance Orchestration)

---

### Milestone 9: Production Hardening (Week 11-12)
**Goal**: Production-ready with documentation and security audit.

**Deliverables**:
- ✅ Complete test suite (85%+ coverage)
- ✅ Security audit (no critical vulnerabilities)
- ✅ Complete documentation (README, API docs, troubleshooting)
- ✅ Performance benchmarking
- ✅ Error message review (all have recovery steps)
- ✅ Real-world validation (3+ projects)

**Success Criteria**:
- All 22 success criteria from baseline spec met
- No critical security issues
- Documentation covers all use cases
- Successfully deployed in production

---

## Phase Breakdown

### Phase 0: Project Setup (Milestone 1)

**Tasks**:
1. **Initialize npm project**
   - Create `package.json` with dependencies
   - Configure scripts (build, test, lint, format, dev)
   - Set up TypeScript compiler

2. **Configure development tools**
   - Set up Biome.js for linting/formatting
   - Configure Vitest for testing
   - Set up tsx for development
   - Configure tsconfig paths

3. **Create project structure**
   - Scaffold all directories
   - Create index files
   - Set up barrel exports

4. **Set up Docker environment**
   - Create docker-compose.yml for Supabase
   - Add test fixtures
   - Document local dev setup

5. **Configure CI/CD**
   - GitHub Actions for tests
   - GitHub Actions for releases
   - Pre-commit hooks (Biome check)

**Dependencies**: None (foundational)
**Estimated Time**: 3-5 days

---

### Phase 1: Core Libraries (Milestone 2)

**Tasks**:
1. **Connection management**
   - Implement ConnectionBuilder (parse multiple formats)
   - Implement PostgresConnectionPool wrapper
   - Implement SupabaseClientWrapper
   - Add connection testing utilities

2. **Validation framework**
   - Define base Zod schemas
   - Implement JWTValidator
   - Implement URLValidator
   - Implement ProjectNameValidator
   - Create validation error types

3. **Memory management**
   - Implement BufferManager (512KB threshold)
   - Implement TempFileManager
   - Add cleanup automation
   - Add streaming utilities

4. **Error handling**
   - Define error hierarchy
   - Implement typed error classes
   - Add recovery suggestion system
   - Add error serialization for MCP

5. **Utilities**
   - Implement structured logger (no secrets!)
   - Implement encryption utility
   - Implement retry with exponential backoff
   - Add configuration loader

**Dependencies**: Phase 0 complete
**Estimated Time**: 1 week

---

### Phase 2: P1 Features - Dokploy Integration (Milestones 3, 4, 5)

**Tasks (Milestone 3 - Setup Wizard)**:
1. **Dokploy API client**
   - Implement authentication
   - Implement application creation endpoint
   - Implement environment variable management
   - Implement deployment triggers
   - Implement health checks
   - Add error handling and retries

2. **JWT generation (CRITICAL)**
   - Implement independent JWT generator
   - Generate correct payload structure (role, iss, iat, exp)
   - Ensure ANON_KEY ≠ SERVICE_ROLE_KEY
   - Add validation against JWT_SECRET
   - Test against Supabase auth endpoint

3. **Environment processing**
   - Implement .env file parser
   - Implement HTTP→HTTPS converter
   - Implement variable validation
   - Implement diff generator (template vs production)

4. **Setup wizard orchestration**
   - Implement 9-step wizard flow
   - Add Dokploy connectivity check
   - Add project name validation step
   - Add secret generation step
   - Add SMTP configuration step
   - Add domain/SSL configuration step
   - Add review step with validation
   - Add deployment step with progress
   - Add post-deployment validation step

5. **Validation tool**
   - Implement `dokploy_validate_config`
   - Check project name format
   - Check HTTP vs HTTPS
   - Check JWT key validity (decode + structure)
   - Check SMTP configuration
   - Check all required variables present
   - Generate actionable error reports

**Tasks (Milestone 4 - Connection Management)**:
6. **Connection string handling**
   - Implement parser for all 6 formats
   - Implement Docker network detection
   - Implement connection string builder
   - Add connection testing

7. **Pool monitoring**
   - Implement `monitor_connections` tool
   - Query pg_stat_activity
   - Group by service (supavisor, analytics, realtime)
   - Generate recommendations (adjust pool size)

8. **SQL execution**
   - Implement `execute_sql` tool
   - Add parameterized query support
   - Add role-based execution
   - Add query timeout
   - Add result streaming for large sets

**Tasks (Milestone 5 - Broken Config Detection)**:
9. **JWT validation**
   - Implement JWT decoder
   - Detect identical keys
   - Detect missing role claim
   - Detect wrong issuer
   - Detect invalid signature

10. **Config repair**
    - Implement `dokploy_regenerate_keys`
    - Implement `dokploy_update_env` with safety checks
    - Add container restart automation
    - Add validation after update

**Dependencies**: Phase 1 complete
**Estimated Time**: 3 weeks (critical path)

---

### Phase 3: P2 Features - Migrations & Backups (Milestone 6)

**Tasks**:
1. **Migration system**
   - Implement migration version tracking
   - Implement up/down migration runner
   - Add rollback on failure
   - Add transaction support

2. **Schema diff**
   - Implement schema introspection
   - Implement diff generator (tables, columns, indexes, constraints)
   - Add compatibility check

3. **Cross-instance migration**
   - Implement data export (pg_dump wrapper)
   - Implement chunked transfer (512KB buffer)
   - Add progress reporting
   - Add integrity checks (row counts, checksums)
   - Add pause/resume capability

4. **Backup system**
   - Implement streaming backup creation
   - Add compression (gzip/zstd)
   - Add encryption (AES-256)
   - Add metadata tagging
   - Implement S3 storage adapter

5. **Restore system**
   - Implement pre-restore validation
   - Implement streaming restore
   - Add post-restore verification
   - Add rollback on failure

**Dependencies**: Phase 2 complete
**Estimated Time**: 2 weeks

---

### Phase 4: P2 Features - Monitoring (Milestone 7)

**Tasks**:
1. **Health monitoring**
   - Implement container status checker (Dokploy API)
   - Implement resource usage monitoring
   - Add alert system

2. **Log aggregation**
   - Implement log fetcher for all services
   - Add filtering (service, level, time range)
   - Add search functionality
   - Add export capability

3. **SSL monitoring**
   - Implement certificate expiration checker
   - Add renewal reminders

**Dependencies**: Phase 2 complete
**Estimated Time**: 1 week

---

### Phase 5: P3 Features - Multi-Instance (Milestone 8)

**Tasks**:
1. **Instance management**
   - Implement instance registry
   - Implement list/filter functionality

2. **Schema sync**
   - Implement schema-only sync
   - Add migration diff between instances

3. **Promotion workflow**
   - Implement backup before promotion
   - Implement schema migration
   - Add optional data migration
   - Add rollback capability

**Dependencies**: Phases 2, 3 complete
**Estimated Time**: 1 week

---

### Phase 6: Production Hardening (Milestone 9)

**Tasks**:
1. **Testing**
   - Write unit tests (85%+ coverage)
   - Write integration tests
   - Write E2E tests
   - Write memory stress tests

2. **Documentation**
   - Write comprehensive README
   - Write API documentation
   - Write troubleshooting guide
   - Add code examples

3. **Security**
   - Run security audit
   - Fix vulnerabilities
   - Review error messages (no secret leaks)

4. **Performance**
   - Run benchmarks
   - Optimize hot paths
   - Validate memory constraints

5. **Validation**
   - Deploy to 3+ production projects
   - Collect feedback
   - Fix critical issues

**Dependencies**: All features complete
**Estimated Time**: 2 weeks

---

## Risk Mitigation

**High Risk**:
1. **Dokploy API changes** - Monitor GitHub releases, version lock in package.json
2. **JWT generation failures** - Extensive testing against real Supabase instances, multiple generation methods
3. **Memory exhaustion** - Continuous monitoring, buffer manager stress tests, disk spillover validation

**Medium Risk**:
1. **Connection pool exhaustion** - Alert system, configuration validation, pool size recommendations
2. **Network timeouts** - Retry logic, exponential backoff, configurable timeouts
3. **Permission errors** - Role detection, automatic role selection, clear error messages

**Low Risk**:
1. **Breaking changes in dependencies** - Lock versions, comprehensive test suite catches issues
2. **Platform compatibility** - CI runs on multiple OS (Linux, macOS, Windows)

---

## Next Steps

1. **Execute Phase 0** (Milestone 1: Project Infrastructure)
   - Initialize package.json
   - Configure dev tools (Biome, Vitest, TypeScript)
   - Scaffold project structure
   - Set up Docker Compose
   - Configure CI/CD

2. **Create Tasks Breakdown** (`003-tasks.md`)
   - Convert each phase into actionable tasks
   - Assign story points
   - Create GitHub issues

3. **Begin Implementation**
   - Start with Phase 0 tasks
   - Follow Constitution development workflow (Spec → Schema → Implementation → Testing → Review)

---

**Ready to proceed with Phase 0?** Let's build the foundation! 🚀
