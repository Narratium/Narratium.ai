import { 
  ToolType, 
  ExecutionContext, 
  ExecutionResult,
} from "@/lib/models/agent-model";
import { BaseSimpleTool, ToolParameter, DetailedToolInfo } from "@/lib/tools/base-tool";

/**
 * Ask User Tool - Pure Execution Unit
 * Formats a question provided by the planner to be presented to the user.
 */
export class AskUserTool extends BaseSimpleTool {
  readonly toolType = ToolType.ASK_USER;
  readonly name = "ASK_USER";
  readonly description = "Ask the user for clarification on core story elements and broad directional questions. USE ONLY when you cannot determine fundamental aspects like: story genre/style (e.g., Cthulhu horror, sweet romance, campus life), character type (single character vs world scenario), or other major creative directions that significantly impact the entire generation. Do NOT use for specific details that can be inferred or creatively determined - only use when uncertain about foundational story elements that require user preference.";
  
  readonly parameters: ToolParameter[] = [
    {
      name: "question",
      type: "string",
      description: "The complete, well-formed question text to present to the user. Should be clear, specific, and actionable.",
      required: true,
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
    
    if (!questionText || typeof questionText !== "string") {
      return this.createFailureResult("ASK_USER tool requires a 'question' parameter of type string.");
    }

    return this.createSuccessResult(
      { 
        message: questionText,
      },
    );
  }
} 
