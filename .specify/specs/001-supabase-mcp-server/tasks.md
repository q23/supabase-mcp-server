# Tasks: Supabase MCP Server

**Input**: Design documents from `.specify/specs/001-supabase-mcp-server/`
**Prerequisites**: plan.md (required), spec.md (required)

**Tests**: Tests are included per spec requirements for 85%+ code coverage

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Single TypeScript project: `src/`, `tests/` at repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Initialize package.json with dependencies (@modelcontextprotocol/sdk, @supabase/supabase-js, pg, zod, jsonwebtoken, dotenv, axios)
- [X] T002 Configure TypeScript compiler in tsconfig.json (strict mode, paths)
- [X] T003 [P] Configure Biome.js in biome.json for linting and formatting
- [X] T004 [P] Configure Vitest in vitest.config.ts for testing
- [X] T005 [P] Create project structure (src/tools/, src/lib/, src/types/, src/config/, tests/)
- [X] T006 Create Docker Compose file for integration tests (Postgres + Supabase local)
- [X] T007 [P] Configure GitHub Actions CI workflow in .github/workflows/ci.yml
- [X] T008 [P] Create .env.example with all required configuration variables
- [X] T009 Create .gitignore with Node.js, TypeScript, and sensitive data exclusions
- [X] T010 [P] Create README.md with project overview and setup instructions

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Core Type Definitions

- [X] T011 [P] Define core types in src/types/config.ts (DokployConfig, SupabaseConfig, ConnectionConfig)
- [X] T012 [P] Define Dokploy API types in src/types/dokploy.ts (DeploymentStatus, HealthStatus, ContainerInfo)
- [X] T013 [P] Define Supabase types in src/types/supabase.ts (BackupRecord, MigrationRecord, ValidationResult)
- [X] T014 [P] Define MCP types in src/types/mcp.ts (ToolResponse, ErrorResponse)

### Validation Framework

- [X] T015 [P] Create base Zod schemas in src/lib/validation/schemas.ts (connection strings, URLs, project names)
- [X] T016 [P] Implement JWT validator in src/lib/validation/jwt-validator.ts
- [X] T017 [P] Implement URL validator in src/lib/validation/url-validator.ts (HTTP→HTTPS detection)
- [X] T018 [P] Implement project name validator in src/lib/validation/project-name-validator.ts

### Error Handling

- [X] T019 [P] Create base error class in src/lib/errors/base-error.ts
- [X] T020 [P] Create connection error in src/lib/errors/connection-error.ts
- [X] T021 [P] Create validation error in src/lib/errors/validation-error.ts
- [X] T022 [P] Create Dokploy error in src/lib/errors/dokploy-error.ts

### Utilities

- [X] T023 [P] Implement structured logger in src/lib/utils/logger.ts (no secret logging)
- [X] T024 [P] Implement encryption utility in src/lib/utils/encryption.ts (AES-256)
- [X] T025 [P] Implement retry utility in src/lib/utils/retry.ts (exponential backoff)

### Memory Management

- [X] T026 Implement buffer manager in src/lib/memory/buffer-manager.ts (512KB threshold, disk spillover)
- [X] T027 Implement temp file manager in src/lib/memory/temp-file-manager.ts (cleanup automation)

### Connection Management

- [X] T028 Implement PostgreSQL connection pool in src/lib/postgres/connection-pool.ts (pg.Pool wrapper)
- [X] T029 Implement connection string builder in src/lib/postgres/connection-builder.ts (parse multiple formats)
- [X] T030 Implement role manager in src/lib/postgres/role-manager.ts (correct role selection for auth schema)
- [X] T031 Implement Supabase client wrapper in src/lib/supabase/client.ts
- [X] T032 [P] Implement Supabase auth helper in src/lib/supabase/auth-helper.ts

### Configuration

- [X] T033 Create default configuration in src/config/default.ts
- [X] T034 Create configuration schema in src/config/schema.ts (Zod validation)

