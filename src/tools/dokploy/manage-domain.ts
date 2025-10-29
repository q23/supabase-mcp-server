import type { DokployAPIClient } from "../../lib/dokploy/api-client.js";
import type { DomainConfig } from "../../types/dokploy.js";
import type { ToolResponse } from "../../types/mcp.js";

export async function manageDomain(
  applicationId: string,
  domain: DomainConfig,
  dokployClient: DokployAPIClient
): Promise<ToolResponse> {
  try {
    await dokployClient.configureDomain(applicationId, domain);

    return {
      content: [{ type: "text", text: `✅ Domain configured: ${domain.domain}\nSSL: ${domain.ssl ? "Enabled" : "Disabled"}` }],
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Domain configuration failed: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
}
