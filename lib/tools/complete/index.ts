import { 
  ToolType, 
  ExecutionContext, 
  ExecutionResult,
} from "../../models/agent-model";
import { BaseTool, ToolParameter, DetailedToolInfo } from "../base-tool";

/**
 * Complete Tool - Session Termination Unit
 * Validates completion status and signals when session should end
 */
export class CompleteTool extends BaseTool {
  
  readonly toolType = ToolType.COMPLETE;
  readonly name = "COMPLETE";
  readonly description = "Final completion tool that signals when the generation is complete and session should end. Use this tool when character and worldbook creation are finished and the system should terminate.";
  
  readonly parameters: ToolParameter[] = [
    {
      name: "finished",
      type: "boolean", 
      description: "Set to true when generation is complete and session should end.",
      required: true,
    },
  ];

  getToolInfo(): DetailedToolInfo {
    return {
      type: ToolType.COMPLETE,
      name: this.name,
      description: this.description,
      parameters: this.parameters,
    };
  }

  protected async doWork(parameters: Record<string, any>, context: ExecutionContext): Promise<ExecutionResult> {
    const finished = parameters.finished;
    
    if (typeof finished !== "boolean") {
      return this.createFailureResult("COMPLETE tool requires 'finished' parameter as a boolean value.");
    }
    
    if (finished) {
      return this.createSuccessResult({
        message: "Session completion confirmed. Ready to end session.",
        finished: true,
      });
    } else {
      return this.createSuccessResult({
        message: "Session not ready for completion.",
        finished: false,
      });
    }
  }
} 