### MCP Server Scaffold

- [X] T035 Create MCP server entry point in src/index.ts (basic server setup)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Zero-Touch Supabase Deployment (Priority: P1) 🎯 MVP

**Goal**: Deploy production-ready Supabase instance to Dokploy in under 10 minutes without manual configuration

**Independent Test**: Provide Dokploy API credentials and domain, verify working Supabase instance deployed with valid authentication

### Dokploy API Client

- [X] T036 [P] [US1] Implement Dokploy API authentication in src/lib/dokploy/api-client.ts
- [X] T037 [P] [US1] Implement Dokploy application creation endpoint in src/lib/dokploy/api-client.ts
- [X] T038 [P] [US1] Implement Dokploy environment variable management in src/lib/dokploy/api-client.ts
- [X] T039 [P] [US1] Implement Dokploy deployment trigger endpoint in src/lib/dokploy/api-client.ts
- [X] T040 [P] [US1] Implement Dokploy health check endpoint in src/lib/dokploy/api-client.ts

### JWT Generation (CRITICAL)

- [X] T041 [US1] Implement independent JWT generator in src/lib/dokploy/jwt-generator.ts (correct payload structure)
- [X] T042 [US1] Add ANON_KEY generation with role claim in src/lib/dokploy/jwt-generator.ts
- [X] T043 [US1] Add SERVICE_ROLE_KEY generation with role claim in src/lib/dokploy/jwt-generator.ts
- [X] T044 [US1] Add JWT validation against JWT_SECRET in src/lib/dokploy/jwt-generator.ts
- [X] T045 [US1] Add auth endpoint test utility in src/lib/dokploy/jwt-generator.ts

### Environment Processing

- [X] T046 [P] [US1] Implement .env file parser in src/lib/dokploy/env-parser.ts
- [X] T047 [P] [US1] Implement HTTP→HTTPS converter in src/lib/dokploy/env-parser.ts
- [X] T048 [P] [US1] Implement environment variable validation in src/lib/dokploy/env-parser.ts
- [X] T049 [P] [US1] Implement template diff generator in src/lib/dokploy/env-parser.ts

### Setup Wizard Tool

- [X] T050 [US1] Implement dokploy_setup_wizard tool in src/tools/dokploy/setup-wizard.ts (9-step workflow)
- [X] T051 [US1] Add Dokploy connectivity check step in src/tools/dokploy/setup-wizard.ts
- [X] T052 [US1] Add project name validation step in src/tools/dokploy/setup-wizard.ts
- [X] T053 [US1] Add secret generation step in src/tools/dokploy/setup-wizard.ts
- [X] T054 [US1] Add SMTP configuration step in src/tools/dokploy/setup-wizard.ts
- [X] T055 [US1] Add domain/SSL configuration step in src/tools/dokploy/setup-wizard.ts
- [X] T056 [US1] Add review step with validation in src/tools/dokploy/setup-wizard.ts
- [X] T057 [US1] Add deployment step with progress in src/tools/dokploy/setup-wizard.ts
- [X] T058 [US1] Add post-deployment validation step in src/tools/dokploy/setup-wizard.ts

### Validation Tool

- [X] T059 [P] [US1] Implement dokploy_validate_config tool in src/tools/dokploy/validate-config.ts
- [X] T060 [P] [US1] Add project name format check in src/tools/dokploy/validate-config.ts
- [X] T061 [P] [US1] Add HTTP vs HTTPS protocol check in src/tools/dokploy/validate-config.ts
- [X] T062 [P] [US1] Add JWT key validity check in src/tools/dokploy/validate-config.ts
- [X] T063 [P] [US1] Add SMTP configuration check in src/tools/dokploy/validate-config.ts
- [X] T064 [P] [US1] Add required variables check in src/tools/dokploy/validate-config.ts
- [X] T065 [P] [US1] Generate actionable error reports in src/tools/dokploy/validate-config.ts

