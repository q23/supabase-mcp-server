/**
 * Project Name Validator
 * Validates project names for DNS compliance and Dokploy requirements
 */

import { projectNameSchema } from "./schemas.js";

/**
 * Project Name Validation Result
 */
export interface ProjectNameValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  sanitized: string;
  suggestions: string[];
}

/**
 * Project Name Validator Class
 */
export class ProjectNameValidator {
  /**
   * Validate a project name
   */
  static validate(name: string): ProjectNameValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const suggestions: string[] = [];

    // Validate with Zod schema
    const result = projectNameSchema.safeParse(name);

    if (!result.success) {
      errors.push(...result.error.errors.map((e) => e.message));
    }

    // Additional DNS-compliance checks
    if (name.length < 3) {
      errors.push("Project name must be at least 3 characters");
    }

    if (name.length > 32) {
      errors.push("Project name must be at most 32 characters");
      suggestions.push(this.sanitize(name.substring(0, 32)));
    }

    // Check for reserved names
    const reservedNames = [
      "admin",
      "api",
      "app",
      "auth",
      "beta",
      "cdn",
      "dashboard",
      "dev",
      "docs",
      "ftp",
      "mail",
      "prod",
      "production",
      "staging",
      "test",
      "www",
    ];

    if (reservedNames.includes(name.toLowerCase())) {
      warnings.push(`"${name}" is a commonly reserved name and may cause conflicts`);
    }

    // Generate sanitized version
    const sanitized = this.sanitize(name);

    // If sanitized differs from original, add as suggestion
    if (sanitized !== name && this.validate(sanitized).valid) {
      suggestions.push(sanitized);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      sanitized,
      suggestions: [...new Set(suggestions)], // Remove duplicates
    };
  }

  /**
   * Sanitize project name to make it DNS-compliant
   */
  static sanitize(name: string): string {
    return (
      name
        .toLowerCase()
        // Replace spaces and underscores with hyphens
        .replace(/[\s_]+/g, "-")
        // Remove special characters (keep only alphanumeric and hyphens)
        .replace(/[^a-z0-9-]/g, "")
        // Remove leading/trailing hyphens
        .replace(/^-+|-+$/g, "")
        // Replace multiple consecutive hyphens with single hyphen
        .replace(/-{2,}/g, "-")
        // Truncate to 32 characters
        .substring(0, 32)
        // Remove trailing hyphen if truncation created one
        .replace(/-$/, "")
    );
  }

  /**
   * Generate project name suggestions from a natural language input
   */
  static generateSuggestions(input: string): string[] {
    const suggestions: string[] = [];

    // Sanitize the input
    const sanitized = this.sanitize(input);
    if (sanitized.length >= 3) {
      suggestions.push(sanitized);
    }

    // Extract words and create variations
    const words = input
      .toLowerCase()
      .split(/[\s_-]+/)
      .filter((w) => w.length > 0);

    if (words.length > 1) {
      // Combine first and last word
      const firstLast = this.sanitize(`${words[0]}-${words[words.length - 1]}`);
      if (firstLast.length >= 3 && firstLast !== sanitized) {
        suggestions.push(firstLast);
      }

      // Combine first two words
      if (words.length >= 2) {
        const firstTwo = this.sanitize(`${words[0]}-${words[1]}`);
        if (firstTwo.length >= 3 && !suggestions.includes(firstTwo)) {
          suggestions.push(firstTwo);
        }
      }

      // Use first word with numeric suffix
      const firstWord = this.sanitize(words[0]);
      if (firstWord.length >= 3) {
        const withNumber = `${firstWord}-1`;
        if (withNumber.length <= 32 && !suggestions.includes(withNumber)) {
          suggestions.push(withNumber);
        }
      }
    }

    // Filter valid suggestions
    return suggestions.filter((s) => this.validate(s).valid).slice(0, 5);
  }

  /**
   * Check if project name is available (for future API integration)
   * Currently just validates format
   */
  static async checkAvailability(name: string): Promise<{
    available: boolean;
    reason?: string;
  }> {
    const validation = this.validate(name);

    if (!validation.valid) {
      return {
        available: false,
        reason: validation.errors.join("; "),
      };
    }

    // In the future, this would check Dokploy API for existing projects
    // For now, just return available if valid
    return {
      available: true,
    };
  }

  /**
   * Validate project name against DNS RFC requirements
   */
  static validateDNSCompliance(name: string): {
    compliant: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    // RFC 1035 requirements
    // Label must be 1-63 characters
    if (name.length > 63) {
      issues.push("DNS label cannot exceed 63 characters");
    }

    // Must start with letter or digit
    if (!/^[a-z0-9]/.test(name)) {
      issues.push("DNS label must start with a letter or digit");
    }

    // Must end with letter or digit
    if (!/[a-z0-9]$/.test(name)) {
      issues.push("DNS label must end with a letter or digit");
    }

    // Can only contain letters, digits, and hyphens
    if (!/^[a-z0-9-]+$/.test(name)) {
      issues.push("DNS label can only contain lowercase letters, digits, and hyphens");
    }

    return {
      compliant: issues.length === 0,
      issues,
    };
  }
}
