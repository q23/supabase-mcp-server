import type { SupabaseClient } from "@supabase/supabase-js";
import type { ToolResponse } from "../../types/mcp.js";

export async function manageFunctions(
  client: SupabaseClient,
  action: "list" | "invoke",
  functionName?: string,
  args?: Record<string, unknown>
): Promise<ToolResponse> {
  try {
    if (action === "invoke" && functionName) {
      const { data, error } = await client.functions.invoke(functionName, { body: args });
      if (error) throw error;

      return {
        content: [{ type: "text", text: `✅ Function invoked: ${functionName}\nResult: ${JSON.stringify(data)}` }],
        _meta: data,
      };
    }

    return {
      content: [{ type: "text", text: "Function list not implemented yet" }],
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Function management failed: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
}