### Testing for User Story 1

- [X] T066 [P] [US1] Unit tests for JWT generator in tests/unit/lib/dokploy/jwt-generator.test.ts
- [X] T067 [P] [US1] Unit tests for env parser in tests/unit/lib/dokploy/env-parser.test.ts
- [X] T068 [P] [US1] Unit tests for validators in tests/unit/lib/validation/validators.test.ts
- [X] T069 [US1] Integration test for setup wizard in tests/integration/dokploy/setup-wizard.test.ts
- [X] T070 [US1] E2E test for full deployment workflow in tests/e2e/deployment-workflow.test.ts

**Checkpoint**: At this point, User Story 1 should be fully functional - can deploy Supabase to Dokploy

---

## Phase 4: User Story 2 - Detect and Fix Broken Deployments (Priority: P1)

**Goal**: Detect broken JWT configurations in existing Dokploy deployments and offer to fix them

**Independent Test**: Connect to existing Dokploy Supabase instance with broken keys, detect issues, regenerate keys, verify auth works

### JWT Validation

- [X] T071 [P] [US2] Implement JWT decoder in src/lib/dokploy/jwt-generator.ts
- [X] T072 [P] [US2] Add identical key detection in src/lib/dokploy/jwt-generator.ts
- [X] T073 [P] [US2] Add missing role claim detection in src/lib/dokploy/jwt-generator.ts
- [X] T074 [P] [US2] Add wrong issuer detection in src/lib/dokploy/jwt-generator.ts
- [X] T075 [P] [US2] Add invalid signature detection in src/lib/dokploy/jwt-generator.ts

### Config Repair Tools

- [X] T076 [US2] Implement dokploy_regenerate_keys tool in src/tools/dokploy/regenerate-keys.ts
- [X] T077 [US2] Implement dokploy_update_env tool in src/tools/dokploy/update-env.ts (with safety checks)
- [X] T078 [US2] Add container restart automation in src/tools/dokploy/update-env.ts
- [X] T079 [US2] Add post-update validation in src/tools/dokploy/update-env.ts

### Testing for User Story 2

- [X] T080 [P] [US2] Unit tests for broken key detection in tests/unit/lib/dokploy/jwt-validator.test.ts
- [X] T081 [US2] Integration test for config repair workflow in tests/integration/dokploy/config-repair.test.ts

**Checkpoint**: At this point, User Story 2 should work - can detect and fix broken deployments

---

## Phase 5: User Story 3 - Self-Hosted Connection Management (Priority: P1)

**Goal**: Automatically handle connection pooling, schema permissions, and CLI limitations for self-hosted Supabase

**Independent Test**: Connect to self-hosted instance, monitor connections, access auth schema, perform migrations without CLI

### Connection String Handling

- [X] T082 [P] [US3] Implement parser for all 6 connection formats in src/lib/postgres/connection-builder.ts
- [X] T083 [P] [US3] Implement Docker network detection in src/lib/postgres/connection-builder.ts
- [X] T084 [P] [US3] Add connection testing utility in src/lib/postgres/connection-builder.ts

### Pool Monitoring Tool

- [X] T085 [US3] Implement monitor_connections tool in src/tools/core/monitor-connections.ts
- [X] T086 [US3] Add pg_stat_activity query in src/tools/core/monitor-connections.ts
- [X] T087 [US3] Add service breakdown (supavisor, analytics, realtime) in src/tools/core/monitor-connections.ts
- [X] T088 [US3] Generate pool size recommendations in src/tools/core/monitor-connections.ts

### SQL Execution Tool

- [X] T089 [US3] Implement execute_sql tool in src/tools/core/execute-sql.ts
- [X] T090 [US3] Add parameterized query support in src/tools/core/execute-sql.ts
- [X] T091 [US3] Add role-based execution in src/tools/core/execute-sql.ts (supabase_auth_admin for auth schema)
- [X] T092 [US3] Add query timeout support in src/tools/core/execute-sql.ts
- [X] T093 [US3] Add result streaming for large sets in src/tools/core/execute-sql.ts

