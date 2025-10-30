# Troubleshooting Guide

## Common Issues

### Dokploy Deployment

#### Issue: Identical JWT Keys
**Symptom**: Auth endpoints return 401 errors
**Cause**: Dokploy template generates identical ANON_KEY and SERVICE_ROLE_KEY
**Fix**: Run `dokploy_regenerate_keys` tool

#### Issue: HTTP URLs in Production
**Symptom**: Mixed content warnings, security issues
**Cause**: Dokploy template uses HTTP by default
**Fix**: Run `dokploy_validate_config` and upgrade to HTTPS

### Connection Issues

#### Issue: Connection Pool Exhausted
**Symptom**: "too many connections" errors
**Fix**:
1. Run `monitor_connections` to see breakdown
2. Increase `max_connections` in PostgreSQL
3. Use pooled connection (port 6543)

#### Issue: Permission Denied on Auth Schema
**Symptom**: Cannot query `auth.users` table
**Fix**: Use role `supabase_auth_admin` for auth schema queries

### Performance

#### Issue: Slow Queries
**Fix**:
1. Add indexes to frequently queried columns
2. Use connection pooling
3. Enable query timeout limits

## Error Codes

- `CONNECTION_FAILED`: Check host, port, credentials
- `DOKPLOY_API_ERROR`: Verify API URL and key
- `VALIDATION_ERROR`: Review input format
- `RATE_LIMIT_EXCEEDED`: Wait and retry (auto-backoff enabled)

## Support

- GitHub Issues: [Report a bug](https://github.com/q23/supabase-mcp-server/issues)
- Documentation: [Read the docs](https://github.com/q23/supabase-mcp-server/docs)
