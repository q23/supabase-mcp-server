# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Which versions are eligible for receiving such patches depends on the CVSS v3.0 Rating:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

Instead, please report them via email to: **[INSERT SECURITY EMAIL]**

You should receive a response within 48 hours. If for some reason you do not, please follow up via email to ensure we received your original message.

Please include the following information (as much as you can provide) to help us better understand the nature and scope of the possible issue:

* Type of issue (e.g. buffer overflow, SQL injection, cross-site scripting, etc.)
* Full paths of source file(s) related to the manifestation of the issue
* The location of the affected source code (tag/branch/commit or direct URL)
* Any special configuration required to reproduce the issue
* Step-by-step instructions to reproduce the issue
* Proof-of-concept or exploit code (if possible)
* Impact of the issue, including how an attacker might exploit the issue

This information will help us triage your report more quickly.

## Security Best Practices

When deploying Supabase MCP Server in production, follow these security guidelines:

### 1. API Key Management

```bash
# Generate strong API key (32+ characters)
openssl rand -hex 32

# Store in .env file (never commit)
MCP_API_KEY=<generated-key>

# Rotate keys regularly (every 90 days recommended)
```

### 2. Network Security

```bash
# Use firewall to restrict access
ufw allow from 203.0.113.0/24 to any port 3000

# Always use HTTPS in production
docker-compose -f docker-compose.prod.yml --profile with-ssl up -d

# Use reverse proxy (Nginx) with SSL
```

### 3. Credentials Protection

```bash
# Never log sensitive data
# Server automatically redacts:
# - MCP_API_KEY
# - DOKPLOY_API_KEY
# - POSTGRES_PASSWORD
# - JWT secrets
# - Service role keys

# Use environment variables, not hardcoded values
# Store credentials in secure vault (1Password, Vault, etc.)
```

### 4. Docker Security

```yaml
# Run as non-root user (already configured)
user: mcp-server

# Security options
security_opt:
  - no-new-privileges:true

# Read-only root filesystem where possible
read_only: true
```

### 5. Rate Limiting

```nginx
# Nginx rate limiting (already configured)
limit_req_zone $binary_remote_addr zone=mcp_limit:10m rate=10r/s;
limit_req zone=mcp_limit burst=20 nodelay;
```

### 6. Monitoring

```bash
# Enable monitoring
CONTINUOUS=true AUTO_RESTART=true ./deployment/monitor.sh

# Setup alerts
ALERT_WEBHOOK=https://hooks.slack.com/... ./deployment/monitor.sh

# Review logs regularly
docker logs supabase-mcp-server --tail 100
```

## Known Security Considerations

### 1. Dokploy JWT Key Bug

**Issue**: Dokploy template generates identical ANON_KEY and SERVICE_ROLE_KEY

**Mitigation**: This server automatically detects and fixes this issue via:
* `dokploy_validate_config` tool
* `dokploy_regenerate_keys` tool

### 2. HTTP URLs in Production

**Issue**: Dokploy template uses HTTP URLs for public endpoints

**Mitigation**: Server automatically converts HTTP to HTTPS

### 3. Weak JWT Secrets

**Issue**: Short or predictable JWT secrets

**Mitigation**: Server validates secret length (32+ characters)

## Security Updates

Security updates will be released as:
* **Critical**: Immediate patch release
* **High**: Patch within 7 days
* **Medium**: Patch within 30 days
* **Low**: Next regular release

Subscribe to security advisories:
* GitHub Security Advisories: https://github.com/q23/supabase-mcp-server/security/advisories
* Watch releases: https://github.com/q23/supabase-mcp-server/releases

## Security Checklist for Production

Before deploying to production, verify:

- [ ] `.env` file not committed to git
- [ ] Strong MCP_API_KEY generated (32+ characters)
- [ ] SSL/TLS certificates installed
- [ ] Firewall rules configured
- [ ] Monitoring and alerts enabled
- [ ] Log rotation configured
- [ ] Backup strategy in place
- [ ] Security updates enabled
- [ ] Rate limiting configured
- [ ] Non-root user for processes
- [ ] Security headers enabled (Nginx)
- [ ] Credentials stored in secure vault
- [ ] Regular security audits scheduled

## Disclosure Policy

When we receive a security bug report, we will:

1. Confirm the problem and determine affected versions
2. Audit code to find similar problems
3. Prepare fixes for all supported versions
4. Release new security fix versions
5. Publish security advisory on GitHub

## Comments on this Policy

If you have suggestions on how this process could be improved, please submit a pull request or open an issue.

## Attribution

This security policy is based on:
* [GitHub Security Policy Template](https://docs.github.com/en/code-security/getting-started/adding-a-security-policy-to-your-repository)
* [OWASP Secure Coding Practices](https://owasp.org/www-project-secure-coding-practices-quick-reference-guide/)
