/**
 * Validation Error
 * Errors related to input validation and configuration validation
 */

import { BaseError, type BaseErrorOptions } from "./base-error.js";
import type { ZodError } from "zod";

/**
 * Validation Error Field
 */
export interface ValidationErrorField {
  field: string;
  message: string;
  value?: unknown;
}

/**
 * Validation Error Class
 */
export class ValidationError extends BaseError {
  public readonly fields: ValidationErrorField[];

  constructor(
    message: string,
    fields: ValidationErrorField[],
    options?: Partial<BaseErrorOptions>
  ) {
    // Generate suggestions based on validation failures
    const suggestions = ValidationError.generateSuggestions(fields);

    super(message, {
      code: "VALIDATION_ERROR",
      category: "validation",
      severity: "medium",
      suggestions,
      ...options,
      context: {
        ...options?.context,
        invalidFields: fields.map((f) => f.field),
      },
    });

    this.fields = fields;
  }

  /**
   * Create ValidationError from Zod error
   */
  static fromZodError(zodError: ZodError, message?: string): ValidationError {
    const fields: ValidationErrorField[] = zodError.errors.map((error) => ({
      field: error.path.join("."),
      message: error.message,
      value: undefined, // Don't include value to avoid logging sensitive data
    }));

    return new ValidationError(
      message || "Validation failed",
      fields,
      {
        cause: zodError as unknown as Error,
      }
    );
  }

  /**
   * Generate suggestions based on validation failures
   */
  private static generateSuggestions(fields: ValidationErrorField[]): string[] {
    const suggestions: string[] = [];

    for (const field of fields) {
      const fieldLower = field.field.toLowerCase();

      if (fieldLower.includes("url")) {
        suggestions.push(`Check that ${field.field} is a valid URL (including http:// or https://)`);
      } else if (fieldLower.includes("port")) {
        suggestions.push(`Ensure ${field.field} is a valid port number (1-65535)`);
      } else if (fieldLower.includes("password")) {
        suggestions.push(`Verify ${field.field} meets minimum requirements`);
      } else if (fieldLower.includes("email")) {
        suggestions.push(`Ensure ${field.field} is a valid email address`);
      } else if (fieldLower.includes("key")) {
        suggestions.push(`Check that ${field.field} has the correct format and length`);
      } else {
        suggestions.push(`Review the ${field.field} field: ${field.message}`);
      }
    }

    // Add general suggestion
    suggestions.push("Check .env.example for correct configuration format");

    // Remove duplicates
    return [...new Set(suggestions)];
  }

  /**
   * Get formatted field errors
   */
  getFormattedFields(): string {
    return this.fields
      .map((f, index) => `  ${index + 1}. ${f.field}: ${f.message}`)
      .join("\n");
  }

  /**
   * Override getFormattedMessage to include field details
   */
  override getFormattedMessage(): string {
    let formatted = `[${this.code}] ${this.userMessage}`;

    if (this.fields.length > 0) {
      formatted += "\n\nInvalid fields:";
      formatted += `\n${this.getFormattedFields()}`;
    }

    if (this.suggestions.length > 0) {
      formatted += "\n\nSuggested actions:";
      this.suggestions.forEach((suggestion, index) => {
        formatted += `\n  ${index + 1}. ${suggestion}`;
      });
    }

    return formatted;
  }
}

/**
 * Configuration Error (specific type of validation error)
 */
export class ConfigurationError extends ValidationError {
  constructor(
    message: string,
    fields: ValidationErrorField[],
    options?: Partial<BaseErrorOptions>
  ) {
    super(message, fields, {
      code: "CONFIGURATION_ERROR",
      category: "configuration",
      severity: "high",
      ...options,
    });
  }

  /**
   * Create error for missing required configuration
   */
  static missingRequired(requiredFields: string[]): ConfigurationError {
    const fields: ValidationErrorField[] = requiredFields.map((field) => ({
      field,
      message: "Required configuration missing",
    }));

    return new ConfigurationError(
      "Missing required configuration",
      fields,
      {
        suggestions: [
          "Set missing environment variables in .env file",
          "Check .env.example for all required variables",
          "Verify environment variables are loaded correctly",
        ],
      }
    );
  }

  /**
   * Create error for invalid configuration
   */
  static invalid(field: string, reason: string, suggestion?: string): ConfigurationError {
    return new ConfigurationError(
      `Invalid configuration: ${field}`,
      [
        {
          field,
          message: reason,
        },
      ],
      {
        suggestions: suggestion ? [suggestion, "Check .env.example for correct format"] : undefined,
      }
    );
  }
}
