/**
 * Supabase Auth Helper
 * Helper functions for Supabase authentication operations
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "../utils/logger.js";

/**
 * Auth User Info
 */
export interface AuthUserInfo {
  id: string;
  email?: string;
  phone?: string;
  emailConfirmedAt?: string;
  phoneConfirmedAt?: string;
  lastSignInAt?: string;
  createdAt: string;
  providers?: string[];
}

/**
 * Auth Provider
 */
export type AuthProvider =
  | "email"
  | "phone"
  | "google"
  | "github"
  | "gitlab"
  | "bitbucket"
  | "azure"
  | "facebook"
  | "discord"
  | "twitter"
  | "slack"
  | "spotify";

/**
 * Auth Helper Class
 */
export class AuthHelper {
  private client: SupabaseClient;

  constructor(client: SupabaseClient) {
    this.client = client;
  }

  /**
   * Get user count
   */
  async getUserCount(): Promise<number> {
    try {
      const { count, error } = await this.client
        .from("auth.users")
        .select("id", { count: "exact", head: true });

      if (error) {
        throw error;
      }

      return count || 0;
    } catch (error) {
      logger.warn("Failed to get user count", {
        error: error instanceof Error ? error.message : String(error),
      });
      return 0;
    }
  }

  /**
   * List users with pagination
   */
  async listUsers(
    page = 1,
    pageSize = 50
  ): Promise<{
    users: AuthUserInfo[];
    total: number;
    page: number;
    pageSize: number;
  }> {
    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      const { data, error, count } = await this.client
        .from("auth.users")
        .select("*", { count: "exact" })
        .range(from, to)
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const users: AuthUserInfo[] = (data || []).map((user: Record<string, unknown>) => ({
        id: user['id'] as string,
        email: user['email'] as string | undefined,
        phone: user['phone'] as string | undefined,
        emailConfirmedAt: user['email_confirmed_at'] as string | undefined,
        phoneConfirmedAt: user['phone_confirmed_at'] as string | undefined,
        lastSignInAt: user['last_sign_in_at'] as string | undefined,
        createdAt: user['created_at'] as string,
      }));

      return {
        users,
        total: count || 0,
        page,
        pageSize,
      };
    } catch (error) {
      logger.error("Failed to list users", error as Error);
      return {
        users: [],
        total: 0,
        page,
        pageSize,
      };
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<AuthUserInfo | null> {
    try {
      const { data, error } = await this.client
        .from("auth.users")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        return null;
      }

      return {
        id: data.id,
        email: data.email,
        phone: data.phone,
        emailConfirmedAt: data.email_confirmed_at,
        phoneConfirmedAt: data.phone_confirmed_at,
        lastSignInAt: data.last_sign_in_at,
        createdAt: data.created_at,
      };
    } catch (error) {
      logger.warn("Failed to get user by ID", {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<AuthUserInfo | null> {
    try {
      const { data, error } = await this.client
        .from("auth.users")
        .select("*")
        .eq("email", email)
        .single();

      if (error) {
        throw error;
      }

      if (!data) {
        return null;
      }

      return {
        id: data.id,
        email: data.email,
        phone: data.phone,
        emailConfirmedAt: data.email_confirmed_at,
        phoneConfirmedAt: data.phone_confirmed_at,
        lastSignInAt: data.last_sign_in_at,
        createdAt: data.created_at,
      };
    } catch (error) {
      logger.warn("Failed to get user by email", {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Get enabled auth providers
   */
  async getEnabledProviders(): Promise<AuthProvider[]> {
    // This would typically query the Supabase config
    // For now, return common providers
    return ["email"];
  }

  /**
   * Validate email/password authentication
   */
  async validateEmailAuth(email: string, password: string): Promise<boolean> {
    try {
      const { error } = await this.client.auth.signInWithPassword({
        email,
        password,
      });

      return !error;
    } catch {
      return false;
    }
  }

  /**
   * Get authentication statistics
   */
  async getAuthStats(): Promise<{
    totalUsers: number;
    verifiedEmails: number;
    verifiedPhones: number;
    signInsLast24h?: number;
  }> {
    try {
      const totalUsers = await this.getUserCount();

      const { count: verifiedEmails } = await this.client
        .from("auth.users")
        .select("id", { count: "exact", head: true })
        .not("email_confirmed_at", "is", null);

      const { count: verifiedPhones } = await this.client
        .from("auth.users")
        .select("id", { count: "exact", head: true })
        .not("phone_confirmed_at", "is", null);

      return {
        totalUsers,
        verifiedEmails: verifiedEmails || 0,
        verifiedPhones: verifiedPhones || 0,
      };
    } catch (error) {
      logger.warn("Failed to get auth stats", {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        totalUsers: 0,
        verifiedEmails: 0,
        verifiedPhones: 0,
      };
    }
  }
}
