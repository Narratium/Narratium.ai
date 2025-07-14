import { 
  ToolType, 
  ExecutionContext, 
  ExecutionResult,
  UserSettingEntry,
} from "../../models/agent-model";
import { BaseTool, ToolParameter } from "../base-tool";
import { v4 as uuidv4 } from "uuid";

/**
 * User Setting Tool - Creates the mandatory USER_SETTING worldbook entry
 * USER_SETTING entry provides comprehensive player character profiling with multi-dimensional hierarchical information
 */
export class UserSettingTool extends BaseTool {
  readonly toolType = ToolType.USER_SETTING;
  readonly name = "USER_SETTING";
  readonly description = "Create the mandatory USER_SETTING worldbook entry that provides comprehensive player character profiling with detailed hierarchical organization. Must include structured sections: Basic Information (name, age, gender, physical stats, occupation), Appearance Features (facial features, body type, clothing style), Personality Traits (surface personality, inner personality, psychological state), Life Status (living environment, social relationships), Special Experiences (past experiences, rebirths, timeline events), Special Abilities (systems, powers, limitations), Current State (resources, psychological dynamics, action tendencies). Use deep hierarchical Markdown structure (## → ### → #### → -) with 800-1500 words total. This is one of the 3 required essential entries.";
  
  readonly parameters: ToolParameter[] = [
    {
      name: "content",
      type: "string",
      description: "Comprehensive USER_SETTING entry content (800-1500 words) wrapped in <user_setting></user_setting> XML tags with deep hierarchical Markdown formatting inside. Must include: ## 基础信息 (personal overview, appearance features), ## 性格特征 (surface personality, inner personality, psychological states), ## 生活状态 (living environment, social relationships), ## 重生经历/特殊经历 (past experiences, timeline events, known/unknown information), ## 特殊能力 (systems, abilities, limitations, usage methods), ## 当前状态 (controlled resources, psychological dynamics, action tendencies). Use 4-level hierarchy (## → ### → #### → -) with specific details, examples, and systematic descriptions. Focus on character depth, contradictions, growth arcs, and world integration.",
      required: true,
    },
    {
      name: "comment",
      type: "string",
      description: "Must be exactly 'USER_SETTING' to identify this as the user setting entry",
      required: true,
    },
  ];

  protected async doWork(parameters: Record<string, any>, context: ExecutionContext): Promise<ExecutionResult> {
    const content = parameters.content;
    const comment = parameters.comment;
    
    if (!content || typeof content !== "string") {
      return this.createFailureResult("USER_SETTING tool requires 'content' parameter as a string.");
    }

    if (!comment || comment.toUpperCase() !== "USER_SETTING") {
      return this.createFailureResult("USER_SETTING tool requires 'comment' parameter to be exactly 'USER_SETTING'.");
    }

    // Validate content has proper XML wrapper
    if (!content.includes("<user_setting>") || !content.includes("</user_setting>")) {
      return this.createFailureResult("USER_SETTING entry content must be wrapped in <user_setting></user_setting> XML tags.");
    }

    // Build the USER_SETTING worldbook entry with fixed configuration
    const userSettingEntry: UserSettingEntry = {
      id: `user_setting_${Date.now()}`,
      uid: uuidv4(),
      keys: ["user", "player", "character", "protagonist", "you"], // Fixed keywords for USER_SETTING
      keysecondary: ["yourself", "personal", "background"],
      comment: "USER_SETTING",
      content: content,
      constant: true, // Always active
      selective: true,
      insert_order: 2, // Second priority
      position: 0, // At story beginning
      disable: false,
      probability: 100,
      useProbability: true,
    };

    console.log(`✅ Created USER_SETTING entry with ${content.length} characters, covering comprehensive character profiling`);

    return this.createSuccessResult({
      user_setting_data: userSettingEntry,
    });
  }
} 
