import { BaseWorkflow, WorkflowConfig } from "@/lib/workflow/BaseWorkflow";
import { NodeCategory } from "@/lib/nodeflow/types";
import { UserInputNode } from "@/lib/nodeflow/UserInputNode/UserInputNode";
import { ContextNode } from "@/lib/nodeflow/ContextNode/ContextNode";
import { WorldBookNode } from "@/lib/nodeflow/WorldBookNode/WorldBookNode";
import { PresetNode } from "@/lib/nodeflow/PresetNode/PresetNode";
import { LLMNode } from "@/lib/nodeflow/LLMNode/LLMNode";
import { RegexNode } from "@/lib/nodeflow/RegexNode/RegexNode";
import { PluginNode } from "@/lib/nodeflow/PluginNode/PluginNode";
import { PluginMessageNode } from "@/lib/nodeflow/PluginNode/PluginMessageNode";
import { OutputNode } from "@/lib/nodeflow/OutputNode/OutputNode";
import { PromptKey } from "@/lib/prompts/preset-prompts";

export interface DialogueWorkflowParams {
  characterId: string;
  userInput: string;
  number?: number;
  language?: "zh" | "en";
  username?: string;
  modelName: string;
  apiKey: string;
  baseUrl?: string;
  llmType?: "openai" | "ollama";
  temperature?: number;
  maxTokens?: number;
  maxRetries?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  topK?: number;
  repeatPenalty?: number;
  streaming?: boolean;
  streamUsage?: boolean;
  fastModel?: boolean;
  systemPresetType?: PromptKey;
}

export class DialogueWorkflow extends BaseWorkflow {
  protected getNodeRegistry() {
    return {
      "userInput": {
        nodeClass: UserInputNode,
      },
      "pluginMessage": {
        nodeClass: PluginMessageNode,
      },
      "context": {
        nodeClass: ContextNode,
      },
      "worldBook": {
        nodeClass: WorldBookNode,
      },
      "preset": {
        nodeClass: PresetNode,
      },
      "llm": {
        nodeClass: LLMNode,
      },
      "regex": {
        nodeClass: RegexNode,
      },
      "plugin": {
        nodeClass: PluginNode,
      },
      "output": {
        nodeClass: OutputNode,
      },
    };
  }

  protected getWorkflowConfig(): WorkflowConfig {
    return {
      id: "complete-dialogue-workflow",
      name: "Complete Dialogue Processing Workflow",
      nodes: [
        {
          id: "user-input-1",
          name: "userInput",
          category: NodeCategory.ENTRY,
          next: ["plugin-message-1"],
          initParams: ["characterId", "userInput", "number", "language", "username", "modelName", "apiKey", "baseUrl", "llmType", "temperature", "fastModel", "systemPresetType", "streaming", "streamUsage"],
          inputFields: [],
          outputFields: ["characterId", "userInput", "number", "language", "username", "modelName", "apiKey", "baseUrl", "llmType", "temperature", "fastModel", "systemPresetType", "streaming", "streamUsage"],
        },
        {
          id: "plugin-message-1",
          name: "pluginMessage",
          category: NodeCategory.MIDDLE,
          next: ["preset-1"],
          initParams: [],
          inputFields: ["characterId", "userInput"],
          outputFields: ["characterId", "userInput", "number", "language", "username", "modelName", "apiKey", "baseUrl", "llmType", "temperature", "fastModel", "systemPresetType", "streaming", "streamUsage"],
        },
        {
          id: "preset-1",
          name: "preset",
          category: NodeCategory.MIDDLE,
          next: ["context-1"],
          initParams: [],
          inputFields: ["characterId", "language", "username", "number", "fastModel", "systemPresetType"],
          outputFields: ["systemMessage", "userMessage", "presetId"],
        },
        {
          id: "context-1",
          name: "context",
          category: NodeCategory.MIDDLE,
          next: ["world-book-1"],
          initParams: [],
          inputFields: ["userMessage", "characterId", "userInput"],
          outputFields: ["userMessage"],
        },
        {
          id: "world-book-1",
          name: "worldBook",
          category: NodeCategory.MIDDLE,
          next: ["llm-1"],
          initParams: [],
          inputFields: ["systemMessage", "userMessage", "characterId", "language", "username", "userInput"],
          outputFields: ["systemMessage", "userMessage"],
          inputMapping: {
            "userInput": "currentUserInput",
          },
        },
        {
          id: "llm-1",
          name: "llm",
          category: NodeCategory.MIDDLE,
          next: ["regex-1"],
          initParams: [],
          inputFields: ["systemMessage", "userMessage", "modelName", "apiKey", "baseUrl", "llmType", "temperature", "language", "streaming", "streamUsage"],
          outputFields: ["llmResponse"],
        },
        {
          id: "regex-1",
          name: "regex",
          category: NodeCategory.MIDDLE,
          next: ["plugin-1"],
          initParams: [],
          inputFields: ["llmResponse", "characterId"],
          outputFields: ["thinkingContent", "screenContent", "fullResponse", "nextPrompts", "event"],
        },
        {
          id: "plugin-1",
          name: "plugin",
          category: NodeCategory.MIDDLE,
          next: ["output-1"],
          initParams: [],
          inputFields: ["thinkingContent", "screenContent", "fullResponse", "nextPrompts", "event", "characterId"],
          outputFields: ["thinkingContent", "screenContent", "fullResponse", "nextPrompts", "event"],
        },
        {
          id: "output-1",
          name: "output",
          category: NodeCategory.EXIT,
          next: [],
          initParams: [],
          inputFields: ["thinkingContent", "screenContent", "fullResponse", "nextPrompts", "event"],
          outputFields: ["thinkingContent", "screenContent", "fullResponse", "nextPrompts", "event"],
        },
      ],
    };
  }
} 
