import { NodeBase } from "@/lib/nodeflow/NodeBase";
import { NodeConfig, NodeInput, NodeOutput, NodeCategory } from "@/lib/nodeflow/types";
import { PluginNodeTools } from "./PluginNodeTools";
import { NodeToolRegistry } from "../NodeTool";
import { PluginRegistry } from "@/lib/plugins/plugin-registry";
import { MessageContext } from "@/lib/plugins/plugin-types";

export class PluginNode extends NodeBase {
  static readonly nodeName = "plugin";
  static readonly description = "Processes plugin tool calls and integrates plugin lifecycle hooks";
  static readonly version = "1.0.0";

  private pluginRegistry: PluginRegistry;

  constructor(config: NodeConfig) {
    NodeToolRegistry.register(PluginNodeTools);
    super(config);
    this.toolClass = PluginNodeTools;
    this.pluginRegistry = PluginRegistry.getInstance();
  }
  
  protected getDefaultCategory(): NodeCategory {
    return NodeCategory.MIDDLE;
  }

  protected async _call(input: NodeInput): Promise<NodeOutput> {
    const screenContent = input.screenContent;
    const fullResponse = input.fullResponse;
    const thinkingContent = input.thinkingContent;
    const nextPrompts = input.nextPrompts;
    const event = input.event;
    const characterId = input.characterId;

    console.log("🔌 PluginNode: Processing content", {
      screenContentLength: screenContent?.length || 0,
      fullResponseLength: fullResponse?.length || 0,
      characterId,
    });

    if (!screenContent) {
      console.error("❌ PluginNode: Screen content is required");
      throw new Error("Screen content is required for PluginNode");
    }

    try {
      // 1. 初始化插件系统（如果未初始化）
      await this.initializePluginSystem();
      
      // 2. 处理onResponse钩子（AI响应后的处理）
      const responseProcessedContent = await this.processResponseHooks(screenContent, characterId);
      
      // 3. 检测并处理插件工具调用
      console.log("🔧 PluginNode: Detecting plugin tool calls in content...");
      const pluginResult = await this.executeTool(
        "processPluginTools",
        responseProcessedContent,
        characterId,
      ) as {
        processedContent: string;
        toolResults: any[];
        hasPluginCalls: boolean;
      };

      // 4. 格式化结果
      let finalContent = responseProcessedContent;
      
      if (pluginResult.hasPluginCalls) {
        console.log("🔌 PluginNode: Plugin tools detected and processed:", {
          toolCount: pluginResult.toolResults.length,
          tools: pluginResult.toolResults.map(r => r.toolName).join(", "),
        });
        
        // 格式化工具结果为用户友好的输出
        const formattedResult = await this.executeTool(
          "formatPluginResults",
          pluginResult.toolResults,
          pluginResult.processedContent,
        ) as string;
        
        finalContent = formattedResult;
      } else {
        console.log("📝 PluginNode: No plugin tools detected in content");
      }

      console.log("✅ PluginNode: Processing complete", {
        originalLength: screenContent.length,
        finalLength: finalContent.length,
        hadPluginCalls: pluginResult.hasPluginCalls,
      });

      return {
        thinkingContent,
        screenContent: finalContent,
        fullResponse,
        nextPrompts,
        event,
        characterId,
      };
    } catch (error) {
      console.error("❌ PluginNode: Error processing content:", error);
      return {
        thinkingContent,
        screenContent: `[插件处理错误: ${error instanceof Error ? error.message : "未知错误"}]\n\n${screenContent}`,
        fullResponse,
        nextPrompts,
        event,
        characterId,
      };
    }
  }

  /**
   * 初始化插件系统
   */
  private async initializePluginSystem(): Promise<void> {
    try {
      console.log("🔌 PluginNode: Initializing plugin system...");
      await this.pluginRegistry.initialize();
      console.log("✅ PluginNode: Plugin system initialized");
    } catch (error) {
      console.error("❌ PluginNode: Failed to initialize plugin system:", error);
    }
  }

  /**
   * 处理onResponse钩子
   */
  private async processResponseHooks(content: string, characterId: string): Promise<string> {
    try {
      console.log("🔌 PluginNode: Processing onResponse hooks...");
      
      const messageContext: MessageContext = {
        id: `plugin-node-${Date.now()}`,
        role: "assistant",
        content,
        timestamp: new Date(),
        characterId,
        metadata: {
          nodeType: "plugin",
          stage: "response",
        },
      };

      const processedMessage = await this.pluginRegistry.processResponse(messageContext);
      
      console.log("✅ PluginNode: onResponse hooks processed", {
        originalLength: content.length,
        processedLength: processedMessage.content.length,
      });

      return processedMessage.content;
    } catch (error) {
      console.error("❌ PluginNode: Error processing onResponse hooks:", error);
      return content;
    }
  }
} 
 
