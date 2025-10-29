/**
 * Deployment Workflow E2E Tests
 * End-to-end tests for the complete deployment workflow
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { JWTGenerator } from "../../src/lib/dokploy/jwt-generator.js";
import { EnvParser } from "../../src/lib/dokploy/env-parser.js";
import { JWTValidator } from "../../src/lib/validation/jwt-validator.js";
import { ProjectNameValidator } from "../../src/lib/validation/project-name-validator.js";

describe("Deployment Workflow E2E", () => {
  describe("Complete workflow simulation", () => {
    it("should execute complete deployment workflow", async () => {
      // Step 1: Validate project name
      const projectName = "My Test Project";
      const nameValidation = ProjectNameValidator.validate(projectName);
      const sanitizedName = nameValidation.sanitized;

      expect(sanitizedName).toBe("my-test-project");
      expect(ProjectNameValidator.validate(sanitizedName).valid).toBe(true);

      // Step 2: Generate JWT keys
      const keySet = JWTGenerator.generateKeySet();

      expect(keySet.validation.keysAreDifferent).toBe(true);
      expect(keySet.validation.anonKeyValid).toBe(true);
      expect(keySet.validation.serviceRoleKeyValid).toBe(true);

      // Step 3: Build environment variables
      const env = {
        POSTGRES_PASSWORD: "test-password",
        JWT_SECRET: keySet.jwtSecret,
        ANON_KEY: keySet.anonKey,
        SERVICE_ROLE_KEY: keySet.serviceRoleKey,
        SITE_URL: "http://example.com", // HTTP (will be upgraded)
        API_EXTERNAL_URL: "http://api.example.com",
        SUPABASE_PUBLIC_URL: "http://supabase.example.com",
      };

      // Step 4: Validate environment
      const envValidation = EnvParser.validate(env);
      expect(envValidation.valid).toBe(true);

      // Step 5: Upgrade HTTP to HTTPS
      const { upgraded, changes } = EnvParser.upgradeToHttps(env);

      expect(changes.length).toBe(3);
      expect(upgraded.SITE_URL).toBe("https://example.com");
      expect(upgraded.API_EXTERNAL_URL).toBe("https://api.example.com");
      expect(upgraded.SUPABASE_PUBLIC_URL).toBe("https://supabase.example.com");

      // Step 6: Final validation
      const finalValidation = EnvParser.validate(upgraded);
      expect(finalValidation.valid).toBe(true);
      expect(finalValidation.warnings.length).toBe(0);

      // Step 7: Verify JWT keys work
      const anonValidation = JWTValidator.validate(keySet.anonKey, keySet.jwtSecret);
      const serviceValidation = JWTValidator.validate(keySet.serviceRoleKey, keySet.jwtSecret);

      expect(anonValidation.valid).toBe(true);
      expect(serviceValidation.valid).toBe(true);
      expect(anonValidation.payload?.role).toBe("anon");
      expect(serviceValidation.payload?.role).toBe("service_role");
    });

    it("should detect and prevent Dokploy template bugs", async () => {
      // Simulate Dokploy template (broken keys)
      const secret = "test-secret-at-least-32-characters-long";
      const brokenKey = JWTGenerator.generateAnonKey(secret); // Same key for both!

      const dokployEnv = {
        POSTGRES_PASSWORD: "password",
        JWT_SECRET: secret,
        ANON_KEY: brokenKey,
        SERVICE_ROLE_KEY: brokenKey, // IDENTICAL (bug!)
        SITE_URL: "http://example.com", // HTTP (bug!)
        API_EXTERNAL_URL: "http://api.example.com",
        SUPABASE_PUBLIC_URL: "http://supabase.example.com",
      };

      // Detect issues
      const validation = EnvParser.validate(dokployEnv);
      const analysis = EnvParser.analyze(dokployEnv);

      // Should detect identical keys
      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes("identical"))).toBe(true);

      // Should detect HTTP issues
      expect(analysis.hasHttpIssues).toBe(true);

      // Fix: Generate new keys
      const newKeySet = JWTGenerator.regenerateKeys(secret);

      // Fix: Upgrade URLs
      const { upgraded } = EnvParser.upgradeToHttps(dokployEnv);

      // Apply fixes
      const fixedEnv = {
        ...upgraded,
        ANON_KEY: newKeySet.anonKey,
        SERVICE_ROLE_KEY: newKeySet.serviceRoleKey,
      };

      // Verify fixes
      const fixedValidation = EnvParser.validate(fixedEnv);
      expect(fixedValidation.valid).toBe(true);
      expect(fixedValidation.errors).toHaveLength(0);

      // Verify keys are different
      expect(fixedEnv.ANON_KEY).not.toBe(fixedEnv.SERVICE_ROLE_KEY);

      // Verify all URLs are HTTPS
      expect(fixedEnv.SITE_URL).toBe("https://example.com");
      expect(fixedEnv.API_EXTERNAL_URL).toBe("https://api.example.com");
    });
  });

  describe("Deployment timing requirements", () => {
    it("should complete key generation in <1 second", () => {
      const startTime = Date.now();

      const keySet = JWTGenerator.generateKeySet();

      const duration = Date.now() - startTime;

      expect(keySet).toBeDefined();
      expect(duration).toBeLessThan(1000);
    });

    it("should complete environment validation in <100ms", () => {
      const env = {
        POSTGRES_PASSWORD: "password",
        JWT_SECRET: "secret",
        ANON_KEY: "anon",
        SERVICE_ROLE_KEY: "service",
        SITE_URL: "https://example.com",
        API_EXTERNAL_URL: "https://api.example.com",
      };

      const startTime = Date.now();

      const validation = EnvParser.validate(env);

      const duration = Date.now() - startTime;

      expect(validation).toBeDefined();
      expect(duration).toBeLessThan(100);
    });

    it("should complete HTTP→HTTPS upgrade in <50ms", () => {
      const env = {
        SITE_URL: "http://example.com",
        API_EXTERNAL_URL: "http://api.example.com",
        SUPABASE_PUBLIC_URL: "http://supabase.example.com",
      };

      const startTime = Date.now();

      const { upgraded } = EnvParser.upgradeToHttps(env);

      const duration = Date.now() - startTime;

      expect(upgraded).toBeDefined();
      expect(duration).toBeLessThan(50);
    });
  });
});
