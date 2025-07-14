import { 
  ToolType,
  ExecutionContext,
  ExecutionResult,
  KnowledgeEntry,
} from "../models/agent-model";
import { v4 as uuidv4 } from "uuid";

// ============================================================================
// PURE EXECUTION TOOL ARCHITECTURE - Following DeepResearch Design
// ============================================================================

/**
 * Tool parameter definition for planning phase
 * Following DeepResearch approach - simple parameter schema
 */
export interface ToolParameter {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  required: boolean;
  description: string;
}

/**
 * Detailed tool information for planning
 */
export interface DetailedToolInfo {
  type: ToolType;
  name: string;
  description: string;
  parameters: ToolParameter[];
}

/**
 * Simple tool interface - pure execution only
 */
export interface SimpleTool {
  readonly name: string;
  readonly description: string;
  readonly toolType: ToolType;
  readonly parameters: ToolParameter[];
  
  execute(context: ExecutionContext, parameters: Record<string, any>): Promise<ExecutionResult>;
}

/**
 * Base Tool - Pure Execution Unit (Following DeepResearch Philosophy)
 * No LLM calls, no parameter generation, just direct execution
 */
export abstract class BaseTool implements SimpleTool {
  abstract readonly toolType: ToolType;
  abstract readonly name: string;
  abstract readonly description: string;
  abstract readonly parameters: ToolParameter[];

  /**
   * Pure execution method - no LLM calls, just execute with given parameters
   */
  async execute(context: ExecutionContext, parameters: Record<string, any>): Promise<ExecutionResult> {
    try {
      
      // Direct execution with provided parameters
      const result = await this.doWork(parameters, context);
      
      console.log(`✅ [${this.name}] Execution completed`);
      
      return result;
      
    } catch (error) {
      console.error(`❌ [${this.name}] Execution failed:`, error);
      return this.createFailureResult(error);
    }
  }

  /**
   * Core work logic - implement this in your tool
   * This should be pure execution without any LLM calls
   */
  protected abstract doWork(parameters: Record<string, any>, context: ExecutionContext): Promise<any>;

  // ============================================================================
  // HELPER METHODS - Pure utilities without LLM calls
  // ============================================================================

  /**
   * Create knowledge entry from results
   */
  protected createKnowledgeEntry(
    source: string,
    content: string,
    url?: string,
    relevanceScore: number = 70,
  ): KnowledgeEntry {
    return {
      id: uuidv4(),
      source,
      content,
      url,
      relevance_score: relevanceScore,  
    };
  }

  /**
   * Create success result
   */
  protected createSuccessResult(
    result: any,
  ): ExecutionResult {
    return {
      success: true,
      result,
    };  
  }

  /**
   * Create failure result
   */
  protected createFailureResult(
    error: any,
  ): ExecutionResult {
    const errorMessage = error instanceof Error ? error.message : String(error);

    return {
      success: false,
      error: `${this.name} failed: ${errorMessage}`,
    };
  }

  /**
   * Build simple summaries for context (no LLM calls)
   */
  protected buildKnowledgeBaseSummary(knowledgeBase: KnowledgeEntry[]): string {
    if (knowledgeBase.length === 0) {
      return "No knowledge gathered yet.";
    }
    
    return knowledgeBase
      .slice(0, 5)
      .map(k => `- ${k.source}: ${k.content.substring(0, 100)}...`)
      .join("\n");
  }
} 