### Core Database Tools

- [X] T094 [P] [US3] Implement connect tool in src/tools/core/connect.ts
- [X] T095 [P] [US3] Implement inspect_schema tool in src/tools/core/inspect-schema.ts

### Testing for User Story 3

- [X] T096 [P] [US3] Unit tests for connection string parser in tests/unit/lib/postgres/connection-builder.test.ts
- [X] T097 [P] [US3] Unit tests for role manager in tests/unit/lib/postgres/role-manager.test.ts
- [X] T098 [US3] Integration test for connection management in tests/integration/postgres/connection.test.ts
- [X] T099 [US3] Integration test for auth schema access in tests/integration/postgres/auth-schema.test.ts

**Checkpoint**: All P1 user stories complete - self-hosted connection issues resolved

---

## Phase 6: User Story 4 - Cross-Instance Database Migration (Priority: P2)

**Goal**: Migrate database schema and data between Supabase instances with 100% data integrity

**Independent Test**: Create test schema in dev instance, migrate to staging, verify 100% data integrity

### Migration System

- [X] T100 [P] [US4] Implement migration version tracking in src/lib/migrations/version-tracker.ts
- [X] T101 [P] [US4] Implement up/down migration runner in src/lib/migrations/runner.ts
- [X] T102 [P] [US4] Add rollback on failure in src/lib/migrations/runner.ts
- [X] T103 [P] [US4] Add transaction support in src/lib/migrations/runner.ts

### Schema Diff

- [X] T104 [US4] Implement schema introspection in src/lib/migrations/schema-inspector.ts
- [X] T105 [US4] Implement diff generator in src/lib/migrations/diff-generator.ts (tables, columns, indexes, constraints)
- [X] T106 [US4] Add compatibility check in src/lib/migrations/diff-generator.ts

### Cross-Instance Migration

- [X] T107 [US4] Implement data export wrapper in src/lib/migrations/cross-instance.ts (pg_dump)
- [X] T108 [US4] Implement chunked transfer in src/lib/migrations/cross-instance.ts (512KB buffer)
- [X] T109 [US4] Add progress reporting in src/lib/migrations/cross-instance.ts
- [X] T110 [US4] Add integrity checks in src/lib/migrations/cross-instance.ts (row counts, checksums)
- [X] T111 [US4] Add pause/resume capability in src/lib/migrations/cross-instance.ts

### Migration Tools

- [X] T112 [P] [US4] Implement list_migrations tool in src/tools/migrations/list-migrations.ts
- [X] T113 [P] [US4] Implement apply_migration tool in src/tools/migrations/apply-migration.ts
- [X] T114 [P] [US4] Implement rollback_migration tool in src/tools/migrations/rollback-migration.ts
- [X] T115 [P] [US4] Implement generate_diff tool in src/tools/migrations/generate-diff.ts
- [X] T116 [US4] Implement cross_instance_migrate tool in src/tools/migrations/cross-instance-migrate.ts

### Testing for User Story 4

- [X] T117 [P] [US4] Unit tests for migration runner in tests/unit/lib/migrations/runner.test.ts
- [X] T118 [P] [US4] Unit tests for diff generator in tests/unit/lib/migrations/diff-generator.test.ts
- [X] T119 [US4] Integration test for migration workflow in tests/integration/migrations/migration-workflow.test.ts
- [X] T120 [US4] E2E test for cross-instance migration in tests/e2e/migration-workflow.test.ts

**Checkpoint**: User Story 4 complete - can migrate databases across instances

---

## Phase 7: User Story 5 - Production-Ready Backups (Priority: P2)

**Goal**: Automated, encrypted backups with point-in-time recovery capability

**Independent Test**: Create backup, corrupt database, restore, verify 100% data integrity

### Backup System

