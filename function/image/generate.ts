import { AgentService } from "@/lib/core/agent-service";

/**
 * Generate image using configured image generation service
 */
export async function generateImage(payload: {
  description: string;
  characterData: any;
  llmConfig: any;
}): Promise<Response> {
  try {
    const { description, characterData, llmConfig } = payload;

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
    const generateResult = await agentService.generateImageWithAI(description, llmConfig);

    return new Response(JSON.stringify(generateResult), {
      headers: { "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Image generation failed:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || "Unknown error during image generation",
    }), { 
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
} 
