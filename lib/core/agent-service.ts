import { AgentEngine, StreamingCallback } from "./agent-engine";
import { ResearchSessionOperations } from "../data/agent/agent-conversation-operations";
import { ResearchSession, SessionStatus } from "@/lib/models/agent-model";
import { ConfigManager, loadConfigFromLocalStorage } from "./config-manager";

// Define user input callback type
type UserInputCallback = (message?: string, options?: string[]) => Promise<string>;

/**
 * Agent Service - Simplified for Real-time Decision Architecture
 * High-level API for character+worldbook generation with real-time planning
 */
export class AgentService {
  private configManager: ConfigManager;

  constructor() {
    this.configManager = ConfigManager.getInstance();
  }

  /**
   * Start a new character generation conversation with user input callback
   */
  async startGeneration(
    initialUserRequest: string,
    userInputCallback?: UserInputCallback,
    streamingCallback?: StreamingCallback,
  ): Promise<{
    conversationId: string;
    success: boolean;
    result?: any;
    error?: string;
  }> {
    try {
      // Ensure ConfigManager is initialized
      if (!this.configManager.isConfigured()) {
        const config = loadConfigFromLocalStorage();
        this.configManager.setConfig(config);
      }

      const session = await ResearchSessionOperations.createSession(
        initialUserRequest,
      );
      
      // Create agent engine with user input and streaming callbacks
      const engine = new AgentEngine(session.id, userInputCallback, streamingCallback);
      
      // Start execution with callback
      const result = await engine.start(userInputCallback);
      
      return {
        conversationId: session.id,
        success: result.success,
        result: result.result,
        error: result.error,
      };
      
    } catch (error) {
      console.error("Failed to start generation:", error);
      return {
        conversationId: "",
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Start execution on an existing session
   */
  async startExistingSession(
    sessionId: string,
    userInputCallback?: UserInputCallback,
    streamingCallback?: StreamingCallback,
  ): Promise<{
    success: boolean;
    result?: any;
    error?: string;
  }> {
    try {
      // Ensure ConfigManager is initialized
      if (!this.configManager.isConfigured()) {
        const config = loadConfigFromLocalStorage();
        this.configManager.setConfig(config);
      }

      // Check if LLM configuration is available
      if (!this.configManager.isConfigured()) {
        return {
          success: false,
          error: "LLM configuration not found. Please run configuration setup first.",
        };
      }

      // Check if session exists
      const session = await ResearchSessionOperations.getSessionById(sessionId);
      if (!session) {
        return {
          success: false,
          error: "Session not found",
        };
      }

      // Create new agent engine for this execution
      const engine = new AgentEngine(sessionId, userInputCallback, streamingCallback);
      
      // Start execution with callback
      const result = await engine.start(userInputCallback);
      
      return {
        success: result.success,
        result: result.result,
        error: result.error,
      };
      
    } catch (error) {
      console.error("Failed to start existing session:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get conversation status and progress with new data structure
   */
  async getSessionStatus(sessionId: string): Promise<{
    session: ResearchSession | null;
    status: SessionStatus;
    progress: {
      completedTasks: number;
      totalIterations: number;
      knowledgeBaseSize: number;
    };
    hasResult: boolean;
    result?: any;
  }> {
    try {
      const session = await ResearchSessionOperations.getSessionById(sessionId);
      if (!session) {
        return {
          session: null,
          status: SessionStatus.FAILED,
          progress: {
            completedTasks: 0,
            totalIterations: 0,
            knowledgeBaseSize: 0,
          },
          hasResult: false,
        };
      }
      
      // Check completion using new character_progress structure
      const hasCharacterData = !!session.generation_output.character_data;
      // Check if all mandatory worldbook components exist and supplement_data has content (at least 5 valid entries)
      const hasAllWorldbookComponents = !!session.generation_output.status_data && 
                                      !!session.generation_output.user_setting_data && 
                                      !!session.generation_output.world_view_data && 
                                      (session.generation_output.supplement_data && session.generation_output.supplement_data.filter(e => e.content && e.content.trim() !== "").length >= 5);
      
      const hasResult = hasCharacterData && hasAllWorldbookComponents;
      
      return {
        session: session,
        status: session.status,
        progress: {
          completedTasks: session.research_state.completed_tasks.length,
          totalIterations: session.execution_info.current_iteration,
          knowledgeBaseSize: session.research_state.knowledge_base.length,
        },
        hasResult: hasResult || false,
        result: hasResult ? {
          character_data: session.generation_output.character_data,
          status_data: session.generation_output.status_data,
          user_setting_data: session.generation_output.user_setting_data,
          world_view_data: session.generation_output.world_view_data,
          supplement_data: session.generation_output.supplement_data,
          knowledge_base: session.research_state.knowledge_base,
          completion_status: session,
        } : undefined,
      };
      
    } catch (error) {
      console.error("Failed to get conversation status:", error);
      return {
        session: null,
        status: SessionStatus.FAILED,
        progress: {
          completedTasks: 0,
          totalIterations: 0,
          knowledgeBaseSize: 0,
        },
        hasResult: false,
      };
    }
  }

  /**
   * List all conversations for a user
   */
  async listConversations(): Promise<ResearchSession[]> {
    try {
      return await ResearchSessionOperations.getAllSessions();
    } catch (error) {
      console.error("Failed to list conversations:", error);
      return [];
    }
  }

  /**
   * Delete a conversation
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      // Delete from storage
      await ResearchSessionOperations.deleteSession(sessionId);
      return true;
    } catch (error) {
      console.error("Failed to delete conversation:", error);
      return false;
    }
  }

  /**
   * Clear all sessions from storage and memory
   */
  async clearAllSessions(): Promise<void> {
    try {
      // Clear all sessions from storage
      await ResearchSessionOperations.clearAll();
      console.log("All sessions cleared from storage.");
    } catch (error) {
      console.error("Failed to clear all sessions:", error);
      throw error; // Re-throw to be caught by CLI
    }
  }

  /**
   * Get conversation messages for UI display
   */
  async getMessages(sessionId: string): Promise<{
    messages: any[];
    messageCount: number;
  }> {
    try {
      const session = await ResearchSessionOperations.getSessionById(sessionId);
      if (!session) {
        return {
          messages: [],
          messageCount: 0,
        };
      }
      
      return {
        messages: session.messages,
        messageCount: session.messages.length,
      };
      
    } catch (error) {
      console.error("Failed to get conversation messages:", error);
      return {
        messages: [],
        messageCount: 0,
      };
    }
  }

  /**
   * Get task state for debugging (replaces planning status)
   */
  async getResearchState(sessionId: string): Promise<{
    mainObjective: string;
    completedTasks: string[];
    knowledgeBase: any[];
  }> {
    try {
      const session = await ResearchSessionOperations.getSessionById(sessionId);
      if (!session) {
        return {
          mainObjective: "",
          completedTasks: [],
          knowledgeBase: [],
        };
      }
      
      return {
        mainObjective: session.research_state.main_objective,
        completedTasks: session.research_state.completed_tasks,
        knowledgeBase: session.research_state.knowledge_base,
      };
      
    } catch (error) {
      console.error("Failed to get task state:", error);
      return {
        mainObjective: "",
        completedTasks: [],
        knowledgeBase: [],
      };
    }
  }

  /**
   * Get character progress for UI display
   */
  async getGenerationOutput(sessionId: string): Promise<{
    hasCharacter: boolean;
    characterData?: any;
    hasStatusData: boolean;
    hasUserSettingData: boolean;
    hasWorldViewData: boolean;
    supplementDataCount: number;
    statusData?: any;
    userSettingData?: any;
    worldViewData?: any;
    supplementData?: any[];
  }> {
    try {
      const session = await ResearchSessionOperations.getSessionById(sessionId);
      if (!session) {
        return {
          hasCharacter: false,
          hasStatusData: false,
          hasUserSettingData: false,
          hasWorldViewData: false,
          supplementDataCount: 0,
        };
      }
      
      const hasCharacter = !!session.generation_output.character_data;
      const hasStatus = !!session.generation_output.status_data;
      const hasUserSetting = !!session.generation_output.user_setting_data;
      const hasWorldView = !!session.generation_output.world_view_data;
      const validSupplementCount = session.generation_output.supplement_data?.filter(e => e.content && e.content.trim() !== "").length || 0;

      return {
        hasCharacter,
        characterData: session.generation_output.character_data,
        hasStatusData: hasStatus,
        hasUserSettingData: hasUserSetting,
        hasWorldViewData: hasWorldView,
        supplementDataCount: validSupplementCount,
        statusData: session.generation_output.status_data,
        userSettingData: session.generation_output.user_setting_data,
        worldViewData: session.generation_output.world_view_data,
        supplementData: session.generation_output.supplement_data,
      };
      
    } catch (error) {
      console.error("Failed to get character progress:", error);
      return {
        hasCharacter: false,
        hasStatusData: false,
        hasUserSettingData: false,
        hasWorldViewData: false,
        supplementDataCount: 0,
      };
    }
  }

  /**
   * Export conversation data
   */
  async exportConversation(sessionId: string): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const session = await ResearchSessionOperations.getSessionById(sessionId);
      if (!session) {
        return {
          success: false,
          error: "Conversation not found",
        };
      }
      
      const exportData = {
        session,
        exportedAt: new Date().toISOString(),
        version: "4.0", // Updated to new simplified architecture
        architecture: "real-time-decision",
      };
      
      return {
        success: true,
        data: exportData,
      };
      
    } catch (error) {
      console.error("Failed to export conversation:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get generation statistics with new data structure
   */
  async getGenerationStats(): Promise<{
    totalConversations: number;
    completedGenerations: number;
    successRate: number;
    averageIterations: number;
    statusBreakdown: Record<string, number>;
    averageKnowledgeBaseSize: number;
    averageTokensUsed: number;
  }> {
    try {
      const sessions = await ResearchSessionOperations.getAllSessions();
      
      const statusBreakdown: Record<string, number> = {};
      let totalIterations = 0;
      let completedGenerations = 0;
      let totalKnowledgeBaseSize = 0;
      let totalTokensUsed = 0;
      
      sessions.forEach(session => {
        // Count by status
        statusBreakdown[session.status] = (statusBreakdown[session.status] || 0) + 1;
        
        // Count iterations
        totalIterations += session.execution_info.current_iteration;
        
        // Count tokens used
        totalTokensUsed += session.execution_info.total_tokens_used || 0;
        
        // Count knowledge base size
        totalKnowledgeBaseSize += session.research_state.knowledge_base.length;
        
        // Count completed generations
        if (session.status === SessionStatus.COMPLETED && 
            session.generation_output.character_data && 
            session.generation_output.status_data &&
            session.generation_output.user_setting_data &&
            session.generation_output.world_view_data &&
            (session.generation_output.supplement_data && session.generation_output.supplement_data.length >= 5)) {
          completedGenerations++;
        }
       
      });
      
      const successRate = sessions.length > 0 
        ? (completedGenerations / sessions.length) * 100 
        : 0;
        
      const averageIterations = sessions.length > 0 
        ? totalIterations / sessions.length 
        : 0;

      const averageKnowledgeBaseSize = sessions.length > 0
        ? totalKnowledgeBaseSize / sessions.length
        : 0;

      const averageTokensUsed = sessions.length > 0
        ? totalTokensUsed / sessions.length
        : 0;
      
      return {
        totalConversations: sessions.length,
        completedGenerations,
        successRate,
        averageIterations,
        statusBreakdown,
        averageKnowledgeBaseSize,
        averageTokensUsed,
      };
      
    } catch (error) {
      console.error("Failed to get generation stats:", error);
      return {
        totalConversations: 0,
        completedGenerations: 0,
        successRate: 0,
        averageIterations: 0,
        statusBreakdown: {},
        averageKnowledgeBaseSize: 0,
        averageTokensUsed: 0,
      };
    }
  }

  /**
   * Get conversation summary for quick display
   */
  async getConversationSummary(sessionId: string): Promise<{
    title: string;
    status: SessionStatus;
    messageCount: number;
    hasCharacter: boolean;
    hasWorldbook: boolean;
    completionPercentage: number;
    knowledgeBaseSize: number;
  } | null> {
    try {
      return await ResearchSessionOperations.getSessionSummary(sessionId);
    } catch (error) {
      console.error("Failed to get conversation summary:", error);
      return null;
    }
  }

  /**
   * Cleanup resources for a conversation
   */
  async cleanup(conversationId: string): Promise<void> {
    // No need to clean up as the engine is stateless
  }

  /**
   * Handle user response for sessions waiting for user input
   */
  async respondToAgent(sessionId: string, userResponse: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const session = await ResearchSessionOperations.getSessionById(sessionId);
      if (!session) {
        return {
          success: false,
          error: "Session not found",
        };
      }

      // Check if session is waiting for user input
      if (session.status !== SessionStatus.WAITING_USER) {
        return {
          success: false,
          error: "Session is not waiting for user input",
        };
      }

      // Add user response message to session
      await ResearchSessionOperations.addMessage(sessionId, {
        role: "user",
        content: userResponse,
        type: "user_input",
      });

      // Update session status to continue execution
      await ResearchSessionOperations.updateStatus(sessionId, SessionStatus.THINKING);

      // Create a new engine for this session to continue execution
      // AgentEngine should be stateless and recreatable
      const engine = new AgentEngine(sessionId);
      
      // Continue execution from where it left off
      // The engine will read the current state from the session
      engine.continueExecution(userResponse).catch((error) => {
        console.error("Failed to continue agent execution:", error);
        ResearchSessionOperations.updateStatus(sessionId, SessionStatus.FAILED);
      });

      return {
        success: true,
      };
      
    } catch (error) {
      console.error("Failed to respond to agent:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Generate avatar image with download and file output
   */
  async generateAvatar(conversationId: string, userInputCallback?: UserInputCallback): Promise<{
    success: boolean;
    imageDescription?: string;
    imageUrl?: string;
    localImagePath?: string;
    outputFilePath?: string;
    candidateImages?: string[];
    generatedImage?: boolean;
    error?: string;
  }> {
    try {
      // Ensure ConfigManager is initialized
      if (!this.configManager.isConfigured()) {
        const config = loadConfigFromLocalStorage();
        this.configManager.setConfig(config);
      }

      // Check if LLM configuration is available
      if (!this.configManager.isConfigured()) {
        return {
          success: false,
          error: "LLM configuration not found. Please run configuration setup first.",
        };
      }

      // Get the session data
      const session = await ResearchSessionOperations.getSessionById(conversationId);
      if (!session) {
        return { success: false, error: "Session not found" };
      }

      const characterData = session.generation_output.character_data;
      const mainObjective = session.research_state.main_objective;

      if (!characterData) {
        return { success: false, error: "No character data found for avatar generation" };
      }

      let selectedImageUrl: string;
      let imageDescription: string = "";
      let candidateImages: string[] = [];
      let generatedImage: boolean = false;

      // Check if character already has an avatar URL (resume mode)
      if (characterData.avatar && this.isValidImageUrl(characterData.avatar)) {
        selectedImageUrl = characterData.avatar;
        imageDescription = "Using existing avatar URL from character data";
      } else {
        const llmConfig = this.configManager.getLLMConfig();
        
        // Debug: Log configuration
        console.log("Avatar generation LLM config:", {
          tavily_api_key: llmConfig.tavily_api_key ? "***configured***" : "missing",
          jina_api_key: llmConfig.jina_api_key ? "***configured***" : "missing",
          fal_api_key: llmConfig.fal_api_key ? "***configured***" : "missing",
        });
        
        // Step 1: Ask user to choose between search and generation
        const choice = await this.askUserForImageChoice(userInputCallback);
        
        if (choice === "generate") {
          // Step 2: Ask user to choose image style for AI generation
          const selectedStyle = await this.askUserForImageStyle(userInputCallback);
          // Generate detailed prompt for AI image generation with selected style
          imageDescription = await this.generateAIImagePrompt(mainObjective, characterData, llmConfig, selectedStyle);
          // Generate image using AI
          const generationResult = await this.generateImageWithAI(imageDescription, llmConfig);
          
          if (!generationResult.success || !generationResult.imageUrl) {
            return {
              success: false,
              error: generationResult.error || "Image generation failed",
              imageDescription,
            };
          }
          
          selectedImageUrl = generationResult.imageUrl;
          generatedImage = true;
        } else {
          // Generate search-optimized description for image search
          imageDescription = await this.generateImageDescription(mainObjective, characterData, llmConfig);
          // Search for images (original behavior)
          const imageResults = await this.searchImages(imageDescription, llmConfig.tavily_api_key || "");
        
          if (!imageResults.success || !imageResults.images || imageResults.images.length === 0) {
            return { 
              success: false, 
              error: imageResults.error || "No images found",
              imageDescription, 
            };
          }

          candidateImages = imageResults.images;

          // Step 3: Select best image using Jina AI
          const selectedUrl = await this.selectBestImage(imageResults.images, imageDescription, llmConfig, characterData);
        
          if (!selectedUrl) {
            return { 
              success: false, 
              error: "No suitable image could be selected",
              imageDescription,
              candidateImages: candidateImages,
            };
          }
        
          selectedImageUrl = selectedUrl;
        }
      }

      // Step 4: Download image and convert to PNG
      const downloadResult = await this.downloadAndConvertImage(selectedImageUrl, characterData.name || "character");
      
      if (!downloadResult.success) {
        return {
          success: false,
          error: downloadResult.error,
          imageDescription,
          imageUrl: selectedImageUrl,
          candidateImages: candidateImages,
          generatedImage,
        };
      }

      // Step 5: Update character data with local image path
      await ResearchSessionOperations.updateGenerationOutput(conversationId, {
        character_data: {
          ...characterData,
          avatar: downloadResult.localPath,
        },
      });

      // Step 6: Generate standard format and embed in PNG
      const outputResult = await this.generateStandardFormatFile(conversationId, downloadResult.localPath || "");
      
      // Step 7: Embed JSON data into PNG metadata
      let embeddedImageUrl = selectedImageUrl;
      if (outputResult.success && outputResult.standardFormat && downloadResult.localPath) {
        const embedResult = await this.embedJsonInPng(downloadResult.localPath, outputResult.standardFormat);
        if (embedResult.success && embedResult.embeddedImageUrl) {
          embeddedImageUrl = embedResult.embeddedImageUrl;
        }
      }

      return {
        success: true,
        imageDescription,
        imageUrl: embeddedImageUrl, // Return the embedded PNG URL instead of original URL
        localImagePath: downloadResult.localPath,
        outputFilePath: outputResult.outputPath,
        candidateImages: candidateImages,
        generatedImage,
      };

    } catch (error) {
      console.error("Avatar generation failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error during avatar generation",
      };
    }
  }

  /**
   * Ask user to choose between searching for images or generating them with AI
   */
  private async askUserForImageChoice(userInputCallback?: UserInputCallback): Promise<"search" | "generate"> {
    // If we have a user input callback, use it for interaction
    if (userInputCallback) {
      const choice = await userInputCallback(
        "How would you like to get the character image?",
        ["Search for existing images online (faster, uses web search)", "Generate new image with AI (slower, creates unique image)"],
      );
      
      // Map the choice to our return type
      if (choice.includes("Generate")) {
        return "generate";
      } else {
        return "search";
      }
    }
    
    // For web UI without callback, default to search (can be overridden later)
    return "search";
  }

  /**
   * Ask user to choose image style for AI generation
   */
  private async askUserForImageStyle(userInputCallback?: UserInputCallback): Promise<string> {
    const styleOptions = [
      "Cute/Kawaii Style - kawaii, adorable, soft lighting, pastel colors, innocent expression",
      "Japanese Anime Style - anime artwork, anime style, key visual, vibrant, studio anime, highly detailed", 
      "Sci-fi/Tech Style - neonpunk style, cyberpunk, vaporwave, neon, vibes, vibrant, ultramodern, high contrast, cinematic",
      "Realistic/Photographic Style - cinematic photo, 35mm photograph, film, bokeh, professional, 4k, highly detailed",
      "Fantasy Style - ethereal fantasy concept art, magnificent, celestial, ethereal, painterly, epic, majestic, magical",
      "Dark/Gothic Style - dark atmosphere, gothic, dramatic lighting, moody, shadows, mysterious",
      "Minimalist Style - clean, simple, minimalist, modern, elegant, white background",
      "Retro/Vintage Style - analog film photo, faded film, desaturated, grainy, vignette, vintage, Kodachrome",
    ];

    // Create display options (only the part before the dash) for user selection
    const displayOptions = styleOptions.map(option => option.split(" - ")[0]);

    // If we have a user input callback, use it for interaction
    if (userInputCallback) {
      const choice = await userInputCallback(
        "Choose the style for your AI-generated image:",
        displayOptions,
      );
      
      // Find the full option that matches the selected display name
      const selectedFullOption = styleOptions.find(option => option.startsWith(choice));
      return selectedFullOption || choice;
    }
    
    // For web UI without callback, default to anime style
    return styleOptions[1]; // Japanese Anime Style
  }

  /**
   * Generate image using fal-ai Stable Diffusion API
   */
  public async generateImageWithAI(description: string, llmConfig: any): Promise<{
    success: boolean;
    imageUrl?: string;
    error?: string;
  }> {
    try {
      // Check if FAL API key is configured
      const falApiKey = llmConfig.fal_api_key;
      if (!falApiKey || falApiKey.trim() === "") {
        return {
          success: false,
          error: "FAL API key not configured. Please set up your FAL API key in configuration.",
        };
      }

      console.log("Generating image with AI...");
      
      // Import fal-ai client
      const { fal } = await import("@fal-ai/client");
      
      // Configure fal client
      fal.config({
        credentials: falApiKey,
      });

      // Generate image using Stable Diffusion 3.5 Large
      const result = await fal.subscribe("fal-ai/stable-diffusion-v35-large", {
        input: {
          prompt: description,
          negative_prompt: "blurry, low quality, distorted, deformed, bad anatomy, ugly, worst quality, low resolution, watermark, text, signature",
          num_inference_steps: 28,
          guidance_scale: 3.5,
          num_images: 1,
          enable_safety_checker: true,
          output_format: "jpeg",
          image_size: "portrait_4_3", // Good for character portraits
        },
        logs: true,
        onQueueUpdate: (update) => {
          if (update.status === "IN_PROGRESS") {
            console.log("Generation in progress...");
            if (update.logs) {
              update.logs.map((log) => log.message).forEach(console.log);
            }
          }
        },
      });

      if (result.data && result.data.images && result.data.images.length > 0) {
        const imageUrl = result.data.images[0].url;
        console.log("Image generated successfully:", imageUrl);
        
        return {
          success: true,
          imageUrl: imageUrl,
        };
      } else {
        return {
          success: false,
          error: "No image generated by AI",
        };
      }
      
    } catch (error) {
      console.error("AI image generation failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error during AI image generation",
      };
    }
  }

  /**
   * Generate AI image prompt with style
   */
  private async generateAIImagePrompt(objective: string, characterData: any, llmConfig: any, selectedStyle: string): Promise<string> {
    // Extract style-specific keywords from the selected style option
    const styleKeywords = selectedStyle.includes(" - ") ? selectedStyle.split(" - ")[1] : selectedStyle;
    
    const prompt = `
Please create a detailed image generation prompt for a character based on the following information:

Character Name: ${characterData.name || "Character"}
Character Description: ${characterData.description || ""}
Background/Context: ${objective}
Style Requirements: ${styleKeywords}

Generate a detailed prompt suitable for Stable Diffusion that includes:
1. Character appearance details
2. Art style (${styleKeywords})
3. Composition and framing
4. Quality modifiers

Make the prompt concise but descriptive, focusing on visual elements. Avoid including the character's name in the prompt.
`;

    try {
      const response = await this.generateResponse(prompt, llmConfig);
      return response.text || `${characterData.description}, ${styleKeywords}`;
    } catch (error) {
      console.error("Failed to generate AI image prompt:", error);
      // Fallback to basic description
      return `${characterData.description}, ${styleKeywords}`;
    }
  }

  /**
   * Generate image description for search
   */
  private async generateImageDescription(objective: string, characterData: any, llmConfig: any): Promise<string> {
    const prompt = `
Based on the following character information, generate a concise image search description (max 50 words) that would help find a suitable character portrait/avatar:

Character Name: ${characterData.name || "Character"}
Character Description: ${characterData.description || ""}
Background/Context: ${objective}

Focus on key visual characteristics like appearance, clothing, setting, or style. Avoid using the character's actual name.
Respond with just the search description, no additional text.
`;

    try {
      const response = await this.generateResponse(prompt, llmConfig);
      return response.text || characterData.description || "character portrait";
    } catch (error) {
      console.error("Failed to generate image description:", error);
      return characterData.description || "character portrait";
    }
  }

  /**
   * Search for images using Tavily API
   */
  public async searchImages(query: string, tavilyApiKey: string): Promise<{
    success: boolean;
    images?: string[];
    error?: string;
  }> {
    try {
      if (!tavilyApiKey || tavilyApiKey.trim() === "") {
        return {
          success: false,
          error: "Tavily API key not configured. Please set up your Tavily API key in configuration.",
        };
      }

      console.log(`Searching for images: ${query}`);
      
      const searchResponse = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api_key: tavilyApiKey,
          query: query,
          search_depth: "basic",
          include_images: true,
          include_answer: false,
          max_results: 10,
        }),
      });

      if (!searchResponse.ok) {
        throw new Error(`Tavily API error: ${searchResponse.status} ${searchResponse.statusText}`);
      }

      const searchData = await searchResponse.json();
      
      // Extract image URLs from results
      const imageUrls: string[] = [];
      
      if (searchData.images) {
        imageUrls.push(...searchData.images);
      }
      
      if (searchData.results) {
        for (const result of searchData.results) {
          if (result.images) {
            imageUrls.push(...result.images);
          }
        }
      }

      // Filter and clean image URLs
      const validImageUrls = imageUrls
        .filter(url => url && typeof url === "string")
        .filter(url => this.isValidImageUrl(url))
        .slice(0, 10); // Limit to 10 images

      console.log(`Found ${validImageUrls.length} valid image URLs`);

      return {
        success: true,
        images: validImageUrls,
      };

    } catch (error) {
      console.error("Image search failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error during image search",
      };
    }
  }

  /**
   * Check if URL is a valid image URL
   */
  public isValidImageUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname.toLowerCase();
      return pathname.match(/\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i) !== null;
    } catch {
      return false;
    }
  }

  /**
   * Select best image using Jina AI
   */
  public async selectBestImage(imageUrls: string[], description: string, llmConfig: any, characterData: any): Promise<string | null> {
    try {
      // For simplicity, if Jina AI is not configured or fails, select the first image
      const jinaApiKey = llmConfig.jina_api_key;
      
      if (!jinaApiKey || jinaApiKey.trim() === "") {
        console.log("Jina AI API key not configured, selecting first image");
        return imageUrls.length > 0 ? imageUrls[0] : null;
      }

      console.log("Using Jina AI to select best image...");
      
      // Prepare image data for Jina AI
      const imageData = imageUrls.map((url, index) => ({
        id: `image_${index}`,
        url: url,
      }));

      const requestBody = {
        model: "jina-clip-v1",
        input: [
          {
            type: "text",
            text: description,
          },
          ...imageData.map(img => ({
            type: "image",
            image_url: img.url,
          })),
        ],
      };

      const response = await fetch("https://api.jina.ai/v1/embeddings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${jinaApiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        console.log("Jina AI request failed, selecting first image");
        return imageUrls.length > 0 ? imageUrls[0] : null;
      }

      const result = await response.json();
      
      if (result.data && result.data.length > 1) {
        // Calculate similarity between text and each image
        const textEmbedding = result.data[0].embedding;
        let bestScore = -1;
        let bestIndex = 0;

        for (let i = 1; i < result.data.length; i++) {
          const imageEmbedding = result.data[i].embedding;
          const similarity = this.cosineSimilarity(textEmbedding, imageEmbedding);
          
          if (similarity > bestScore) {
            bestScore = similarity;
            bestIndex = i - 1; // Subtract 1 because first embedding is text
          }
        }

        console.log(`Selected image ${bestIndex} with similarity score: ${bestScore}`);
        return imageUrls[bestIndex];
      }

      // Fallback to first image
      return imageUrls.length > 0 ? imageUrls[0] : null;
      
    } catch (error) {
      console.error("Image selection failed:", error);
      // Fallback to first image
      return imageUrls.length > 0 ? imageUrls[0] : null;
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    
    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (magnitudeA * magnitudeB);
  }

  /**
   * Download image and convert to PNG format
   */
  private async downloadAndConvertImage(imageUrl: string, characterName: string): Promise<{
    success: boolean;
    localPath?: string;
    error?: string;
  }> {
    try {
      console.log(`Downloading image: ${imageUrl}`);
      
      // Download the image
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      
      // For browser environment, we need to convert to PNG format
      if (typeof window !== "undefined") {
        // Create a temporary image to ensure PNG conversion
        const tempImg = new Image();
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        
        if (!ctx) {
          throw new Error("Could not get canvas context");
        }
        
        // Create blob from downloaded data
        const tempBlob = new Blob([arrayBuffer]);
        const tempUrl = URL.createObjectURL(tempBlob);
        
        return new Promise((resolve) => {
          tempImg.onload = () => {
            // Set canvas size to match image
            canvas.width = tempImg.width;
            canvas.height = tempImg.height;
            
            // Draw image to canvas
            ctx.drawImage(tempImg, 0, 0);
            
            // Convert to PNG blob
            canvas.toBlob((pngBlob) => {
              if (!pngBlob) {
                resolve({
                  success: false,
                  error: "Failed to convert image to PNG format",
                });
                return;
              }
              
              // Verify PNG blob has minimum size and correct type
              if (pngBlob.size < 100) {
                resolve({
                  success: false,
                  error: "Generated PNG is too small, likely corrupted",
                });
                return;
              }
              
              // Verify PNG file header
              const verifyPngHeader = async (blob: Blob): Promise<boolean> => {
                const buffer = await blob.arrayBuffer();
                const uint8Array = new Uint8Array(buffer);
                // PNG signature: 89 50 4E 47 0D 0A 1A 0A
                const pngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
                for (let i = 0; i < pngSignature.length; i++) {
                  if (uint8Array[i] !== pngSignature[i]) {
                    return false;
                  }
                }
                return true;
              };
              
              // Verify the PNG header before proceeding
              verifyPngHeader(pngBlob).then((isValidPng) => {
                if (!isValidPng) {
                  resolve({
                    success: false,
                    error: "Generated file does not have valid PNG header",
                  });
                  return;
                }
                
                // Create blob URL for the PNG
                const blobUrl = URL.createObjectURL(pngBlob);
                
                // Clean up temporary URL
                URL.revokeObjectURL(tempUrl);
                
                console.log("PNG conversion successful:", {
                  originalSize: arrayBuffer.byteLength,
                  pngSize: pngBlob.size,
                  imageSize: `${tempImg.width}x${tempImg.height}`,
                  validPngHeader: true,
                });
                
                resolve({
                  success: true,
                  localPath: blobUrl,
                });
              }).catch((verifyError) => {
                resolve({
                  success: false,
                  error: `PNG header verification failed: ${verifyError.message}`,
                });
              });
            }, "image/png", 0.95); // Use high quality PNG compression
          };
          
          tempImg.onerror = () => {
            URL.revokeObjectURL(tempUrl);
            resolve({
              success: false,
              error: "Failed to load downloaded image",
            });
          };
          
          tempImg.src = tempUrl;
        });
      } else {
        // Node.js environment - save to file system
        const fs = await import("fs");
        const path = await import("path");
        
        const imageBuffer = new Uint8Array(arrayBuffer);
        
        // Create safe filename
        const safeCharacterName = characterName.replace(/[^a-zA-Z0-9]/g, "_");
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `${safeCharacterName}_${timestamp}.png`;
        
        // Create output directory if it doesn't exist
        const outputDir = path.join(process.cwd(), "public", "generated");
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const filePath = path.join(outputDir, filename);
        
        // Convert to PNG if needed (simplified - assumes the downloaded image is already in a web format)
        fs.writeFileSync(filePath, imageBuffer);
        
        return {
          success: true,
          localPath: `/generated/${filename}`, // Return public URL path
        };
      }
      
    } catch (error) {
      console.error("Image download failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error during image download",
      };
    }
  }

  /**
   * Generate standard format file
   */
  private async generateStandardFormatFile(conversationId: string, imagePath?: string): Promise<{
    success: boolean;
    standardFormat?: any;
    outputPath?: string;
    error?: string;
  }> {
    try {
      // Get session data
      const session = await ResearchSessionOperations.getSessionById(conversationId);
      if (!session) {
        return { success: false, error: "Session not found" };
      }

      const characterData = session.generation_output.character_data;

      if (!characterData) {
        return { success: false, error: "No character data found" };
      }

      // Build character book entries from generation output
      const characterBookEntries: any[] = [];
      
      if (session.generation_output.status_data && session.generation_output.status_data.content && session.generation_output.status_data.content.trim() !== "") {
        characterBookEntries.push({
          comment: "STATUS",
          content: session.generation_output.status_data.content,
          keys: session.generation_output.status_data.keys || ["status"],
          insert_order: session.generation_output.status_data.insert_order || 1,
          position: session.generation_output.status_data.position || 0,
          constant: session.generation_output.status_data.constant || true,
          disable: session.generation_output.status_data.disable || false,
          depth: 4,
        });
      }
      
      if (session.generation_output.user_setting_data && session.generation_output.user_setting_data.content && session.generation_output.user_setting_data.content.trim() !== "") {
        characterBookEntries.push({
          comment: "USER_SETTING",
          content: session.generation_output.user_setting_data.content,
          keys: session.generation_output.user_setting_data.keys || ["user", "player", "character"],
          insert_order: session.generation_output.user_setting_data.insert_order || 2,
          position: session.generation_output.user_setting_data.position || 0,
          constant: session.generation_output.user_setting_data.constant || true,
          disable: session.generation_output.user_setting_data.disable || false,
          depth: 4,
        });
      }
      
      if (session.generation_output.world_view_data && session.generation_output.world_view_data.content && session.generation_output.world_view_data.content.trim() !== "") {
        characterBookEntries.push({
          comment: "WORLD_VIEW",
          content: session.generation_output.world_view_data.content,
          keys: session.generation_output.world_view_data.keys || ["world", "universe"],
          insert_order: session.generation_output.world_view_data.insert_order || 3,
          position: session.generation_output.world_view_data.position || 0,
          constant: session.generation_output.world_view_data.constant || true,
          disable: session.generation_output.world_view_data.disable || false,
          depth: 4,
        });
      }
      
      if (session.generation_output.supplement_data && Array.isArray(session.generation_output.supplement_data)) {
        session.generation_output.supplement_data.forEach((entry: any) => {
          if (entry.content && entry.content.trim() !== "") {
            characterBookEntries.push({
              comment: entry.comment || "SUPPLEMENTARY",
              content: entry.content,
              disable: entry.disable || false,
              position: entry.position || 2,
              constant: entry.constant || false,
              keys: entry.keys || [],
              insert_order: entry.insert_order || 10,
              depth: entry.depth || 4,
            });
          }
        });
      }

      // Generate standard format with character book
      const standardFormat = {
        spec: "chara_card_v3",
        spec_version: "3.0",
        data: {
          name: characterData.name,
          description: characterData.description,
          personality: characterData.personality,
          first_mes: characterData.first_mes,
          scenario: characterData.scenario,
          mes_example: characterData.mes_example,
          creator_notes: characterData.creator_notes,
          data: {
            name: characterData.name,
            description: characterData.description,
            personality: characterData.personality,
            first_mes: characterData.first_mes,
            scenario: characterData.scenario,
            mes_example: characterData.mes_example,
            creator_notes: characterData.creator_notes,
            // Only include fields that exist
            ...(characterData.system_prompt && { system_prompt: characterData.system_prompt }),
            ...(characterData.post_history_instructions && { post_history_instructions: characterData.post_history_instructions }),
            ...(characterData.tags && { tags: characterData.tags }),
            ...(characterData.creator && { creator: characterData.creator }),
            ...(characterData.character_version && { character_version: characterData.character_version }),
            ...(characterData.alternate_greetings && { alternate_greetings: characterData.alternate_greetings }),
            // Add character book if worldbook entries exist
            ...(characterBookEntries.length > 0 && {
              character_book: {
                entries: characterBookEntries,
              },
            }),
          },
        },
      };

      // Create filename
      const safeCharacterName = (characterData.name || "character").replace(/[^a-zA-Z0-9]/g, "_");
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `${safeCharacterName}_${timestamp}.json`;

      // Save file in browser or Node.js environment
      if (typeof window !== "undefined") {
        // Browser environment - trigger download
        const blob = new Blob([JSON.stringify(standardFormat, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        
        return {
          success: true,
          standardFormat,
          outputPath: filename,
        };
      } else {
        // Node.js environment - save to file system
        const fs = await import("fs");
        const path = await import("path");
        
        const outputDir = path.join(process.cwd(), "public", "generated");
        if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
        }
        
        const filePath = path.join(outputDir, filename);
        fs.writeFileSync(filePath, JSON.stringify(standardFormat, null, 2));
        
        return {
          success: true,
          standardFormat,
          outputPath: filePath,
        };
      }
      
    } catch (error) {
      console.error("Standard format generation failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error during file generation",
      };
    }
  }

  /**
   * Embed JSON data into PNG metadata
   */
  private async embedJsonInPng(imagePath: string, jsonData: any): Promise<{
    success: boolean;
    embeddedImageUrl?: string;
    error?: string;
  }> {
    try {
      // Import the PNG processing utilities
      const { writeCharacterToPng } = await import("@/utils/character-parser");
      
      // Get the PNG file (if it's a blob URL, fetch it first)
      let imageFile: File;
      
      if (imagePath.startsWith("blob:")) {
        // Fetch the blob and convert to File
        const response = await fetch(imagePath);
        const blob = await response.blob();
        imageFile = new File([blob], "avatar.png", { type: "image/png" });
      } else {
        // For local storage paths, we'll need to implement this differently
        // For now, log an error as this case might not be common in browser environment
        console.error("Local file path not supported in browser environment:", imagePath);
        return {
          success: false,
          error: "Local file path not supported in browser environment",
        };
      }
      
      // Convert character data to the expected format for writeCharacterToPng
      // The writeCharacterToPng function expects ONLY the data part (not the full v3 wrapper)
      // It will automatically add spec and spec_version when creating the ccv3 chunk
      let dataForEmbedding;
      if (jsonData.spec === "chara_card_v3" && jsonData.data) {
        // Extract just the data part from v3 format
        dataForEmbedding = jsonData.data;
      } else {
        // If it's not v3 format, use the whole object as data
        dataForEmbedding = jsonData;
      }
      
      const characterDataString = JSON.stringify(dataForEmbedding);
      
      console.log("Embedding character data into PNG:", {
        originalDataSize: JSON.stringify(jsonData).length,
        extractedDataSize: characterDataString.length,
        hasSpec: !!jsonData.spec,
        dataKeys: Object.keys(dataForEmbedding),
        imageFileSize: imageFile.size,
        imageFileType: imageFile.type,
      });
      
      // Embed the data into PNG
      try {
        const embeddedBlob = await writeCharacterToPng(imageFile, characterDataString);
        
        // Verify the embedded blob is valid
        if (!embeddedBlob || embeddedBlob.size === 0) {
          throw new Error("Generated PNG blob is empty or invalid");
        }
        
        // Create a new blob URL for the embedded PNG
        const embeddedImageUrl = URL.createObjectURL(embeddedBlob);
        
        console.log("JSON data successfully embedded into PNG metadata:", {
          imagePath,
          dataSize: characterDataString.length,
          originalImageSize: imageFile.size,
          embeddedImageSize: embeddedBlob.size,
          embeddedImageUrl,
        });
        
        return { 
          success: true,
          embeddedImageUrl,
        };
      } catch (pngError) {
        console.error("PNG embedding failed:", pngError);
        throw new Error(`PNG metadata embedding failed: ${pngError instanceof Error ? pngError.message : "Unknown PNG processing error"}`);
      }
      
    } catch (error) {
      console.error("PNG metadata embedding failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error during PNG metadata embedding",
      };
    }
  }

  /**
   * Generate response using LLM
   */
  private async generateResponse(prompt: string, llmConfig: any): Promise<{ text: string }> {
    const llm = this.createLLM(llmConfig);
    const response = await llm.invoke(prompt);
    return { text: response.content as string };
  }

  /**
   * Create LLM instance based on configuration
   */
  private createLLM(llmConfig: any) {
    // Import LLM classes dynamically
    const { ChatOpenAI } = require("@langchain/openai");
    const { ChatOllama } = require("@langchain/ollama");

    if (llmConfig.llm_type === "openai") {
      return new ChatOpenAI({
        modelName: llmConfig.model_name,
        openAIApiKey: llmConfig.api_key,
        configuration: {
          baseURL: llmConfig.base_url,
        },
        temperature: llmConfig.temperature,
        maxTokens: llmConfig.max_tokens,
        streaming: false,
      });
    } else if (llmConfig.llm_type === "ollama") {
      return new ChatOllama({
        model: llmConfig.model_name,
        baseUrl: llmConfig.base_url || "http://localhost:11434",
        temperature: llmConfig.temperature,
        streaming: false,
      });
    }

    throw new Error(`Unsupported LLM type: ${llmConfig.llm_type}`);
  }

}
