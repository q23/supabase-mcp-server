/**
 * Environment Parser Tests
 * Tests for .env parsing, validation, and HTTP→HTTPS conversion
 */

import { describe, it, expect } from "vitest";
import { EnvParser } from "../../../../src/lib/dokploy/env-parser.js";

describe("EnvParser", () => {
  describe("parse", () => {
    it("should parse basic .env format", () => {
      const envContent = `
KEY1=value1
KEY2=value2
KEY3=value with spaces
      `.trim();

      const parsed = EnvParser.parse(envContent);

      expect(parsed.KEY1).toBe("value1");
      expect(parsed.KEY2).toBe("value2");
      expect(parsed.KEY3).toBe("value with spaces");
    });

    it("should skip comments and empty lines", () => {
      const envContent = `
# This is a comment
KEY1=value1

# Another comment
KEY2=value2
      `.trim();

      const parsed = EnvParser.parse(envContent);

      expect(Object.keys(parsed)).toHaveLength(2);
      expect(parsed.KEY1).toBe("value1");
      expect(parsed.KEY2).toBe("value2");
    });

    it("should remove quotes from values", () => {
      const envContent = `
KEY1="quoted value"
KEY2='single quoted'
KEY3=unquoted
      `.trim();

      const parsed = EnvParser.parse(envContent);

      expect(parsed.KEY1).toBe("quoted value");
      expect(parsed.KEY2).toBe("single quoted");
      expect(parsed.KEY3).toBe("unquoted");
    });
  });

  describe("stringify", () => {
    it("should convert object to .env format", () => {
      const variables = {
        KEY1: "value1",
        KEY2: "value2",
      };

      const envString = EnvParser.stringify(variables);

      expect(envString).toContain("KEY1=value1");
      expect(envString).toContain("KEY2=value2");
    });

    it("should quote values with spaces", () => {
      const variables = {
        KEY1: "value with spaces",
        KEY2: "simple",
      };

      const envString = EnvParser.stringify(variables);

      expect(envString).toContain('KEY1="value with spaces"');
      expect(envString).toContain("KEY2=simple");
    });
  });

  describe("analyze", () => {
    it("should identify public-facing URLs", () => {
      const variables = {
        SITE_URL: "http://example.com",
        API_EXTERNAL_URL: "https://api.example.com",
        INTERNAL_URL: "http://localhost:3000",
      };

      const analysis = EnvParser.analyze(variables);

      expect(analysis.publicFacingUrls).toContain("SITE_URL");
      expect(analysis.publicFacingUrls).toContain("API_EXTERNAL_URL");
    });

    it("should detect HTTP vs HTTPS URLs", () => {
      const variables = {
        SITE_URL: "http://example.com",
        API_EXTERNAL_URL: "https://api.example.com",
      };

      const analysis = EnvParser.analyze(variables);

      expect(analysis.httpUrls).toContain("SITE_URL");
      expect(analysis.httpsUrls).toContain("API_EXTERNAL_URL");
    });

    it("should flag HTTP issues in public-facing URLs", () => {
      const variables = {
        SITE_URL: "http://example.com", // Public + HTTP = issue!
        INTERNAL_URL: "http://localhost", // Not public = no issue
      };

      const analysis = EnvParser.analyze(variables);

      expect(analysis.hasHttpIssues).toBe(true);
    });

    it("should identify secret variables", () => {
      const variables = {
        POSTGRES_PASSWORD: "secret123",
        JWT_SECRET: "jwt-secret",
        API_KEY: "api-key",
        SITE_URL: "https://example.com",
      };

      const analysis = EnvParser.analyze(variables);

      expect(analysis.variables.find((v) => v.key === "POSTGRES_PASSWORD")?.isSecret).toBe(true);
      expect(analysis.variables.find((v) => v.key === "JWT_SECRET")?.isSecret).toBe(true);
      expect(analysis.variables.find((v) => v.key === "SITE_URL")?.isSecret).toBe(false);
    });
  });

  describe("upgradeToHttps", () => {
    it("should upgrade HTTP to HTTPS for public URLs", () => {
      const variables = {
        SITE_URL: "http://example.com",
        API_EXTERNAL_URL: "http://api.example.com",
        INTERNAL_URL: "http://localhost",
      };

      const { upgraded, changes } = EnvParser.upgradeToHttps(variables);

      expect(upgraded.SITE_URL).toBe("https://example.com");
      expect(upgraded.API_EXTERNAL_URL).toBe("https://api.example.com");
      expect(changes).toHaveLength(2);
      expect(changes.find((c) => c.key === "SITE_URL")).toBeDefined();
    });

    it("should not change already HTTPS URLs", () => {
      const variables = {
        SITE_URL: "https://example.com",
      };

      const { upgraded, changes } = EnvParser.upgradeToHttps(variables);

      expect(upgraded.SITE_URL).toBe("https://example.com");
      expect(changes).toHaveLength(0);
    });
  });

  describe("validate", () => {
    it("should pass validation for complete configuration", () => {
      const variables = {
        POSTGRES_PASSWORD: "password123",
        JWT_SECRET: "jwt-secret-at-least-32-chars-long",
        ANON_KEY: "anon-key",
        SERVICE_ROLE_KEY: "service-role-key",
        SITE_URL: "https://example.com",
        API_EXTERNAL_URL: "https://api.example.com",
      };

      const validation = EnvParser.validate(variables);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it("should fail validation for missing required variables", () => {
      const variables = {
        SITE_URL: "https://example.com",
      };

      const validation = EnvParser.validate(variables);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors.some((e) => e.includes("POSTGRES_PASSWORD"))).toBe(true);
    });

    it("should warn about identical ANON_KEY and SERVICE_ROLE_KEY", () => {
      const variables = {
        POSTGRES_PASSWORD: "password123",
        JWT_SECRET: "jwt-secret-at-least-32-chars-long",
        ANON_KEY: "same-key",
        SERVICE_ROLE_KEY: "same-key", // Same as ANON_KEY (Dokploy bug!)
        SITE_URL: "https://example.com",
        API_EXTERNAL_URL: "https://api.example.com",
      };

      const validation = EnvParser.validate(variables);

      expect(validation.valid).toBe(false);
      expect(validation.errors.some((e) => e.includes("must be different"))).toBe(true);
    });

    it("should warn about HTTP URLs in production variables", () => {
      const variables = {
        POSTGRES_PASSWORD: "password123",
        JWT_SECRET: "jwt-secret-at-least-32-chars-long",
        ANON_KEY: "anon-key",
        SERVICE_ROLE_KEY: "service-role-key",
        SITE_URL: "http://example.com", // HTTP!
        API_EXTERNAL_URL: "https://api.example.com",
      };

      const validation = EnvParser.validate(variables);

      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.warnings.some((w) => w.includes("HTTP"))).toBe(true);
    });
  });

  describe("diff", () => {
    it("should detect added variables", () => {
      const oldEnv = {
        KEY1: "value1",
      };
      const newEnv = {
        KEY1: "value1",
        KEY2: "value2",
      };

      const diff = EnvParser.diff(oldEnv, newEnv);

      expect(diff.added).toHaveLength(1);
      expect(diff.added[0].key).toBe("KEY2");
    });

    it("should detect removed variables", () => {
      const oldEnv = {
        KEY1: "value1",
        KEY2: "value2",
      };
      const newEnv = {
        KEY1: "value1",
      };

      const diff = EnvParser.diff(oldEnv, newEnv);

      expect(diff.removed).toHaveLength(1);
      expect(diff.removed[0]).toBe("KEY2");
    });

    it("should detect modified variables", () => {
      const oldEnv = {
        KEY1: "old-value",
      };
      const newEnv = {
        KEY1: "new-value",
      };

      const diff = EnvParser.diff(oldEnv, newEnv);

      expect(diff.modified).toHaveLength(1);
      expect(diff.modified[0].key).toBe("KEY1");
      expect(diff.modified[0].oldValue).toBe("old-value");
      expect(diff.modified[0].newValue).toBe("new-value");
    });

    it("should detect HTTP→HTTPS upgrades", () => {
      const oldEnv = {
        SITE_URL: "http://example.com",
      };
      const newEnv = {
        SITE_URL: "https://example.com",
      };

      const diff = EnvParser.diff(oldEnv, newEnv);

      expect(diff.modified).toHaveLength(1);
      expect(diff.modified[0].reason).toBe("Upgraded HTTP to HTTPS");
    });
  });

  describe("getSupabaseVariables", () => {
    it("should filter Supabase-specific variables", () => {
      const variables = {
        POSTGRES_PASSWORD: "password",
        JWT_SECRET: "secret",
        ANON_KEY: "anon",
        RANDOM_VAR: "random",
        SITE_URL: "https://example.com",
      };

      const supabaseVars = EnvParser.getSupabaseVariables(variables);

      expect(supabaseVars.POSTGRES_PASSWORD).toBe("password");
      expect(supabaseVars.JWT_SECRET).toBe("secret");
      expect(supabaseVars.ANON_KEY).toBe("anon");
      expect(supabaseVars.RANDOM_VAR).toBeUndefined();
    });
  });

  describe("Integration: Fixes Dokploy Template Issues", () => {
    it("upgrades all public-facing HTTP URLs to HTTPS", () => {
      const dokployTemplate = {
        SITE_URL: "http://example.com",
        API_EXTERNAL_URL: "http://api.example.com",
        SUPABASE_PUBLIC_URL: "http://supabase.example.com",
        POSTGRES_HOST: "db", // Internal, should not change
      };

      const { upgraded } = EnvParser.upgradeToHttps(dokployTemplate);

      expect(upgraded.SITE_URL).toBe("https://example.com");
      expect(upgraded.API_EXTERNAL_URL).toBe("https://api.example.com");
      expect(upgraded.SUPABASE_PUBLIC_URL).toBe("https://supabase.example.com");
      expect(upgraded.POSTGRES_HOST).toBe("db"); // Unchanged
    });
  });
});
