#!/usr/bin/env node
/**
 * Minimal HTTP Server for Testing
 * Ensures basic connectivity works before adding MCP complexity
 */

import express from "express";

const PORT = parseInt(process.env["MCP_PORT"] || "3000");
const API_KEY = process.env["MCP_API_KEY"];

const app = express();
app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({
    status: "healthy",
    server: "supabase-mcp-server-minimal",
    version: "0.1.0",
    port: PORT,
    auth: API_KEY ? "enabled" : "disabled",
    timestamp: new Date().toISOString(),
  });
});

// Root
app.get("/", (_req, res) => {
  res.json({
    message: "Supabase MCP Server is running",
    endpoints: {
      health: "/health",
      mcp: "/mcp (coming soon)"
    }
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Minimal server listening on http://0.0.0.0:${PORT}`);
  console.log(`Authentication: ${API_KEY ? "Enabled" : "Disabled"}`);
  console.log(`Time: ${new Date().toISOString()}`);
});

// Error handling
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});
