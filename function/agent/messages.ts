import { AgentService } from "@/lib/core/agent-service";

export async function getAgentSessionMessages(payload: {
  sessionId: string;
}): Promise<Response> {
  try {
    const { sessionId } = payload;

    if (!sessionId) {
      return new Response(JSON.stringify({ 
        error: "Missing session ID", 
        success: false, 
      }), { status: 400 });
    }

    const agentService = new AgentService();
    const messagesResult = await agentService.getMessages(sessionId);

    return new Response(JSON.stringify({
      success: true,
      messages: messagesResult.messages,
      messageCount: messagesResult.messageCount,
    }), {
      headers: {
        "Content-Type": "application/json",
      },
    });

  } catch (error: any) {
    console.error("Failed to get session messages:", error);
    return new Response(JSON.stringify({ 
      error: `Failed to get messages: ${error.message}`, 
      success: false, 
    }), { 
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
}

export async function respondToAgent(payload: {
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
 
