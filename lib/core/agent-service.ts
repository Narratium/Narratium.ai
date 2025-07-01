import { AgentEngine } from "@/lib/core/agent-engine";
import { ResearchSessionOperations } from "@/lib/data/agent/agent-conversation-operations";
import { ResearchSession, SessionStatus } from "@/lib/models/agent-model";

// Define user input callback type
type UserInputCallback = (message?: string) => Promise<string>;

/**
 * Agent Service - Simplified for Real-time Decision Architecture
 * High-level API for character+worldbook generation with real-time planning
 */
export class AgentService {
  private engines: Map<string, AgentEngine> = new Map();

  constructor() {
    // Initialize storage on construction
    this.initialize();
  }

  /**
   * Initialize service with storage
   */
  private async initialize(): Promise<void> {
    try {
      const { initializeDataFiles } = await import("../data/local-storage");
      await initializeDataFiles();
    } catch (error) {
      console.error("Failed to initialize AgentService:", error);
    }
  }

  /**
   * Start a new character generation conversation with user input callback
   */
  async startGeneration(
    initialUserRequest: string,
    llmConfig: {
      model_name: string;
      api_key: string;
      base_url?: string;
      llm_type: "openai" | "ollama";
      temperature?: number;
      max_tokens?: number;
      tavily_api_key?: string;
    },
    userInputCallback?: UserInputCallback,
  ): Promise<{
    conversationId: string;
    success: boolean;
    result?: any;
    error?: string;
  }> {
    try {
      // Create new conversation with fixed title and story as user request
      const session = await ResearchSessionOperations.createSession(
        "Character & Worldbook Generation", // Fixed title
        {
          model_name: llmConfig.model_name,
          api_key: llmConfig.api_key,
          base_url: llmConfig.base_url,
          llm_type: llmConfig.llm_type,
          temperature: llmConfig.temperature || 0.7,
          max_tokens: llmConfig.max_tokens,
          tavily_api_key: llmConfig.tavily_api_key,
        },
        initialUserRequest, // Story description as user request
      );
      
      // Create agent engine with user input callback
      const engine = new AgentEngine(session.id, userInputCallback);
      this.engines.set(session.id, engine);
      
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
      const hasWorldbookData = !!session.generation_output.worldbook_data && session.generation_output.worldbook_data.length > 0;
      const hasResult = hasCharacterData && hasWorldbookData;
      
      return {
        session: session,
        status: session.status,
        progress: {
          completedTasks: session.research_state.completed_tasks.length,
          totalIterations: session.execution_info.current_iteration,
          knowledgeBaseSize: session.research_state.knowledge_base.length,
        },
        hasResult,
        result: hasResult ? {
          character_data: session.generation_output.character_data,
          worldbook_data: session.generation_output.worldbook_data,
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
      // Remove engine from memory
      this.engines.delete(sessionId);
      
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
      // Clear all engines from memory
      this.engines.clear();
      
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
    hasWorldbook: boolean;
    completionPercentage: number;
    characterData?: any;
    worldbookData?: any[];
  }> {
    try {
      const session = await ResearchSessionOperations.getSessionById(sessionId);
      if (!session) {
        return {
          hasCharacter: false,
          hasWorldbook: false,
          completionPercentage: 0,
        };
      }
      
      const hasCharacter = !!session.generation_output.character_data;
      const hasWorldbook = !!session.generation_output.worldbook_data && session.generation_output.worldbook_data.length > 0;
      
      // Calculate completion percentage from completion status
      const completionPercentage = 0;
      
      return {
        hasCharacter,
        hasWorldbook,
        completionPercentage: Math.round(completionPercentage),
        characterData: session.generation_output.character_data,
        worldbookData: session.generation_output.worldbook_data,
      };
      
    } catch (error) {
      console.error("Failed to get character progress:", error);
      return {
        hasCharacter: false,
        hasWorldbook: false,
        completionPercentage: 0,
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
            session.generation_output.worldbook_data && 
            session.generation_output.worldbook_data.length > 0) {
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
    this.engines.delete(conversationId);
  }

  /**
   * Get engine for conversation (for advanced usage)
   */
  getEngine(conversationId: string): AgentEngine | undefined {
    return this.engines.get(conversationId);
  }
}

// Singleton instance
export const agentService = new AgentService(); 
 
