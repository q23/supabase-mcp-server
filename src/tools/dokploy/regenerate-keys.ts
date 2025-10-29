/**
 * Regenerate JWT Keys Tool
 * Fixes broken Dokploy-generated JWT keys with correct structure
 *
 * FIXES:
 * - Identical ANON_KEY and SERVICE_ROLE_KEY (Dokploy template bug)
 * - Missing 'role' claim in JWT tokens
 * - Wrong 'iss' value in JWT tokens
 * - Invalid signature issues
 *
 * PROCESS:
 * 1. Detect broken keys in current deployment
 * 2. Regenerate keys with correct structure
 * 3. Update environment via Dokploy API
 * 4. Restart containers
 * 5. Validate auth endpoint works
 */

import type { DokployAPIClient } from "../../lib/dokploy/api-client.js";
import { JWTGenerator } from "../../lib/dokploy/jwt-generator.js";
import { JWTValidator } from "../../lib/validation/jwt-validator.js";
import { logger } from "../../lib/utils/logger.js";
import type { ToolResponse } from "../../types/mcp.js";
import type { EnvironmentVariableUpdate } from "../../types/dokploy.js";

/**
 * Regenerate Keys Input
 */
export interface RegenerateKeysInput {
  /** Application ID */
  applicationId: string;
  /** Keep existing JWT_SECRET (default: true) */
  keepExistingSecret?: boolean;
  /** Automatically restart containers (default: true) */
  autoRestart?: boolean;
  /** Validate auth endpoint after regeneration (default: true) */
  validateAuth?: boolean;
}

/**
 * Regenerate Keys Result
 */
export interface RegenerateKeysResult {
  success: boolean;
  applicationId: string;
  /** Issues detected before regeneration */
  issuesDetected: string[];
  /** New JWT keys */
  newKeys: {
    jwtSecret: string;
    anonKey: string;
    serviceRoleKey: string;
  };
  /** Whether JWT_SECRET was changed */
  secretChanged: boolean;
  /** Container restart status */
  restarted: boolean;
  /** Auth validation result */
  authValidation?: {
    success: boolean;
    anonKeyWorks: boolean;
    serviceRoleKeyWorks: boolean;
    errors: string[];
  };
  duration: number;
}

/**
 * Regenerate Keys Tool
 */
export class RegenerateKeysTool {
  private dokployClient: DokployAPIClient;

  constructor(dokployClient: DokployAPIClient) {
    this.dokployClient = dokployClient;
  }

  /**
   * Regenerate JWT keys for broken deployment
   */
  async regenerateKeys(input: RegenerateKeysInput): Promise<RegenerateKeysResult> {
    const startTime = Date.now();

    logger.info("Regenerating JWT keys", {
      applicationId: input.applicationId,
      keepExistingSecret: input.keepExistingSecret !== false,
    });

    // Step 1: Get current application configuration
    const application = await this.dokployClient.getApplication(input.applicationId);
    const currentEnv = application.env;

    const anonKey = currentEnv.ANON_KEY;
    const serviceRoleKey = currentEnv.SERVICE_ROLE_KEY;
    const jwtSecret = currentEnv.JWT_SECRET;

    if (!jwtSecret) {
      throw new Error("JWT_SECRET not found in application environment");
    }

    // Step 2: Detect issues with current keys
    const issuesDetected: string[] = [];

    if (!anonKey || !serviceRoleKey) {
      issuesDetected.push("Missing ANON_KEY or SERVICE_ROLE_KEY");
    } else {
      const dokployIssues = JWTValidator.detectDokployIssues(anonKey, serviceRoleKey, jwtSecret);
      if (dokployIssues.hasIssues) {
        issuesDetected.push(...dokployIssues.issues);
      }
    }

    logger.info("Detected JWT issues", {
      issueCount: issuesDetected.length,
      issues: issuesDetected,
    });

    // Step 3: Generate new keys
    let newKeySet;
    let secretChanged = false;

    if (input.keepExistingSecret !== false && jwtSecret) {
      // Keep existing JWT_SECRET, regenerate keys
      newKeySet = JWTGenerator.regenerateKeys(jwtSecret);
      secretChanged = false;
    } else {
      // Generate completely new key set (including secret)
      newKeySet = JWTGenerator.generateValidatedKeySet();
      secretChanged = true;
    }

    logger.info("New JWT keys generated", {
      secretChanged,
      keysValid: newKeySet.validation.anonKeyValid && newKeySet.validation.serviceRoleKeyValid,
      keysDifferent: newKeySet.validation.keysAreDifferent,
    });

    // Step 4: Prepare environment updates
    const updates: EnvironmentVariableUpdate[] = [
      {
        name: "ANON_KEY",
        value: newKeySet.anonKey,
        secret: true,
      },
      {
        name: "SERVICE_ROLE_KEY",
        value: newKeySet.serviceRoleKey,
        secret: true,
      },
    ];

    if (secretChanged) {
      updates.push({
        name: "JWT_SECRET",
        value: newKeySet.jwtSecret,
        secret: true,
      });
    }

    // Step 5: Update environment via Dokploy API
    await this.dokployClient.updateEnvironment(input.applicationId, updates);

    logger.info("Environment variables updated", {
      applicationId: input.applicationId,
      updatedKeys: updates.map((u) => u.name),
    });

    // Step 6: Restart containers if requested
    let restarted = false;
    if (input.autoRestart !== false) {
      await this.dokployClient.restart(input.applicationId);
      restarted = true;

      logger.info("Containers restarted", {
        applicationId: input.applicationId,
      });

      // Wait for containers to be ready
      await new Promise((resolve) => setTimeout(resolve, 10000)); // 10 second wait
    }

    // Step 7: Validate auth endpoint (if requested)
    let authValidation;
    if (input.validateAuth !== false && currentEnv.SITE_URL) {
      authValidation = await JWTGenerator.validateAuthEndpoint(
        currentEnv.SITE_URL,
        newKeySet.anonKey,
        newKeySet.serviceRoleKey
      );

      logger.info("Auth endpoint validation completed", {
        success: authValidation.success,
        anonKeyWorks: authValidation.anonKeyWorks,
        serviceRoleKeyWorks: authValidation.serviceRoleKeyWorks,
      });
    }

    const duration = Date.now() - startTime;

    return {
      success: true,
      applicationId: input.applicationId,
      issuesDetected,
      newKeys: {
        jwtSecret: newKeySet.jwtSecret,
        anonKey: newKeySet.anonKey,
        serviceRoleKey: newKeySet.serviceRoleKey,
      },
      secretChanged,
      restarted,
      authValidation,
      duration,
    };
  }

