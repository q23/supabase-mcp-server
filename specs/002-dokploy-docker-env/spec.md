# Feature Specification: Real Dokploy Docker Environment

**Feature Branch**: `002-dokploy-docker-env`
**Created**: 2025-10-29
**Status**: Draft
**Input**: User description: "Docker Container mit echtem Dokploy: Ubuntu Server mit vollständiger Dokploy-Installation. User kann Benutzer anlegen, API Key generieren, und dann via MCP Server echte Supabase-Instanzen in diesem Dokploy deployen. Ziel: Komplette E2E-Testumgebung wo alle 32 MCP Tools gegen echte Dokploy-Deployments getestet werden können."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Complete Dokploy Docker Environment (Priority: P1)

As a developer, I want a Docker container running a complete Dokploy installation on Ubuntu, so that I can test the Supabase MCP Server against a real Dokploy instance and deploy actual Supabase instances locally.

**Why this priority**: This is the ONLY way to properly test the Dokploy integration features. Without a real Dokploy instance, we cannot validate that the MCP server actually works with real deployments, real JWT key generation, and real container orchestration.

**Independent Test**: Start Docker container with Dokploy, create user + API key in Dokploy UI, configure MCP server with that API key, deploy a real Supabase instance via dokploy_setup_wizard, verify it works.

**Acceptance Scenarios**:

1. **Given** I have Docker installed
   **When** I run the Dokploy container
   **Then** Dokploy web UI is accessible at http://localhost:3000 and I can create an admin account

2. **Given** Dokploy is running
   **When** I create a user and generate an API key in the Dokploy UI
   **Then** I receive a valid API key that I can use with the MCP server

3. **Given** I have a Dokploy API key
   **When** I run `dokploy_setup_wizard` via the MCP server pointing to http://localhost:3000
   **Then** A real Supabase instance is deployed in Dokploy with all services (PostgreSQL, Auth, REST, Storage, etc.)

4. **Given** Supabase is deployed in Dokploy
   **When** I access the deployed Supabase instance
   **Then** All services are healthy, authentication works, and I can connect to the database

5. **Given** Real Supabase instance is running in Dokploy
   **When** I test all 32 MCP tools against it
   **Then** All tools work correctly (connect, execute_sql, migrations, backups, monitoring, etc.)

---

### User Story 2 - Automated Dokploy Setup (Priority: P1)

As a developer, I want an automated setup script that installs and configures Dokploy in the Docker container, so that I don't have to manually install Dokploy every time I recreate the environment.

**Why this priority**: Manual Dokploy installation is complex and error-prone. Automation ensures consistency and enables quick environment recreation.

**Independent Test**: Run Docker container, wait for auto-setup to complete, verify Dokploy is accessible and ready to use.

**Acceptance Scenarios**:

1. **Given** Docker container starts
   **When** Automated setup script runs
   **Then** Dokploy is fully installed, configured, and the web UI is accessible within 5 minutes

