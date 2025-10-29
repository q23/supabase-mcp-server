import { SupabaseClientWrapper } from "../../lib/supabase/client.js";
import { AuthHelper } from "../../lib/supabase/auth-helper.js";
import type { ToolResponse } from "../../types/mcp.js";

export async function manageProviders(
  supabaseClient: SupabaseClientWrapper
): Promise<ToolResponse> {
  try {
    const authHelper = new AuthHelper(supabaseClient.getClient());
    const providers = await authHelper.getEnabledProviders();

    return {
      content: [{ type: "text", text: `Enabled providers:\n${providers.join("\n")}` }],
      _meta: providers,
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Provider management failed: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
}
