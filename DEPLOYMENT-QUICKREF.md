# Deployment Quick Reference

## 🚀 One-Line Deploy

```bash
curl -sSL https://raw.githubusercontent.com/your-org/supabase-mcp-server/main/deployment/deploy.sh | bash
```

---

## Docker (Recommended)

```bash
# Start
docker-compose -f docker-compose.prod.yml up -d

# With SSL
docker-compose -f docker-compose.prod.yml --profile with-ssl up -d

# With auto-updates
docker-compose -f docker-compose.prod.yml --profile with-autoupdate up -d

# Check status
docker ps
docker logs supabase-mcp-server -f
```

**Features**: Auto-restart, health checks, log rotation, resource limits

---

## PM2

```bash
# Install & deploy
npm install -g pm2
npm install && npm run build
pm2 start ecosystem.config.js
pm2 save && pm2 startup

# Monitor
pm2 list
pm2 logs supabase-mcp-server
pm2 monit
```

**Features**: Cluster mode, auto-restart, memory limits, cron restart

---

## systemd

```bash
# Install service
sudo cp deployment/systemd/supabase-mcp-server.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable supabase-mcp-server
sudo systemctl start supabase-mcp-server

# Monitor
sudo systemctl status supabase-mcp-server
sudo journalctl -u supabase-mcp-server -f
```

**Features**: Auto-boot, auto-restart, security hardening

---

## Monitoring

```bash
# Single health check
./deployment/monitor.sh

# Continuous monitoring
CONTINUOUS=true INTERVAL=60 ./deployment/monitor.sh

# With auto-restart
AUTO_RESTART=true ./deployment/monitor.sh

# With Slack alerts
ALERT_WEBHOOK=https://hooks.slack.com/... AUTO_RESTART=true ./deployment/monitor.sh

# Setup cron (every 5 min)
echo "*/5 * * * * /path/to/deployment/monitor.sh" | crontab -
```

---

## SSL Setup

```bash
# Get certificate
sudo certbot certonly --standalone -d mcp.your-domain.com

# Copy certs
mkdir -p ssl
sudo cp /etc/letsencrypt/live/mcp.your-domain.com/{fullchain,privkey}.pem ssl/

# Update nginx.conf server_name
nano nginx.conf

# Deploy with SSL
docker-compose -f docker-compose.prod.yml --profile with-ssl up -d
```

---

## Updates

```bash
# Docker
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# PM2 (zero downtime)
git pull && npm install && npm run build
pm2 reload ecosystem.config.js

# systemd
git pull && npm install && npm run build
sudo systemctl restart supabase-mcp-server
```

---

## Troubleshooting

```bash
# Check health
curl http://localhost:3000/health

# View logs
docker logs supabase-mcp-server --tail 100 -f
pm2 logs supabase-mcp-server
sudo journalctl -u supabase-mcp-server -n 100 -f

# Check port
sudo netstat -tulpn | grep 3000

# Restart
docker restart supabase-mcp-server
pm2 restart supabase-mcp-server
sudo systemctl restart supabase-mcp-server
```

---

## Key Features

✅ **Auto-Start**: Boots automatically after server restart  
✅ **Auto-Restart**: Recovers from crashes within seconds  
✅ **Health Checks**: Monitors every 30s, auto-restarts on failure  
✅ **Resource Limits**: CPU (2 cores) & Memory (1GB)  
✅ **Log Rotation**: 10MB files, 3 max  
✅ **Zero Downtime**: Rolling updates without service interruption  
✅ **Monitoring**: Built-in health check + alerting  
✅ **SSL/HTTPS**: Let's Encrypt integration  

---

📖 Full docs: [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)
