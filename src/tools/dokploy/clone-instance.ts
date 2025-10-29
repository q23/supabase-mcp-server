import type { DokployAPIClient } from "../../lib/dokploy/api-client.js";
import type { ToolResponse } from "../../types/mcp.js";

export async function cloneInstance(
  sourceApplicationId: string,
  newName: string,
  dokployClient: DokployAPIClient
): Promise<ToolResponse> {
  try {
    const source = await dokployClient.getApplication(sourceApplicationId);

    const cloned = await dokployClient.createApplication({
      projectName: newName,
      domain: `${newName}.example.com`,
      env: source.env,
    });

    return {
      content: [{ type: "text", text: `✅ Instance cloned: ${cloned.id}` }],
      _meta: cloned,
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Clone failed: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
}
