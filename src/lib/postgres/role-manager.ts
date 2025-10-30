/**
 * Role Manager
 * Manages PostgreSQL role selection for correct schema access
 */

import type { PostgresConnectionPool } from "./connection-pool.js";
import { logger } from "../utils/logger.js";
import { ConnectionError } from "../errors/connection-error.js";
import type * as pg from "pg";

/**
 * PostgreSQL Role
 */
export type PostgresRole =
  | "postgres" // Superuser
  | "supabase_admin" // Supabase admin role
  | "supabase_auth_admin" // Auth schema admin
  | "authenticated" // Authenticated user role
  | "anon" // Anonymous role
  | "service_role"; // Service role

/**
 * Schema Access Requirements
 */
export interface SchemaAccessRequirements {
  schema: string;
  requiredRole: PostgresRole;
  fallbackRoles?: PostgresRole[];
}

/**
 * Role Manager Class
 */
export class RoleManager {
  private pool: PostgresConnectionPool;
  private availableRoles: Set<string> = new Set();
  private currentRole?: string;

  constructor(pool: PostgresConnectionPool) {
    this.pool = pool;
  }

  /**
   * Initialize and detect available roles
   */
  async initialize(): Promise<void> {
    try {
      // Query available roles
      const result = await this.pool.query<{ rolname: string }>(
        "SELECT rolname FROM pg_roles WHERE pg_has_role(current_user, oid, 'member')"
      );

      this.availableRoles = new Set(result.rows.map((row) => row.rolname));

      // Get current role
      const currentResult = await this.pool.query<{ current_user: string }>("SELECT current_user");
      this.currentRole = currentResult.rows[0]?.current_user;

      logger.info("Role manager initialized", {
        currentRole: this.currentRole,
        availableRoles: Array.from(this.availableRoles),
      });
    } catch (error) {
      logger.warn("Failed to initialize role manager, will use default role", {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Get role for schema access
   */
  getRequiredRole(schema: string): PostgresRole {
    const schemaRoleMap: Record<string, PostgresRole> = {
      auth: "supabase_auth_admin",
      storage: "supabase_admin",
      realtime: "supabase_admin",
      graphql_public: "postgres",
      public: "authenticated",
    };

    return schemaRoleMap[schema] || "postgres";
  }

  /**
   * Check if role is available
   */
  hasRole(role: string): boolean {
    return this.availableRoles.has(role);
  }

  /**
   * Execute query with specific role
   */
  async executeWithRole<T extends pg.QueryResultRow = any>(
    role: PostgresRole,
    query: string,
    values?: unknown[]
  ): Promise<T[]> {
    const client = await this.pool.getClient();

    try {
      // Set role if different from current
      if (role !== this.currentRole && this.hasRole(role)) {
        logger.debug(`Switching to role: ${role}`);
        await client.query(`SET ROLE ${role}`);
      } else if (!this.hasRole(role)) {
        logger.warn(`Role ${role} not available, using current role`, {
          currentRole: this.currentRole,
          requestedRole: role,
        });
      }

      // Execute query
      const result = await client.query<T>(query, values);

      return result.rows;
    } catch (error) {
      const err = error as Error & { code?: string };

      // Check if it's a permission error
      if (err.code === "42501") {
        throw new ConnectionError(
          `Permission denied. Role '${role}' does not have access to execute this query.`,
          "permission_denied",
          {
            cause: err,
            context: {
              role,
              currentRole: this.currentRole,
              availableRoles: Array.from(this.availableRoles),
            },
            suggestions: [
              `Ensure role '${role}' exists and has required permissions`,
              "Try using 'supabase_auth_admin' role for auth schema access",
              "Check PostgreSQL role permissions with: \\du in psql",
              "Grant necessary permissions to the role",
            ],
          }
        );
      }

      throw ConnectionError.fromPostgresError(err);
    } finally {
      // Reset role
      if (role !== this.currentRole && this.hasRole(role)) {
        try {
          await client.query("RESET ROLE");
        } catch {
          // Ignore reset errors
        }
      }

      client.release();
    }
  }

  /**
   * Execute query on auth schema (uses correct role automatically)
   */
  async executeAuthQuery<T extends pg.QueryResultRow = any>(query: string, values?: unknown[]): Promise<T[]> {
    return this.executeWithRole<T>("supabase_auth_admin", query, values);
  }

  /**
   * Execute query on storage schema
   */
  async executeStorageQuery<T extends pg.QueryResultRow = any>(query: string, values?: unknown[]): Promise<T[]> {
    return this.executeWithRole<T>("supabase_admin", query, values);
  }

  /**
   * Execute query with automatic role detection based on schema
   */
  async executeWithAutoRole<T extends pg.QueryResultRow = any>(
    query: string,
    values?: unknown[],
    targetSchema?: string
  ): Promise<T[]> {
    // Detect schema from query if not provided
    const schema = targetSchema || this.detectSchemaFromQuery(query);

    // Get required role
    const role = this.getRequiredRole(schema);

    return this.executeWithRole<T>(role, query, values);
  }

  /**
   * Detect schema from query
   */
  private detectSchemaFromQuery(query: string): string {
    const lowerQuery = query.toLowerCase();

    // Check for explicit schema references
    if (lowerQuery.includes("auth.")) return "auth";
    if (lowerQuery.includes("storage.")) return "storage";
    if (lowerQuery.includes("realtime.")) return "realtime";
    if (lowerQuery.includes("graphql_public.")) return "graphql_public";

    // Default to public
    return "public";
  }

  /**
   * Create role if it doesn't exist (requires superuser)
   */
  async ensureRole(role: PostgresRole, password?: string): Promise<void> {
    if (this.hasRole(role)) {
      logger.debug(`Role ${role} already exists`);
      return;
    }

    try {
      const createRoleQuery = password
        ? `CREATE ROLE ${role} WITH LOGIN PASSWORD '${password}'`
        : `CREATE ROLE ${role} WITH LOGIN`;

      await this.pool.query(createRoleQuery);

      // Refresh available roles
      await this.initialize();

      logger.info(`Role ${role} created successfully`);
    } catch (error) {
      const err = error as Error & { code?: string };

      if (err.code === "42710") {
        // Role already exists
        logger.debug(`Role ${role} already exists (concurrent creation)`);
        await this.initialize();
      } else {
        throw new ConnectionError(`Failed to create role ${role}`, "permission_denied", {
          cause: err,
          suggestions: [
            "Ensure current user has CREATEROLE privilege",
            "Connect as superuser (postgres) to create roles",
            "Manually create role: CREATE ROLE <role> WITH LOGIN",
          ],
        });
      }
    }
  }

  /**
   * Grant permissions to role
   */
  async grantPermissions(
    role: PostgresRole,
    permissions: string[],
    target: string
  ): Promise<void> {
    try {
      for (const permission of permissions) {
        const grantQuery = `GRANT ${permission} ON ${target} TO ${role}`;
        await this.pool.query(grantQuery);
      }

      logger.info(`Granted permissions to role ${role}`, {
        permissions,
        target,
      });
    } catch (error) {
      throw new ConnectionError(
        `Failed to grant permissions to role ${role}`,
        "permission_denied",
        {
          cause: error as Error,
          suggestions: [
            "Ensure current user has GRANT privileges",
            "Check that target exists and is accessible",
            "Review PostgreSQL permission hierarchy",
          ],
        }
      );
    }
  }

  /**
   * Get current role
   */
  getCurrentRole(): string | undefined {
    return this.currentRole;
  }

  /**
   * Get available roles
   */
  getAvailableRoles(): string[] {
    return Array.from(this.availableRoles);
  }
}
