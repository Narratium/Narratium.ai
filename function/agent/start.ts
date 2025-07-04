import { AgentService } from "@/lib/core/agent-service";

export async function startAgentGeneration(payload: {
  userRequest: string;
  sessionId?: string;
  userInputCallback?: (message?: string, options?: string[]) => Promise<string>;
}): Promise<Response> {
  try {
    const { userRequest, sessionId, userInputCallback } = payload;

    if (!userRequest || !userRequest.trim()) {
      return new Response(JSON.stringify({ 
        error: "Missing user request", 
        success: false, 
      }), { status: 400 });
    }

    const agentService = new AgentService();
    const result = await agentService.startGeneration(
      userRequest.trim(),
      sessionId,
      userInputCallback,
    );

    return new Response(JSON.stringify({
      success: result.success,
      conversationId: result.conversationId,
      result: result.result,
      error: result.error,
    }), {
      headers: {
        "Content-Type": "application/json",
      },
    });

  } catch (error: any) {
    console.error("Failed to start agent generation:", error);
    return new Response(JSON.stringify({ 
      error: `Failed to start generation: ${error.message}`, 
      success: false, 
    }), { 
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
} 
