import { AgentService } from "@/lib/core/agent-service";
import { ResearchSessionOperations } from "@/lib/data/agent/agent-conversation-operations";
import { LLMConfig } from "@/lib/core/config-manager";
import { StreamingCallback } from "@/lib/core/agent-engine";

/**
 * Direct execution function for frontend calls with streaming support
 */
export async function executeAgentSession(payload: {
  sessionId: string;
  userRequest?: string;
  modelName?: string;
  baseUrl?: string;
  apiKey?: string;
  llmType?: "openai" | "ollama";
  language?: "zh" | "en";
  streamingCallback?: StreamingCallback;
}): Promise<{
  success: boolean;
  result?: any;
  error?: string;
}> {
  try {
    const { 
      sessionId, 
      userRequest,
      modelName,
      baseUrl,
      apiKey,
      llmType = "openai",
      language = "zh",
      streamingCallback,
    } = payload;

    if (!sessionId) {
      throw new Error("Missing session ID");
    }

    // Get LLM configuration from localStorage defaults or parameters
    const finalModelName = modelName || (llmType === "openai" ? "gpt-4" : "qwen2.5:32b");
    const finalBaseUrl = baseUrl || (llmType === "openai" ? "https://api.openai.com/v1" : "http://localhost:11434");
    const finalApiKey = apiKey || "";

    const agentService = new AgentService();

    // Configure ConfigManager with the provided parameters before execution
    if (finalModelName || finalBaseUrl || finalApiKey) {
      const { ConfigManager } = await import("@/lib/core/config-manager");
      const configManager = ConfigManager.getInstance();
      
      const tempConfig: LLMConfig = {
        llm_type: llmType,
        model_name: finalModelName,
        api_key: finalApiKey,
        base_url: finalBaseUrl,
        temperature: 0.7,
        max_tokens: 4000,
      };
      
      configManager.setConfig(tempConfig);
    }

    // If userRequest provided, this is a user response to agent
    if (userRequest) {
      const respondResult = await agentService.respondToAgent(sessionId, userRequest);
      return {
        success: respondResult.success,
        error: respondResult.error,
      };
    }

    // Otherwise, start agent execution on existing session
    const session = await ResearchSessionOperations.getSessionById(sessionId);
    if (!session) {
      throw new Error("Session not found");
    }

    // Start agent execution with streaming callback
    const result = await agentService.startExistingSession(
      sessionId,
      undefined, // userInputCallback will be handled through polling
      streamingCallback,
    );

    return {
      success: result.success,
      result: result.result,
      error: result.error,
    };

  } catch (error: any) {
    console.error("Failed to execute agent session:", error);
    return {
      success: false,
      error: error.message || "Failed to execute session",
    };
  }
}

/**
 * Respond to agent user input request
 */
export async function respondToResearchSession(payload: {
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
