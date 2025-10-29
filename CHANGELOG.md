# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2025-10-29

### Added

#### User Story 1: Zero-Touch Dokploy Deployment (P1)
- Complete 9-step setup wizard for automated Supabase deployment
- Independent JWT key generator with correct structure (fixes Dokploy template bugs)
- Automatic HTTP→HTTPS conversion for production URLs
- Project name validation and DNS compliance checking
- Post-deployment validation (auth endpoint, container health)
- SMTP configuration support

#### User Story 2: Broken Config Detection & Repair (P1)
- Configuration validator detecting all Dokploy template issues
- Automatic detection of identical JWT keys
- Detection of missing 'role' claims in JWT tokens
- Detection of wrong 'iss' values
- Automatic key regeneration tool
- Safe environment variable updates with container restart

#### User Story 3: Self-Hosted Connection Management (P1)
- Connection string parser supporting 6 different formats
- Docker network auto-detection
- Connection pool monitoring with alerts
- Role-based query execution (correct auth schema access)
- SQL execution tool with parameterization and timeouts

#### User Story 4: Cross-Instance Migration (P2)
- Migration version tracking system
- Schema diff generator
- Cross-instance data migration with chunking
- Integrity verification (row counts, checksums)
- Progress streaming and checkpoint-based resumption

#### User Story 5: Production-Ready Backups (P2)
- Streaming backup creation with compression (gzip/zstd)
- AES-256 encryption with key rotation support
- S3-compatible storage adapter
- Backup restoration with pre/post validation
- Automated cleanup with retention policies

#### User Story 6: Real-Time Monitoring & Alerts (P2)
- Container health monitoring via Dokploy API
- Connection pool status tracking with alerts
- Log aggregation from all Supabase services
- SSL certificate expiration monitoring
- In-MCP notifications with optional webhook support

#### User Story 7: Multi-Instance Orchestration (P3)
- Instance registry for managing multiple environments
- Schema-only sync between instances
- Safe deployment promotion workflow (dev→staging→prod)
- Instance cloning capability

#### Additional Features
- Auth management (list users, manage providers)
- Storage operations (bucket management)
- Edge Functions management
- Knowledge base integration (docs search)

#### Core Infrastructure
- Complete TypeScript type system with strict mode
- Zod validation framework for all inputs
- Structured error handling with recovery suggestions
- Secure logging that never logs secrets
- 512KB memory buffer with automatic disk spillover
- Temporary file management with auto-cleanup
- AES-256 encryption utilities with key rotation
- Exponential backoff retry logic with circuit breaker
- Adaptive rate limiting (10 req/sec, burst 20)

#### Testing
- Comprehensive unit tests for core libraries
- Integration tests for critical workflows
- E2E tests for deployment scenarios
- Test coverage target: 85%+

#### Documentation
- Complete README with features and examples
- Detailed API documentation
- Troubleshooting guide
- Code examples
- Environment configuration guide

### Fixed
- Dokploy template JWT key generation (keys are now different with correct claims)
- HTTP URLs in production configurations (automatic HTTPS upgrade)
- Connection pool exhaustion detection and alerts
- Auth schema permission errors (correct role selection)
- Memory exhaustion (512KB buffer with disk spillover)

### Security
- All sensitive data automatically redacted from logs
- Encrypted storage for credentials and backups
- Audit logging with configurable retention
- Read-only mode support
- Confirmation required for destructive operations
- SQL injection prevention via parameterized queries

## [Unreleased]

### Planned
- Real-time database change notifications
- Advanced query builder
- Database schema visualization
- Performance profiling tools
- Multi-region deployment support
