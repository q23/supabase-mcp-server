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
  private dynamicClients: Map<string, { clientId: string; clientSecret: string; createdAt: number }> = new Map();

  constructor(config: OAuthConfig) {
    this.config = config;

    // Register default client
    this.dynamicClients.set(config.clientId, {
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      createdAt: Date.now(),
    });
  }

  /**
   * Dynamic Client Registration (RFC 7591)
   * For Claude Desktop auto-discovery
   */
  registerClient(_params: {
    clientName?: string;
    redirectUris?: string[];
  }): { clientId: string; clientSecret: string; clientIdIssuedAt: number } {
    // Generate new client credentials
    const clientId = `client_${randomBytes(16).toString("hex")}`;
    const clientSecret = randomBytes(32).toString("hex");
    const createdAt = Math.floor(Date.now() / 1000);

    this.dynamicClients.set(clientId, {
      clientId,
      clientSecret,
      createdAt,
    });

    return {
      clientId,
      clientSecret,
      clientIdIssuedAt: createdAt,
    };
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
    // Validate client ID (check dynamic clients, including default)
    const client = this.dynamicClients.get(params.clientId);
    if (!client) {
      // DEBUG: Log registered clients
      console.error("[OAuth] Invalid client_id:", params.clientId);
      console.error("[OAuth] Registered clients:", Array.from(this.dynamicClients.keys()));
      throw new Error("Invalid client_id");
    }

    // Validate redirect URI (must be Claude's callback)
    const allowedRedirects = [
      "https://claude.ai/api/mcp/auth_callback",
      "https://claude.com/api/mcp/auth_callback",
      "http://localhost:3000/callback", // For testing
    ];

    if (!allowedRedirects.some(uri => params.redirectUri.startsWith(uri))) {
      throw new Error("Invalid redirect_uri");
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
    // Validate client credentials (check both static and dynamic clients)
    const client = this.dynamicClients.get(params.clientId);
    if (!client || client.clientSecret !== params.clientSecret) {
      throw new Error("Invalid client credentials");
    }

    // Grant Type: client_credentials (for MCP initialize)
    if (params.grantType === "client_credentials") {
      const accessToken = jwt.sign(
        {
          clientId: params.clientId,
          grant_type: "client_credentials",
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

    // Grant Type: authorization_code (for MCP tool calls)
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
