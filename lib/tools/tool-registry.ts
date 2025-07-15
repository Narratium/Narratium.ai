import { 
  ToolType, 
  ExecutionContext, 
  ExecutionResult, 
  ToolDecision, 
} from "../models/agent-model";
import { SimpleTool } from "./base-tool";
import { SearchTool } from "./search";
import { AskUserTool } from "./ask-user";
import { CharacterTool } from "./character";
import { StatusTool } from "./status";
import { UserSettingTool } from "./user-setting";
import { WorldViewTool } from "./world-view";
import { SupplementTool } from "./supplement";
import { ReflectTool } from "./reflect";
import { CompleteTool } from "./complete";

/**
 * Simplified Tool Registry - Real-time Decision Architecture
 * No more complex tool planning, just direct tool execution
 */
export class ToolRegistry {
  private static tools: Map<ToolType, SimpleTool> = new Map();
  private static dynamicTools: Map<string, SimpleTool> = new Map();
  private static initialized = false;

  /**
   * Initialize and register all tools
   */
  static initialize(): void {
    if (this.initialized) return;

    // Register simplified tools
    this.tools.set(ToolType.SEARCH, new SearchTool());
    this.tools.set(ToolType.ASK_USER, new AskUserTool());
    this.tools.set(ToolType.CHARACTER, new CharacterTool());
    this.tools.set(ToolType.STATUS, new StatusTool());
    this.tools.set(ToolType.USER_SETTING, new UserSettingTool());
    this.tools.set(ToolType.WORLD_VIEW, new WorldViewTool());
    this.tools.set(ToolType.SUPPLEMENT, new SupplementTool());
    this.tools.set(ToolType.REFLECT, new ReflectTool());
    this.tools.set(ToolType.COMPLETE, new CompleteTool());

    this.initialized = true;
    console.log("🔧 Tool Registry initialized with 9 tools (including 4 specialized worldbook tools)");
  }

  /**
   * Register a dynamic plugin tool
   */
  static registerDynamicTool(tool: SimpleTool): void {
    this.initialize();
    
    const toolName = tool.constructor.name;
    if (this.dynamicTools.has(toolName)) {
      console.warn(`⚠️ Dynamic tool ${toolName} is already registered, replacing...`);
    }
    
    this.dynamicTools.set(toolName, tool);
    console.log(`🔧 Dynamic tool registered: ${toolName}`);
  }

  /**
   * Unregister a dynamic plugin tool
   */
  static unregisterDynamicTool(toolName: string): void {
    if (this.dynamicTools.has(toolName)) {
      this.dynamicTools.delete(toolName);
      console.log(`🔧 Dynamic tool unregistered: ${toolName}`);
    }
  }

  /**
   * Get a dynamic tool by name
   */
  static getDynamicTool(toolName: string): SimpleTool | undefined {
    return this.dynamicTools.get(toolName);
  }

  /**
   * Get all dynamic tools
   */
  static getDynamicTools(): SimpleTool[] {
    return Array.from(this.dynamicTools.values());
  }

  /**
   * Get all available tools (both static and dynamic)
   */
  static getAvailableTools(): Record<string, SimpleTool> {
    const allTools: Record<string, SimpleTool> = {};
    
    // Add static tools
    this.tools.forEach((tool, type) => {
      allTools[type] = tool;
    });
    
    // Add dynamic tools
    this.dynamicTools.forEach((tool, name) => {
      allTools[name] = tool;
    });
    
    return allTools;
  }

  /**
   * Get a specific tool by name
   */
  static getTool(toolName: string): SimpleTool | undefined {
    // Check dynamic tools first
    if (this.dynamicTools.has(toolName)) {
      return this.dynamicTools.get(toolName);
    }
    
    // Check static tools
    for (const [type, tool] of this.tools) {
      if (type === toolName) {
        return tool;
      }
    }
    
    return undefined;
  }

  /**
   * Execute a tool decision - the core method for real-time execution
   */
  static async executeToolDecision(
    decision: ToolDecision, 
    context: ExecutionContext,
  ): Promise<ExecutionResult> {
    this.initialize();

    const tool = this.tools.get(decision.tool);
    if (!tool) {
      return {
        success: false,
        error: `No tool found for type: ${decision.tool}`,
      };
    }

    try {
      const result = await tool.execute(context, decision.parameters);
      
      console.log(`✅ [${tool.name}] ${result.success ? "Success" : "Failed"}`);
      if (result.error) {
        console.log(`❌ Error: ${result.error}`);
      }
      
      return result;
    } catch (error) {
      console.error(`❌ [${tool.name}] Execution failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Generates a detailed XML string describing all registered tools and their parameters.
   * This structured format is easier for the LLM to parse in prompts.
   */
  static getDetailedToolsInfo(): string {
    this.initialize();

    let xmlOutput = "<tools>\n";

    this.tools.forEach((tool, toolType) => {
      xmlOutput += "  <tool>\n";
      xmlOutput += `    <type>${toolType}</type>\n`;
      xmlOutput += `    <name>${tool.name}</name>\n`;
      xmlOutput += `    <description>${tool.description}</description>\n`;
      xmlOutput += "    <parameters>\n";
      
      tool.parameters.forEach(param => {
        xmlOutput += "      <parameter>\n";
        xmlOutput += `        <name>${param.name}</name>\n`;
        xmlOutput += `        <type>${param.type}</type>\n`;
        xmlOutput += `        <required>${param.required}</required>\n`;
        xmlOutput += `        <description>${param.description}</description>\n`;
        xmlOutput += "      </parameter>\n";
      });

      xmlOutput += "    </parameters>\n";
      xmlOutput += "  </tool>\n";
    });

    xmlOutput += "</tools>";
    return xmlOutput;
  }
}

// Auto-initialize the registry
ToolRegistry.initialize(); 
 
