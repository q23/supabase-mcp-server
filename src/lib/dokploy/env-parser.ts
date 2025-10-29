/**
 * Environment Parser
 * Parses .env files, validates, and fixes HTTP→HTTPS issues
 */

import { URLValidator } from "../validation/url-validator.js";
import { logger } from "../utils/logger.js";

/**
 * Environment Variable Entry
 */
export interface EnvVariable {
  key: string;
  value: string;
  isSecret: boolean;
  needsHttpsUpgrade: boolean;
}

/**
 * Parsed Environment
 */
export interface ParsedEnvironment {
  variables: EnvVariable[];
  publicFacingUrls: string[];
  httpUrls: string[];
  httpsUrls: string[];
  hasHttpIssues: boolean;
}

/**
 * Environment Diff
 */
export interface EnvironmentDiff {
  added: EnvVariable[];
  modified: Array<{
    key: string;
    oldValue: string;
    newValue: string;
    reason: string;
  }>;
  removed: string[];
  unchanged: string[];
}

/**
 * Environment Parser Class
 */
export class EnvParser {
  /**
   * Parse .env file content
   */
  static parse(envContent: string): Record<string, string> {
    const variables: Record<string, string> = {};
    const lines = envContent.split("\n");

    for (const line of lines) {
      // Skip comments and empty lines
      if (line.trim().startsWith("#") || line.trim() === "") {
        continue;
      }

      // Parse KEY=VALUE format
      const match = line.match(/^([A-Z_][A-Z0-9_]*)\s*=\s*(.*)$/);
      if (match) {
        const [, key, value] = match;
        // Remove quotes if present
        const cleanValue = value.replace(/^["']|["']$/g, "").trim();
        variables[key] = cleanValue;
      }
    }

    logger.debug("Parsed environment variables", {
      count: Object.keys(variables).length,
    });

    return variables;
  }

  /**
   * Convert environment object to .env format
   */
  static stringify(variables: Record<string, string>): string {
    const lines: string[] = [];

    for (const [key, value] of Object.entries(variables)) {
      // Quote value if it contains spaces or special characters
      const needsQuotes = /[\s#]/.test(value);
      const formattedValue = needsQuotes ? `"${value}"` : value;
      lines.push(`${key}=${formattedValue}`);
    }

    return lines.join("\n");
  }

  /**
   * Analyze environment variables
   */
  static analyze(variables: Record<string, string>): ParsedEnvironment {
    const envVariables: EnvVariable[] = [];
    const publicFacingUrls: string[] = [];
    const httpUrls: string[] = [];
    const httpsUrls: string[] = [];

    // Secret patterns
    const secretPatterns = [
      /password/i,
      /secret/i,
      /key/i,
      /token/i,
      /jwt/i,
      /api[_-]?key/i,
      /service[_-]?role/i,
    ];

    // Public-facing URL keys (need HTTPS)
    const publicUrlKeys = [
      "SITE_URL",
      "API_EXTERNAL_URL",
      "SUPABASE_PUBLIC_URL",
      "ADDITIONAL_REDIRECT_URLS",
      "PUBLIC_REST_URL",
      "PUBLIC_ANON_URL",
      "PUBLIC_SITE_URL",
    ];

    for (const [key, value] of Object.entries(variables)) {
      const isSecret = secretPatterns.some((pattern) => pattern.test(key));
      const isPublicUrl = publicUrlKeys.includes(key);
      const isUrl = value.startsWith("http://") || value.startsWith("https://");

      let needsHttpsUpgrade = false;

      if (isUrl) {
        if (value.startsWith("http://")) {
          httpUrls.push(key);
          if (isPublicUrl) {
            needsHttpsUpgrade = true;
          }
        } else {
          httpsUrls.push(key);
        }

        if (isPublicUrl) {
          publicFacingUrls.push(key);
        }
      }

      envVariables.push({
        key,
        value,
        isSecret,
        needsHttpsUpgrade,
      });
    }

    const hasHttpIssues = httpUrls.length > 0 && publicFacingUrls.some((key) => httpUrls.includes(key));

    return {
      variables: envVariables,
      publicFacingUrls,
      httpUrls,
      httpsUrls,
      hasHttpIssues,
    };
  }

  /**
   * Upgrade HTTP URLs to HTTPS
   */
  static upgradeToHttps(variables: Record<string, string>): {
    upgraded: Record<string, string>;
    changes: Array<{ key: string; old: string; new: string }>;
  } {
    const upgraded: Record<string, string> = { ...variables };
    const changes: Array<{ key: string; old: string; new: string }> = [];

    const analysis = this.analyze(variables);

    for (const key of analysis.publicFacingUrls) {
      const value = variables[key];
      if (value && value.startsWith("http://")) {
        const newValue = URLValidator.upgradeToHttps(value);
        upgraded[key] = newValue;
        changes.push({ key, old: value, new: newValue });

        logger.info(`Upgraded ${key} to HTTPS`, {
          old: value,
          new: newValue,
        });
      }
    }

    return { upgraded, changes };
  }

  /**
   * Validate environment variables
   */
  static validate(variables: Record<string, string>): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required Supabase variables
    const requiredVars = [
      "POSTGRES_PASSWORD",
      "JWT_SECRET",
      "ANON_KEY",
      "SERVICE_ROLE_KEY",
      "SITE_URL",
      "API_EXTERNAL_URL",
    ];

    for (const required of requiredVars) {
      if (!variables[required]) {
        errors.push(`Missing required variable: ${required}`);
      }
    }

    // Check for HTTP URLs in production-facing variables
    const analysis = this.analyze(variables);
    if (analysis.hasHttpIssues) {
      warnings.push(
        `Found HTTP URLs in public-facing variables: ${analysis.httpUrls.filter((key) => analysis.publicFacingUrls.includes(key)).join(", ")}`
      );
      warnings.push("Consider upgrading to HTTPS for production security");
    }

    // Check JWT secret length
    if (variables.JWT_SECRET && variables.JWT_SECRET.length < 32) {
      warnings.push("JWT_SECRET should be at least 32 characters for security");
    }

    // Check ANON_KEY and SERVICE_ROLE_KEY are different
    if (variables.ANON_KEY && variables.SERVICE_ROLE_KEY) {
      if (variables.ANON_KEY === variables.SERVICE_ROLE_KEY) {
        errors.push("ANON_KEY and SERVICE_ROLE_KEY must be different (Dokploy template bug)");
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Generate diff between two environments
   */
  static diff(
    oldEnv: Record<string, string>,
    newEnv: Record<string, string>
  ): EnvironmentDiff {
    const added: EnvVariable[] = [];
    const modified: Array<{
      key: string;
      oldValue: string;
      newValue: string;
      reason: string;
    }> = [];
    const removed: string[] = [];
    const unchanged: string[] = [];

    const allKeys = new Set([...Object.keys(oldEnv), ...Object.keys(newEnv)]);

    for (const key of allKeys) {
      const oldValue = oldEnv[key];
      const newValue = newEnv[key];

      if (!oldValue && newValue) {
        // Added
        added.push({
          key,
          value: newValue,
          isSecret: this.isSecretKey(key),
          needsHttpsUpgrade: false,
        });
      } else if (oldValue && !newValue) {
        // Removed
        removed.push(key);
      } else if (oldValue !== newValue) {
        // Modified
        let reason = "Value changed";

        // Determine reason for change
        if (oldValue.startsWith("http://") && newValue.startsWith("https://")) {
          reason = "Upgraded HTTP to HTTPS";
        } else if (this.isSecretKey(key)) {
          reason = "Secret regenerated";
        }

        modified.push({
          key,
          oldValue,
          newValue,
          reason,
        });
      } else {
        // Unchanged
        unchanged.push(key);
      }
    }

    logger.debug("Environment diff generated", {
      added: added.length,
      modified: modified.length,
      removed: removed.length,
      unchanged: unchanged.length,
    });

    return {
      added,
      modified,
      removed,
      unchanged,
    };
  }

  /**
   * Check if key is a secret
   */
  private static isSecretKey(key: string): boolean {
    const secretPatterns = [
      /password/i,
      /secret/i,
      /key/i,
      /token/i,
      /jwt/i,
      /api[_-]?key/i,
      /service[_-]?role/i,
    ];

    return secretPatterns.some((pattern) => pattern.test(key));
  }

  /**
   * Merge environments (newEnv overrides oldEnv)
   */
  static merge(
    oldEnv: Record<string, string>,
    newEnv: Record<string, string>
  ): Record<string, string> {
    return {
      ...oldEnv,
      ...newEnv,
    };
  }

  /**
   * Filter environment variables by pattern
   */
  static filter(
    variables: Record<string, string>,
    pattern: RegExp
  ): Record<string, string> {
    const filtered: Record<string, string> = {};

    for (const [key, value] of Object.entries(variables)) {
      if (pattern.test(key)) {
        filtered[key] = value;
      }
    }

    return filtered;
  }

  /**
   * Get Supabase-specific variables
   */
  static getSupabaseVariables(variables: Record<string, string>): Record<string, string> {
    const supabaseKeys = [
      "POSTGRES_PASSWORD",
      "JWT_SECRET",
      "ANON_KEY",
      "SERVICE_ROLE_KEY",
      "SITE_URL",
      "API_EXTERNAL_URL",
      "SUPABASE_PUBLIC_URL",
      "POSTGRES_HOST",
      "POSTGRES_PORT",
      "POSTGRES_DB",
      "POSTGRES_USER",
      "SMTP_HOST",
      "SMTP_PORT",
      "SMTP_USER",
      "SMTP_PASS",
      "SMTP_FROM",
    ];

    const supabaseVars: Record<string, string> = {};

    for (const key of supabaseKeys) {
      if (variables[key]) {
        supabaseVars[key] = variables[key];
      }
    }

    return supabaseVars;
  }
}
