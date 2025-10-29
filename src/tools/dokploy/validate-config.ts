/**
 * Dokploy Config Validator
 * Detects and reports broken configurations in existing Dokploy deployments
 *
 * DETECTS:
 * - Identical ANON_KEY and SERVICE_ROLE_KEY (Dokploy template bug)
 * - Missing 'role' claim in JWT tokens
 * - Wrong 'iss' value in JWT tokens
 * - HTTP URLs instead of HTTPS
 * - Missing required variables
 * - Invalid project names
 */

import type { DokployAPIClient } from "../../lib/dokploy/api-client.js";
import { JWTValidator } from "../../lib/validation/jwt-validator.js";
import { EnvParser } from "../../lib/dokploy/env-parser.js";
import { ProjectNameValidator } from "../../lib/validation/project-name-validator.js";
import { URLValidator } from "../../lib/validation/url-validator.js";
import { JWTGenerator } from "../../lib/dokploy/jwt-generator.js";
import { logger } from "../../lib/utils/logger.js";
import type { ValidationResult } from "../../types/supabase.js";
import type { ToolResponse } from "../../types/mcp.js";

/**
 * Config Validation Input
 */
export interface ValidateConfigInput {
  /** Application ID to validate */
  applicationId: string;
  /** Dokploy API client */
  dokployClient: DokployAPIClient;
  /** Offer to fix issues automatically */
  offerFix?: boolean;
}

/**
 * Config Validation Result
 */
export interface ConfigValidationResult extends ValidationResult {
  /** Application ID */
  applicationId: string;
  /** Application name */
  applicationName: string;
  /** Detected issues by category */
  issues: {
    jwtKeys: string[];
    urls: string[];
    projectName: string[];
    missingVars: string[];
    smtp: string[];
  };
  /** Suggested fixes */
  fixes: Array<{
    issue: string;
    fix: string;
    command?: string;
  }>;
  /** Can be fixed automatically */
  autoFixable: boolean;
}

/**
 * Config Validator Class
 */
export class ConfigValidator {
  private dokployClient: DokployAPIClient;

  constructor(dokployClient: DokployAPIClient) {
    this.dokployClient = dokployClient;
  }

  /**
   * Validate Dokploy Supabase configuration
   */
  async validate(applicationId: string): Promise<ConfigValidationResult> {
    logger.info("Validating Dokploy configuration", { applicationId });

    // Get application details
    const application = await this.dokployClient.getApplication(applicationId);

    const result: ConfigValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      validatedAt: new Date().toISOString(),
      context: "Dokploy Supabase Configuration",
      applicationId,
      applicationName: application.name,
      issues: {
        jwtKeys: [],
        urls: [],
        projectName: [],
        missingVars: [],
        smtp: [],
      },
      fixes: [],
      autoFixable: false,
    };

    // Parse environment variables
    const env = application.env;

    // Check 1: JWT Keys
    this.checkJWTKeys(env, result);

    // Check 2: HTTP vs HTTPS
    this.checkURLProtocols(env, result);

    // Check 3: Project name
    this.checkProjectName(application.name, result);

    // Check 4: Required variables
    this.checkRequiredVariables(env, result);

    // Check 5: SMTP configuration
    this.checkSMTPConfiguration(env, result);

    // Determine if valid
    result.valid = result.errors.length === 0;

    // Determine if auto-fixable
    result.autoFixable = this.isAutoFixable(result);

    logger.info("Configuration validation completed", {
      valid: result.valid,
      errorCount: result.errors.length,
      warningCount: result.warnings.length,
      autoFixable: result.autoFixable,
    });

