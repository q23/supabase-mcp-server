import type { ToolResponse } from "../../types/mcp.js";

export async function searchDocs(query: string): Promise<ToolResponse> {
  // Simple docs search - would integrate with Supabase docs API
  const mockResults = [
    { title: "Getting Started", url: "https://supabase.com/docs" },
    { title: "Database", url: "https://supabase.com/docs/guides/database" },
  ];

  return {
    content: [{
      type: "text",
      text: `Search results for "${query}":\n${mockResults.map(r => `${r.title}: ${r.url}`).join("\n")}`,
    }],
    _meta: mockResults,
  };
}