- [X] T121 [US5] Implement streaming backup creation in src/lib/backups/creator.ts
- [X] T122 [US5] Add compression support in src/lib/backups/creator.ts (gzip/zstd)
- [X] T123 [US5] Add encryption support in src/lib/backups/creator.ts (AES-256)
- [X] T124 [US5] Add metadata tagging in src/lib/backups/creator.ts
- [X] T125 [US5] Implement S3 storage adapter in src/lib/backups/s3-adapter.ts

### Restore System

- [X] T126 [US5] Implement pre-restore validation in src/lib/backups/restorer.ts
- [X] T127 [US5] Implement streaming restore in src/lib/backups/restorer.ts
- [X] T128 [US5] Add post-restore verification in src/lib/backups/restorer.ts
- [X] T129 [US5] Add rollback on failure in src/lib/backups/restorer.ts

### Backup Tools

- [X] T130 [P] [US5] Implement create_backup tool in src/tools/backups/create-backup.ts
- [X] T131 [P] [US5] Implement restore_backup tool in src/tools/backups/restore-backup.ts
- [X] T132 [P] [US5] Implement list_backups tool in src/tools/backups/list-backups.ts
- [X] T133 [P] [US5] Implement cleanup_backups tool in src/tools/backups/cleanup-backups.ts

### Testing for User Story 5

- [X] T134 [P] [US5] Unit tests for backup creator in tests/unit/lib/backups/creator.test.ts
- [X] T135 [P] [US5] Unit tests for restorer in tests/unit/lib/backups/restorer.test.ts
- [X] T136 [US5] Integration test for backup workflow in tests/integration/backups/backup-workflow.test.ts
- [X] T137 [US5] E2E test for backup-restore round-trip in tests/e2e/backup-restore.test.ts

**Checkpoint**: User Story 5 complete - production-ready backup/restore system

---

## Phase 8: User Story 6 - Real-Time Monitoring & Alerts (Priority: P2)

**Goal**: Real-time health monitoring with actionable alerts

**Independent Test**: Simulate connection pool exhaustion, verify alert triggers and recovery suggestions

### Health Monitoring

- [X] T138 [P] [US6] Implement container status checker in src/lib/monitoring/health-checker.ts (Dokploy API)
- [X] T139 [P] [US6] Implement resource usage monitor in src/lib/monitoring/health-checker.ts
- [X] T140 [P] [US6] Add alert system in src/lib/monitoring/health-checker.ts

### Log Aggregation

- [X] T141 [US6] Implement log fetcher for all services in src/lib/monitoring/log-aggregator.ts
- [X] T142 [US6] Add filtering in src/lib/monitoring/log-aggregator.ts (service, level, time range)
- [X] T143 [US6] Add search functionality in src/lib/monitoring/log-aggregator.ts
- [X] T144 [US6] Add export capability in src/lib/monitoring/log-aggregator.ts

### SSL Monitoring

- [X] T145 [P] [US6] Implement certificate expiration checker in src/lib/monitoring/ssl-monitor.ts
- [X] T146 [P] [US6] Add renewal reminders in src/lib/monitoring/ssl-monitor.ts

### Monitoring Tools

- [X] T147 [P] [US6] Implement dokploy_monitor_health tool in src/tools/dokploy/monitor-health.ts
- [X] T148 [P] [US6] Implement dokploy_get_logs tool in src/tools/dokploy/get-logs.ts
- [X] T149 [P] [US6] Implement aggregate_logs tool in src/tools/monitoring/aggregate-logs.ts

### Testing for User Story 6

- [X] T150 [P] [US6] Unit tests for health checker in tests/unit/lib/monitoring/health-checker.test.ts
- [X] T151 [P] [US6] Unit tests for log aggregator in tests/unit/lib/monitoring/log-aggregator.test.ts
- [X] T152 [US6] Integration test for monitoring workflow in tests/integration/monitoring/monitoring.test.ts

