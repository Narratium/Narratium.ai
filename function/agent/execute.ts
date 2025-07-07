import { AgentService } from "@/lib/core/agent-service";
import { ResearchSessionOperations } from "@/lib/data/agent/agent-conversation-operations";

/**
 * Start agent execution for a session (similar to handleCharacterChatRequest)
 */
export async function executeAgentSession(payload: {
  sessionId: string;
  userRequest?: string; // For new sessions or follow-up requests
  modelName?: string;
  baseUrl?: string;
  apiKey?: string;
  llmType?: "openai" | "ollama";
  language?: "zh" | "en";
}): Promise<Response> {
  try {
    const { 
      sessionId, 
      userRequest,
      modelName,
      baseUrl,
      apiKey,
      llmType = "openai",
      language = "zh",
    } = payload;

    if (!sessionId) {
      return new Response(JSON.stringify({ 
        error: "Missing session ID", 
        success: false, 
      }), { status: 400 });
    }

    // Get LLM configuration from localStorage defaults or parameters
    const finalModelName = modelName || (llmType === "openai" ? "gpt-4" : "qwen2.5:32b");
    const finalBaseUrl = baseUrl || (llmType === "openai" ? "https://api.openai.com/v1" : "http://localhost:11434");
    const finalApiKey = apiKey || "";

    const agentService = new AgentService();

    // Configure ConfigManager with the provided parameters before execution
    if (finalModelName || finalBaseUrl || finalApiKey) {
      // Import ConfigManager and create temporary configuration object
      const { ConfigManager } = await import("@/lib/core/config-manager");
      const configManager = ConfigManager.getInstance();
      
      const tempConfig = {
        defaultType: llmType,
        defaultModel: finalModelName,
        defaultApiKey: finalApiKey,
        defaultBaseUrl: finalBaseUrl,
        temperature: 0.7,
        maxTokens: 4000,
      };
      
      // Set the configuration before execution
      configManager.setConfig(tempConfig);
    }

    // If userRequest provided, this is a user response to agent
    if (userRequest) {
      const respondResult = await agentService.respondToAgent(sessionId, userRequest);
      
      return new Response(JSON.stringify({
        success: respondResult.success,
        error: respondResult.error,
      }), {
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    // Otherwise, start agent execution on existing session
    const session = await ResearchSessionOperations.getSessionById(sessionId);
    if (!session) {
      return new Response(JSON.stringify({ 
        error: "Session not found", 
        success: false, 
      }), { status: 404 });
    }

    // Start agent execution on existing session - this will call AgentEngine.start()
    const result = await agentService.startExistingSession(
      sessionId,
      undefined, // userInputCallback will be handled through polling
    );

    return new Response(JSON.stringify({
      success: result.success,
      conversationId: sessionId,
      result: result.result,
      error: result.error,
    }), {
      headers: {
        "Content-Type": "application/json",
      },
    });

  } catch (error: any) {
    console.error("Failed to execute agent session:", error);
    return new Response(JSON.stringify({ 
      error: `Failed to execute: ${error.message}`, 
      success: false, 
    }), { 
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}

/**
 * Respond to agent user input request
 */
export async function respondToAgentSession(payload: {
  sessionId: string;
  userResponse: string;
}): Promise<Response> {
  try {
    const { sessionId, userResponse } = payload;

    if (!sessionId || !userResponse) {
      return new Response(JSON.stringify({ 
        error: "Missing session ID or user response", 
        success: false, 
      }), { status: 400 });
    }

    const agentService = new AgentService();
    const result = await agentService.respondToAgent(sessionId, userResponse);

    return new Response(JSON.stringify({
      success: result.success,
      error: result.error,
    }), {
      headers: {
        "Content-Type": "application/json",
      },
    });

  } catch (error: any) {
    console.error("Failed to respond to agent:", error);
    return new Response(JSON.stringify({ 
      error: `Failed to respond: ${error.message}`, 
      success: false, 
    }), { 
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
} 