2. **Given** Dokploy auto-setup completes
   **When** I check the Dokploy web UI
   **Then** I see a default admin user is created (or I'm prompted to create one)

3. **Given** Auto-setup is complete
   **When** I generate an API key
   **Then** The key works immediately with the MCP server without additional configuration

---

### User Story 3 - Docker Compose Integration (Priority: P2)

As a developer, I want the Dokploy container to integrate with Docker Compose alongside the existing test services, so that I can run both Dokploy and test databases in a coordinated environment.

**Why this priority**: Enables more complex testing scenarios where Dokploy manages multiple Supabase instances. Less critical than basic Dokploy functionality but valuable for comprehensive testing.

**Independent Test**: Run docker-compose up, verify Dokploy container starts, verify it can access other Docker services via shared network.

**Acceptance Scenarios**:

1. **Given** Docker Compose configuration includes Dokploy
   **When** I run `docker-compose up -d`
   **Then** Dokploy starts alongside other services and is accessible

2. **Given** Dokploy is running in Docker Compose
   **When** Dokploy deploys a Supabase instance
   **Then** The instance can communicate with other Docker services via shared network

3. **Given** Multiple services are running
   **When** I stop Docker Compose
   **Then** All services shut down cleanly and data persists (configurable)

---

### Edge Cases

- What happens when Dokploy installation fails during auto-setup?
  - Container should log clear error messages
  - Provide troubleshooting steps in documentation
  - Optionally retry setup on next container start

- How does system handle port conflicts (Dokploy uses 3000, may conflict with Studio)?
  - Document port requirements upfront
  - Provide environment variables to customize ports
  - Clear error messages indicating which port is conflicted

- What if Docker host has insufficient resources (Dokploy needs 2GB+)?
  - Container should check resource availability on startup
  - Fail with clear message if insufficient resources
  - Document minimum requirements (4GB RAM recommended)

- How does environment handle Dokploy updates?
  - Document Dokploy version being used
  - Provide script to update Dokploy in container
  - Test that MCP server works with updated Dokploy

- What happens when deployed Supabase instance fails?
  - Dokploy handles container restart
  - MCP monitoring tools should detect failures
  - Clear logs available via dokploy_get_logs tool

- How does system handle Docker-in-Docker requirements?
  - Dokploy needs Docker socket access to manage containers
  - Mount Docker socket from host into Dokploy container
  - Document security implications and alternatives

---

## Requirements *(mandatory)*

### Functional Requirements

**Docker Container**:
- **FR-001**: System MUST provide a Docker container running Ubuntu Server (20.04 LTS or later)
- **FR-002**: Container MUST have Docker-in-Docker or Docker socket access to manage deployments
- **FR-003**: Container MUST expose Dokploy web UI port (default 3000, configurable)
- **FR-004**: Container MUST have Dokploy fully installed and running within 5 minutes of container start
- **FR-005**: Container MUST persist Dokploy data across restarts (using Docker volumes)

**Dokploy Installation**:
- **FR-006**: System MUST install official Dokploy release (latest stable version)
- **FR-007**: Dokploy MUST be accessible via web UI for user management and API key generation
- **FR-008**: Dokploy MUST support deploying applications via its template system
- **FR-009**: Dokploy MUST have Docker and Docker Compose available for managing deployments
- **FR-010**: Installation MUST be fully automated (no manual intervention required)

**User Management**:
- **FR-011**: System MUST allow creating Dokploy admin users via web UI
- **FR-012**: System MUST support API key generation for admin users
- **FR-013**: API keys MUST work with the Supabase MCP Server without modifications
- **FR-014**: System MUST document default credentials (if any) for initial access

**Supabase Deployment Support**:
- **FR-015**: Dokploy MUST be able to deploy Supabase instances using its template system
- **FR-016**: Deployed Supabase instances MUST be accessible from the host machine
- **FR-017**: Deployed instances MUST have all required services (PostgreSQL, Auth, REST, Storage, etc.)
- **FR-018**: System MUST support deploying multiple Supabase instances simultaneously

**MCP Server Integration**:
- **FR-019**: MCP server MUST be able to connect to Dokploy API from host machine
- **FR-020**: MCP server MUST be able to deploy Supabase via dokploy_setup_wizard tool
- **FR-021**: MCP server MUST be able to validate and fix configurations via validation tools
- **FR-022**: All 32 MCP tools MUST work against Dokploy-deployed Supabase instances

**Testing Support**:
- **FR-023**: Environment MUST support testing all Dokploy-related MCP tools (11 tools minimum)
- **FR-024**: Environment MUST support testing database operations against deployed instances
- **FR-025**: Environment MUST provide clear logs for troubleshooting deployment issues
- **FR-026**: System MUST support both manual testing (via UI) and automated testing (via scripts)

**Resource Management**:
- **FR-027**: Container MUST run on machines with 8GB RAM minimum (16GB recommended)
- **FR-028**: Container MUST document disk space requirements (20GB recommended)
- **FR-029**: Container MUST allow configuration of resource limits (CPU, memory)
- **FR-030**: System MUST provide cleanup scripts for removing test deployments

### Key Entities

**DokployContainer**:
- Represents the Docker container running Dokploy
- Components: Ubuntu OS, Docker-in-Docker, Dokploy installation, web UI
- Configuration: Port mappings, volume mounts, resource limits

**DokployInstance**:
- Represents the running Dokploy installation
- Attributes: Version, admin users, API keys, deployed applications
- Services: Web UI (port 3000), API server, database, container orchestrator

**DeployedSupabase**:
- Represents a Supabase instance deployed via Dokploy
- Attributes: Application ID, domain, service URLs, health status
- Services: PostgreSQL, Auth, REST, Storage, Realtime, Studio

**APICredentials**:
- Represents Dokploy API authentication
- Attributes: API key, user ID, permissions
- Usage: Required for MCP server to interact with Dokploy

## Success Criteria *(mandatory)*

### Measurable Outcomes

**Environment Setup**:
- **SC-001**: Developers can start complete Dokploy environment with single Docker command and access web UI within 5 minutes
- **SC-002**: Container consumes less than 8GB RAM when idle (before deployments)
- **SC-003**: Dokploy installation completes automatically without manual intervention
- **SC-004**: Environment can be recreated from scratch in under 10 minutes

**Deployment Capability**:
- **SC-005**: Developers can deploy a complete Supabase instance via MCP server in under 15 minutes
- **SC-006**: Deployed Supabase instances are fully functional (all services healthy, auth works)
- **SC-007**: Multiple Supabase instances can coexist in same Dokploy (2+ instances)
- **SC-008**: All 32 MCP tools execute successfully against deployed instances

**Testing Effectiveness**:
- **SC-009**: Bug detection features work correctly (detect real Dokploy template bugs, not simulated)
- **SC-010**: Auto-fix features work correctly (actually fix broken deployments)
- **SC-011**: Developers can validate all Dokploy integration features locally
- **SC-012**: 100% of Dokploy-related MCP tools validated against real Dokploy

**Developer Experience**:
- **SC-013**: Clear documentation enables new developers to set up environment in 15 minutes
- **SC-014**: Troubleshooting guide covers common Dokploy deployment issues
- **SC-015**: Environment cleanup completes in under 2 minutes
- **SC-016**: Docker container restarts preserve Dokploy state and deployments

---

**Next Steps**:
1. Research Dokploy installation methods and Docker-in-Docker requirements
2. Create implementation plan for Dockerfile with automated Dokploy setup
3. Design Docker Compose integration
4. Document setup process and MCP server configuration
5. Create testing guide for validating all 32 tools
