# Research: Real Dokploy Docker Environment

**Feature**: 002-dokploy-docker-env
**Date**: 2025-10-29

## Decision 1: Dokploy Installation Method

**Decision**: Use official Dokploy installation script in Dockerfile

**Rationale**:
- Dokploy provides official installation script: `curl -sSL https://dokploy.com/install.sh | sh`
- Script handles all dependencies automatically
- Most reliable and up-to-date method
- Used by production deployments

**Alternatives Considered**:
- Manual installation: Too complex, error-prone
- Pre-built Dokploy Docker image: Not officially available
- Source compilation: Slow, unnecessary

**Implementation**: Run install script in Dockerfile during image build

---

## Decision 2: Docker-in-Docker Strategy

**Decision**: Mount Docker socket from host (`/var/run/docker.sock`)

**Rationale**:
- Simplest and most reliable approach
- Dokploy can manage containers on host Docker daemon
- No nested Docker daemon needed
- Lower resource usage
- Standard practice for Dokploy

**Alternatives Considered**:
- Full Docker-in-Docker (dind): Complex, higher resource usage, nested daemons
- Podman: Not compatible with Dokploy
- Containerd: Dokploy requires Docker specifically

**Security Note**: Mounting Docker socket gives container full Docker access - acceptable for local testing, documented in security notes

---

## Decision 3: Base Image

**Decision**: Ubuntu 22.04 LTS

**Rationale**:
- Dokploy officially supports Ubuntu
- LTS = long-term stability
- Well-documented, widely used
- Compatible with Dokploy installation script

**Alternatives**:
- Alpine: Too minimal, Dokploy installation may fail
- Debian: Similar to Ubuntu but less Dokploy documentation
- Ubuntu 20.04: Older, 22.04 is current LTS

---

## Decision 4: Port Allocation

**Decision**:
- Dokploy UI: 3000 (host) → 3000 (container)
- Dokploy API: 3001 (host) → 3001 (container)
- Deployed apps: Dynamic ports assigned by Dokploy

**Rationale**:
- Standard Dokploy ports
- No conflicts with Supabase MCP server
- Deployed Supabase will get dynamic ports from Dokploy

**Port Map**:
- 3000: Dokploy Web UI
- 3001: Dokploy API
- 5432+: Dynamic (assigned by Dokploy for deployed Postgres)
- 8000+: Dynamic (assigned by Dokploy for deployed Supabase API)

---

## Decision 5: Data Persistence

**Decision**: Named Docker volumes for Dokploy data and deployments

**Rationale**:
- Dokploy data persists across container restarts
- Deployed applications persist
- Can easily backup/restore volume
- Standard Docker practice

**Volumes**:
- `dokploy-data`: Dokploy configuration and database
- `dokploy-apps`: Deployed application data
- `docker-certs`: Docker TLS certificates (if needed)

---

## Best Practices

### Dokploy Installation
- Use official install script
- Run as non-root user where possible
- Enable all Dokploy features (templates, git integration)
- Pre-configure Supabase template availability

### Resource Management
- Minimum 8GB RAM for container
- 20GB disk space recommended
- Set Docker resource limits
- Monitor resource usage

### Security
- Document Docker socket security implications
- Use for testing only, not production
- API keys are local-only
- No exposure to internet required

---

## Technical Constraints

### System Requirements
- Host: Docker 20.10+, 16GB RAM, 30GB disk
- Container: Ubuntu 22.04, 8GB RAM, 20GB disk
- Network: Localhost only, no external access needed

### Dokploy Requirements
- Docker + Docker Compose in container
- Git (for Dokploy's git-based deployments)
- Node.js (Dokploy is built with Node)
- PostgreSQL (Dokploy's database)

### Compatibility
- macOS (Intel + Apple Silicon)
- Linux
- Windows (WSL2 + Docker Desktop)

---

## Research Summary

All technical decisions resolved:
✅ Installation: Official Dokploy script
✅ Docker strategy: Mount host socket
✅ Base image: Ubuntu 22.04 LTS
✅ Ports: 3000 (UI), 3001 (API)
✅ Persistence: Named volumes

Ready for design phase.
