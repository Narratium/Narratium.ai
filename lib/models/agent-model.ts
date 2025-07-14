/**
 * Agent Model - Real-time Decision Architecture
 * Inspired by Jina AI DeepResearch design philosophy
 * Optimized naming conventions for clarity
 */

// ============================================================================
// TOOL TYPES AND ENUMS
// ============================================================================

export enum ToolType {
  SEARCH = "SEARCH",     // Search and gather information
  ASK_USER = "ASK_USER", // Get user input
  CHARACTER = "CHARACTER", // Generate/update character card
  STATUS = "STATUS", // Create world status entry (mandatory)
  USER_SETTING = "USER_SETTING", // Create player setting entry (mandatory)
  WORLD_VIEW = "WORLD_VIEW", // Create world structure entry (mandatory)
  SUPPLEMENT = "SUPPLEMENT", // Create supplementary entries (minimum 5)
  REFLECT = "REFLECT",    // Reflect on progress and update tasks
  COMPLETE = "COMPLETE"   // Final completion - clear all tasks and end session
}

/**
 * Session status enum
 */
export enum SessionStatus {
  IDLE = "idle",
  THINKING = "thinking",
  EXECUTING = "executing", 
  WAITING_USER = "waiting_user",
  COMPLETED = "completed",
  FAILED = "failed"
}

// ============================================================================
// PLANNING AND DECISION STRUCTURES
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
  sub_problems: SubProblem[]; // insert_ordered list of sub-problems to solve
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
  task_queue: TaskEntry[];        // Pending tasks in execution insert_order
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
 * Configuration (API keys, etc.) should be injected from external config
 */
export interface ExecutionContext {
  session_id: string;
  generation_output: GenerationOutput;
  // Current research state
  research_state: ResearchState;
  message_history: Message[];
}

// ============================================================================
// WORLDBOOK DATA STRUCTURES
// ============================================================================

/**
 * Base worldbook entry interface with common properties
 */
export interface BaseWorldbookEntry {
  id: string;
  uid: string;
  keys: string[];
  keysecondary: string[];
  comment: string;
  content: string;
  constant: boolean;
  selective: boolean;
  insert_order: number;
  position: number;
  disable: boolean;
  probability?: number;
  useProbability?: boolean;
}

/**
 * STATUS worldbook entry - Real-time game interface
 * Always active with highest priority (insert_order: 1)
 */
export interface StatusEntry extends BaseWorldbookEntry {
  comment: "STATUS";
  constant: true;
  insert_order: 1;
  position: 0;
}

/**
 * USER_SETTING worldbook entry - Player character profiling
 * Always active with second priority (insert_order: 2)
 */
export interface UserSettingEntry extends BaseWorldbookEntry {
  comment: "USER_SETTING";
  constant: true;
  insert_order: 2;
  position: 0;
}

/**
 * WORLD_VIEW worldbook entry - Foundational world structure
 * Always active with third priority (insert_order: 3)
 */
export interface WorldViewEntry extends BaseWorldbookEntry {
  comment: "WORLD_VIEW";
  constant: true;
  insert_order: 3;
  position: 0;
}

/**
 * SUPPLEMENT worldbook entry - Contextual expansions
 * Context-activated with variable priority (insert_order: 10+)
 */
export interface SupplementEntry extends BaseWorldbookEntry {
  constant: false;
  insert_order: number; // 10+ for supplementary entries
  position: 2; // Story end position for contextual activation
}

// ============================================================================
// COMMUNICATION STRUCTURES
// ============================================================================

/**
 * Communication message structure - enhanced with UI metadata
 */
export interface Message {
  id: string;
  role: "user" | "agent" | "system";
  content: string;
  type: "user_input" | "agent_thinking" | "agent_action" | "agent_preparing_tool" | "system_info" | "quality_evaluation" | "tool_failure" | "completion_actions";
  timestamp?: string | Date; // Timestamp for message ordering
  metadata?: {
    tool?: string;
    parameters?: any;
    result?: any;
    reasoning?: string;
    priority?: number;
    actions?: string[]; // For completion_actions type
    [key: string]: any;
  };
}

/**
 * Generation output (specific to character creation application)
 * Worldbook data is now separated into 4 specialized categories
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
  
  // Separated worldbook data structures
  status_data?: StatusEntry;           // Single STATUS entry (mandatory)
  user_setting_data?: UserSettingEntry; // Single USER_SETTING entry (mandatory)
  world_view_data?: WorldViewEntry;    // Single WORLD_VIEW entry (mandatory)
  supplement_data?: SupplementEntry[]; // Multiple SUPPLEMENT entries (minimum 5)
}

// ============================================================================
// MAIN SESSION STRUCTURE
// ============================================================================

/**
 * Research Session - the main data container
 * Represents a complete research/generation session
 * LLM configuration is not stored here - it's injected at runtime from ConfigManager
 */
export interface ResearchSession {
  id: string;
  title: string;
  status: SessionStatus;
  
  // Core session data
  messages: Message[];
  research_state: ResearchState;
  generation_output: GenerationOutput;
  
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
