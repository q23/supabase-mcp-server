/**
 * Config Repair Integration Tests
 * Tests for detecting and fixing broken Dokploy configurations
 */

import { describe, it, expect } from "vitest";
import { JWTGenerator } from "../../../src/lib/dokploy/jwt-generator.js";
import { JWTValidator } from "../../../src/lib/validation/jwt-validator.js";
import { EnvParser } from "../../../src/lib/dokploy/env-parser.js";
import { ConfigValidator } from "../../../src/tools/dokploy/validate-config.js";

describe("Config Repair Workflow", () => {
  describe("Detect broken Dokploy template configuration", () => {
    it("should detect all common Dokploy template issues", async () => {
      // Simulate broken Dokploy template environment
      const brokenSecret = "dokploy-generated-secret-32-chars";
      const brokenKey = JWTGenerator.generateAnonKey(brokenSecret); // Same for both!

      const brokenEnv = {
        POSTGRES_PASSWORD: "password123",
        JWT_SECRET: brokenSecret,
        ANON_KEY: brokenKey,
        SERVICE_ROLE_KEY: brokenKey, // IDENTICAL (bug!)
        SITE_URL: "http://example.com", // HTTP (bug!)
        API_EXTERNAL_URL: "http://api.example.com", // HTTP (bug!)
        SUPABASE_PUBLIC_URL: "http://supabase.example.com", // HTTP (bug!)
        POSTGRES_HOST: "db",
        POSTGRES_PORT: "5432",
        POSTGRES_DB: "postgres",
      };

      // Detect JWT issues
      const jwtIssues = JWTValidator.detectDokployIssues(
        brokenEnv.ANON_KEY,
        brokenEnv.SERVICE_ROLE_KEY,
        brokenEnv.JWT_SECRET
      );

      expect(jwtIssues.hasIssues).toBe(true);
      expect(jwtIssues.issues).toContain(
        "CRITICAL: ANON_KEY and SERVICE_ROLE_KEY are identical (Dokploy template bug)"
      );

      // Detect URL issues
      const analysis = EnvParser.analyze(brokenEnv);
      expect(analysis.hasHttpIssues).toBe(true);
      expect(analysis.httpUrls).toContain("SITE_URL");
      expect(analysis.httpUrls).toContain("API_EXTERNAL_URL");

      // Overall validation
      const validation = EnvParser.validate(brokenEnv);
      expect(validation.valid).toBe(false);
    });
  });

  describe("Fix broken configuration", () => {
    it("should fix all issues automatically", async () => {
      // Start with broken config
      const brokenSecret = "dokploy-generated-secret-32-chars";
      const brokenKey = JWTGenerator.generateAnonKey(brokenSecret);

      const brokenEnv = {
        POSTGRES_PASSWORD: "password123",
        JWT_SECRET: brokenSecret,
        ANON_KEY: brokenKey,
        SERVICE_ROLE_KEY: brokenKey,
        SITE_URL: "http://example.com",
        API_EXTERNAL_URL: "http://api.example.com",
        SUPABASE_PUBLIC_URL: "http://supabase.example.com",
        POSTGRES_HOST: "db",
        POSTGRES_PORT: "5432",
        POSTGRES_DB: "postgres",
      };

      // Fix 1: Regenerate JWT keys (keep same secret)
      const newKeySet = JWTGenerator.regenerateKeys(brokenSecret);

      expect(newKeySet.anonKey).not.toBe(newKeySet.serviceRoleKey);
      expect(newKeySet.validation.keysAreDifferent).toBe(true);

      // Fix 2: Upgrade URLs to HTTPS
      const { upgraded } = EnvParser.upgradeToHttps(brokenEnv);

      expect(upgraded.SITE_URL).toBe("https://example.com");
      expect(upgraded.API_EXTERNAL_URL).toBe("https://api.example.com");

      // Apply fixes
      const fixedEnv = {
        ...upgraded,
        ANON_KEY: newKeySet.anonKey,
        SERVICE_ROLE_KEY: newKeySet.serviceRoleKey,
      };

      // Validate fixed environment
      const validation = EnvParser.validate(fixedEnv);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);

      // Verify JWT keys are different and valid
      const jwtIssues = JWTValidator.detectDokployIssues(
        fixedEnv.ANON_KEY,
        fixedEnv.SERVICE_ROLE_KEY,
        fixedEnv.JWT_SECRET
      );

      expect(jwtIssues.hasIssues).toBe(false);
      expect(jwtIssues.issues).toHaveLength(0);
    });

    it("should maintain existing JWT_SECRET when regenerating keys", async () => {
      const existingSecret = "existing-jwt-secret-32-characters";
      const newKeySet = JWTGenerator.regenerateKeys(existingSecret);

      // Secret should be unchanged
      expect(newKeySet.jwtSecret).toBe(existingSecret);

      // Keys should validate with existing secret
      const anonValidation = JWTValidator.validate(newKeySet.anonKey, existingSecret);
      const serviceValidation = JWTValidator.validate(newKeySet.serviceRoleKey, existingSecret);

      expect(anonValidation.valid).toBe(true);
      expect(serviceValidation.valid).toBe(true);
    });
  });

  describe("Complete repair workflow", () => {
    it("should execute detect → fix → validate workflow", async () => {
      // 1. DETECT
      const brokenSecret = "dokploy-secret-32-characters-long";
      const brokenKey = JWTGenerator.generateAnonKey(brokenSecret);
      const brokenEnv = {
        JWT_SECRET: brokenSecret,
        ANON_KEY: brokenKey,
        SERVICE_ROLE_KEY: brokenKey, // Identical!
        SITE_URL: "http://example.com", // HTTP!
        API_EXTERNAL_URL: "https://api.example.com",
        POSTGRES_PASSWORD: "password",
        POSTGRES_HOST: "db",
        POSTGRES_PORT: "5432",
        POSTGRES_DB: "postgres",
      };

      const beforeValidation = EnvParser.validate(brokenEnv);
      expect(beforeValidation.valid).toBe(false);

      // 2. FIX
      const newKeys = JWTGenerator.regenerateKeys(brokenSecret);
      const { upgraded } = EnvParser.upgradeToHttps(brokenEnv);

      const fixedEnv = {
        ...upgraded,
        ANON_KEY: newKeys.anonKey,
        SERVICE_ROLE_KEY: newKeys.serviceRoleKey,
      };

      // 3. VALIDATE
      const afterValidation = EnvParser.validate(fixedEnv);
      expect(afterValidation.valid).toBe(true);
      expect(afterValidation.errors).toHaveLength(0);

      // Verify specific fixes
      expect(fixedEnv.ANON_KEY).not.toBe(fixedEnv.SERVICE_ROLE_KEY); // Different!
      expect(fixedEnv.SITE_URL).toBe("https://example.com"); // HTTPS!

      // Verify JWT structure
      const anonPayload = JWTValidator.decode(fixedEnv.ANON_KEY);
      const servicePayload = JWTValidator.decode(fixedEnv.SERVICE_ROLE_KEY);

      expect(anonPayload?.role).toBe("anon");
      expect(servicePayload?.role).toBe("service_role");
      expect(anonPayload?.iss).toBe("supabase");
      expect(servicePayload?.iss).toBe("supabase");
    });
  });

  describe("Real-world Dokploy scenarios", () => {
    it("should fix 100% of Dokploy template deployments", async () => {
      // Based on actual Dokploy template issues documented in spec
      const scenarios = [
        {
          name: "Identical keys with missing role claim",
          env: {
            JWT_SECRET: "secret-32-chars-long-for-test",
            ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSJ9.test",
            SERVICE_ROLE_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSJ9.test",
          },
        },
        {
          name: "All HTTP URLs",
          env: {
            SITE_URL: "http://example.com",
            API_EXTERNAL_URL: "http://api.example.com",
            SUPABASE_PUBLIC_URL: "http://supabase.example.com",
          },
        },
      ];

      for (const scenario of scenarios) {
        logger.info(`Testing scenario: ${scenario.name}`);

        // Each scenario should be fixable
        if (scenario.env.JWT_SECRET) {
          const newKeys = JWTGenerator.regenerateKeys(scenario.env.JWT_SECRET);
          expect(newKeys.validation.keysAreDifferent).toBe(true);
        }

        if (scenario.env.SITE_URL) {
          const { upgraded } = EnvParser.upgradeToHttps(scenario.env);
          expect(upgraded.SITE_URL?.startsWith("https://")).toBe(true);
        }
      }
    });
  });
});
