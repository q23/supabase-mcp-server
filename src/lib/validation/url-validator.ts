/**
 * URL Validator
 * Validates URLs and handles HTTP→HTTPS conversion
 */

import { httpUrlSchema, httpsUrlSchema } from "./schemas.js";

/**
 * URL Validation Result
 */
export interface URLValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  url: string;
  protocol: "http" | "https";
  shouldUpgrade: boolean;
}

/**
 * URL Validator Class
 */
export class URLValidator {
  /**
   * Validate a URL
   */
  static validate(url: string, requireHttps = false): URLValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    let protocol: "http" | "https" = "http";
    let shouldUpgrade = false;

    try {
      // Parse URL
      const parsedUrl = new URL(url);
      protocol = parsedUrl.protocol.replace(":", "") as "http" | "https";

      // Check protocol
      if (protocol !== "http" && protocol !== "https") {
        errors.push(`Invalid protocol: ${protocol} (expected http or https)`);
        return { valid: false, errors, warnings, url, protocol, shouldUpgrade: false };
      }

      // Check if HTTPS is required
      if (requireHttps && protocol === "http") {
        errors.push("HTTPS is required for production URLs");
        shouldUpgrade = true;
      }

      // Validate with Zod schema
      const schema = requireHttps ? httpsUrlSchema : httpUrlSchema;
      const result = schema.safeParse(url);

      if (!result.success) {
        errors.push(...result.error.errors.map((e) => e.message));
      }

      // Check for common issues
      if (protocol === "http" && !requireHttps) {
        warnings.push("URL uses HTTP instead of HTTPS (recommended for production)");
        shouldUpgrade = true;
      }

      return {
        valid: errors.length === 0,
        errors,
        warnings,
        url,
        protocol,
        shouldUpgrade,
      };
    } catch (error) {
      errors.push(`Invalid URL format: ${error instanceof Error ? error.message : String(error)}`);
      return { valid: false, errors, warnings, url, protocol, shouldUpgrade: false };
    }
  }

  /**
   * Convert HTTP URL to HTTPS
   */
  static upgradeToHttps(url: string): string {
    if (url.startsWith("http://")) {
      return url.replace("http://", "https://");
    }
    return url;
  }

  /**
   * Bulk validate and upgrade URLs
   */
  static validateAndUpgradeUrls(urls: Record<string, string>, requireHttps = false): {
    upgraded: Record<string, string>;
    issues: Array<{ key: string; url: string; errors: string[]; warnings: string[] }>;
  } {
    const upgraded: Record<string, string> = {};
    const issues: Array<{ key: string; url: string; errors: string[]; warnings: string[] }> = [];

    for (const [key, url] of Object.entries(urls)) {
      const validation = this.validate(url, requireHttps);

      if (!validation.valid) {
        issues.push({
          key,
          url,
          errors: validation.errors,
          warnings: validation.warnings,
        });
      }

      // Upgrade to HTTPS if needed and valid
      if (validation.shouldUpgrade && validation.valid) {
        upgraded[key] = this.upgradeToHttps(url);
      } else {
        upgraded[key] = url;
      }
    }

    return { upgraded, issues };
  }

  /**
   * Identify Supabase public-facing URL variables that should use HTTPS
   */
  static identifyPublicFacingUrls(envVars: Record<string, string>): Record<string, string> {
    const publicFacingKeys = [
      "SITE_URL",
      "API_EXTERNAL_URL",
      "SUPABASE_PUBLIC_URL",
      "ADDITIONAL_REDIRECT_URLS",
      "PUBLIC_REST_URL",
      "PUBLIC_ANON_URL",
      "PUBLIC_SITE_URL",
    ];

    const publicUrls: Record<string, string> = {};

    for (const key of publicFacingKeys) {
      if (envVars[key]) {
        publicUrls[key] = envVars[key];
      }
    }

    return publicUrls;
  }

  /**
   * Detect mixed HTTP/HTTPS configuration (security issue)
   */
  static detectMixedProtocols(urls: Record<string, string>): {
    hasMixedProtocols: boolean;
    httpUrls: string[];
    httpsUrls: string[];
  } {
    const httpUrls: string[] = [];
    const httpsUrls: string[] = [];

    for (const [key, url] of Object.entries(urls)) {
      if (url.startsWith("http://")) {
        httpUrls.push(key);
      } else if (url.startsWith("https://")) {
        httpsUrls.push(key);
      }
    }

    return {
      hasMixedProtocols: httpUrls.length > 0 && httpsUrls.length > 0,
      httpUrls,
      httpsUrls,
    };
  }

  /**
   * Validate domain name (for SSL certificates, DNS)
   */
  static validateDomain(domain: string): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check if domain exists
    if (!domain) {
      return { valid: false, errors: ["Domain is required"] };
    }

    // Remove protocol if present
    const cleanDomain = domain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");

    // Check length
    if (cleanDomain.length === 0) {
      errors.push("Domain cannot be empty");
      return { valid: false, errors };
    }

    if (cleanDomain.length > 253) {
      errors.push("Domain exceeds maximum length of 253 characters");
    }

    // Check format
    const domainRegex = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;
    if (!domainRegex.test(cleanDomain)) {
      errors.push("Invalid domain format");
    }

    // Check for localhost (not valid for production)
    if (cleanDomain === "localhost" || cleanDomain.startsWith("127.0.0.")) {
      errors.push("localhost is not a valid production domain");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
