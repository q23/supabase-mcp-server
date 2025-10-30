/**
 * PM2 Ecosystem Configuration
 * Production-ready process management with auto-restart
 *
 * Usage:
 *   pm2 start ecosystem.config.js
 *   pm2 save
 *   pm2 startup
 */

module.exports = {
  apps: [
    {
      name: 'supabase-mcp-server',
      script: './dist/server-http.js',
      instances: 1,
      exec_mode: 'cluster',

      // Auto-restart configuration
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',

      // Restart policy
      min_uptime: '10s',
      max_restarts: 10,
      restart_delay: 5000,

      // Environment
      env: {
        NODE_ENV: 'production',
        MCP_PORT: 3000,
      },
      env_file: '.env',

      // Logging
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      // Log rotation
      log_type: 'json',
      max_size: '10M',
      max_files: 10,

      // Monitoring
      instance_var: 'INSTANCE_ID',

      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,

      // Health check (PM2 Plus)
      health_check: {
        interval: 30000,
        timeout: 5000,
        endpoint: 'http://localhost:3000/health'
      },

      // Advanced features
      cron_restart: '0 2 * * *',  // Restart daily at 2 AM
      vizion: true,
      autorestart: true,

      // Process management
      interpreter: 'node',
      interpreter_args: '--max-old-space-size=1024'
    }
  ],

  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:yourusername/supabase-mcp-server.git',
      path: '/opt/supabase-mcp-server',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production'
    }
  }
};
