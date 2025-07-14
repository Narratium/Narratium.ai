import { 
  ResearchSession, 
  SessionStatus, 
  Message, 
  ResearchState,      
  KnowledgeEntry,
  GenerationOutput,
  TaskEntry,
} from "../../models/agent-model";
import { readData, writeData, AGENT_CONVERSATIONS_FILE } from "../local-storage";
import { v4 as uuidv4 } from "uuid";

/**
 * Agent Conversation Operations - Simplified for Real-time Architecture
 */
export class ResearchSessionOperations {

  /**
   * Create a new agent conversation with simplified initial state
   */
  static async createSession(
    initialUserRequest: string,
  ): Promise<ResearchSession> {
    const conversationId = uuidv4();

    // Create initial task state
    const ResearchState: ResearchState = {
      id: uuidv4(),
      session_id: conversationId,
      main_objective: initialUserRequest,
      // Sequential task management - will be populated by task decomposition
      task_queue: [], // Empty initially - will be filled by task decomposition
      completed_tasks: [],
      knowledge_base: [],
    };

    // Create initial character progress
    const GenerationOutput: GenerationOutput = {
    };

    // Create initial user message
    const initialMessage: Message = {
      id: uuidv4(),
      role: "user",
      content: initialUserRequest,
      type: "user_input",
    };

    const session: ResearchSession = {
      id: conversationId,
      title: initialUserRequest ,
      status: SessionStatus.IDLE,
      messages: [initialMessage],
      research_state: ResearchState,
      generation_output: GenerationOutput,
      execution_info: {
        current_iteration: 0,
        max_iterations: 50,
        error_count: 0,
        total_tokens_used: 0,
        token_budget: 100000, // 100K tokens default budget
      },
    };

    await this.saveSession(session);
    return session;
  }

  /**
   * Get conversation by ID
   */
  static async getSessionById(sessionId: string): Promise<ResearchSession | null> {
    const sessions = await this.getAllSessions();
    return sessions.find(s => s.id === sessionId) || null;
  }

  /**
   * Get all conversations
   */
  static async getAllSessions(): Promise<ResearchSession[]> {
    try {
      const data = await readData(AGENT_CONVERSATIONS_FILE);
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("Failed to load sessions:", error);
      return [];
    }
  }

  /**
   * Save conversation to storage
   */
  static async saveSession(session: ResearchSession): Promise<void> {
    const sessions = await this.getAllSessions();
    const existingIndex = sessions.findIndex(s => s.id === session.id);
    
    if (existingIndex >= 0) {
      sessions[existingIndex] = session;
    } else {
      sessions.push(session);
    }

    await writeData(AGENT_CONVERSATIONS_FILE, sessions);
  }

