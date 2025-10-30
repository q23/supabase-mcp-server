# Deployment Guide

Production deployment options for Supabase MCP Server with **auto-start**, **auto-restart**, and **zero downtime**.

## Quick Start

```bash
# 1. Clone and configure
git clone https://github.com/your-org/supabase-mcp-server.git
cd supabase-mcp-server
cp .env.example .env
nano .env  # Configure credentials

# 2. Deploy (auto-detects best method)
chmod +x deployment/deploy.sh
./deployment/deploy.sh
```

---

## Deployment Methods

### Option 1: Docker (Recommended)

**Best for**: Multi-user teams, easy scaling, isolation

**Features:**
- ✅ Auto-restart on failure (`restart: always`)
- ✅ Health checks every 30s
- ✅ Resource limits (1GB RAM, 2 CPU)
- ✅ Log rotation (10MB files, 3 max)
- ✅ Auto-update with Watchtower (optional)

```bash
# Standard deployment
docker-compose -f docker-compose.prod.yml up -d

# With SSL (Nginx)
docker-compose -f docker-compose.prod.yml --profile with-ssl up -d

# With auto-updates
docker-compose -f docker-compose.prod.yml --profile with-autoupdate up -d

# Check status
docker-compose -f docker-compose.prod.yml ps
docker logs supabase-mcp-server
```

**Restart Policies:**
- `restart: always` - Restart unless manually stopped
- Health check fails 3 times → Container restarts automatically
- Server crashes → Restarts within seconds
- Host reboots → Container starts automatically

---

### Option 2: PM2

**Best for**: Node.js environments, easy monitoring

```bash
# Install PM2
npm install -g pm2

# Deploy
npm install
npm run build
pm2 start ecosystem.config.js

# Enable auto-start on boot
pm2 save
pm2 startup

# Monitor
pm2 list
pm2 logs supabase-mcp-server
pm2 monit
```

**Features:**
- ✅ Cluster mode (multiple instances)
- ✅ Auto-restart on crash
- ✅ Memory limit (1GB)
- ✅ Cron restart (daily at 2 AM)
- ✅ Log rotation
- ✅ Health checks

---

### Option 3: systemd

**Best for**: Linux servers, native integration

```bash
# Copy service file
sudo cp deployment/systemd/supabase-mcp-server.service /etc/systemd/system/

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable supabase-mcp-server
sudo systemctl start supabase-mcp-server

# Check status
sudo systemctl status supabase-mcp-server
sudo journalctl -u supabase-mcp-server -f
```

**Features:**
- ✅ Auto-start on boot
- ✅ Auto-restart on failure (5 times in 5min)
- ✅ Security hardening
- ✅ Resource limits
- ✅ journald logging

---

## Monitoring & Alerting

### Health Monitoring Script

```bash
# Single check
./deployment/monitor.sh

# Continuous monitoring (every 60s)
CONTINUOUS=true INTERVAL=60 ./deployment/monitor.sh

# With auto-restart on failure
AUTO_RESTART=true ./deployment/monitor.sh

# With Slack/Discord alerts
ALERT_WEBHOOK=https://hooks.slack.com/... ./deployment/monitor.sh
```

### Setup Cron Job

```bash
# Edit crontab
crontab -e

# Add health check every 5 minutes
*/5 * * * * /opt/supabase-mcp-server/deployment/monitor.sh >> /var/log/mcp-monitor.log 2>&1
```

---

## Zero-Downtime Updates

### Docker

```bash
# Pull latest image
docker-compose -f docker-compose.prod.yml pull

# Recreate containers
docker-compose -f docker-compose.prod.yml up -d

# Watchtower auto-updates (optional)
docker-compose -f docker-compose.prod.yml --profile with-autoupdate up -d
```

### PM2

```bash
# Update code
git pull
npm install
npm run build

# Zero-downtime reload
pm2 reload ecosystem.config.js
```

### systemd

```bash
# Update code
git pull
npm install
npm run build

# Restart service
sudo systemctl restart supabase-mcp-server
```

---

## SSL/HTTPS Setup

### With Let's Encrypt (Recommended)

```bash
# Install certbot
sudo apt-get install certbot

# Get certificate
sudo certbot certonly --standalone -d mcp.your-domain.com

# Copy certificates
mkdir -p ssl
sudo cp /etc/letsencrypt/live/mcp.your-domain.com/fullchain.pem ssl/
sudo cp /etc/letsencrypt/live/mcp.your-domain.com/privkey.pem ssl/

# Update nginx.conf with your domain
nano nginx.conf  # Change server_name

# Deploy with SSL
docker-compose -f docker-compose.prod.yml --profile with-ssl up -d
```

### Auto-renewal

```bash
# Add to crontab
0 0 * * * certbot renew --quiet && docker restart mcp-nginx
```

---

## Troubleshooting

### Server won't start

```bash
# Check logs
docker logs supabase-mcp-server

# Or PM2
pm2 logs supabase-mcp-server

# Or systemd
sudo journalctl -u supabase-mcp-server -n 50
```

### Health check fails

```bash
# Manual health check
curl http://localhost:3000/health

# Check port binding
sudo netstat -tulpn | grep 3000

# Check environment
docker exec supabase-mcp-server env | grep MCP
```

### Container keeps restarting

```bash
# Check restart count
docker inspect supabase-mcp-server | grep RestartCount

# Check events
docker events --filter container=supabase-mcp-server

# Increase health check interval
# Edit docker-compose.prod.yml: interval: 60s
```

---

## Resource Limits

Default limits (adjust in `docker-compose.prod.yml`):

```yaml
resources:
  limits:
    cpus: '2'
    memory: 1G
  reservations:
    cpus: '0.5'
    memory: 256M
```

For high-traffic:
- CPUs: 4
- Memory: 2G
- Add load balancer

---

## Backup & Recovery

### Backup Configuration

```bash
# Backup .env
cp .env .env.backup

# Backup logs
tar -czf logs-$(date +%Y%m%d).tar.gz logs/
```

### Disaster Recovery

```bash
# Restore configuration
cp .env.backup .env

# Rebuild and restart
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## Production Checklist

- [ ] `.env` configured with strong API keys
- [ ] SSL certificates installed
- [ ] Firewall rules configured (allow port 443)
- [ ] Health monitoring enabled
- [ ] Alerts configured (Slack/Discord webhook)
- [ ] Backup strategy in place
- [ ] Auto-updates configured (Watchtower)
- [ ] Log rotation enabled
- [ ] Resource limits set
- [ ] Domain DNS configured

---

## Performance Tuning

### High Traffic

```yaml
# docker-compose.prod.yml
mcp-server:
  deploy:
    replicas: 3  # Run 3 instances
    resources:
      limits:
        cpus: '4'
        memory: 2G
```

### PM2 Cluster Mode

```javascript
// ecosystem.config.js
instances: 'max',  // Use all CPU cores
exec_mode: 'cluster'
```

---

## Monitoring Tools Integration

### Prometheus

```yaml
# Add to docker-compose.prod.yml
prometheus:
  image: prom/prometheus
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml
  ports:
    - "9090:9090"
```

### Grafana Dashboard

```bash
docker run -d -p 3001:3000 grafana/grafana
# Import MCP Server dashboard
```

---

## Next Steps

- [Client Configuration](./CLIENT-CONFIGURATION.md)
- [API Reference](./API.md)
- [Troubleshooting](./TROUBLESHOOTING.md)
