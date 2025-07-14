import { AgentService } from "@/lib/core/agent-service";

/**
 * Search for images using Tavily API
 */
export async function searchImages(payload: {
  query: string;
  tavilyApiKey: string;
}): Promise<Response> {
  try {
    const { query, tavilyApiKey } = payload;

    if (!query) {
      return new Response(JSON.stringify({
        success: false,
        error: "Query is required",
      }), { 
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!tavilyApiKey) {
      return new Response(JSON.stringify({
        success: false,
        error: "Tavily API key is required",
      }), { 
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const agentService = new AgentService();
    const searchResult = await agentService.searchImages(query, tavilyApiKey);

    return new Response(JSON.stringify(searchResult), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Image search failed:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Unknown error during image search",
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
} 
