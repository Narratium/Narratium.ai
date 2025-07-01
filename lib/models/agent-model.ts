/**
 * Agent Model - Real-time Decision Architecture
 * Inspired by Jina AI DeepResearch design philosophy
 * Optimized naming conventions for clarity
 */

// Tool types - pure execution units
export enum ToolType {
  SEARCH = "SEARCH",     // Search and gather information
  ASK_USER = "ASK_USER", // Get user input
  CHARACTER = "CHARACTER", // Generate/update character card
  WORLDBOOK = "WORLDBOOK", // Generate worldbook entries
  REFLECT = "REFLECT",    // Reflect on progress and update tasks
  COMPLETE = "COMPLETE"   // Final completion - clear all tasks and end session
}

// Session execution status
export enum SessionStatus {
  IDLE = "idle",
  THINKING = "thinking",
  EXECUTING = "executing", 
  WAITING_USER = "waiting_user",
  COMPLETED = "completed",
  FAILED = "failed"
}

// ============================================================================
// CORE DECISION STRUCTURES
// ============================================================================

/**
 * Task adjustment structure for planning analysis
 */
export interface TaskAdjustment {
  reasoning: string;
  taskDescription?: string; // New task description if optimization needed
  newSubproblems?: string[]; // New sub-problems (max 2, cannot exceed current count)
}

/**
 * Real-time tool decision - inspired by DeepResearch action types
 */
export interface ToolDecision {
  tool: ToolType;
  parameters: Record<string, any>;
  reasoning: string;
  priority: number;
  taskAdjustment?: TaskAdjustment; // Optional task adjustment from planning analysis
}

/**
 * Knowledge entry from search/research results
 */
export interface KnowledgeEntry {
  id: string;
  source: string;
  content: string;
  url?: string;
  relevance_score: number;
}

/**
 * Sub-problem entry for breaking down tasks into smaller actionable steps
 */
export interface SubProblem {
  id: string;
  description: string;
  reasoning?: string;
}

/**
 * Task entry for tracking specific work items
 * Enhanced structure with sub-problems - tasks are no longer bound to specific tools
 */
export interface TaskEntry {
  id: string;
  description: string;
  reasoning?: string; // Why this task was created/updated
  sub_problems: SubProblem[]; // Ordered list of sub-problems to solve
}

/**
 * Research state - similar to DeepResearch's context management
 */
export interface ResearchState {
  id: string;
  session_id: string;
  
  // Current research objective
  main_objective: string;
  
  // Sequential task management
  task_queue: TaskEntry[];        // Pending tasks in execution order
  completed_tasks: string[];      // Descriptions of finished tasks
  
  // Research artifacts
  knowledge_base: KnowledgeEntry[];
}

/**
 * Tool execution result
 */
export interface ExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
}

// ============================================================================
// EXECUTION CONTEXT
// ============================================================================

/**
 * Tool execution context - unified for all tools
 */
export interface ExecutionContext {
  session_id: string;
  generation_output: GenerationOutput;
  // Current research state
  research_state: ResearchState;
  message_history: Message[];
  
  // LLM configuration
  llm_config: {
    model_name: string;
    api_key: string;
    base_url?: string;
    llm_type: "openai" | "ollama";
    temperature: number;
    max_tokens?: number;
    tavily_api_key?: string; // Add Tavily API key support
  };

}

// ============================================================================
// COMMUNICATION STRUCTURES
// ============================================================================

/**
 * Message in the conversation/research process
 */
export interface Message {
  id: string;
  role: "user" | "agent" | "system";
  content: string;
  type: "user_input" | "agent_thinking" | "agent_action" | "system_info" | "quality_evaluation" | "tool_failure";
}

/**
 * Generation output (specific to character creation application)
 */
export interface GenerationOutput {
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
}

export interface WorldbookEntry {
  id: string;
  uid: string;
  key: string[];
  keysecondary: string[];
  comment: string;
  content: string;
  constant: boolean;
  selective: boolean;
  order: number;
  position: number;
  disable: boolean;
}

// ============================================================================
// MAIN SESSION STRUCTURE
// ============================================================================

/**
 * Research Session - the main data container
 * Represents a complete research/generation session
 */
export interface ResearchSession {
  id: string;
  title: string;
  status: SessionStatus;
  
  // Core session data
  messages: Message[];
  research_state: ResearchState;
  generation_output: GenerationOutput;
  
  // LLM configuration
  llm_config: {
    model_name: string;
    api_key: string;
    base_url?: string;
    llm_type: "openai" | "ollama";
    temperature: number;
    max_tokens?: number;
    tavily_api_key?: string; // Add Tavily API key support
  };
  
  // Execution tracking
  execution_info: {
    current_iteration: number;
    max_iterations: number;
    error_count: number;
    last_error?: string;
    total_tokens_used: number;
    token_budget: number;
  };
  
}
