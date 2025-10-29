/**
 * Dokploy-like Deployment Manager
 * Deploys real Supabase instances via Docker Compose
 */

import express from 'express';
import cors from 'cors';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

const execAsync = promisify(exec);
const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.API_KEY || 'test-dokploy-api-key-local-only';

// In-memory store
const applications = new Map();
const deployments = new Map();

app.use(cors());
app.use(express.json());

// Auth middleware
function authMiddleware(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (apiKey !== API_KEY) {
    return res.status(401).json({ error: 'Invalid API key' });
  }
  next();
}

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Create application (deploy Supabase)
app.post('/api/application', authMiddleware, async (req, res) => {
  const { name, domain, env } = req.body;
  const appId = randomUUID();

  try {
    // Generate docker-compose for this Supabase instance
    const composeContent = generateSupabaseCompose(name, domain, env);

    // Save compose file
    const deploymentDir = `/app/deployments/${appId}`;
    await fs.mkdir(deploymentDir, { recursive: true });
    await fs.writeFile(`${deploymentDir}/docker-compose.yml`, composeContent);

    // Start deployment
    const { stdout } = await execAsync(`cd ${deploymentDir} && docker-compose up -d`);

    const app = {
      id: appId,
      name,
      domain,
      env,
      status: 'running',
      createdAt: new Date().toISOString(),
      containers: [],
    };

    applications.set(appId, app);

    res.json(app);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get application
app.get('/api/application/:id', authMiddleware, (req, res) => {
  const app = applications.get(req.params.id);
  if (!app) {
    return res.status(404).json({ error: 'Not found' });
  }
  res.json(app);
});

// Update environment
app.put('/api/application/:id/env', authMiddleware, async (req, res) => {
  const app = applications.get(req.params.id);
  if (!app) {
    return res.status(404).json({ error: 'Not found' });
  }

  const { variables } = req.body;
  for (const v of variables) {
    app.env[v.name] = v.value;
  }

  applications.set(req.params.id, app);
  res.json({ success: true });
});

// Generate Supabase docker-compose.yml
function generateSupabaseCompose(name, domain, env) {
  const projectName = name.replace(/[^a-z0-9-]/g, '-');

  return `version: '3.8'
services:
  postgres:
    image: supabase/postgres:15.1.0.117
    container_name: ${projectName}-postgres
    environment:
      POSTGRES_PASSWORD: ${env.POSTGRES_PASSWORD || 'postgres'}
      POSTGRES_DB: postgres
    ports:
      - "\${POSTGRES_PORT:-5432}:5432"
    volumes:
      - ${projectName}-postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  ${projectName}-postgres-data:
`;
}

app.listen(PORT, () => {
  console.log(`🚀 Deployment Manager running on port ${PORT}`);
  console.log(`📝 API Key: ${API_KEY}`);
  console.log(`🔗 Health: http://localhost:${PORT}/health`);
});
