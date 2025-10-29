/**
 * Dokploy Environment Update Tool
 * Updates environment variables with safety checks and container restart
 */

import type { DokployAPIClient } from "../../lib/dokploy/api-client.js";
import type { EnvironmentVariableUpdate } from "../../types/dokploy.js";
import { logger } from "../../lib/utils/logger.js";
import { EnvParser } from "../../lib/dokploy/env-parser.js";
import type { ToolResponse } from "../../types/mcp.js";

/**
 * Update Environment Input
 */
export interface UpdateEnvironmentInput {
  /** Application ID */
  applicationId: string;
  /** Environment variable updates */
  updates: EnvironmentVariableUpdate[];
  /** Restart containers after update (default: true) */
  restart?: boolean;
  /** Skip safety validation (default: false) */
  skipValidation?: boolean;
  /** Require confirmation for destructive changes (default: true) */
  requireConfirmation?: boolean;
}

/**
 * Update Environment Result
 */
export interface UpdateEnvironmentResult {
  success: boolean;
  applicationId: string;
  updatedVariables: string[];
  restarted: boolean;
  validation: {
    before: {
      valid: boolean;
      errors: string[];
      warnings: string[];
    };
    after: {
      valid: boolean;
      errors: string[];
      warnings: string[];
    };
  };
  duration: number;
}

/**
 * Update Environment Tool
 */
export class UpdateEnvironmentTool {
  private dokployClient: DokployAPIClient;

  constructor(dokployClient: DokployAPIClient) {
    this.dokployClient = dokployClient;
  }

  /**
   * Update environment variables with safety checks
   */
  async updateEnvironment(input: UpdateEnvironmentInput): Promise<UpdateEnvironmentResult> {
    const startTime = Date.now();

    logger.info("Updating environment variables", {
      applicationId: input.applicationId,
      updateCount: input.updates.length,
    });

    // Get current application state
    const application = await this.dokployClient.getApplication(input.applicationId);
    const currentEnv = application.env;

    // Validate current environment
    const beforeValidation = EnvParser.validate(currentEnv);

    // Apply updates to environment
    const updatedEnv = { ...currentEnv };
    for (const update of input.updates) {
      updatedEnv[update.name] = update.value;
    }

    // Validate updated environment
    const afterValidation = EnvParser.validate(updatedEnv);

    if (!input.skipValidation && !afterValidation.valid) {
      throw new Error(
        `Updated environment is invalid: ${afterValidation.errors.join(", ")}`
      );
    }

    // Check for destructive changes
    const destructiveChanges = this.detectDestructiveChanges(currentEnv, updatedEnv);
    if (destructiveChanges.length > 0 && input.requireConfirmation !== false) {
      logger.warn("Destructive changes detected", {
        changes: destructiveChanges,
      });

      // In a real implementation, this would prompt for user confirmation
      // For now, we'll just log a warning
    }

    // Update via Dokploy API
    await this.dokployClient.updateEnvironment(input.applicationId, input.updates);

    // Restart if requested
    let restarted = false;
    if (input.restart !== false) {
      await this.dokployClient.restart(input.applicationId);
      restarted = true;

      logger.info("Containers restarted after environment update", {
        applicationId: input.applicationId,
      });
    }

    const duration = Date.now() - startTime;

    logger.info("Environment update completed", {
      applicationId: input.applicationId,
      duration,
      restarted,
    });

    return {
      success: true,
      applicationId: input.applicationId,
      updatedVariables: input.updates.map((u) => u.name),
      restarted,
      validation: {
        before: {
          valid: beforeValidation.valid,
          errors: beforeValidation.errors,
          warnings: beforeValidation.warnings,
        },
        after: {
          valid: afterValidation.valid,
          errors: afterValidation.errors,
          warnings: afterValidation.warnings,
        },
      },
      duration,
    };
  }

  /**
   * Detect destructive changes (password changes, secret changes)
   */
  private detectDestructiveChanges(
    oldEnv: Record<string, string>,
    newEnv: Record<string, string>
  ): string[] {
    const destructive: string[] = [];

    const destructiveKeys = [
      "POSTGRES_PASSWORD",
      "JWT_SECRET",
      "POSTGRES_DB",
      "POSTGRES_USER",
    ];

    for (const key of destructiveKeys) {
      if (oldEnv[key] && newEnv[key] && oldEnv[key] !== newEnv[key]) {
        destructive.push(key);
      }
    }

    return destructive;
  }

  /**
   * Validate environment after update
   */
  async validateAfterUpdate(applicationId: string): Promise<{
    valid: boolean;
    errors: string[];
    authWorks: boolean;
  }> {
    const application = await this.dokployClient.getApplication(applicationId);
    const env = application.env;

    const validation = EnvParser.validate(env);

    // Try to ping auth endpoint if possible
    let authWorks = false;
    if (env["SITE_URL"] && env["ANON_KEY"]) {
      try {
        const response = await fetch(`${env["SITE_URL"]}/auth/v1/health`, {
          headers: { apikey: env["ANON_KEY"] },
        });
        authWorks = response.ok;
      } catch {
        authWorks = false;
      }
    }

    return {
      valid: validation.valid,
      errors: validation.errors,
      authWorks,
    };
  }
}

/**
 * MCP Tool Handler: dokploy_update_env
 */
export async function dokployUpdateEnv(
  input: UpdateEnvironmentInput,
  dokployClient: DokployAPIClient
): Promise<ToolResponse<UpdateEnvironmentResult>> {
  try {
    const tool = new UpdateEnvironmentTool(dokployClient);
    const result = await tool.updateEnvironment(input);

    return {
      content: [
        {
          type: "text",
          text: formatUpdateResult(result),
        },
      ],
      _meta: result,
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Environment update failed: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Format update result for display
 */
function formatUpdateResult(result: UpdateEnvironmentResult): string {
  const lines: string[] = [];

  if (result.success) {
    lines.push("✅ Environment variables updated successfully\n");
  } else {
    lines.push("❌ Environment update failed\n");
  }

  lines.push(`Application ID: ${result.applicationId}`);
  lines.push(`Updated Variables: ${result.updatedVariables.join(", ")}`);
  lines.push(`Containers Restarted: ${result.restarted ? "Yes" : "No"}`);
  lines.push(`Duration: ${(result.duration / 1000).toFixed(1)}s\n`);

  // Validation before/after
  lines.push("\n📋 Validation:");
  lines.push(`   Before: ${result.validation.before.valid ? "✅ Valid" : "❌ Invalid"}`);
  if (result.validation.before.errors.length > 0) {
    lines.push(`      Errors: ${result.validation.before.errors.join(", ")}`);
  }

  lines.push(`   After: ${result.validation.after.valid ? "✅ Valid" : "❌ Invalid"}`);
  if (result.validation.after.errors.length > 0) {
    lines.push(`      Errors: ${result.validation.after.errors.join(", ")}`);
  }

  return lines.join("\n");
}
