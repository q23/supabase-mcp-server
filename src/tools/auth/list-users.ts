import { SupabaseClientWrapper } from "../../lib/supabase/client.js";
import { AuthHelper } from "../../lib/supabase/auth-helper.js";
import type { ToolResponse } from "../../types/mcp.js";

export async function listUsers(
  supabaseClient: SupabaseClientWrapper,
  page = 1,
  pageSize = 50
): Promise<ToolResponse> {
  try {
    const authHelper = new AuthHelper(supabaseClient.getClient());
    const result = await authHelper.listUsers(page, pageSize);

    return {
      content: [{
        type: "text",
        text: `Users: ${result.total}\nPage ${result.page}/${Math.ceil(result.total / pageSize)}\n${result.users.map(u => `${u.email || u.phone}: ${u.id}`).join("\n")}`,
      }],
      _meta: result,
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `List users failed: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
}