  /**
   * Update conversation status
   */
  static async updateStatus(sessionId: string, status: SessionStatus): Promise<void> {
    const session = await this.getSessionById(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.status = status;
    await this.saveSession(session);
  }

  /**
   * Add message to conversation
   */
  static async addMessage(
    sessionId: string,
    messageData: Omit<Message, "id">,
  ): Promise<Message> {
    const session = await this.getSessionById(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const message: Message = {
      ...messageData,
      id: uuidv4(),
    };

    session.messages.push(message);
    await this.saveSession(session);
    
    return message;
  }

  /**
   * Update task state
   */
  static async updateResearchState(
    sessionId: string,
    updates: Partial<Omit<ResearchState, "id" | "session_id">>,
  ): Promise<void> {
    const session = await this.getSessionById(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Update task state
    Object.assign(session.research_state, updates);

    await this.saveSession(session);
  }

  /**
   * Update generation output with intelligent merging
   * For character_data: merges new fields with existing ones, overwrites existing fields with new values
   * For other fields: performs direct assignment
   */
  static async updateGenerationOutput(
    sessionId: string,
    updates: Partial<GenerationOutput>,
  ): Promise<void> {
    const session = await this.getSessionById(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Handle character_data with intelligent merging
    if (updates.character_data) {
      const existingCharacterData = session.generation_output.character_data || {};
      // Merge new character fields with existing ones, new fields override existing ones
      session.generation_output.character_data = {
        ...existingCharacterData,
        ...updates.character_data,
      };
      
      // Remove character_data from updates to avoid double processing
      const { character_data, ...otherUpdates } = updates;
      
      // Apply other updates normally
      if (Object.keys(otherUpdates).length > 0) {
        Object.assign(session.generation_output, otherUpdates);
      }
    } else {
      // No character_data to merge, apply updates normally
      Object.assign(session.generation_output, updates);
    }

    await this.saveSession(session);
  }

  /**
   * Add knowledge entries to the knowledge base
   */
  static async addKnowledgeEntries(
    sessionId: string,
    entries: KnowledgeEntry[],
  ): Promise<void> {
    const session = await this.getSessionById(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.research_state.knowledge_base.push(...entries);

    await this.saveSession(session);
  }

  /**
   * Increment iteration counter
   */
  static async incrementIteration(sessionId: string): Promise<number> {
    const session = await this.getSessionById(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.execution_info.current_iteration++;
    await this.saveSession(session);
    
    return session.execution_info.current_iteration;
  }

  /**
   * Record token usage
   */
  static async recordTokenUsage(sessionId: string, tokensUsed: number): Promise<void> {
    const session = await this.getSessionById(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.execution_info.total_tokens_used += tokensUsed;
    await this.saveSession(session);
  }

  /**
   * Record error
   */
  static async recinsert_orderror(sessionId: string, error: string): Promise<void> {
    const session = await this.getSessionById(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.execution_info.error_count++;
    session.execution_info.last_error = error;
    await this.saveSession(session);
  }

  /**
   * Delete conversation
   */
  static async deleteSession(sessionId: string): Promise<void> {
    const sessions = await this.getAllSessions();
    const updatedSessions = sessions.filter(s => s.id !== sessionId);
    await writeData(AGENT_CONVERSATIONS_FILE, updatedSessions);
  }

  /**
   * Clear all sessions from the data file
   */
  static async clearAll(): Promise<void> {
    await writeData(AGENT_CONVERSATIONS_FILE, []);
  }

  /**
   * Get session summary for UI display (similar to character dialogue info)
   */
  static async getSessionSummary(sessionId: string): Promise<{
    title: string;
    status: SessionStatus;
    messageCount: number;
    hasCharacter: boolean;
    hasWorldbook: boolean;
    completionPercentage: number;
    knowledgeBaseSize: number;
  } | null> {
    const session = await this.getSessionById(sessionId);
    if (!session) return null;

    const hasCharacter = !!session.generation_output.character_data;
    const hasWorldbook = !!(
      session.generation_output.status_data ||
      session.generation_output.user_setting_data ||
      session.generation_output.world_view_data ||
      (session.generation_output.supplement_data && session.generation_output.supplement_data.length > 0)
    );

    // Calculate completion percentage based on available data
    let completedComponents = 0;
    const totalComponents = 5; // character + 4 worldbook components
    
    if (session.generation_output.character_data) completedComponents++;
    if (session.generation_output.status_data) completedComponents++;
    if (session.generation_output.user_setting_data) completedComponents++;
    if (session.generation_output.world_view_data) completedComponents++;
    if (session.generation_output.supplement_data && session.generation_output.supplement_data.length >= 5) completedComponents++;

    const completionPercentage = (completedComponents / totalComponents) * 100;

    return {
      title: session.title,
      status: session.status,
      messageCount: session.messages.length,
      hasCharacter,
      hasWorldbook,
      completionPercentage,
      knowledgeBaseSize: session.research_state.knowledge_base.length,
    };
  }

  /**
   * Get or create session for UI (similar to character dialogue loading)
   */
  static async getOrCreateSession(
    sessionId?: string,
    initialRequest?: string,
  ): Promise<{ session: ResearchSession; isNew: boolean }> {
    if (sessionId) {
      const existingSession = await this.getSessionById(sessionId);
      if (existingSession) {
        return { session: existingSession, isNew: false };
      }
    }

    if (!initialRequest) {
      throw new Error("initial request required for new session");
    }

    const newSession = await this.createSession(initialRequest);
    return { session: newSession, isNew: true };
  }

  /**
   * Get session with formatted messages for UI display
   */
  static async getSessionForUI(sessionId: string): Promise<{
    session: ResearchSession;
    formattedMessages: Message[];
    needsUserInput: boolean;
    userInputQuestion?: string;
    userInputOptions?: string[];
  } | null> {
    const session = await this.getSessionById(sessionId);
    if (!session) return null;

    const formattedMessages = session.messages.map(msg => ({
      id: msg.id,
      role: msg.role as "agent" | "user",
      content: msg.content,
      type: msg.type || "agent_action" as any,
      timestamp: new Date(msg.timestamp || Date.now()),
      metadata: msg.metadata,
    }));

    // Check if waiting for user input
    const needsUserInput = session.status === SessionStatus.WAITING_USER;
    let userInputQuestion: string | undefined;
    let userInputOptions: string[] | undefined;

    if (needsUserInput) {
      const lastMessage = session.messages[session.messages.length - 1];
      if (lastMessage && lastMessage.content.includes("INPUT REQUIRED:")) {
        const lines = lastMessage.content.split("\n");
        const questionLine = lines.find(line => line.includes("INPUT REQUIRED:"));
        const optionsLine = lines.find(line => line.includes("Options:"));
        
        if (questionLine) {
          userInputQuestion = questionLine.replace("INPUT REQUIRED:", "").trim();
        }
        if (optionsLine) {
          userInputOptions = optionsLine
            .replace("Options:", "")
            .split(",")
            .map(opt => opt.trim())
            .filter(opt => opt.length > 0);
        }
      }
    }

    return {
      session,
      formattedMessages: formattedMessages as Message[],
      needsUserInput,
      userInputQuestion,
      userInputOptions,
    };
  }

  /**
   * Add new tasks to the task queue efficiently
   */
  static async addTasksToQueue(
    sessionId: string,
    newTasks: TaskEntry[],
  ): Promise<void> {
    const sessions = await this.getAllSessions();
    const sessionIndex = sessions.findIndex(s => s.id === sessionId);
    
    if (sessionIndex === -1) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const session = sessions[sessionIndex];
    const currentQueue = session.research_state.task_queue || [];
    
    // Add new tasks to the end of current queue
    session.research_state.task_queue = [...currentQueue, ...newTasks];
    
    // Save only the updated session
    await writeData(AGENT_CONVERSATIONS_FILE, sessions);
  }
  
  /**
   * Complete current task efficiently by moving it to completed_tasks
   */
  static async completeCurrentTask(
    sessionId: string,
  ): Promise<void> {
    const session = await this.getSessionById(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const taskQueue = session.research_state.task_queue || [];
    
    if (taskQueue.length > 0) {
      const completedTask = taskQueue[0];
      const remainingTasks = taskQueue.slice(1);
      
      // Update research state
      session.research_state.task_queue = remainingTasks;
      session.research_state.completed_tasks.push(completedTask.description);
      
      await this.saveSession(session);
    }
  }

  /**
   * Append new worldbook entries to existing specialized worldbook data efficiently
   */
  static async appendWorldbookData(
    sessionId: string,
    worldbookData: {
      status_data?: any;
      user_setting_data?: any;
      world_view_data?: any;
      supplement_data?: any[];
    },
  ): Promise<void> {
    const session = await this.getSessionById(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Update specialized worldbook data fields
    if (worldbookData.status_data) {
      session.generation_output.status_data = worldbookData.status_data;
    }
    
    if (worldbookData.user_setting_data) {
      session.generation_output.user_setting_data = worldbookData.user_setting_data;
    }
    
    if (worldbookData.world_view_data) {
      session.generation_output.world_view_data = worldbookData.world_view_data;
    }
    
    if (worldbookData.supplement_data && worldbookData.supplement_data.length > 0) {
      const currentSupplements = session.generation_output.supplement_data || [];
      session.generation_output.supplement_data = [...currentSupplements, ...worldbookData.supplement_data];
    }
    
    await this.saveSession(session);
  }

  /**
   * Get generation output without fetching entire session
   */
  static async getGenerationOutput(sessionId: string): Promise<GenerationOutput | null> {
    const session = await this.getSessionById(sessionId);
    if (!session) return null;
    
    return session.generation_output;
  }

  /**
   * Complete current sub-problem by removing it from the latest task
   */
  static async completeCurrentSubProblem(sessionId: string): Promise<void> {
    const session = await this.getSessionById(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const taskQueue = session.research_state.task_queue || [];
    
    if (taskQueue.length > 0 && taskQueue[0].sub_problems.length > 0) {
      const currentTask = taskQueue[0];
      const completedSubProblem = currentTask.sub_problems[0]; // First sub-problem
      
      // Remove the first sub-problem
      currentTask.sub_problems = currentTask.sub_problems.slice(1);
      
      // If no more sub-problems in this task, move the task to completed
      if (currentTask.sub_problems.length === 0) {
        session.research_state.task_queue = taskQueue.slice(1);
        session.research_state.completed_tasks.push(currentTask.description);
      }
      
      await this.saveSession(session);
      
      console.log(`✅ Sub-problem completed: ${completedSubProblem.description}`);
      if (currentTask.sub_problems.length === 0) {
        console.log(`✅ Task completed: ${currentTask.description}`);
      }
    }
  }

  /**
   * Get current sub-problem from the first task in queue
   */
  static async getCurrentSubProblem(sessionId: string): Promise<{ 
    task?: TaskEntry, 
    subProblem?: any 
  }> {
    const session = await this.getSessionById(sessionId);
    if (!session || !session.research_state.task_queue || session.research_state.task_queue.length === 0) {
      return {};
    }

    const currentTask = session.research_state.task_queue[0];
    if (!currentTask.sub_problems || currentTask.sub_problems.length === 0) {
      return { task: currentTask };
    }

    return { 
      task: currentTask, 
      subProblem: currentTask.sub_problems[0], 
    };
  }

  /**
   * Modify current task description and replace sub-problems
   */
  static async modifyCurrentTaskAndSubproblems(sessionId: string, newDescription: string, newSubproblems: string[]): Promise<void> {
    const session = await this.getSessionById(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    const taskQueue = session.research_state.task_queue || [];
    
    if (taskQueue.length > 0) {
      const currentTask = taskQueue[0];
      
      // Update task description
      currentTask.description = newDescription;
      
      // Replace sub-problems with new ones
      if (newSubproblems.length > 0) {
        currentTask.sub_problems = newSubproblems.map((description, index) => ({
          id: `modified_sub_${Date.now()}_${index}`,
          description: description,
          reasoning: "Updated by task adjustment",
        }));
      } else {
        // If no new sub-problems provided, clear existing ones and mark task as complete
        currentTask.sub_problems = [];
        session.research_state.task_queue = taskQueue.slice(1);
        session.research_state.completed_tasks.push(currentTask.description);
      }
      
      await this.saveSession(session);
      console.log(`✅ Modified current task to: ${newDescription}`);
      
      if (newSubproblems.length > 0) {
        console.log(`✅ Updated with ${newSubproblems.length} new sub-problems`);
      } else {
        console.log(`✅ Task completed with no sub-problems: ${currentTask.description}`);
      }
    }
  }

  /**
   * Clear all tasks from the task queue
   */
  static async clearAllTasks(sessionId: string): Promise<void> {
    const session = await this.getSessionById(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.research_state.task_queue = [];
    await this.saveSession(session);
  }
} 
