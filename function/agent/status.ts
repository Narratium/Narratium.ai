import { AgentService } from "@/lib/core/agent-service";

export async function getResearchSessionStatus(payload: {
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
    const statusResult = await agentService.getSessionStatus(sessionId);

    return new Response(JSON.stringify({
      success: true,
      session: statusResult.session,
      status: statusResult.status,
      progress: statusResult.progress,
      hasResult: statusResult.hasResult,
      result: statusResult.result,
    }), {
      headers: {
        "Content-Type": "application/json",
      },
    });

  } catch (error: any) {
    console.error("Failed to get session status:", error);
    return new Response(JSON.stringify({ 
      error: `Failed to get status: ${error.message}`, 
      success: false, 
    }), { 
      status: 500,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
} 