    return result;
  }

  /**
   * Check JWT keys for common issues
   */
  private checkJWTKeys(env: Record<string, string>, result: ConfigValidationResult): void {
    const anonKey = env.ANON_KEY;
    const serviceRoleKey = env.SERVICE_ROLE_KEY;
    const jwtSecret = env.JWT_SECRET;

    if (!anonKey || !serviceRoleKey || !jwtSecret) {
      result.errors.push({
        code: "MISSING_JWT_KEYS",
        message: "Missing JWT keys (ANON_KEY, SERVICE_ROLE_KEY, or JWT_SECRET)",
        severity: "critical",
        suggestion: "Generate new JWT keys using the setup wizard",
      });
      result.issues.jwtKeys.push("Missing JWT keys");
      return;
    }

    // Check 1: Identical keys (Dokploy template bug)
    if (JWTValidator.areIdentical(anonKey, serviceRoleKey)) {
      result.errors.push({
        code: "IDENTICAL_JWT_KEYS",
        message: "ANON_KEY and SERVICE_ROLE_KEY are identical (Dokploy template bug)",
        severity: "critical",
        suggestion: "Regenerate JWT keys with correct structure",
      });
      result.issues.jwtKeys.push("Keys are identical");
      result.fixes.push({
        issue: "Identical JWT keys",
        fix: "Generate new keys with different role claims",
        command: "dokploy_regenerate_keys",
      });
    }

    // Check 2: Validate key structure
    const dokployIssues = JWTValidator.detectDokployIssues(anonKey, serviceRoleKey, jwtSecret);

    if (dokployIssues.hasIssues) {
      for (const issue of dokployIssues.issues) {
        result.errors.push({
          code: "INVALID_JWT_STRUCTURE",
          message: issue,
          severity: "high",
          suggestion: "Regenerate JWT keys with correct claims",
        });
        result.issues.jwtKeys.push(issue);
      }

      result.fixes.push({
        issue: "Invalid JWT structure",
        fix: "Generate keys with correct 'role' and 'iss' claims",
        command: "dokploy_regenerate_keys",
      });
    }
  }

  /**
   * Check URL protocols (HTTP vs HTTPS)
   */
  private checkURLProtocols(env: Record<string, string>, result: ConfigValidationResult): void {
    const analysis = EnvParser.analyze(env);

    if (analysis.hasHttpIssues) {
      const httpPublicUrls = analysis.httpUrls.filter((key) =>
        analysis.publicFacingUrls.includes(key)
      );

      for (const key of httpPublicUrls) {
        result.warnings.push({
          code: "HTTP_URL",
          message: `${key} uses HTTP instead of HTTPS`,
          field: key,
          recommendation: "Upgrade to HTTPS for production security",
        });
        result.issues.urls.push(key);
      }

      result.fixes.push({
        issue: "HTTP URLs in public-facing variables",
        fix: `Convert ${httpPublicUrls.join(", ")} to HTTPS`,
        command: "dokploy_upgrade_urls",
      });
    }
  }

  /**
   * Check project name format
   */
  private checkProjectName(projectName: string, result: ConfigValidationResult): void {
    const validation = ProjectNameValidator.validate(projectName);

    if (!validation.valid) {
      result.warnings.push({
        code: "INVALID_PROJECT_NAME",
        message: `Project name format issues: ${validation.errors.join(", ")}`,
        recommendation: `Suggested names: ${validation.suggestions.join(", ")}`,
      });
      result.issues.projectName.push(...validation.errors);
    }
  }

  /**
   * Check required variables
   */
  private checkRequiredVariables(env: Record<string, string>, result: ConfigValidationResult): void {
    const requiredVars = [
      "POSTGRES_PASSWORD",
      "JWT_SECRET",
      "ANON_KEY",
      "SERVICE_ROLE_KEY",
      "SITE_URL",
      "API_EXTERNAL_URL",
      "POSTGRES_HOST",
      "POSTGRES_PORT",
      "POSTGRES_DB",
    ];

    const missing = requiredVars.filter((key) => !env[key]);

    if (missing.length > 0) {
      result.errors.push({
        code: "MISSING_REQUIRED_VARS",
        message: `Missing required variables: ${missing.join(", ")}`,
        severity: "high",
        suggestion: "Add missing environment variables",
      });
      result.issues.missingVars.push(...missing);
    }
  }

  /**
   * Check SMTP configuration
   */
  private checkSMTPConfiguration(env: Record<string, string>, result: ConfigValidationResult): void {
    const smtpHost = env.SMTP_HOST;

    if (!smtpHost) {
      result.warnings.push({
        code: "MISSING_SMTP",
        message: "SMTP not configured (email features will not work)",
        recommendation: "Configure SMTP for email functionality",
      });
      return;
    }

    // Check for fake test SMTP servers
    const fakeSmtpPatterns = [
      /example\.com/i,
      /test\.com/i,
      /localhost/i,
      /127\.0\.0\.1/,
      /fake/i,
      /dummy/i,
    ];

    if (fakeSmtpPatterns.some((pattern) => pattern.test(smtpHost))) {
      result.warnings.push({
        code: "FAKE_SMTP",
        message: `SMTP host appears to be a test server: ${smtpHost}`,
        recommendation: "Use a real SMTP server for production",
      });
      result.issues.smtp.push("Test SMTP server detected");
    }
  }

  /**
   * Determine if issues can be fixed automatically
   */
  private isAutoFixable(result: ConfigValidationResult): boolean {
    // Can auto-fix JWT issues and URL issues
    const hasFixableIssues =
      result.issues.jwtKeys.length > 0 || result.issues.urls.length > 0;

    // Cannot auto-fix missing variables or project name issues
    const hasUnfixableIssues =
      result.issues.missingVars.length > 0 || result.issues.projectName.length > 0;

    return hasFixableIssues && !hasUnfixableIssues;
  }

  /**
   * Generate fix for broken configuration
   */
  async generateFix(applicationId: string): Promise<{
    newJwtKeys?: {
      jwtSecret: string;
      anonKey: string;
      serviceRoleKey: string;
    };
    urlUpgrades?: Record<string, string>;
    envUpdates: Array<{ name: string; value: string; secret?: boolean }>;
  }> {
    logger.info("Generating fix for broken configuration", { applicationId });

    const application = await this.dokployClient.getApplication(applicationId);
    const env = application.env;

    const fix: {
      newJwtKeys?: {
        jwtSecret: string;
        anonKey: string;
        serviceRoleKey: string;
      };
      urlUpgrades?: Record<string, string>;
      envUpdates: Array<{ name: string; value: string; secret?: boolean }>;
    } = {
      envUpdates: [],
    };

    // Fix JWT keys if needed
    const jwtSecret = env.JWT_SECRET;
    if (jwtSecret) {
      const dokployIssues = JWTValidator.detectDokployIssues(
        env.ANON_KEY || "",
        env.SERVICE_ROLE_KEY || "",
        jwtSecret
      );

      if (dokployIssues.hasIssues) {
        // Regenerate keys with existing secret
        const newKeys = JWTGenerator.regenerateKeys(jwtSecret);

        fix.newJwtKeys = {
          jwtSecret: newKeys.jwtSecret,
          anonKey: newKeys.anonKey,
          serviceRoleKey: newKeys.serviceRoleKey,
        };

        fix.envUpdates.push(
          { name: "ANON_KEY", value: newKeys.anonKey, secret: true },
          { name: "SERVICE_ROLE_KEY", value: newKeys.serviceRoleKey, secret: true }
        );
      }
    }

    // Fix HTTP URLs
    const { upgraded, changes } = EnvParser.upgradeToHttps(env);

    if (changes.length > 0) {
      fix.urlUpgrades = {};
      for (const change of changes) {
        fix.urlUpgrades[change.key] = change.new;
        fix.envUpdates.push({ name: change.key, value: change.new });
      }
    }

    return fix;
  }
}

