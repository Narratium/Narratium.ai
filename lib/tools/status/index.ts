import { 
  ToolType, 
  ExecutionContext, 
  ExecutionResult,
  StatusEntry,
} from "../../models/agent-model";
import { BaseTool, ToolParameter } from "../base-tool";
import { v4 as uuidv4 } from "uuid";

/**
 * Status Tool - Creates the mandatory STATUS worldbook entry
 * STATUS entry provides comprehensive real-time game interface with professional formatting and visual organization
 */
export class StatusTool extends BaseTool {
  readonly toolType = ToolType.STATUS;
  readonly name = "STATUS";
  readonly description = "Create the mandatory STATUS worldbook entry that provides comprehensive real-time game interface with professional visual formatting. Must include structured sections with decorative headers, temporal context (current time/date/location), environmental data (indoor/outdoor temperature, weather), character interaction panels (basic info, physical data, special attributes), dynamic statistics (numerical values with progress bars), and interactive elements (available actions, special events). Use professional formatting with symbols, dividers, organized data presentation, and visual structure that creates an immersive game-like interface. This is one of the 3 required essential entries.";
  
  readonly parameters: ToolParameter[] = [
    {
      name: "content",
      type: "string",
      description: "Comprehensive STATUS entry content (500-1500 words) wrapped in <status></status> XML tags with professional visual formatting inside. Must include: decorative title headers with symbols/dividers, temporal context (current time/date/day/location), environmental data (temperatures, conditions), character interaction panels with structured data (basic info: name/age/affiliation/occupation/level/status effects, physical data: height/weight/measurements/experience, special attributes: traits/personality/preferences), dynamic statistics with numerical values and progress indicators, interactive elements (available actions list, special events/triggers), and professional visual organization using symbols, formatting, and clear data presentation that creates an immersive real-time game interface.",
      required: true,
    },
    {
      name: "comment",
      type: "string", 
      description: "Must be exactly 'STATUS' to identify this as the status entry",
      required: true,
    },
  ];

  protected async doWork(parameters: Record<string, any>, context: ExecutionContext): Promise<ExecutionResult> {
    const content = parameters.content;
    const comment = parameters.comment;
    
    if (!content || typeof content !== "string") {
      return this.createFailureResult("STATUS tool requires 'content' parameter as a string.");
    }

    if (!comment || comment.toUpperCase() !== "STATUS") {
      return this.createFailureResult("STATUS tool requires 'comment' parameter to be exactly 'STATUS'.");
    }

    // Validate content has proper XML wrapper
    if (!content.includes("<status>") || !content.includes("</status>")) {
      return this.createFailureResult("STATUS entry content must be wrapped in <status></status> XML tags.");
    }

    // Validate content length for quality requirements
    const contentLength = content.length;
    if (contentLength < 300) {
      return this.createFailureResult("STATUS entry content too short. Minimum 500 words required for comprehensive real-time interface.");
    }

    // Build the STATUS worldbook entry with fixed configuration
    const statusEntry: StatusEntry = {
      id: `status_${Date.now()}`,
      uid: uuidv4(),
      keys: ["status", "current", "state", "condition", "situation"], // Fixed keywords for STATUS
      keysecondary: ["info", "update", "check"],
      comment: "STATUS",
      content: content,
      constant: true, // Always active
      selective: true,
      insert_order: 1, // Highest priority
      position: 0, // At story beginning
      disable: false,
      probability: 100,
      useProbability: true,
    };

    console.log(`✅ Created STATUS entry with ${content.length} characters, featuring professional game interface formatting`);

    return this.createSuccessResult({
      status_data: statusEntry,
    });
  }
} 
