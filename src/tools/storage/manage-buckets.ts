import type { SupabaseClient } from "@supabase/supabase-js";
import type { ToolResponse } from "../../types/mcp.js";

export async function manageBuckets(
  client: SupabaseClient,
  action: "list" | "create" | "delete",
  bucketName?: string
): Promise<ToolResponse> {
  try {
    if (action === "list") {
      const { data, error } = await client.storage.listBuckets();
      if (error) throw error;

      return {
        content: [{ type: "text", text: `Buckets: ${data?.length || 0}\n${data?.map(b => b.name).join("\n")}` }],
        _meta: data,
      };
    }

    if (action === "create" && bucketName) {
      const { data, error } = await client.storage.createBucket(bucketName);
      if (error) throw error;

      return {
        content: [{ type: "text", text: `✅ Bucket created: ${bucketName}` }],
      };
    }

    return {
      content: [{ type: "text", text: "Invalid action or missing bucket name" }],
      isError: true,
    };
  } catch (error) {
    return {
      content: [{ type: "text", text: `Bucket management failed: ${error instanceof Error ? error.message : String(error)}` }],
      isError: true,
    };
  }
}
