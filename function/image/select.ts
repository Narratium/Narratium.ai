import { AgentService } from "@/lib/core/agent-service";

/**
 * Select best image from a list using Jina AI
 */
export async function selectBestImage(payload: {
  imageUrls: string[];
  description: string;
  llmConfig: any;
  characterData: any;
}): Promise<Response> {
  try {
    const { imageUrls, description, llmConfig, characterData } = payload;

    if (!imageUrls || imageUrls.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        error: "Image URLs are required",
      }), { 
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (!description) {
      return new Response(JSON.stringify({
        success: false,
        error: "Description is required",
      }), { 
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const agentService = new AgentService();
    const selectedImageUrl = await agentService.selectBestImage(imageUrls, description, llmConfig, characterData);

    return new Response(JSON.stringify({
      success: true,
      selectedImageUrl,
    }), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Image selection failed:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Unknown error during image selection",
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
} 
