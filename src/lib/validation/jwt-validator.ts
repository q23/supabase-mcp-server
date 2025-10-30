/**
 * JWT Validator
 * Validates JWT token structure and claims for Supabase
 */

import jwt from "jsonwebtoken";
import { jwtPayloadSchema } from "./schemas.js";

/**
 * JWT Validation Result
 */
export interface JWTValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  payload?: JWTPayload;
}

/**
 * JWT Payload (Supabase format)
 */
export interface JWTPayload {
  role: "anon" | "authenticated" | "service_role";
  iss: string;
  iat: number;
  exp: number;
  [key: string]: unknown;
}

/**
 * JWT Validator Class
 */
export class JWTValidator {
  /**
   * Validate a JWT token against a secret
   */
  static validate(token: string, secret: string): JWTValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    try {
      // Decode without verification first to inspect structure
      const decoded = jwt.decode(token, { complete: true });

      if (!decoded) {
        errors.push("Failed to decode JWT token");
        return { valid: false, errors, warnings };
      }

      // Check algorithm
      if (decoded.header.alg !== "HS256") {
        warnings.push(`JWT uses ${decoded.header.alg} algorithm, expected HS256`);
      }

      // Verify signature
      let verified: unknown;
      try {
        verified = jwt.verify(token, secret, { algorithms: ["HS256"] });
      } catch (verifyError) {
        if (verifyError instanceof Error) {
          errors.push(`JWT signature verification failed: ${verifyError.message}`);
        }
        return { valid: false, errors, warnings };
      }

      // Validate payload structure
      const payload = verified as Record<string, unknown>;

      // Check required Supabase claims
      if (!payload['role']) {
        errors.push("Missing 'role' claim (required: anon, authenticated, or service_role)");
      } else if (!["anon", "authenticated", "service_role"].includes(payload['role'] as string)) {
        errors.push(
          `Invalid 'role' claim: ${payload['role']} (expected: anon, authenticated, or service_role)`
        );
      }

      if (!payload['iss']) {
        errors.push("Missing 'iss' (issuer) claim");
      } else if (payload['iss'] !== "supabase") {
        errors.push(`Invalid 'iss' claim: ${payload['iss']} (expected: supabase)`);
      }

      if (!payload['iat']) {
        warnings.push("Missing 'iat' (issued at) claim");
      }

      if (!payload['exp']) {
        warnings.push("Missing 'exp' (expiration) claim");
      } else {
        const exp = payload['exp'] as number;
        const now = Math.floor(Date.now() / 1000);
        if (exp < now) {
          errors.push(`JWT token expired at ${new Date(exp * 1000).toISOString()}`);
        } else {
          const daysUntilExpiry = Math.floor((exp - now) / 86400);
          if (daysUntilExpiry < 30) {
            warnings.push(`JWT expires in ${daysUntilExpiry} days`);
          }
        }
      }

      // Validate with Zod schema
      const schemaResult = jwtPayloadSchema.safeParse(payload);
      if (!schemaResult.success) {
        errors.push(...schemaResult.error.errors.map((e) => e.message));
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        payload: payload as JWTPayload,
      };
    } catch (error) {
      errors.push(`JWT validation error: ${error instanceof Error ? error.message : String(error)}`);
      return { valid: false, errors, warnings };
    }
  }

  /**
   * Decode JWT without verification (for inspection)
   */
  static decode(token: string): JWTPayload | null {
    try {
      const decoded = jwt.decode(token);
      return decoded as JWTPayload | null;
    } catch {
      return null;
    }
  }

  /**
   * Check if two JWT tokens are identical
   */
  static areIdentical(token1: string, token2: string): boolean {
    return token1 === token2;
  }

  /**
   * Detect common Dokploy JWT issues
   */
  static detectDokployIssues(anonKey: string, serviceRoleKey: string, jwtSecret: string): {
    hasIssues: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // Issue 1: Identical keys (Dokploy template bug)
    if (this.areIdentical(anonKey, serviceRoleKey)) {
      issues.push(
        "CRITICAL: ANON_KEY and SERVICE_ROLE_KEY are identical (Dokploy template bug)"
      );
    }

    // Issue 2: Validate ANON_KEY
    const anonValidation = this.validate(anonKey, jwtSecret);
    if (!anonValidation.valid) {
      issues.push(`ANON_KEY validation failed: ${anonValidation.errors.join(", ")}`);
    } else if (anonValidation.payload?.role !== "anon") {
      issues.push(`ANON_KEY has wrong role: ${anonValidation.payload?.role} (expected: anon)`);
    }

    // Issue 3: Validate SERVICE_ROLE_KEY
    const serviceValidation = this.validate(serviceRoleKey, jwtSecret);
    if (!serviceValidation.valid) {
      issues.push(`SERVICE_ROLE_KEY validation failed: ${serviceValidation.errors.join(", ")}`);
    } else if (serviceValidation.payload?.role !== "service_role") {
      issues.push(
        `SERVICE_ROLE_KEY has wrong role: ${serviceValidation.payload?.role} (expected: service_role)`
      );
    }

    return {
      hasIssues: issues.length > 0,
      issues,
    };
  }

  /**
   * Extract expiration date from JWT
   */
  static getExpirationDate(token: string): Date | null {
    const payload = this.decode(token);
    if (!payload || !payload.exp) {
      return null;
    }
    return new Date(payload.exp * 1000);
  }

  /**
   * Check if JWT is expired
   */
  static isExpired(token: string): boolean {
    const expDate = this.getExpirationDate(token);
    if (!expDate) {
      return false; // No expiration = never expires
    }
    return expDate < new Date();
  }
}
