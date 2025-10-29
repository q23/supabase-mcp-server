/**
 * Validator Tests
 * Tests for JWT, URL, and project name validators
 */

import { describe, it, expect } from "vitest";
import { JWTValidator } from "../../../../src/lib/validation/jwt-validator.js";
import { URLValidator } from "../../../../src/lib/validation/url-validator.js";
import { ProjectNameValidator } from "../../../../src/lib/validation/project-name-validator.js";
import jwt from "jsonwebtoken";

describe("JWTValidator", () => {
  const validSecret = "test-secret-that-is-at-least-32-characters-long";

  describe("validate", () => {
    it("should validate correct JWT with all required claims", () => {
      const token = jwt.sign(
        {
          role: "anon",
          iss: "supabase",
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
        validSecret
      );

      const result = JWTValidator.validate(token, validSecret);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.payload?.role).toBe("anon");
      expect(result.payload?.iss).toBe("supabase");
    });

    it("should fail validation for missing role claim", () => {
      const token = jwt.sign(
        {
          iss: "supabase",
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
        validSecret
      );

      const result = JWTValidator.validate(token, validSecret);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("role"))).toBe(true);
    });

    it("should fail validation for wrong issuer", () => {
      const token = jwt.sign(
        {
          role: "anon",
          iss: "wrong-issuer",
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
        validSecret
      );

      const result = JWTValidator.validate(token, validSecret);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("iss"))).toBe(true);
    });

    it("should fail validation for expired token", () => {
      const token = jwt.sign(
        {
          role: "anon",
          iss: "supabase",
          iat: Math.floor(Date.now() / 1000) - 7200,
          exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
        },
        validSecret
      );

      const result = JWTValidator.validate(token, validSecret);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("expired"))).toBe(true);
    });

    it("should fail validation for wrong secret", () => {
      const token = jwt.sign(
        {
          role: "anon",
          iss: "supabase",
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
        "wrong-secret"
      );

      const result = JWTValidator.validate(token, validSecret);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("signature"))).toBe(true);
    });
  });

  describe("detectDokployIssues", () => {
    it("should detect identical keys", () => {
      const token = jwt.sign({ role: "anon", iss: "supabase" }, validSecret);

      const result = JWTValidator.detectDokployIssues(token, token, validSecret);

      expect(result.hasIssues).toBe(true);
      expect(result.issues).toContain("CRITICAL: ANON_KEY and SERVICE_ROLE_KEY are identical (Dokploy template bug)");
    });

    it("should detect missing role claims", () => {
      const anonKey = jwt.sign({ iss: "supabase" }, validSecret); // Missing role!
      const serviceKey = jwt.sign({ role: "service_role", iss: "supabase" }, validSecret);

      const result = JWTValidator.detectDokployIssues(anonKey, serviceKey, validSecret);

      expect(result.hasIssues).toBe(true);
      expect(result.issues.some((i) => i.includes("ANON_KEY validation failed"))).toBe(true);
    });
  });

  describe("areIdentical", () => {
    it("should detect identical tokens", () => {
      const token = "test-token";

      expect(JWTValidator.areIdentical(token, token)).toBe(true);
    });

    it("should detect different tokens", () => {
      expect(JWTValidator.areIdentical("token1", "token2")).toBe(false);
    });
  });
});