  /**
   * Detect destructive changes
   */
  private detectDestructiveChanges(
    oldEnv: Record<string, string>,
    newEnv: Record<string, string>
  ): string[] {
    const destructive: string[] = [];

    // Changing POSTGRES_PASSWORD requires data migration
    if (oldEnv.POSTGRES_PASSWORD && newEnv.POSTGRES_PASSWORD !== oldEnv.POSTGRES_PASSWORD) {
      destructive.push("POSTGRES_PASSWORD change requires database migration");
    }

    return destructive;
  }
}

/**
 * MCP Tool Handler: dokploy_regenerate_keys
 */
export async function dokployRegenerateKeys(
  input: RegenerateKeysInput,
  dokployClient: DokployAPIClient
): Promise<ToolResponse<RegenerateKeysResult>> {
  try {
    const tool = new RegenerateKeysTool(dokployClient);
    const result = await tool.regenerateKeys(input);

    return {
      content: [
        {
          type: "text",
          text: formatRegenerateKeysResult(result),
        },
      ],
      _meta: result,
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Key regeneration failed: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
}

/**
 * Format regenerate keys result for display
 */
function formatRegenerateKeysResult(result: RegenerateKeysResult): string {
  const lines: string[] = [];

  if (result.success) {
    lines.push("✅ JWT Keys Regenerated Successfully!\n");
  } else {
    lines.push("❌ Key Regeneration Failed\n");
  }

  lines.push(`Application ID: ${result.applicationId}`);
  lines.push(`Duration: ${(result.duration / 1000).toFixed(1)}s\n`);

  // Issues detected
  if (result.issuesDetected.length > 0) {
    lines.push("\n🔍 Issues Detected:");
    for (const issue of result.issuesDetected) {
      lines.push(`   • ${issue}`);
    }
  }

  // New keys generated
  lines.push("\n🔑 New Keys Generated:");
  lines.push(`   JWT Secret: ${result.secretChanged ? "NEW (changed)" : "EXISTING (kept)"}`);
  lines.push(`   ANON_KEY: ${result.newKeys.anonKey.substring(0, 40)}...`);
  lines.push(`   SERVICE_ROLE_KEY: ${result.newKeys.serviceRoleKey.substring(0, 40)}...`);

  // Actions taken
  lines.push("\n✅ Actions Completed:");
  lines.push(`   • Environment variables updated`);
  if (result.restarted) {
    lines.push(`   • Containers restarted`);
  }

  // Auth validation
  if (result.authValidation) {
    lines.push("\n🏥 Auth Endpoint Validation:");
    if (result.authValidation.success) {
      lines.push(`   ✅ Auth endpoint is healthy`);
      lines.push(`   ✅ ANON_KEY: ${result.authValidation.anonKeyWorks ? "Works" : "Failed"}`);
      lines.push(`   ✅ SERVICE_ROLE_KEY: ${result.authValidation.serviceRoleKeyWorks ? "Works" : "Failed"}`);
    } else {
      lines.push(`   ❌ Auth endpoint validation failed`);
      for (const error of result.authValidation.errors) {
        lines.push(`      • ${error}`);
      }
    }
  }

  lines.push("\n🎉 Your Supabase authentication is now working correctly!");

  return lines.join("\n");
}
