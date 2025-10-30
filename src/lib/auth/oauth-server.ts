/**
 * Simple OAuth 2.1 Server for MCP
 * Provides authorization and token endpoints for Claude Desktop
 */

import jwt from "jsonwebtoken";
import { randomBytes } from "node:crypto";

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  jwtSecret: string;
  tokenExpiry: number; // seconds
}

interface AuthorizationCode {
  code: string;
  clientId: string;
  expiresAt: number;
  codeChallenge?: string;
  codeChallengeMethod?: string;
}

export class OAuthServer {
  private config: OAuthConfig;
  private authCodes: Map<string, AuthorizationCode> = new Map();

  constructor(config: OAuthConfig) {
    this.config = config;
  }

  /**
   * Authorization endpoint - generates authorization code
   */
  authorize(params: {
    clientId: string;
    redirectUri: string;
    state?: string;
    codeChallenge?: string;
    codeChallengeMethod?: string;
  }): { code: string; redirectUri: string } {
    if (params.clientId !== this.config.clientId) {
      throw new Error("Invalid client_id");
    }

    // Generate authorization code
    const code = randomBytes(32).toString("hex");
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    this.authCodes.set(code, {
      code,
      clientId: params.clientId,
      expiresAt,
      codeChallenge: params.codeChallenge,
      codeChallengeMethod: params.codeChallengeMethod,
    });

    // Build redirect URL
    const url = new URL(params.redirectUri);
    url.searchParams.set("code", code);
    if (params.state) {
      url.searchParams.set("state", params.state);
    }

    return {
      code,
      redirectUri: url.toString(),
    };
  }

  /**
   * Token endpoint - exchanges authorization code for access token
   */
  token(params: {
    grantType: string;
    code?: string;
    clientId: string;
    clientSecret: string;
    redirectUri?: string;
    codeVerifier?: string;
  }): { accessToken: string; tokenType: string; expiresIn: number } {
    // Validate client credentials
    if (
      params.clientId !== this.config.clientId ||
      params.clientSecret !== this.config.clientSecret
    ) {
      throw new Error("Invalid client credentials");
    }

    if (params.grantType === "authorization_code") {
      if (!params.code) {
        throw new Error("Missing authorization code");
      }

      const authCode = this.authCodes.get(params.code);
      if (!authCode) {
        throw new Error("Invalid or expired authorization code");
      }

      // Check expiration
      if (Date.now() > authCode.expiresAt) {
        this.authCodes.delete(params.code);
        throw new Error("Authorization code expired");
      }

      // Verify PKCE if used
      if (authCode.codeChallenge && params.codeVerifier) {
        // Simplified - would need proper PKCE validation
        // For now, just check it exists
      }

      // Delete used code (one-time use)
      this.authCodes.delete(params.code);

      // Generate access token
      const accessToken = jwt.sign(
        {
          clientId: params.clientId,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + this.config.tokenExpiry,
        },
        this.config.jwtSecret
      );

      return {
        accessToken,
        tokenType: "Bearer",
        expiresIn: this.config.tokenExpiry,
      };
    }

    throw new Error("Unsupported grant_type");
  }

  /**
   * Validate access token
   */
  validateToken(token: string): boolean {
    try {
      jwt.verify(token, this.config.jwtSecret);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Cleanup expired auth codes
   */
  cleanupExpiredCodes(): void {
    const now = Date.now();
    for (const [code, authCode] of this.authCodes.entries()) {
      if (now > authCode.expiresAt) {
        this.authCodes.delete(code);
      }
    }
  }
}
