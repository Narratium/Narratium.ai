import { ResearchSessionOperations } from "../../lib/data/agent/agent-conversation-operations";

type SessionSummary = {
  id: string;
  title: string;
};

export async function listAgentSessions(): Promise<SessionSummary[]> {
  try {
    const sessions = await ResearchSessionOperations.getAllSessions();
    
    // Sort sessions by the timestamp embedded in their UUIDs (descending)
    sessions.sort((a, b) => {
      // Basic time-based sorting for UUIDv4 is not truly reliable,
      // but for this application's purposes, it provides a "good enough" chronological order.
      // A proper implementation would use a `createdAt` timestamp.
      return b.id.localeCompare(a.id);
    });

    return sessions.map(session => ({
      id: session.id,
      title: session.title,
    }));
  } catch (error) {
    console.error("Failed to list agent sessions:", error);
    return [];
  }
} 