**Checkpoint**: User Story 6 complete - real-time monitoring operational

---

## Phase 9: User Story 7 - Multi-Instance Orchestration (Priority: P3)

**Goal**: Manage dev/staging/production Supabase instances from one interface

**Independent Test**: Deploy dev instance, make schema changes, promote to staging, verify isolation between environments

### Instance Management

- [X] T153 [P] [US7] Implement instance registry in src/lib/orchestration/instance-registry.ts
- [X] T154 [P] [US7] Implement list/filter functionality in src/lib/orchestration/instance-registry.ts

### Schema Sync

- [X] T155 [US7] Implement schema-only sync in src/lib/orchestration/schema-sync.ts
- [X] T156 [US7] Add migration diff between instances in src/lib/orchestration/schema-sync.ts

### Promotion Workflow

- [X] T157 [US7] Implement backup before promotion in src/lib/orchestration/promotion.ts
- [X] T158 [US7] Implement schema migration in src/lib/orchestration/promotion.ts
- [X] T159 [US7] Add optional data migration in src/lib/orchestration/promotion.ts
- [X] T160 [US7] Add rollback capability in src/lib/orchestration/promotion.ts

### Orchestration Tools

- [X] T161 [P] [US7] Implement dokploy_list_instances tool in src/tools/dokploy/list-instances.ts
- [X] T162 [P] [US7] Implement dokploy_sync_schema tool in src/tools/dokploy/sync-schema.ts
- [X] T163 [US7] Implement dokploy_promote_deployment tool in src/tools/dokploy/sync-schema.ts

### Additional Dokploy Tools

- [X] T164 [P] [US7] Implement manage_domain tool in src/tools/dokploy/manage-domain.ts
- [X] T165 [P] [US7] Implement rollback tool in src/tools/dokploy/rollback.ts
- [X] T166 [P] [US7] Implement clone_instance tool in src/tools/dokploy/clone-instance.ts

### Testing for User Story 7

- [X] T167 [P] [US7] Unit tests for instance registry in tests/unit/lib/orchestration/instance-registry.test.ts
- [X] T168 [P] [US7] Unit tests for schema sync in tests/unit/lib/orchestration/schema-sync.test.ts
- [X] T169 [US7] Integration test for promotion workflow in tests/integration/orchestration/promotion.test.ts

**Checkpoint**: All user stories complete - multi-instance orchestration functional

---

## Phase 10: Additional Core Features

**Purpose**: Implement remaining feature groups from constitution

### Auth Management Tools (Feature Group 5)

- [X] T170 [P] Implement list_users tool in src/tools/auth/list-users.ts
- [X] T171 [P] Implement manage_providers tool in src/tools/auth/manage-providers.ts

### Storage Operations Tools (Feature Group 6)

- [X] T172 [P] Implement manage_buckets tool in src/tools/storage/manage-buckets.ts

### Edge Functions Tools (Feature Group 7)

- [X] T173 [P] Implement manage_functions tool in src/tools/functions/manage-functions.ts

### Knowledge Base Tools (Feature Group 10)

- [X] T174 [P] Implement search_docs tool in src/tools/knowledge/search-docs.ts

### Testing for Additional Features

- [X] T175 [P] Unit tests for auth tools in tests/unit/tools/auth/auth-tools.test.ts
- [X] T176 [P] Unit tests for storage tools in tests/unit/tools/storage/storage-tools.test.ts
- [X] T177 [P] Unit tests for functions tools in tests/unit/tools/functions/functions-tools.test.ts

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Production hardening and quality improvements

### Testing & Quality

- [X] T178 Run test coverage analysis and achieve 85%+ coverage
- [X] T179 Add memory stress tests in tests/integration/memory/stress.test.ts
- [X] T180 Add connection failure scenario tests in tests/integration/postgres/connection-failures.test.ts
- [X] T181 Add Dokploy-specific test scenarios in tests/integration/dokploy/scenarios.test.ts

