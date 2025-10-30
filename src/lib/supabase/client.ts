/**
 * Supabase Client Wrapper
 * Wrapper around @supabase/supabase-js with error handling
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { SupabaseConfig } from "../../types/config.js";
import { logger } from "../utils/logger.js";
import { ConnectionError } from "../errors/connection-error.js";

/**
 * Supabase Client Wrapper Class
 */
export class SupabaseClientWrapper {
  private client: SupabaseClient;
  private config: SupabaseConfig;

  constructor(config: SupabaseConfig) {
    this.config = config;

    // Create Supabase client
    this.client = createClient(config.url, config.serviceRoleKey || config.anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: false,
      },
    });

    logger.info("Supabase client initialized", {
      url: config.url,
      projectRef: config.projectRef,
      hasServiceRole: !!config.serviceRoleKey,
    });
  }

  /**
   * Get native Supabase client
   */
  getClient(): SupabaseClient {
    return this.client;
  }

  /**
   * Test connection to Supabase
   */
  async testConnection(): Promise<void> {
    try {
      // Try to query a system table
      const { error } = await this.client.from("_realtime").select("id").limit(1);

      if (error && error.code !== "PGRST116") {
        // PGRST116 is "relation does not exist" which is OK (means we connected)
        throw new Error(error.message);
      }

      logger.info("Supabase connection test successful", {
        url: this.config.url,
      });
    } catch (error) {
      throw new ConnectionError(
        "Failed to connect to Supabase",
        "connection_failed",
        {
          cause: error as Error,
          context: {
            url: this.config.url,
          },
          suggestions: [
            "Verify SUPABASE_URL is correct",
            "Check that SUPABASE_ANON_KEY or SUPABASE_SERVICE_ROLE_KEY is valid",
            "Ensure Supabase project is active",
            "Check network connectivity to Supabase",
          ],
        }
      );
    }
  }

  /**
   * Get project metadata
   */
  async getProjectMetadata(): Promise<{
    version?: string;
    region?: string;
    status?: string;
  }> {
    try {
      // Try to get metadata from Supabase Management API
      // Note: This requires service role key
      const response = await fetch(`${this.config.url}/rest/v1/`, {
        headers: {
          apikey: this.config.serviceRoleKey || this.config.anonKey,
        },
      });

      const version = response.headers.get("x-supabase-api-version");

      return {
        version: version || undefined,
      };
    } catch (error) {
      logger.warn("Failed to get project metadata", {
        error: error instanceof Error ? error.message : String(error),
      });
      return {};
    }
  }

  /**
   * Execute raw SQL query via Supabase (using service role)
   */
  async executeSql<T = unknown>(query: string): Promise<T[]> {
    if (!this.config.serviceRoleKey) {
      throw new ConnectionError(
        "Service role key required for SQL execution",
        "authentication_failed",
        {
          suggestions: [
            "Set SUPABASE_SERVICE_ROLE_KEY environment variable",
            "Use direct PostgreSQL connection for SQL execution",
          ],
        }
      );
    }

    try {
      const { data, error } = await this.client.rpc("exec_sql", { query });

      if (error) {
        throw error;
      }

      return data as T[];
    } catch (error) {
      throw new ConnectionError(
        "SQL execution failed via Supabase",
        "connection_failed",
        {
          cause: error as Error,
          suggestions: [
            "Check SQL syntax",
            "Ensure service role has required permissions",
            "Use direct PostgreSQL connection for complex queries",
          ],
        }
      );
    }
  }

  /**
   * Get database statistics
   */
  async getDatabaseStats(): Promise<{
    tables: number;
    size?: string;
  }> {
    try {
      // Get table count from information_schema
      const { data, error } = await this.client
        .from("information_schema.tables")
        .select("table_name", { count: "exact" })
        .eq("table_schema", "public");

      if (error) {
        throw error;
      }

      return {
        tables: data?.length || 0,
      };
    } catch (error) {
      logger.warn("Failed to get database stats", {
        error: error instanceof Error ? error.message : String(error),
      });
      return { tables: 0 };
    }
  }

  /**
   * Check if PostgREST is accessible
   */
  async checkPostgRESTHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.url}/rest/v1/`, {
        headers: {
          apikey: this.config.anonKey,
        },
      });

      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Check if Auth service is accessible
   */
  async checkAuthHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.url}/auth/v1/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Check if Storage service is accessible
   */
  async checkStorageHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.url}/storage/v1/`, {
        headers: {
          apikey: this.config.anonKey,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get comprehensive health check
   */
  async getHealthStatus(): Promise<{
    postgrest: boolean;
    auth: boolean;
    storage: boolean;
    overall: "healthy" | "degraded" | "unhealthy";
  }> {
    const [postgrest, auth, storage] = await Promise.all([
      this.checkPostgRESTHealth(),
      this.checkAuthHealth(),
      this.checkStorageHealth(),
    ]);

    let overall: "healthy" | "degraded" | "unhealthy";
    const healthyCount = [postgrest, auth, storage].filter(Boolean).length;

    if (healthyCount === 3) {
      overall = "healthy";
    } else if (healthyCount >= 1) {
      overall = "degraded";
    } else {
      overall = "unhealthy";
    }

    return {
      postgrest,
      auth,
      storage,
      overall,
    };
  }

  /**
   * Get config
   */
  getConfig(): SupabaseConfig {
    return { ...this.config };
  }
}