describe("URLValidator", () => {
  describe("validate", () => {
    it("should validate HTTPS URLs", () => {
      const result = URLValidator.validate("https://example.com");

      expect(result.valid).toBe(true);
      expect(result.protocol).toBe("https");
      expect(result.errors).toHaveLength(0);
    });

    it("should validate HTTP URLs but warn", () => {
      const result = URLValidator.validate("http://example.com");

      expect(result.valid).toBe(true);
      expect(result.protocol).toBe("http");
      expect(result.shouldUpgrade).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("should fail validation for HTTP when HTTPS required", () => {
      const result = URLValidator.validate("http://example.com", true);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("HTTPS is required"))).toBe(true);
    });

    it("should fail validation for invalid URLs", () => {
      const result = URLValidator.validate("not-a-url");

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("upgradeToHttps", () => {
    it("should convert HTTP to HTTPS", () => {
      const upgraded = URLValidator.upgradeToHttps("http://example.com");

      expect(upgraded).toBe("https://example.com");
    });

    it("should not change HTTPS URLs", () => {
      const upgraded = URLValidator.upgradeToHttps("https://example.com");

      expect(upgraded).toBe("https://example.com");
    });
  });

  describe("validateAndUpgradeUrls", () => {
    it("should upgrade all HTTP URLs", () => {
      const urls = {
        SITE_URL: "http://example.com",
        API_URL: "https://api.example.com",
      };

      const { upgraded, issues } = URLValidator.validateAndUpgradeUrls(urls);

      expect(upgraded.SITE_URL).toBe("https://example.com");
      expect(upgraded.API_URL).toBe("https://api.example.com");
    });
  });

  describe("validateDomain", () => {
    it("should validate valid domains", () => {
      const result = URLValidator.validateDomain("example.com");

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should fail validation for localhost", () => {
      const result = URLValidator.validateDomain("localhost");

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("localhost"))).toBe(true);
    });

    it("should fail validation for empty domain", () => {
      const result = URLValidator.validateDomain("");

      expect(result.valid).toBe(false);
    });
  });
});

describe("ProjectNameValidator", () => {
  describe("validate", () => {
    it("should validate correct project names", () => {
      const result = ProjectNameValidator.validate("my-project");

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should fail validation for uppercase letters", () => {
      const result = ProjectNameValidator.validate("My-Project");

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("lowercase"))).toBe(true);
    });

    it("should fail validation for special characters", () => {
      const result = ProjectNameValidator.validate("my_project!");

      expect(result.valid).toBe(false);
    });

    it("should fail validation for too short names", () => {
      const result = ProjectNameValidator.validate("ab");

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("3 characters"))).toBe(true);
    });

    it("should fail validation for too long names", () => {
      const longName = "a".repeat(40);
      const result = ProjectNameValidator.validate(longName);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("32 characters"))).toBe(true);
    });

    it("should fail validation for leading/trailing hyphens", () => {
      expect(ProjectNameValidator.validate("-project").valid).toBe(false);
      expect(ProjectNameValidator.validate("project-").valid).toBe(false);
    });

    it("should fail validation for consecutive hyphens", () => {
      const result = ProjectNameValidator.validate("my--project");

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes("consecutive"))).toBe(true);
    });
  });

  describe("sanitize", () => {
    it("should convert to lowercase", () => {
      const sanitized = ProjectNameValidator.sanitize("My-Project");

      expect(sanitized).toBe("my-project");
    });

    it("should replace spaces with hyphens", () => {
      const sanitized = ProjectNameValidator.sanitize("my project");

      expect(sanitized).toBe("my-project");
    });

    it("should replace underscores with hyphens", () => {
      const sanitized = ProjectNameValidator.sanitize("my_project");

      expect(sanitized).toBe("my-project");
    });

    it("should remove special characters", () => {
      const sanitized = ProjectNameValidator.sanitize("my-project!");

      expect(sanitized).toBe("my-project");
    });

    it("should remove leading/trailing hyphens", () => {
      const sanitized = ProjectNameValidator.sanitize("-my-project-");

      expect(sanitized).toBe("my-project");
    });

    it("should collapse multiple hyphens", () => {
      const sanitized = ProjectNameValidator.sanitize("my---project");

      expect(sanitized).toBe("my-project");
    });

    it("should truncate to 32 characters", () => {
      const longName = "a".repeat(40);
      const sanitized = ProjectNameValidator.sanitize(longName);

      expect(sanitized.length).toBeLessThanOrEqual(32);
    });
  });

  describe("generateSuggestions", () => {
    it("should generate suggestions from natural language", () => {
      const suggestions = ProjectNameValidator.generateSuggestions("My Cool Project");

      expect(suggestions.length).toBeGreaterThan(0);
      expect(suggestions[0]).toBe("my-cool-project");
    });

    it("should return multiple variations", () => {
      const suggestions = ProjectNameValidator.generateSuggestions("My Cool Project Name");

      expect(suggestions.length).toBeGreaterThan(1);
    });
  });

  describe("validateDNSCompliance", () => {
    it("should pass for valid DNS labels", () => {
      const result = ProjectNameValidator.validateDNSCompliance("my-project");

      expect(result.compliant).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("should fail for labels starting with hyphen", () => {
      const result = ProjectNameValidator.validateDNSCompliance("-project");

      expect(result.compliant).toBe(false);
      expect(result.issues.some((i) => i.includes("start"))).toBe(true);
    });

    it("should fail for labels ending with hyphen", () => {
      const result = ProjectNameValidator.validateDNSCompliance("project-");

      expect(result.compliant).toBe(false);
      expect(result.issues.some((i) => i.includes("end"))).toBe(true);
    });
  });
});
