/**
 * JWT Generator
 * Independent JWT key generation with correct Supabase structure
 *
 * FIXES: Dokploy template generates broken JWT keys:
 * - ANON_KEY === SERVICE_ROLE_KEY (same value!)
 * - Missing 'role' claim
 * - Wrong 'iss' value
 *
 * This generator creates CORRECT keys that work with Supabase auth.
 */

import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { logger } from "../utils/logger.js";
import { JWTValidator } from "../validation/jwt-validator.js";

/**
 * JWT Generation Options
 */
export interface JWTGenerationOptions {
  /** JWT secret (will be generated if not provided) */
  secret?: string;
  /** Expiration time (default: 10 years) */
  expiresIn?: string | number;
  /** Issuer (default: 'supabase') */
  issuer?: string;
}

/**
 * Generated JWT Keys
 */
export interface GeneratedJWTKeys {
  /** JWT secret used for signing */
  jwtSecret: string;
  /** Anonymous (public) key with 'anon' role */
  anonKey: string;
  /** Service role (admin) key with 'service_role' role */
  serviceRoleKey: string;
  /** Generation timestamp */
  generatedAt: Date;
  /** Key validation results */
  validation: {
    anonKeyValid: boolean;
    serviceRoleKeyValid: boolean;
    keysAreDifferent: boolean;
  };
}

/**
 * JWT Generator Class
 */
export class JWTGenerator {
  /**
   * Generate cryptographically secure JWT secret
   */
  static generateSecret(length = 64): string {
    return crypto.randomBytes(length).toString("base64");
  }

  /**
   * Generate ANON_KEY with correct structure
   */
  static generateAnonKey(secret: string, options: JWTGenerationOptions = {}): string {
    const payload = {
      role: "anon",
      iss: options.issuer || "supabase",
      iat: Math.floor(Date.now() / 1000),
      exp: this.calculateExpiration(options.expiresIn),
    };

    const token = jwt.sign(payload, secret, {
      algorithm: "HS256",
    });

    logger.debug("Generated ANON_KEY", {
      role: payload.role,
      iss: payload.iss,
      exp: new Date(payload.exp * 1000).toISOString(),
    });

    return token;
  }

  /**
   * Generate SERVICE_ROLE_KEY with correct structure
   */
  static generateServiceRoleKey(secret: string, options: JWTGenerationOptions = {}): string {
    const payload = {
      role: "service_role",
      iss: options.issuer || "supabase",
      iat: Math.floor(Date.now() / 1000),
      exp: this.calculateExpiration(options.expiresIn),
    };

    const token = jwt.sign(payload, secret, {
      algorithm: "HS256",
    });

    logger.debug("Generated SERVICE_ROLE_KEY", {
      role: payload.role,
      iss: payload.iss,
      exp: new Date(payload.exp * 1000).toISOString(),
    });

    return token;
  }

