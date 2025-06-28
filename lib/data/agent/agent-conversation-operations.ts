import { 
  readData, 
  writeData, 
  AGENT_CONVERSATIONS_FILE, 
} from "@/lib/data/local-storage";
import { 
  AgentConversation,
  AgentStatus,
  PlanPool,
  ThoughtBuffer,
  AgentResult,
  ConversationMessage,
} from "@/lib/models/agent-model";
import { v4 as uuidv4 } from "uuid";

/**
 * Agent Conversation Operations - New simplified architecture
 */
export class AgentConversationOperations {
  /**
   * Create a new agent conversation
   */
  static async createConversation(
    title: string,
    userRequest: string,
    llmConfig: AgentConversation["llm_config"],
  ): Promise<AgentConversation> {
    const conversations = await readData(AGENT_CONVERSATIONS_FILE);
    const conversationId = uuidv4();
    const now = new Date().toISOString();
    
    // Initialize plan pool
    const planPool: PlanPool = {
      id: uuidv4(),
      conversation_id: conversationId,
      goal_tree: [{
        id: uuidv4(),
        description: "Create character and worldbook based on user request",
        type: "main_goal",
        children: [],
        status: "pending",
        metadata: { user_request: userRequest },
      }],
      current_tasks: [],
      completed_tasks: [],
      context: {
        user_request: userRequest,
        current_focus: "Analyzing user request and creating initial plan",
        constraints: [],
        preferences: {},
      },
      created_at: now,
      updated_at: now,
    };

    // Initialize thought buffer
    const thoughtBuffer: ThoughtBuffer = {
      id: uuidv4(),
      conversation_id: conversationId,
      thoughts: [{
        id: uuidv4(),
        type: "observation",
        content: `User requested: ${userRequest}`,
        timestamp: now,
      }],
      current_reasoning: "Starting analysis of user request",
      decision_history: [],
      reflection_notes: [],
      created_at: now,
      updated_at: now,
    };

    // Initialize result
    const result: AgentResult = {
      id: uuidv4(),
      conversation_id: conversationId,
      generation_metadata: {
        total_iterations: 0,
        tools_used: [],
      },
      created_at: now,
      updated_at: now,
    };
    
    const newConversation: AgentConversation = {
      id: conversationId,
      title,
      status: AgentStatus.IDLE,
      plan_pool: planPool,
      thought_buffer: thoughtBuffer,
      result,
      messages: [{
        id: uuidv4(),
        role: "user",
        content: userRequest,
        message_type: "userInput",
        timestamp: now,
      }],
      llm_config: llmConfig,
      context: {
        current_iteration: 0,
        max_iterations: 50,
        start_time: now,
        last_activity: now,
        error_count: 0,
      },
      created_at: now,
      updated_at: now,
    };
    
    conversations.push(newConversation);
    await writeData(AGENT_CONVERSATIONS_FILE, conversations);
    
    return newConversation;
  }

  /**
   * Get conversation by ID
   */
  static async getConversationById(id: string): Promise<AgentConversation | null> {
    const conversations = await readData(AGENT_CONVERSATIONS_FILE);
    return conversations.find((conv: AgentConversation) => conv.id === id) || null;
  }

  /**
   * Get all conversations
   */
  static async getAllConversations(): Promise<AgentConversation[]> {
    const conversations = await readData(AGENT_CONVERSATIONS_FILE);
    return conversations.sort((a: AgentConversation, b: AgentConversation) => 
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    );
  }

  /**
   * Update conversation status
   */
  static async updateStatus(conversationId: string, status: AgentStatus): Promise<void> {
    const conversations = await readData(AGENT_CONVERSATIONS_FILE);
    const index = conversations.findIndex((conv: AgentConversation) => conv.id === conversationId);
    
    if (index === -1) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }
    
    conversations[index].status = status;
    conversations[index].context.last_activity = new Date().toISOString();
    conversations[index].updated_at = new Date().toISOString();
    
    await writeData(AGENT_CONVERSATIONS_FILE, conversations);
  }

  /**
   * Update entire conversation
   */
  static async updateConversation(conversation: AgentConversation): Promise<void> {
    const conversations = await readData(AGENT_CONVERSATIONS_FILE);
    const index = conversations.findIndex((conv: AgentConversation) => conv.id === conversation.id);
    
    if (index === -1) {
      throw new Error(`Conversation not found: ${conversation.id}`);
    }
    
    conversation.updated_at = new Date().toISOString();
    conversation.context.last_activity = new Date().toISOString();
    conversations[index] = conversation;
    
    await writeData(AGENT_CONVERSATIONS_FILE, conversations);
  }

  /**
   * Add message to conversation
   */
  static async addMessage(
    conversationId: string, 
    message: Omit<ConversationMessage, "id" | "timestamp">,
  ): Promise<void> {
    const conversations = await readData(AGENT_CONVERSATIONS_FILE);
    const index = conversations.findIndex((conv: AgentConversation) => conv.id === conversationId);
    
    if (index === -1) {
      throw new Error(`Conversation not found: ${conversationId}`);
    }
    
    const newMessage: ConversationMessage = {
      ...message,
      id: uuidv4(),
      timestamp: new Date().toISOString(),
    };
    
    conversations[index].messages.push(newMessage);
    conversations[index].updated_at = new Date().toISOString();
    
    await writeData(AGENT_CONVERSATIONS_FILE, conversations);
  }

  /**
   * Delete conversation
   */
  static async deleteConversation(id: string): Promise<boolean> {
    const conversations = await readData(AGENT_CONVERSATIONS_FILE);
    const filteredConversations = conversations.filter((conv: AgentConversation) => conv.id !== id);
    
    if (filteredConversations.length === conversations.length) return false;
    
    await writeData(AGENT_CONVERSATIONS_FILE, filteredConversations);
    return true;
  }
} 
