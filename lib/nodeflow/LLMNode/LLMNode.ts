import { NodeBase } from "@/lib/nodeflow/NodeBase";
import { NodeConfig, NodeInput, NodeOutput, NodeCategory } from "@/lib/nodeflow/types";
import { LLMNodeTools } from "./LLMNodeTools";
import { NodeToolRegistry } from "../NodeTool";

export class LLMNode extends NodeBase {
  static readonly nodeName = "llm";
  static readonly description = "Handles LLM requests and responses";
  static readonly version = "1.0.0";

  constructor(config: NodeConfig) {
    NodeToolRegistry.register(LLMNodeTools);
    super(config);
    this.toolClass = LLMNodeTools;
  }
  
  protected getDefaultCategory(): NodeCategory {
    return NodeCategory.MIDDLE;
  }

  protected async _call(input: NodeInput): Promise<NodeOutput> {    
    const systemMessage = input.systemMessage;
    const userMessage = input.userMessage;
    const modelName = input.modelName;
    const apiKey = input.apiKey;
    const baseUrl = input.baseUrl;
    const llmType = input.llmType || "openai";
    const temperature = input.temperature;
    const language = input.language || "zh";
    const streaming = input.streaming || false;
    const streamUsage = input.streamUsage ?? true; // 默认启用token usage追踪

    if (!systemMessage) {
      throw new Error("System message is required for LLMNode");
    }

    if (!userMessage) { 
      throw new Error("User message is required for LLMNode");
    }

    const llmResponse = await this.executeTool(
      "invokeLLM",
      systemMessage,
      userMessage,
      {
        modelName,
        apiKey,
        baseUrl,
        llmType,
        temperature,
        language,
        streaming,
        streamUsage,
      },
    ) as string;

    return {
      llmResponse,
      systemMessage,
      userMessage,
      modelName,
      llmType,
    };
  }
} 