  /**
   * Generate complete JWT key set (secret + both keys)
   */
  static generateKeySet(options: JWTGenerationOptions = {}): GeneratedJWTKeys {
    logger.info("Generating JWT key set");

    // Generate or use provided secret
    const jwtSecret = options.secret || this.generateSecret();

    // Generate both keys
    const anonKey = this.generateAnonKey(jwtSecret, options);
    const serviceRoleKey = this.generateServiceRoleKey(jwtSecret, options);

    // Validate generated keys
    const anonValidation = JWTValidator.validate(anonKey, jwtSecret);
    const serviceValidation = JWTValidator.validate(serviceRoleKey, jwtSecret);
    const keysAreDifferent = !JWTValidator.areIdentical(anonKey, serviceRoleKey);

    if (!keysAreDifferent) {
      logger.error("CRITICAL: Generated keys are identical! This should never happen.");
      throw new Error("Key generation failed: keys are identical");
    }

    if (!anonValidation.valid) {
      const errorMessage = `ANON_KEY validation failed: ${anonValidation.errors.join(", ")}`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    if (!serviceValidation.valid) {
      const errorMessage = `SERVICE_ROLE_KEY validation failed: ${serviceValidation.errors.join(", ")}`;
      logger.error(errorMessage);
      throw new Error(errorMessage);
    }

    logger.info("JWT key set generated successfully", {
      keysAreDifferent,
      anonKeyValid: anonValidation.valid,
      serviceRoleKeyValid: serviceValidation.valid,
    });

    return {
      jwtSecret,
      anonKey,
      serviceRoleKey,
      generatedAt: new Date(),
      validation: {
        anonKeyValid: anonValidation.valid,
        serviceRoleKeyValid: serviceValidation.valid,
        keysAreDifferent,
      },
    };
  }

  /**
   * Regenerate keys for existing JWT secret
   */
  static regenerateKeys(existingSecret: string, options: JWTGenerationOptions = {}): GeneratedJWTKeys {
    logger.info("Regenerating JWT keys with existing secret");

    return this.generateKeySet({
      ...options,
      secret: existingSecret,
    });
  }

  /**
   * Calculate expiration timestamp
   */
  private static calculateExpiration(expiresIn?: string | number): number {
    if (!expiresIn) {
      // Default: 10 years
      return Math.floor(Date.now() / 1000) + 10 * 365 * 24 * 60 * 60;
    }

    if (typeof expiresIn === "number") {
      // Seconds
      return Math.floor(Date.now() / 1000) + expiresIn;
    }

    // Parse string format (e.g., '10y', '365d', '24h')
    const match = expiresIn.match(/^(\d+)([ydhms])$/);
    if (!match) {
      throw new Error(`Invalid expiresIn format: ${expiresIn}`);
    }

    const valueStr = match[1];
    const unit = match[2];

    if (!valueStr || !unit) {
      throw new Error(`Invalid expiresIn format: ${expiresIn}`);
    }

    const value = parseInt(valueStr, 10);

    const multipliers: Record<string, number> = {
      y: 365 * 24 * 60 * 60,
      d: 24 * 60 * 60,
      h: 60 * 60,
      m: 60,
      s: 1,
    };

    const multiplier = multipliers[unit];
    if (multiplier === undefined) {
      throw new Error(`Invalid time unit: ${unit}`);
    }

    const seconds = value * multiplier;
    return Math.floor(Date.now() / 1000) + seconds;
  }

  /**
   * Validate auth endpoint with generated keys
   */
  static async validateAuthEndpoint(
    supabaseUrl: string,
    anonKey: string,
    serviceRoleKey: string
  ): Promise<{
    success: boolean;
    errors: string[];
    anonKeyWorks: boolean;
    serviceRoleKeyWorks: boolean;
  }> {
    const errors: string[] = [];
    let anonKeyWorks = false;
    let serviceRoleKeyWorks = false;

    // Test ANON_KEY
    try {
      const anonResponse = await fetch(`${supabaseUrl}/auth/v1/health`, {
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
        },
      });

      anonKeyWorks = anonResponse.ok;
      if (!anonKeyWorks) {
        errors.push(`ANON_KEY test failed: HTTP ${anonResponse.status}`);
      }
    } catch (error) {
      errors.push(`ANON_KEY test error: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Test SERVICE_ROLE_KEY
    try {
      const serviceResponse = await fetch(`${supabaseUrl}/auth/v1/health`, {
        headers: {
          apikey: serviceRoleKey,
          Authorization: `Bearer ${serviceRoleKey}`,
        },
      });

      serviceRoleKeyWorks = serviceResponse.ok;
      if (!serviceRoleKeyWorks) {
        errors.push(`SERVICE_ROLE_KEY test failed: HTTP ${serviceResponse.status}`);
      }
    } catch (error) {
      errors.push(
        `SERVICE_ROLE_KEY test error: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    const success = anonKeyWorks && serviceRoleKeyWorks;

    if (success) {
      logger.info("Auth endpoint validation successful", {
        anonKeyWorks,
        serviceRoleKeyWorks,
      });
    } else {
      logger.warn("Auth endpoint validation failed", {
        anonKeyWorks,
        serviceRoleKeyWorks,
        errors,
      });
    }

    return {
      success,
      errors,
      anonKeyWorks,
      serviceRoleKeyWorks,
    };
  }

  /**
   * Compare generated keys with Dokploy template keys
   */
  static compareWithDokployKeys(
    _generatedKeys: GeneratedJWTKeys,
    dokployKeys: { anonKey: string; serviceRoleKey: string; jwtSecret: string }
  ): {
    identical: boolean;
    issues: string[];
    improvements: string[];
  } {
    const issues: string[] = [];
    const improvements: string[] = [];

    // Check if Dokploy keys are identical (the bug!)
    if (JWTValidator.areIdentical(dokployKeys.anonKey, dokployKeys.serviceRoleKey)) {
      issues.push("Dokploy keys are identical (CRITICAL BUG)");
      improvements.push("Generated keys are different (FIXED)");
    }

    // Validate Dokploy keys
    const dokployAnonValidation = JWTValidator.validate(dokployKeys.anonKey, dokployKeys.jwtSecret);
    const dokployServiceValidation = JWTValidator.validate(
      dokployKeys.serviceRoleKey,
      dokployKeys.jwtSecret
    );

    if (!dokployAnonValidation.valid) {
      issues.push(`Dokploy ANON_KEY invalid: ${dokployAnonValidation.errors.join(", ")}`);
      improvements.push("Generated ANON_KEY is valid");
    }

    if (!dokployServiceValidation.valid) {
      issues.push(
        `Dokploy SERVICE_ROLE_KEY invalid: ${dokployServiceValidation.errors.join(", ")}`
      );
      improvements.push("Generated SERVICE_ROLE_KEY is valid");
    }

    return {
      identical: issues.length === 0,
      issues,
      improvements,
    };
  }

  /**
   * Generate keys with validation loop (ensure quality)
   */
  static generateValidatedKeySet(
    options: JWTGenerationOptions = {},
    maxAttempts = 3
  ): GeneratedJWTKeys {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const keys = this.generateKeySet(options);

        // Extra validation: ensure keys work
        if (
          keys.validation.anonKeyValid &&
          keys.validation.serviceRoleKeyValid &&
          keys.validation.keysAreDifferent
        ) {
          return keys;
        }

        logger.warn(`Key generation attempt ${attempt} produced invalid keys, retrying...`);
      } catch (error) {
        logger.error(`Key generation attempt ${attempt} failed`, error as Error);

        if (attempt === maxAttempts) {
          throw error;
        }
      }
    }

    throw new Error(`Failed to generate valid keys after ${maxAttempts} attempts`);
  }
}
