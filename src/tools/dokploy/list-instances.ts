import { InstanceRegistry } from "../../lib/orchestration/instance-registry.js";
import type { ToolResponse } from "../../types/mcp.js";

export async function dokployListInstances(
  registry: InstanceRegistry,
  filter?: { environment?: string }
): Promise<ToolResponse> {
  const instances = registry.list(filter);

  return {
    content: [{
      type: "text",
      text: `Instances: ${instances.length}\n${instances.map(i => `${i.name} (${i.environment}): ${i.status}`).join("\n")}`,
    }],
    _meta: instances,
  };
}
