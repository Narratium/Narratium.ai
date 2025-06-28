/**
 * New Agent Model - Plan-based Architecture
 * Based on the simplified workflow design with LLM as the central planner
 */

// Core tool types available to the agent
export enum ToolType {
  PLAN = "PLAN",
  ASK_USER = "ASK_USER",
  SEARCH = "SEARCH",
  OUTPUT = "OUTPUT",
  UPDATE_PLAN = "UPDATE_PLAN"
}

// Agent execution status
export enum AgentStatus {
  IDLE = "idle",
  THINKING = "thinking",           // LLM is planning/thinking
  EXECUTING = "executing",         // Executing a tool
  WAITING_USER = "waiting_user",   // Waiting for user input
  COMPLETED = "completed",
  FAILED = "failed"
}

// Plan task structure
export interface PlanTask {
  id: string;
  description: string;
  tool: ToolType;
  parameters: Record<string, any>;
  dependencies: string[];          // Task IDs this task depends on
  status: "pending" | "executing" | "completed" | "failed";
  result?: any;
  reasoning?: string;              // Why this task is needed
  priority: number;                // Execution priority (1-10)
  created_at: string;
  completed_at?: string;
}

// Goal tree structure for hierarchical planning
export interface GoalNode {
  id: string;
  description: string;
  type: "main_goal" | "sub_goal" | "task";
  parent_id?: string;
  children: string[];              // Child goal/task IDs
  status: "pending" | "in_progress" | "completed" | "failed";
  checkpoint?: {                   // For tracking progress
    progress: number;              // 0-100
    description: string;
    timestamp: string;
  };
  metadata?: Record<string, any>;
}

// Plan pool - central planning state
export interface PlanPool {
  id: string;
  conversation_id: string;
  goal_tree: GoalNode[];           // Hierarchical goal structure
  current_tasks: PlanTask[];       // Current active tasks
  completed_tasks: PlanTask[];     // Completed task history
  context: {
    user_request: string;          // Original user request
    current_focus: string;         // What the agent is currently focusing on
    constraints: string[];         // Any constraints or requirements
    preferences: Record<string, any>; // User preferences
  };
  created_at: string;
  updated_at: string;
}

// Thought buffer for agent's internal reasoning
export interface ThoughtBuffer {
  id: string;
  conversation_id: string;
  thoughts: ThoughtEntry[];
  current_reasoning: string;       // Current line of thinking
  decision_history: DecisionEntry[]; // History of decisions made
  reflection_notes: string[];      // Self-reflection notes
  created_at: string;
  updated_at: string;
}

export interface ThoughtEntry {
  id: string;
  type: "observation" | "reasoning" | "decision" | "reflection";
  content: string;
  related_task_id?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface DecisionEntry {
  id: string;
  decision: string;
  reasoning: string;
  alternatives_considered: string[];
  confidence: number;              // 0-1 confidence in decision
  outcome?: "success" | "failure" | "partial";
  timestamp: string;
}

// Final result structure
export interface AgentResult {
  id: string;
  conversation_id: string;
  character_data?: {
    name: string;
    description: string;
    personality: string;
    scenario: string;
    first_mes: string;
    mes_example: string;
    creator_notes: string;
    avatar?: string;
    alternate_greetings?: string[];
    tags?: string[];
    [key: string]: any;
  };
  worldbook_data?: WorldbookEntry[];
  integration_notes?: string;
  quality_metrics?: {
    completeness: number;          // 0-100
    consistency: number;           // 0-100
    creativity: number;            // 0-100
    user_satisfaction: number;     // 0-100
  };
  generation_metadata: {
    total_iterations: number;
    tools_used: ToolType[];
  };
  created_at: string;
  updated_at: string;
}

export interface WorldbookEntry {
  id: string;
  uid: string;
  key: string[];                   // Trigger keywords
  keysecondary: string[];
  comment: string;                 // Entry title/description
  content: string;                 // Entry content
  constant: boolean;               // Always active
  selective: boolean;              // Context-dependent
  order: number;
  position: number;                // Insertion position
  disable: boolean;
  probability: number;             // Activation probability
  useProbability: boolean;
}

// Main conversation structure
export interface AgentConversation {
  id: string;
  title: string;
  status: AgentStatus;
  
  // Core state components
  plan_pool: PlanPool;
  thought_buffer: ThoughtBuffer;
  result: AgentResult;
  
  // Message history for UI display
  messages: ConversationMessage[];
  
  // LLM configuration
  llm_config: {
    model_name: string;
    api_key: string;
    base_url?: string;
    llm_type: "openai" | "ollama";
    temperature: number;
    max_tokens?: number;
  };
  
  // Execution context
  context: {
    current_iteration: number;
    max_iterations: number;
    start_time: string;
    last_activity: string;
    error_count: number;
    last_error?: string;
  };
  
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  id: string;
  role: "user" | "agent" | "system";
  content: string;
  message_type: "userInput" | "agent_thinking" | "agent_action" | "agent_output" | "system_info";
  metadata?: {
    task_id?: string;
    tool_used?: ToolType;
    reasoning?: string;
    attachments?: any[];
  };
  timestamp: string;
}

// Tool execution interface
export interface ToolExecutionContext {
  conversation_id: string;
  plan_pool: PlanPool;
  thought_buffer: ThoughtBuffer;
  current_result: AgentResult;
  llm_config: AgentConversation["llm_config"];
}

export interface ToolExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  should_update_plan?: boolean;
  should_continue?: boolean;
  userInput_required?: boolean;
  reasoning?: string;
}

// Note: PlanExecutor interface has been replaced by the unified BaseTool system in lib/tools/
