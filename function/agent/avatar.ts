import { AgentService } from "@/lib/core/agent-service";

/**
 * Generate avatar for an agent session
 */
export async function generateAvatar(searchParams: URLSearchParams): Promise<{
  success: boolean;
  message?: string;
  data?: {
    imageDescription?: string;
    imageUrl?: string;
    localImagePath?: string;
    outputFilePath?: string;
    candidateImages?: string[];
    generatedImage?: boolean;
  };
  error?: string;
}> {
  try {
    const sessionId = searchParams.get("sessionId");
    
    if (!sessionId) {
      return {
        success: false,
        error: "Session ID is required",
      };
    }

    // Get user input options from URL parameters
    const imageChoice = searchParams.get("imageChoice") as "search" | "generate" | null;
    const imageStyle = searchParams.get("imageStyle") || undefined;

    const agentService = new AgentService();

    // Create a user input callback for Web UI
    const userInputCallback = async (question?: string, options?: string[]): Promise<string> => {
      if (!question || !options || options.length === 0) {
        return ""; // Fallback for invalid input
      }
      
      // For image choice, use URL parameter if provided
      if (question.includes("How would you like to get the character image?") && imageChoice) {
        if (imageChoice === "generate") {
          return "Generate new image with AI (slower, creates unique image)";
        } else {
          return "Search for existing images online (faster, uses web search)";
        }
      }
      
      // For image style, use URL parameter if provided
      if (question.includes("Choose the style for your AI-generated image:") && imageStyle) {
        // Find matching style option
        const matchingOption = options.find(option => 
          option.toLowerCase().includes(imageStyle.toLowerCase()) ||
          imageStyle.toLowerCase().includes(option.toLowerCase()),
        );
        return matchingOption || options[1] || options[0]; // Default to second option (Anime style) or first if not available
      }
      
      // Default fallbacks
      if (question.includes("How would you like to get the character image?")) {
        return options[0]; // Default to search
      }
      if (question.includes("Choose the style for your AI-generated image:")) {
        return options[1] || options[0]; // Default to anime style or first option
      }
      
      return options[0]; // Default to first option
    };

    // Generate avatar with user input callback
    const result = await agentService.generateAvatar(sessionId, userInputCallback);

    if (!result.success) {
      return {
        success: false,
        error: result.error || "Avatar generation failed",
      };
    }

    return {
      success: true,
      message: "Avatar generated successfully",
      data: {
        imageDescription: result.imageDescription,
        imageUrl: result.imageUrl,
        localImagePath: result.localImagePath,
        outputFilePath: result.outputFilePath,
        candidateImages: result.candidateImages,
        generatedImage: result.generatedImage,
      },
    };

  } catch (error) {
    console.error("Avatar generation failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error during avatar generation",
    };
  }
} 
