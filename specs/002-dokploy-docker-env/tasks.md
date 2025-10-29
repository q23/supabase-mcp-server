# Tasks: Real Dokploy Docker Environment

**Input**: Design documents from `/specs/002-dokploy-docker-env/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Organization**: Tasks grouped by user story for independent implementation and testing

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1, US2, US3)
- Include exact file paths

---

## Phase 1: Setup

**Purpose**: Initialize Docker infrastructure for Dokploy

- [ ] T001 Create docker/dokploy/ directory structure
- [ ] T002 [P] Create docker/dokploy/README.md with setup instructions
- [ ] T003 [P] Create .env.dokploy with Dokploy-specific environment variables
- [ ] T004 [P] Create docs/DOKPLOY-TESTING.md with complete testing guide

---

## Phase 2: Foundational

**Purpose**: Core Dockerfile foundation

- [ ] T005 Create base Dockerfile in docker/dokploy/Dockerfile (FROM ubuntu:22.04)
- [ ] T006 Add Docker prerequisites to Dockerfile (curl, wget, git, ca-certificates)

---

## Phase 3: User Story 1 - Complete Dokploy Docker Environment (P1) 🎯

**Goal**: Docker container with real Dokploy installation, accessible UI, can deploy real Supabase

**Independent Test**: docker run → access UI at localhost:3000 → create user → generate API key → deploy Supabase via MCP

### Dockerfile Implementation

- [ ] T007 [US1] Add Dokploy installation command to Dockerfile (curl -sSL https://dokploy.com/install.sh | sh)
- [ ] T008 [US1] Configure Docker socket mounting in Dockerfile comments/docs
- [ ] T009 [US1] Add EXPOSE directives in Dockerfile (3000 for UI, 3001 for API)
- [ ] T010 [US1] Add volume mount points in Dockerfile (/home/dokploy)
- [ ] T011 [US1] Configure Dokploy startup command in Dockerfile (CMD)

### Docker Run Configuration

- [ ] T012 [P] [US1] Create docker/dokploy/run.sh helper script (docker run with all correct flags)
- [ ] T013 [P] [US1] Document Docker socket mounting in run.sh (-v /var/run/docker.sock:/var/run/docker.sock)
- [ ] T014 [P] [US1] Document volume mounts in run.sh (-v dokploy-data:/home/dokploy)
- [ ] T015 [P] [US1] Document port mappings in run.sh (-p 3000:3000 -p 3001:3001)

### Validation

- [ ] T016 [US1] Create docker/dokploy/test.sh script (test Dokploy UI accessible, API responding)
- [ ] T017 [US1] Build Docker image and verify Dokploy installs successfully
- [ ] T018 [US1] Start container and verify UI accessible at localhost:3000

**Checkpoint**: Dokploy running in Docker, UI accessible, ready for user creation

---

## Phase 4: User Story 2 - Automated Dokploy Setup (P1)

**Goal**: Fully automated Dokploy installation, no manual steps

**Independent Test**: docker run → wait 5 minutes → Dokploy UI ready

### Automated Setup Script

- [ ] T019 [US2] Create docker/dokploy/setup.sh automated installation script
- [ ] T020 [US2] Add Docker + Docker Compose installation to setup.sh
- [ ] T021 [US2] Add Dokploy installation to setup.sh (run official script)
- [ ] T022 [US2] Add health check wait logic to setup.sh (wait for Dokploy ready)
- [ ] T023 [US2] Add setup completion marker in setup.sh (/tmp/dokploy-ready)

### Dockerfile Integration

- [ ] T024 [US2] Integrate setup.sh into Dockerfile (COPY and RUN)
- [ ] T025 [US2] Add healthcheck to Dockerfile (check if Dokploy UI responding)

**Checkpoint**: Container starts → Dokploy auto-installs → UI ready within 5 minutes

---

## Phase 5: User Story 3 - Docker Compose Integration (P2)

**Goal**: Add Dokploy to docker-compose.yml, works with other services

**Independent Test**: docker-compose up → all services start → Dokploy + Supabase coexist

### Docker Compose Configuration

- [ ] T026 [US3] Add dokploy service to docker-compose.yml
- [ ] T027 [US3] Configure dokploy service build context in docker-compose.yml
- [ ] T028 [US3] Add Docker socket volume mount in docker-compose.yml
- [ ] T029 [US3] Add dokploy-data volume in docker-compose.yml
- [ ] T030 [US3] Configure port mappings (3000, 3001) in docker-compose.yml
- [ ] T031 [US3] Add healthcheck for dokploy service in docker-compose.yml
- [ ] T032 [US3] Update shared network configuration in docker-compose.yml

**Checkpoint**: docker-compose up starts Dokploy + all test services

---

## Phase 6: Polish & Documentation

**Purpose**: Complete documentation and validation

### Documentation

- [ ] T033 [P] Complete docs/DOKPLOY-TESTING.md with all 32 tool testing examples
- [ ] T034 [P] Add troubleshooting section to DOKPLOY-TESTING.md
- [ ] T035 [P] Update README.md with Dokploy testing section
- [ ] T036 [P] Document security implications of Docker socket mounting

### Validation

- [ ] T037 Test deploying Supabase via MCP dokploy_setup_wizard tool
- [ ] T038 Test dokploy_validate_config detects real Dokploy template bugs
- [ ] T039 Test dokploy_regenerate_keys fixes real broken deployments
- [ ] T040 Test all database tools (connect, execute_sql, inspect_schema) against deployed instance
- [ ] T041 Validate environment can be recreated from scratch in <10 minutes
- [ ] T042 Document any discovered issues or improvements needed

---

## Dependencies

**Phase Dependencies**:
- Setup → Foundational → US1 → US2 → US3 → Polish

**User Story Dependencies**:
- US1 (P1): Independent - base container
- US2 (P1): Depends on US1 Dockerfile - adds automation
- US3 (P2): Depends on US1 + US2 - adds Compose integration

**Parallel Opportunities**:
- Setup: T002-T004 can run in parallel
- US1: T012-T015 (helper scripts) can run in parallel
- US3: T026-T032 (Compose configs) can be done together
- Polish: T033-T036 (docs) can run in parallel

---

## Implementation Strategy

### MVP (P1 User Stories): ~32 tasks

1. Setup (4 tasks)
2. Foundational (2 tasks)
3. US1: Dokploy Container (12 tasks)
4. US2: Automated Setup (7 tasks)
5. US3: Docker Compose (7 tasks)

**Result**: Real Dokploy in Docker, fully automated, Compose-integrated

### Timeline

**Estimated**: 1-2 days for complete implementation
- Day 1: Dockerfile + automated setup + testing
- Day 2: Docker Compose + documentation + validation

---

## Summary

**Total Tasks**: 42
**MVP Tasks**: 32 (Setup + Foundational + US1 + US2 + US3)
**Polish Tasks**: 10

**Key Deliverables**:
- Dockerfile with real Dokploy installation
- Automated setup script
- Docker Compose integration
- Complete testing documentation
- Validation of all 32 MCP tools

**Independent Test Per Story**:
- US1: docker run → UI at :3000 → works!
- US2: Auto-setup → UI ready in 5 min → works!
- US3: docker-compose up → Dokploy + services → works!
