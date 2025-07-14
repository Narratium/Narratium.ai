import { 
  ToolType, 
  ExecutionContext, 
  ExecutionResult,
} from "../../models/agent-model";
import { BaseTool, ToolParameter, DetailedToolInfo } from "../base-tool";

/**
 * Ask User Tool - Pure Execution Unit
 * Formats a question provided by the planner to be presented to the user.
 * Can optionally provide predefined choice options for the user to select from.
 */
export class AskUserTool extends BaseTool {
  readonly toolType = ToolType.ASK_USER;
  readonly name = "ASK_USER";
  readonly description = "Ask the user for clarification on core story elements and broad directional questions. USE ONLY when you cannot determine fundamental aspects like: story genre/style (e.g., Cthulhu horror, sweet romance, campus life), character type (single character vs world scenario), or other major creative directions that significantly impact the entire generation. Do NOT use for specific details that can be inferred or creatively determined - only use when uncertain about foundational story elements that require user preference. Can provide optional choice options for easier user selection.";
  
  readonly parameters: ToolParameter[] = [
    {
      name: "question",
      type: "string",
      description: "The complete, well-formed question text to present to the user. Should be clear, specific, and actionable.",
      required: true,
    },
    {
      name: "options",
      type: "array",
      description: "Optional array of predefined answer choices (typically 2-3 options). If provided, users can navigate with arrow keys to select, but can still choose to input custom text. Example: ['Fantasy adventure', 'Modern romance', 'Sci-fi thriller']",
      required: false,
    },
  ];

  getToolInfo(): DetailedToolInfo {
    return {
      type: ToolType.ASK_USER,
      name: this.name,
      description: this.description,
      parameters: this.parameters,
    };
  }

  protected async doWork(parameters: Record<string, any>, context: ExecutionContext): Promise<ExecutionResult> {
    const questionText = parameters.question;
    const options = parameters.options;
    
    if (!questionText || typeof questionText !== "string") {
      return this.createFailureResult("ASK_USER tool requires a 'question' parameter of type string.");
    }

    // Validate options parameter if provided
    if (options !== undefined) {
      if (!Array.isArray(options)) {
        return this.createFailureResult("ASK_USER tool 'options' parameter must be an array when provided.");
      }
      
      // Filter out empty/invalid options
      const validOptions = options.filter(option => 
        option && typeof option === "string" && option.trim().length > 0,
      );
      
      if (validOptions.length === 0) {
        return this.createFailureResult("ASK_USER tool 'options' parameter must contain at least one valid string option.");
      }

      return this.createSuccessResult({
        message: questionText,
        options: validOptions,
      });
    }

    // No options provided, return just the message
    return this.createSuccessResult({
      message: questionText,
    });
  }
} 