/**
 * MCP Tool Handler: dokploy_validate_config
 */
export async function dokployValidateConfig(
  input: ValidateConfigInput
): Promise<ToolResponse<ConfigValidationResult>> {
  try {
    const validator = new ConfigValidator(input.dokployClient);
    const result = await validator.validate(input.applicationId);

    return {
      content: [
        {
          type: "text",
          text: formatValidationResult(result, input.offerFix),
        },
      ],
      _meta: result,
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Configuration validation failed: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Format validation result for display
 */
function formatValidationResult(result: ConfigValidationResult, offerFix?: boolean): string {
  const lines: string[] = [];

  // Header
  if (result.valid) {
    lines.push("✅ Configuration is valid!\n");
  } else {
    lines.push("❌ Configuration has issues\n");
  }

  lines.push(`Application: ${result.applicationName} (${result.applicationId})`);
  lines.push(`Validated: ${result.validatedAt}\n`);

  // Errors
  if (result.errors.length > 0) {
    lines.push("\n🔴 ERRORS:");
    for (const error of result.errors) {
      lines.push(`   [${error.code}] ${error.message}`);
      if (error.suggestion) {
        lines.push(`   💡 ${error.suggestion}`);
      }
    }
  }

  // Warnings
  if (result.warnings.length > 0) {
    lines.push("\n⚠️  WARNINGS:");
    for (const warning of result.warnings) {
      lines.push(`   [${warning.code}] ${warning.message}`);
      if (warning.recommendation) {
        lines.push(`   💡 ${warning.recommendation}`);
      }
    }
  }

  // Issues by category
  if (Object.values(result.issues).some((arr) => arr.length > 0)) {
    lines.push("\n📋 Issues by Category:");

    if (result.issues.jwtKeys.length > 0) {
      lines.push(`   JWT Keys: ${result.issues.jwtKeys.join(", ")}`);
    }
    if (result.issues.urls.length > 0) {
      lines.push(`   URLs: ${result.issues.urls.join(", ")}`);
    }
    if (result.issues.projectName.length > 0) {
      lines.push(`   Project Name: ${result.issues.projectName.join(", ")}`);
    }
    if (result.issues.missingVars.length > 0) {
      lines.push(`   Missing Variables: ${result.issues.missingVars.join(", ")}`);
    }
    if (result.issues.smtp.length > 0) {
      lines.push(`   SMTP: ${result.issues.smtp.join(", ")}`);
    }
  }

  // Fixes
  if (result.fixes.length > 0) {
    lines.push("\n🔧 Suggested Fixes:");
    for (const fix of result.fixes) {
      lines.push(`   • ${fix.issue}`);
      lines.push(`     → ${fix.fix}`);
      if (fix.command) {
        lines.push(`     Command: ${fix.command}`);
      }
    }
  }

  // Offer automatic fix
  if (offerFix && result.autoFixable) {
    lines.push("\n✨ Good news! These issues can be fixed automatically.");
    lines.push("   Run: dokploy_fix_config");
  }

  return lines.join("\n");
}
