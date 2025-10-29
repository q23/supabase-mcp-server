# Implementation Plan: Real Dokploy Docker Environment

**Branch**: `002-dokploy-docker-env` | **Date**: 2025-10-29 | **Spec**: [spec.md](./spec.md)

## Summary

Build a Docker container with complete Dokploy installation on Ubuntu, enabling E2E testing of all 32 MCP tools against real Dokploy deployments. Container mounts Docker socket for container management, runs official Dokploy installation, and allows deploying actual Supabase instances via MCP server.

## Technical Context

**Base Image**: Ubuntu 22.04 LTS  
**Primary Components**: Dokploy (latest stable), Docker (via socket mount), PostgreSQL (Dokploy DB)  
**Installation Method**: Official Dokploy install script (`curl -sSL https://dokploy.com/install.sh | sh`)  
**Docker Strategy**: Mount host Docker socket (`-v /var/run/docker.sock:/var/run/docker.sock`)  
**Testing**: Manual (via UI) + Automated (all 32 MCP tools)  
**Target Platform**: Docker (Linux containers), macOS/Linux/Windows (WSL2) host  

**Performance Goals**: <5 min Dokploy startup, <15 min Supabase deployment, <8GB RAM idle  
**Constraints**: Requires Docker socket access, 16GB RAM host, 30GB disk  
**Scale**: 1 Dokploy instance managing 2+ Supabase deployments simultaneously

## Constitution Check

✅ Section 3.1: Bash scripts for automation  
✅ Section 4: Enables comprehensive testing  
✅ Section 6: Security documented (Docker socket access)  
✅ Section 12: Validates real Dokploy integration  

No violations - testing infrastructure.

## Project Structure

```
docker/dokploy/
├── Dockerfile              # Ubuntu + Dokploy installation
├── setup.sh                # Automated Dokploy setup script
└── README.md               # Setup guide

docs/
└── DOKPLOY-TESTING.md     # Complete testing guide

.env.dokploy               # Dokploy-specific config
```

## Milestones

### Milestone 1: Dokploy Container (Week 1)
- Dockerfile with Ubuntu + automated Dokploy install
- Docker socket mounting
- Volume persistence
- Web UI accessible

### Milestone 2: MCP Integration (Week 1)  
- Deploy Supabase via MCP
- Test all Dokploy tools
- Validate bug detection + auto-fix

### Milestone 3: Documentation (Week 1)
- Complete testing guide
- Troubleshooting
- Example workflows

## Next Steps

Run `/speckit.tasks` to generate implementation tasks (~25 tasks estimated).
