import { ResearchSessionOperations } from "@/lib/data/agent/agent-conversation-operations";

/**
 * Get agent session information (similar to getCharacterDialogue)
 * Handles session loading, creation, and initialization
 */
export async function getResearchSession(
  sessionId: string | null,
  initialRequest?: string,
): Promise<{
  success: boolean;
  session?: any;
  isNew?: boolean;
  error?: string;
}> {
  try {
    // If no sessionId provided, create new session if we have request
    if (!sessionId) {
      if (!initialRequest) {
        return {
          success: false,
          error: "Session ID is required, or initial request for new session",
        };
      }

      const { session, isNew } = await ResearchSessionOperations.getOrCreateSession(
        undefined,
        initialRequest,
      );

      return {
        success: true,
        session,
        isNew,
      };
    }

    // Load existing session
    const sessionData = await ResearchSessionOperations.getSessionForUI(sessionId);
    if (!sessionData) {
      return {
        success: false,
        error: "Session not found",
      };
    }

    return {
      success: true,
      session: sessionData,
      isNew: false,
    };

  } catch (error: any) {
    console.error("Failed to get agent session:", error);
    return {
      success: false,
      error: error.message || "Failed to load session",
    };
  }
}

/**
 * Initialize new agent session (similar to initCharacterDialogue)
 */
export async function initAgentSession(
  initialRequest: string,
): Promise<{
  success: boolean;
  sessionId?: string;
  error?: string;
}> {
  try {
    const session = await ResearchSessionOperations.createSession(initialRequest);
    
    return {
      success: true,
      sessionId: session.id,
    };

  } catch (error: any) {
    console.error("Failed to initialize agent session:", error);
    return {
      success: false,
      error: error.message || "Failed to initialize session",
    };
  }
} 
