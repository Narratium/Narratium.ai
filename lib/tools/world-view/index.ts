import { 
  ToolType, 
  ExecutionContext, 
  ExecutionResult,
  WorldViewEntry,
} from "../../models/agent-model";
import { BaseTool, ToolParameter } from "../base-tool";
import { v4 as uuidv4 } from "uuid";

/**
 * World View Tool - Creates the mandatory WORLD_VIEW worldbook entry
 * WORLD_VIEW entry provides comprehensive foundational world structure with deep hierarchical organization
 */
export class WorldViewTool extends BaseTool {
  readonly toolType = ToolType.WORLD_VIEW;
  readonly name = "WORLD_VIEW";
  readonly description = "Create the mandatory WORLD_VIEW worldbook entry that provides comprehensive foundational world structure with deep hierarchical organization. Must include systematic world-building covering: world origins/history with detailed timelines, core systems (technology/magic/power) with specific mechanisms, geographical structure with environmental details, societal frameworks with power dynamics, cultural aspects with behavioral patterns, faction systems with relationships and conflicts, resource distribution with scarcity factors, communication networks, survival challenges, and clear expansion opportunities that can be developed into supplementary entries. Use deep hierarchical Markdown structure (## → ### → #### → -) with 800-2000 words total. This is one of the 3 required essential entries.";
  
  readonly parameters: ToolParameter[] = [
    {
      name: "content",
      type: "string",
      description: "Comprehensive WORLD_VIEW entry content (800-2000 words) wrapped in <world_view></world_view> XML tags with deep hierarchical Markdown formatting inside. Must include systematic world structure using 4-level hierarchy (## → ### → #### → -) covering: world origins/history with detailed timelines, core systems (technology/magic/power) with specific mechanisms, geographical structure with environmental details, societal frameworks with power dynamics, cultural aspects with behavioral patterns, faction systems with relationships and conflicts, resource distribution with scarcity factors, communication networks, survival challenges. Focus on creating clear expansion opportunities that can be developed into supplementary entries. Include specific nouns, names, locations, organizations, technologies, and systems that can serve as keywords for supplementary worldbook entries.",
      required: true,
    },
    {
      name: "comment",
      type: "string",
      description: "Must be exactly 'WORLD_VIEW' to identify this as the world view entry",
      required: true,
    },
  ];

  protected async doWork(parameters: Record<string, any>, context: ExecutionContext): Promise<ExecutionResult> {
    const content = parameters.content;
    const comment = parameters.comment;
    
    if (!content || typeof content !== "string") {
      return this.createFailureResult("WORLD_VIEW tool requires 'content' parameter as a string.");
    }

    if (!comment || comment.toUpperCase() !== "WORLD_VIEW") {
      return this.createFailureResult("WORLD_VIEW tool requires 'comment' parameter to be exactly 'WORLD_VIEW'.");
    }

    // Validate content has proper XML wrapper
    if (!content.includes("<world_view>") || !content.includes("</world_view>")) {
      return this.createFailureResult("WORLD_VIEW entry content must be wrapped in <world_view></world_view> XML tags.");
    }

    // Build the WORLD_VIEW worldbook entry with fixed configuration
    const worldViewEntry: WorldViewEntry = {
      id: `world_view_${Date.now()}`,
      uid: uuidv4(),
      keys: ["world", "universe", "realm", "setting", "reality"], // Fixed keywords for WORLD_VIEW
      keysecondary: ["background", "lore", "foundation"],
      comment: "WORLD_VIEW",
      content: content,
      constant: true, // Always active
      selective: true,
      insert_order: 3, // Third priority
      position: 0, // At story beginning
      disable: false,
      probability: 100,
      useProbability: true,
    };

    console.log(`✅ Created WORLD_VIEW entry with ${content.length} characters, providing comprehensive world foundation`);

    return this.createSuccessResult({
      world_view_data: worldViewEntry,
    });
  }
} 