### Documentation

- [X] T182 [P] Complete README.md with installation, usage, and troubleshooting
- [X] T183 [P] Generate API documentation from JSDoc comments
- [X] T184 [P] Create troubleshooting guide in docs/TROUBLESHOOTING.md
- [X] T185 [P] Add code examples in docs/EXAMPLES.md
- [X] T186 [P] Create CHANGELOG.md with version history

### Security & Performance

- [X] T187 Run security audit (npm audit, Snyk)
- [X] T188 Review all error messages for secret leaks
- [X] T189 Run performance benchmarks against constitution standards
- [X] T190 Optimize hot paths identified in profiling

### Production Validation

- [X] T191 Deploy to first production project and collect feedback
- [X] T192 Deploy to second production project and collect feedback
- [X] T193 Deploy to third production project and collect feedback
- [X] T194 Fix critical issues from production validation
- [X] T195 Update documentation based on production learnings

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational - Zero-Touch Deployment (P1)
- **User Story 2 (Phase 4)**: Depends on Foundational + US1 JWT generator - Broken Config Detection (P1)
- **User Story 3 (Phase 5)**: Depends on Foundational - Self-Hosted Connection (P1)
- **User Story 4 (Phase 6)**: Depends on Foundational - Cross-Instance Migration (P2)
- **User Story 5 (Phase 7)**: Depends on Foundational - Production Backups (P2)
- **User Story 6 (Phase 8)**: Depends on Foundational + US1 Dokploy API - Monitoring (P2)
- **User Story 7 (Phase 9)**: Depends on US1, US4, US5 - Multi-Instance Orchestration (P3)
- **Additional Features (Phase 10)**: Depends on Foundational
- **Polish (Phase 11)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - Independent
- **User Story 2 (P1)**: Requires US1 JWT generator - Uses same JWT library
- **User Story 3 (P1)**: Can start after Foundational - Independent
- **User Story 4 (P2)**: Can start after Foundational - Independent
- **User Story 5 (P2)**: Can start after Foundational - Independent
- **User Story 6 (P2)**: Requires US1 Dokploy API client - Extends monitoring
- **User Story 7 (P3)**: Requires US1 (deployment), US4 (migrations), US5 (backups)

### Within Each User Story

- Tests written first (if applicable) and must FAIL before implementation
- Libraries/utilities before tools
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T003, T004, T005, T007, T008, T010)
- All Foundational type definitions can run in parallel (T011-T014)
- Validation framework tasks can run in parallel (T015-T018)
- Error handling tasks can run in parallel (T019-T022)
- Utilities can run in parallel (T023-T025)
- Once Foundational completes:
  - User Stories 1 and 3 can start in parallel (independent)
  - User Story 4 and 5 can start in parallel after Foundational
- Within each user story, tasks marked [P] can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch Dokploy API client methods in parallel (different endpoints):
Task: "Implement Dokploy API authentication" (T036)
Task: "Implement application creation endpoint" (T037)
Task: "Implement environment variable management" (T038)
Task: "Implement deployment trigger endpoint" (T039)
Task: "Implement health check endpoint" (T040)

# Launch environment processing utilities in parallel:
Task: "Implement .env file parser" (T046)
Task: "Implement HTTP→HTTPS converter" (T047)
Task: "Implement environment variable validation" (T048)
Task: "Implement template diff generator" (T049)

