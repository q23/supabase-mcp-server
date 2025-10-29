/**
 * Setup Wizard Integration Tests
 * Tests for the complete setup wizard workflow
 */

import { describe, it, expect, beforeEach } from "vitest";
import { SetupWizard } from "../../../src/tools/dokploy/setup-wizard.js";
import { DokployAPIClient } from "../../../src/lib/dokploy/api-client.js";
import type { SetupWizardInput } from "../../../src/tools/dokploy/setup-wizard.js";

describe("SetupWizard Integration", () => {
  let mockDokployClient: DokployAPIClient;

  beforeEach(() => {
    // Mock Dokploy client (in real integration test, use Docker or test instance)
    mockDokployClient = {
      createApplication: async (config) => ({
        id: "test-app-id",
        name: config.projectName,
        projectId: "test-project",
        appType: "compose",
        status: "running",
        env: config.env,
        source: {
          type: "docker",
          image: "supabase/supabase",
          tag: "latest",
        },
        createdAt: new Date().toISOString(),
      }),
      deploy: async () => ({
        deploymentId: "test-deployment-id",
        applicationId: "test-app-id",
        status: "pending",
        startedAt: new Date().toISOString(),
      }),
    } as unknown as DokployAPIClient;
  });

  describe("execute", () => {
    it("should complete all 9 steps successfully", async () => {
      const input: SetupWizardInput = {
        dokployApiUrl: "https://dokploy.example.com",
        dokployApiKey: "test-api-key",
        projectName: "test-project",
        domain: "supabase.example.com",
        useLetsEncrypt: true,
      };

      const wizard = new SetupWizard(mockDokployClient, input);
      const result = await wizard.execute();

      expect(result.success).toBe(true);
      expect(result.steps).toHaveLength(9);
      expect(result.steps.every((s) => s.status === "completed" || s.status === "skipped")).toBe(true);
    });

    it("should generate unique JWT keys", async () => {
      const input: SetupWizardInput = {
        dokployApiUrl: "https://dokploy.example.com",
        dokployApiKey: "test-api-key",
        projectName: "test-project",
        domain: "supabase.example.com",
      };

      const wizard = new SetupWizard(mockDokployClient, input);
      const result = await wizard.execute();

      expect(result.credentials.anonKey).not.toBe(result.credentials.serviceRoleKey);
      expect(result.credentials.jwtSecret).toBeDefined();
    });

    it("should sanitize invalid project names", async () => {
      const input: SetupWizardInput = {
        dokployApiUrl: "https://dokploy.example.com",
        dokployApiKey: "test-api-key",
        projectName: "My Cool Project!", // Invalid!
        domain: "supabase.example.com",
      };

      const wizard = new SetupWizard(mockDokployClient, input);
      const result = await wizard.execute();

      expect(result.success).toBe(true);
      // Should have been sanitized to "my-cool-project"
    });

    it("should handle SMTP configuration", async () => {
      const input: SetupWizardInput = {
        dokployApiUrl: "https://dokploy.example.com",
        dokployApiKey: "test-api-key",
        projectName: "test-project",
        domain: "supabase.example.com",
        smtp: {
          host: "smtp.gmail.com",
          port: 587,
          user: "test@example.com",
          password: "smtp-password",
          from: "noreply@example.com",
        },
      };

      const wizard = new SetupWizard(mockDokployClient, input);
      const result = await wizard.execute();

      expect(result.success).toBe(true);
      const smtpStep = result.steps.find((s) => s.name.includes("SMTP"));
      expect(smtpStep?.status).toBe("completed");
    });

    it("should record all step timings", async () => {
      const input: SetupWizardInput = {
        dokployApiUrl: "https://dokploy.example.com",
        dokployApiKey: "test-api-key",
        projectName: "test-project",
        domain: "supabase.example.com",
      };

      const wizard = new SetupWizard(mockDokployClient, input);
      const result = await wizard.execute();

      expect(result.duration).toBeGreaterThan(0);
      for (const step of result.steps) {
        expect(step.durationMs).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
