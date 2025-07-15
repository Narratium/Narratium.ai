import { NodeTool } from "../NodeTool";
import { ToolRegistry } from "@/lib/tools/tool-registry";
import { ExecutionContext } from "@/lib/models/agent-model";

export class PluginNodeTools extends NodeTool {
  static readonly description = "Tools for processing plugin calls in dialogue";
  static readonly version = "1.0.0";

  /**
   * 处理插件工具调用
   * 检测内容中的插件工具调用并执行
   */
  static async processPluginTools(
    content: string,
    characterId: string,
  ): Promise<{
    processedContent: string;
    toolResults: any[];
    hasPluginCalls: boolean;
  }> {
    console.log("🔧 PluginNodeTools: Processing plugin tools", {
      contentLength: content.length,
      characterId,
      contentPreview: content.substring(0, 100) + "...",
    });
    
    try {
      // 定义插件工具调用的正则表达式模式
      const pluginCallPatterns = [
        // 格式1: /tool_name param1 param2
        /\/(\w+)\s+(.+)/g,
        // 格式2: @tool_name(param1, param2)
        /@(\w+)\(([^)]*)\)/g,
        // 格式3: [tool:tool_name:param1:param2]
        /\[tool:(\w+):([^\]]*)\]/g,
        // 格式4: {{tool_name|param1|param2}}
        /\{\{(\w+)\|([^}]*)\}\}/g,
      ];

      let processedContent = content;
      let toolResults: any[] = [];
      let hasPluginCalls = false;
      
      console.log("🔍 PluginNodeTools: Checking for plugin patterns...", {
        patterns: pluginCallPatterns.map(p => p.source),
      });

      // 检测每种格式的插件工具调用
      for (const pattern of pluginCallPatterns) {
        let match;
        let patternMatches = 0;
        
        while ((match = pattern.exec(content)) !== null) {
          const [fullMatch, toolName, paramString] = match;
          patternMatches++;
          
          console.log("🔍 PluginNodeTools: Found plugin call", {
            pattern: pattern.source,
            toolName,
            paramString,
            fullMatch,
          });
          
          // 检查工具是否存在
          const tool = ToolRegistry.getTool(toolName);
          if (!tool) {
            console.warn(`🔧 PluginNodeTools: Tool '${toolName}' not found in registry`);
            continue;
          }

          hasPluginCalls = true;
          
          try {
            console.log(`🔧 PluginNodeTools: Executing tool '${toolName}'...`);
            
            // 解析参数
            const params = this.parseToolParameters(paramString, toolName);
            console.log("📋 PluginNodeTools: Parsed parameters:", params);
            
            // 执行工具
            const context: ExecutionContext = {
              session_id: characterId,
              generation_output: {},
              research_state: {
                id: characterId,
                session_id: characterId,
                main_objective: `Plugin tool execution: ${toolName}`,
                task_queue: [],
                completed_tasks: [],
                knowledge_base: [],
              },
              message_history: [],
            };
            const toolResult = await tool.execute(context, params);
            
            console.log(`✅ PluginNodeTools: Tool '${toolName}' executed successfully:`, toolResult);
            
            // 记录结果
            toolResults.push({
              toolName,
              params,
              result: toolResult,
              originalMatch: fullMatch,
            });

            // 替换内容中的工具调用为结果
            const formattedResult = this.formatToolResult(toolName, toolResult);
            processedContent = processedContent.replace(fullMatch, formattedResult);
            
            console.log(`🔧 PluginNodeTools: Replaced '${fullMatch}' with '${formattedResult}'`);
          } catch (error) {
            console.error(`❌ Error executing tool '${toolName}':`, error);
            
            // 记录错误结果
            toolResults.push({
              toolName,
              params: paramString,
              error: error instanceof Error ? error.message : "Unknown error",
              originalMatch: fullMatch,
            });

            // 替换为错误消息
            processedContent = processedContent.replace(
              fullMatch,
              `[工具 ${toolName} 执行失败: ${error instanceof Error ? error.message : "未知错误"}]`,
            );
          }
        }
      }

      console.log("🔧 PluginNodeTools: Processing complete", {
        originalLength: content.length,
        processedLength: processedContent.length,
        toolResultsCount: toolResults.length,
        hasPluginCalls,
        toolsExecuted: toolResults.map(r => r.toolName).join(", "),
      });

      return {
        processedContent,
        toolResults,
        hasPluginCalls,
      };
    } catch (error) {
      this.handleError(error as Error, "processPluginTools");
      return {
        processedContent: content,
        toolResults: [],
        hasPluginCalls: false,
      };
    }
  }

  /**
   * 格式化插件工具结果为用户友好的输出
   */
  static async formatPluginResults(
    toolResults: any[],
    processedContent: string,
  ): Promise<string> {
    try {
      if (toolResults.length === 0) {
        return processedContent;
      }

      // 创建工具结果的汇总
      const resultSummary = toolResults.map(result => {
        if (result.error) {
          return `❌ ${result.toolName}: ${result.error}`;
        }
        
        const success = result.result?.success !== false;
        const resultText = result.result?.result || result.result?.message || "完成";
        
        return `${success ? "✅" : "⚠️"} ${result.toolName}: ${resultText}`;
      }).join("\n");

      // 如果有工具调用，在内容末尾添加工具结果汇总
      const finalContent = processedContent + "\n\n" + 
        "🔧 **工具执行结果:**\n" + resultSummary;

      return finalContent;
    } catch (error) {
      this.handleError(error as Error, "formatPluginResults");
      return processedContent;
    }
  }

  /**
   * 解析工具参数
   */
  private static parseToolParameters(paramString: string, toolName: string): any {
    if (!paramString || paramString.trim() === "") {
      return {};
    }

    try {
      // 尝试解析为 JSON
      if (paramString.trim().startsWith("{") && paramString.trim().endsWith("}")) {
        return JSON.parse(paramString);
      }

      // 根据工具名称解析特定格式的参数
      switch (toolName) {
      case "text-formatter":
        return this.parseTextFormatterParams(paramString);
      case "text-analyzer":
        return this.parseTextAnalyzerParams(paramString);
      case "text-generator":
        return this.parseTextGeneratorParams(paramString);
      default:
        // 默认解析为键值对
        return this.parseKeyValueParams(paramString);
      }
    } catch (error) {
      console.warn(`⚠️ Failed to parse parameters for ${toolName}:`, error);
      return { raw: paramString };
    }
  }

  /**
   * 解析文本格式化工具参数
   */
  private static parseTextFormatterParams(paramString: string): any {
    const parts = paramString.split(/\s+/);
    const format = parts[0];
    const text = parts.slice(1).join(" ") || "";
    
    return {
      text,
      format,
    };
  }

  /**
   * 解析文本分析工具参数
   */
  private static parseTextAnalyzerParams(paramString: string): any {
    const parts = paramString.split(/\s+/);
    const analysis = parts[0];
    const text = parts.slice(1).join(" ") || "";
    
    return {
      text,
      analysis,
    };
  }

  /**
   * 解析文本生成工具参数
   */
  private static parseTextGeneratorParams(paramString: string): any {
    const parts = paramString.split(/\s+/);
    const type = parts[0];
    const count = parseInt(parts[1]) || 5;
    
    return {
      type,
      count,
    };
  }

  /**
   * 解析键值对参数
   */
  private static parseKeyValueParams(paramString: string): any {
    const params: any = {};
    
    // 分割参数（支持多种分隔符）
    const pairs = paramString.split(/[,;|]/);
    
    for (const pair of pairs) {
      const [key, value] = pair.split(/[:=]/).map(s => s.trim());
      if (key && value) {
        params[key] = value;
      }
    }
    
    return params;
  }

  /**
   * 格式化单个工具结果
   */
  private static formatToolResult(toolName: string, toolResult: any): string {
    if (toolResult.error) {
      return `[${toolName} 错误: ${toolResult.error}]`;
    }

    const result = toolResult.result || toolResult.message || toolResult;
    
    // 根据工具类型格式化结果
    switch (toolName) {
    case "text-formatter":
      return `**${result}**`;
    case "text-analyzer":
      return `*分析结果: ${result}*`;
    case "text-generator":
      return `> ${result}`;
    default:
      return `[${toolName}: ${result}]`;
    }
  }
} 
 