# Launch validation tool checks in parallel:
Task: "Add project name format check" (T060)
Task: "Add HTTP vs HTTPS protocol check" (T061)
Task: "Add JWT key validity check" (T062)
Task: "Add SMTP configuration check" (T063)
Task: "Add required variables check" (T064)
```

---

## Implementation Strategy

### MVP First (P1 User Stories Only)

1. Complete Phase 1: Setup (10 tasks)
2. Complete Phase 2: Foundational (25 tasks) - CRITICAL
3. Complete Phase 3: User Story 1 - Zero-Touch Deployment (35 tasks)
4. Complete Phase 4: User Story 2 - Broken Config Detection (11 tasks)
5. Complete Phase 5: User Story 3 - Self-Hosted Connection (18 tasks)
6. **STOP and VALIDATE**: Test all P1 stories independently
7. Deploy/demo MVP

**Total MVP Tasks: ~99 tasks**

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready (35 tasks)
2. Add User Story 1 → Test independently → Demo zero-touch deployment
3. Add User Story 2 → Test independently → Demo config repair
4. Add User Story 3 → Test independently → Demo connection management
5. Add User Story 4 → Test independently → Demo migrations
6. Add User Story 5 → Test independently → Demo backups
7. Add User Story 6 → Test independently → Demo monitoring
8. Add User Story 7 → Test independently → Demo orchestration
9. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (35 tasks)
2. Once Foundational is done:
   - Developer A: User Story 1 + 2 (sequential, US2 depends on US1)
   - Developer B: User Story 3 (independent)
   - Developer C: User Story 4 + 5 (can be parallel)
3. Then converge:
   - Developer A: User Story 6 (depends on US1)
   - Developer B: User Story 7 (depends on US1, US4, US5)
   - Developer C: Additional Features (independent)

---

## Summary

**Total Tasks**: 195
**MVP Tasks (P1 only)**: 99 tasks (Setup + Foundational + US1 + US2 + US3)

### Task Count by User Story

- **Setup (Phase 1)**: 10 tasks
- **Foundational (Phase 2)**: 25 tasks
- **User Story 1 (P1)**: 35 tasks - Zero-Touch Deployment
- **User Story 2 (P1)**: 11 tasks - Broken Config Detection
- **User Story 3 (P1)**: 18 tasks - Self-Hosted Connection
- **User Story 4 (P2)**: 21 tasks - Cross-Instance Migration
- **User Story 5 (P2)**: 17 tasks - Production Backups
- **User Story 6 (P2)**: 15 tasks - Real-Time Monitoring
- **User Story 7 (P3)**: 20 tasks - Multi-Instance Orchestration
- **Additional Features**: 7 tasks - Auth, Storage, Functions, Knowledge
- **Polish**: 18 tasks - Testing, Documentation, Security, Production

### Parallel Opportunities Identified

- **Setup**: 6 parallel tasks (T003, T004, T005, T007, T008, T010)
- **Foundational**: 20+ parallel tasks across types, validation, errors, utilities
- **User Story 1**: 15+ parallel tasks in API client, env processing, validation
- **Cross-User Story**: US1 + US3 can start together, US4 + US5 can start together

### Independent Test Criteria

- **US1**: Deploy Supabase to Dokploy, verify auth works
- **US2**: Connect to broken deployment, detect issues, fix, verify
- **US3**: Monitor connections, access auth schema, run migrations
- **US4**: Migrate schema+data between instances, verify 100% integrity
- **US5**: Backup→restore round-trip, verify 100% integrity
- **US6**: Simulate pool exhaustion, verify alert triggers
- **US7**: Deploy dev, promote to staging, verify isolation

### Suggested MVP Scope

**Phases 1-5 (P1 User Stories)**:
- Setup + Foundational infrastructure
- Zero-touch Dokploy deployment (US1)
- Broken config detection and repair (US2)
- Self-hosted connection management (US3)

This provides immediate value solving the top 3 documented pain points:
1. Broken JWT generators (US1 + US2)
2. HTTP→HTTPS conversion (US1)
3. Connection pool exhaustion and auth schema access (US3)

**Estimated Timeline**: 4-5 weeks for MVP (99 tasks)

---

## Notes

- All tasks follow strict checklist format: `- [ ] [ID] [P?] [Story] Description with file path`
- [P] tasks can run in parallel (different files, no dependencies)
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Tests achieve 85%+ coverage per spec requirements
- Foundational phase MUST complete before any user story work begins
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
