import { 
  ToolType, 
  ExecutionContext, 
  ExecutionResult, 
} from "@/lib/models/agent-model";
import { BaseSimpleTool, ToolParameter } from "@/lib/tools/base-tool";

/**
 * Worldbook Tool - Pure Execution Unit
 * Handles worldbook generation metadata based on provided parameters from planner
 * Actual content generation is handled by AgentEngine
 */
export class WorldbookTool extends BaseSimpleTool {
  readonly toolType = ToolType.WORLDBOOK;
  readonly name = "WORLDBOOK";
  readonly description = "Generate worldbook entries to enhance storytelling - one of the most frequently used tools. Use AFTER character creation is substantially complete. Create entries systematically: start with character relationships and background, then world information, rules, and supporting elements. Build worldbook incrementally, adding 1-3 high-quality entries per call that complement the established character and story setting.";
  
  readonly parameters: ToolParameter[] = [
    {
      name: "key",
      type: "array",
      description: "Array of primary trigger keywords that activate this worldbook entry when mentioned in conversation. Choose common, natural words that users would likely use when discussing this topic. Keywords should be broad enough to catch relevant context but specific enough to avoid false triggers (e.g., for magic system: ['magic', 'spell', 'mana', 'enchantment', 'wizard'])",
      required: true,
    },
    {
      name: "content",
      type: "string",
      description: "Detailed worldbook content that enhances roleplay and provides context",
      required: true,
    },
    {
      name: "comment",
      type: "string",
      description: "Brief description of what this entry covers (for organization)",
      required: true,
    },
    {
      name: "keysecondary",
      type: "array",
      description: "Array of secondary trigger keywords (optional)",
      required: false,
    },
    {
      name: "constant",
      type: "boolean",
      description: "Whether this entry should always be active. Use TRUE for global information like world background, historical events, character relationships, and NPC details that should always be available. Use FALSE (default) for situational information that only appears in specific story contexts or scenes.",
      required: false,
    },
    {
      name: "position",
      type: "number",
      description: "Controls where this worldbook entry is inserted in the AI conversation context. Values: 0-1 (at story beginning for foundational info), 2 (at story end for supplemental context), 3 (before recent user input for immediate relevance), 4 (after recent user input for response context). Default: 0",
      required: false,
    },
    {
      name: "order",
      type: "number",
      description: "Display/processing order priority (default: 100)",
      required: false,
    },
  ];

  protected async doWork(parameters: Record<string, any>, context: ExecutionContext): Promise<ExecutionResult> {
    const key = parameters.key;
    const content = parameters.content;
    const comment = parameters.comment;
    
    if (!key) {
      return this.createFailureResult("WORLDBOOK tool requires 'key' parameter.");
    }

    // Handle key parameter - support both array and comma-separated string
    let keyArray: string[];
    if (Array.isArray(key)) {
      keyArray = key.filter((k: string) => k && k.trim().length > 0);
    } else if (typeof key === "string") {
      keyArray = key.split(",").map((k: string) => k.trim()).filter((k: string) => k.length > 0);
    } else {
      return this.createFailureResult("WORLDBOOK tool requires 'key' parameter as an array or comma-separated string.");
    }

    if (!content || typeof content !== "string") {
      return this.createFailureResult("WORLDBOOK tool requires 'content' parameter as a string.");
    }

    if (!comment || typeof comment !== "string") {
      return this.createFailureResult("WORLDBOOK tool requires 'comment' parameter as a string.");
    }

    // Handle keysecondary parameter - support both array and comma-separated string
    let keysecondaryArray: string[] = [];
    if (parameters.keysecondary) {
      if (Array.isArray(parameters.keysecondary)) {
        keysecondaryArray = parameters.keysecondary.filter((k: string) => k && k.trim().length > 0);
      } else if (typeof parameters.keysecondary === "string") {
        keysecondaryArray = parameters.keysecondary.split(",").map((k: string) => k.trim()).filter((k: string) => k.length > 0);
      }
    }

    // Build the worldbook entry
    const entry = {
      id: `wb_entry_${Date.now()}`,
      uid: (1000 + Math.floor(Math.random() * 1000)).toString(),
      key: keyArray,
      keysecondary: keysecondaryArray,
      comment: comment,
      content: content,
      constant: parameters.constant || false,
      selective: true,
      order: parameters.order || 100,
      position: parameters.position || 0,
      disable: false,
      probability: 100,
      useProbability: true,
    };

    return this.createSuccessResult({
      worldbook_data: [entry],
    });
  }

}
