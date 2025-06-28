import { NodeBase } from "@/lib/nodeflow/NodeBase";
import { NodeConfig, NodeInput, NodeOutput, NodeCategory } from "@/lib/nodeflow/types";
import { RegexNodeTools } from "./RegexNodeTools";
import { NodeToolRegistry } from "../NodeTool";

export class RegexNode extends NodeBase {
  static readonly nodeName = "regex";
  static readonly description = "Processes LLM responses with regex patterns";
  static readonly version = "1.0.0";

  constructor(config: NodeConfig) {
    NodeToolRegistry.register(RegexNodeTools);
    super(config);
    this.toolClass = RegexNodeTools;
  }
  
  protected getDefaultCategory(): NodeCategory {
    return NodeCategory.MIDDLE;
  }

  protected async _call(input: NodeInput): Promise<NodeOutput> {
    let llmResponse = input.llmResponse;
    const characterId = input.characterId;

    if (!llmResponse) {
      throw new Error("LLM response is required for RegexNode");
    }

    if (!characterId) {
      throw new Error("Character ID is required for RegexNode");
    }

    // Extract thinking content from LLM response
    let thinkingContent = "";
    const thinkingMatch = llmResponse.match(/<(?:think|thinking)>([\s\S]*?)<\/(?:think|thinking)>/);
    if (thinkingMatch) {
      thinkingContent = thinkingMatch[1].trim();
    }
    console.log("thinkingContent", thinkingContent);

    llmResponse = llmResponse
      .replace(/\n*\s*<think>[\s\S]*?<\/think>\s*\n*/g, "")
      .replace(/\n*\s*<thinking>[\s\S]*?<\/thinking>\s*\n*/g, "")
      .trim();

    let mainContent = "";
    let nextPrompts: string[] = [];
    let event = "";

    const cleanedResponse = llmResponse
      .replace(/\s*<\/?output>\s*/g, "")
      .replace(/\s*<\/?outputFormat>\s*/g, "")
      .trim();

    const nextPromptsMatch = cleanedResponse.match(/<next_prompts>([\s\S]*?)<\/next_prompts>/);
    if (nextPromptsMatch) {
      nextPrompts = nextPromptsMatch[1]
        .trim()
        .split("\n")
        .map((l: string) => l.trim())
        .filter((l: string) => l.length > 0)
        .map((l: string) => l.replace(/^[-*]\s*/, "").replace(/^\s*\[|\]\s*$/g, "").trim());
    }

    const eventsMatch = cleanedResponse.match(/<events>([\s\S]*?)<\/events>/);
    if (eventsMatch) {
      event = eventsMatch[1].trim().replace(/\[|\]/g, "");
    }

    mainContent = cleanedResponse
      .replace(/\n*\s*<next_prompts>[\s\S]*?<\/next_prompts>\s*\n*/g, "")
      .replace(/\n*\s*<events>[\s\S]*?<\/events>\s*\n*/g, "")
      .trim();

    const processedResult = await this.executeTool(
      "processRegex",
      mainContent,
      characterId,
    ) as { replacedText: string };

    return {
      thinkingContent,
      screenContent: processedResult.replacedText,
      fullResponse: llmResponse,
      nextPrompts,
      event,
      characterId,
    };
  }
} 
