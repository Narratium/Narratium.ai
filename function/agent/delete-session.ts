import { ResearchSessionOperations } from "../../lib/data/agent/agent-conversation-operations";

export async function deleteAgentSession(sessionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    await ResearchSessionOperations.deleteSession(sessionId);
    return { success: true };
  } catch (error) {
    console.error(`Failed to delete agent session ${sessionId}:`, error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return { success: false, error: errorMessage };
  }
} 
