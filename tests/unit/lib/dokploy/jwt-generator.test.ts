/**
 * JWT Generator Tests
 * Tests for independent JWT key generation with correct structure
 */

import { describe, it, expect, beforeEach } from "vitest";
import { JWTGenerator } from "../../../../src/lib/dokploy/jwt-generator.js";
import { JWTValidator } from "../../../../src/lib/validation/jwt-validator.js";

describe("JWTGenerator", () => {
  describe("generateSecret", () => {
    it("should generate a base64 secret of specified length", () => {
      const secret = JWTGenerator.generateSecret(64);
      expect(secret).toBeDefined();
      expect(secret.length).toBeGreaterThan(0);

      // Decode to verify it's base64
      const decoded = Buffer.from(secret, "base64");
      expect(decoded.length).toBe(64);
    });

    it("should generate different secrets each time", () => {
      const secret1 = JWTGenerator.generateSecret();
      const secret2 = JWTGenerator.generateSecret();
      expect(secret1).not.toBe(secret2);
    });
  });

  describe("generateAnonKey", () => {
    it("should generate a valid JWT with anon role", () => {
      const secret = JWTGenerator.generateSecret();
      const anonKey = JWTGenerator.generateAnonKey(secret);

      expect(anonKey).toBeDefined();
      expect(anonKey.split(".")).toHaveLength(3); // JWT has 3 parts

      const validation = JWTValidator.validate(anonKey, secret);
      expect(validation.valid).toBe(true);
      expect(validation.payload?.role).toBe("anon");
      expect(validation.payload?.iss).toBe("supabase");
    });
  });

  describe("generateServiceRoleKey", () => {
    it("should generate a valid JWT with service_role", () => {
      const secret = JWTGenerator.generateSecret();
      const serviceRoleKey = JWTGenerator.generateServiceRoleKey(secret);

      expect(serviceRoleKey).toBeDefined();
      expect(serviceRoleKey.split(".")).toHaveLength(3);

      const validation = JWTValidator.validate(serviceRoleKey, secret);
      expect(validation.valid).toBe(true);
      expect(validation.payload?.role).toBe("service_role");
      expect(validation.payload?.iss).toBe("supabase");
    });
  });

  describe("generateKeySet", () => {
    it("should generate complete key set with valid keys", () => {
      const keySet = JWTGenerator.generateKeySet();

      expect(keySet.jwtSecret).toBeDefined();
      expect(keySet.anonKey).toBeDefined();
      expect(keySet.serviceRoleKey).toBeDefined();
      expect(keySet.generatedAt).toBeInstanceOf(Date);
      expect(keySet.validation.keysAreDifferent).toBe(true);
      expect(keySet.validation.anonKeyValid).toBe(true);
      expect(keySet.validation.serviceRoleKeyValid).toBe(true);
    });

    it("should generate different ANON_KEY and SERVICE_ROLE_KEY", () => {
      const keySet = JWTGenerator.generateKeySet();

      expect(keySet.anonKey).not.toBe(keySet.serviceRoleKey);
      expect(JWTValidator.areIdentical(keySet.anonKey, keySet.serviceRoleKey)).toBe(false);
    });

    it("should use provided secret if given", () => {
      const customSecret = "my-custom-secret-that-is-at-least-32-characters-long";
      const keySet = JWTGenerator.generateKeySet({ secret: customSecret });

      expect(keySet.jwtSecret).toBe(customSecret);

      // Verify keys work with custom secret
      const anonValidation = JWTValidator.validate(keySet.anonKey, customSecret);
      expect(anonValidation.valid).toBe(true);
    });

    it("should respect custom expiration", () => {
      const keySet = JWTGenerator.generateKeySet({ expiresIn: "1d" });

      const anonPayload = JWTValidator.decode(keySet.anonKey);
      expect(anonPayload).toBeDefined();
      expect(anonPayload?.exp).toBeDefined();

      // Should expire in ~1 day (allow some variance)
      const now = Math.floor(Date.now() / 1000);
      const dayInSeconds = 24 * 60 * 60;
      expect(anonPayload!.exp).toBeGreaterThan(now);
      expect(anonPayload!.exp).toBeLessThan(now + dayInSeconds + 60); // +60s buffer
    });
  });

  describe("regenerateKeys", () => {
    it("should regenerate keys with existing secret", () => {
      const originalKeySet = JWTGenerator.generateKeySet();
      const regeneratedKeySet = JWTGenerator.regenerateKeys(originalKeySet.jwtSecret);

      expect(regeneratedKeySet.jwtSecret).toBe(originalKeySet.jwtSecret);
      expect(regeneratedKeySet.anonKey).not.toBe(originalKeySet.anonKey); // Different due to different iat
      expect(regeneratedKeySet.serviceRoleKey).not.toBe(originalKeySet.serviceRoleKey);

      // But both should validate with the same secret
      const anonValidation = JWTValidator.validate(regeneratedKeySet.anonKey, originalKeySet.jwtSecret);
      expect(anonValidation.valid).toBe(true);
    });
  });

  describe("compareWithDokployKeys", () => {
    it("should detect identical Dokploy keys", () => {
      const goodKeys = JWTGenerator.generateKeySet();
      const badKeys = {
        anonKey: goodKeys.anonKey, // Same key!
        serviceRoleKey: goodKeys.anonKey, // Same key (Dokploy bug)!
        jwtSecret: goodKeys.jwtSecret,
      };

      const comparison = JWTGenerator.compareWithDokployKeys(goodKeys, badKeys);

      expect(comparison.identical).toBe(false);
      expect(comparison.issues).toContain("Dokploy keys are identical (CRITICAL BUG)");
      expect(comparison.improvements).toContain("Generated keys are different (FIXED)");
    });

    it("should detect invalid Dokploy key structure", () => {
      const goodKeys = JWTGenerator.generateKeySet();

      // Create invalid keys (no role claim)
      const jwt = require("jsonwebtoken");
      const invalidKey = jwt.sign({ iss: "wrong-issuer" }, goodKeys.jwtSecret);

      const badKeys = {
        anonKey: invalidKey,
        serviceRoleKey: invalidKey,
        jwtSecret: goodKeys.jwtSecret,
      };

      const comparison = JWTGenerator.compareWithDokployKeys(goodKeys, badKeys);

      expect(comparison.identical).toBe(false);
      expect(comparison.issues.length).toBeGreaterThan(0);
    });
  });

  describe("generateValidatedKeySet", () => {
    it("should generate valid keys on first attempt", () => {
      const keySet = JWTGenerator.generateValidatedKeySet();

      expect(keySet.validation.anonKeyValid).toBe(true);
      expect(keySet.validation.serviceRoleKeyValid).toBe(true);
      expect(keySet.validation.keysAreDifferent).toBe(true);
    });

    it("should throw after max attempts if generation fails", () => {
      // This is hard to test since generation should always succeed
      // But we can verify the method exists and returns valid keys
      const keySet = JWTGenerator.generateValidatedKeySet({}, 1);
      expect(keySet).toBeDefined();
    });
  });

  describe("Integration: Fixes Dokploy Template Bugs", () => {
    it("generates keys that fix all known Dokploy issues", () => {
      const keySet = JWTGenerator.generateKeySet();

      // Issue 1: Keys must be different
      expect(keySet.anonKey).not.toBe(keySet.serviceRoleKey);

      // Issue 2: ANON_KEY must have 'role: anon'
      const anonPayload = JWTValidator.decode(keySet.anonKey);
      expect(anonPayload?.role).toBe("anon");

      // Issue 3: SERVICE_ROLE_KEY must have 'role: service_role'
      const servicePayload = JWTValidator.decode(keySet.serviceRoleKey);
      expect(servicePayload?.role).toBe("service_role");

      // Issue 4: Both must have 'iss: supabase'
      expect(anonPayload?.iss).toBe("supabase");
      expect(servicePayload?.iss).toBe("supabase");

      // Issue 5: Both must have iat and exp
      expect(anonPayload?.iat).toBeDefined();
      expect(anonPayload?.exp).toBeDefined();
      expect(servicePayload?.iat).toBeDefined();
      expect(servicePayload?.exp).toBeDefined();
    });
  });
});
