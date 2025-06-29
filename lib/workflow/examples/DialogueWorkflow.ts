import { BaseWorkflow, WorkflowConfig } from "@/lib/workflow/BaseWorkflow";
import { NodeCategory } from "@/lib/nodeflow/types";
import { UserInputNode } from "@/lib/nodeflow/UserInputNode/UserInputNode";
import { ContextNode } from "@/lib/nodeflow/ContextNode/ContextNode";
import { WorldBookNode } from "@/lib/nodeflow/WorldBookNode/WorldBookNode";
import { PresetNode } from "@/lib/nodeflow/PresetNode/PresetNode";
import { LLMNode } from "@/lib/nodeflow/LLMNode/LLMNode";
import { RegexNode } from "@/lib/nodeflow/RegexNode/RegexNode";
import { OutputNode } from "@/lib/nodeflow/OutputNode/OutputNode";

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
  systemPresetType?: "mirror_realm" | "novel_king";
}

export class DialogueWorkflow extends BaseWorkflow {
  protected getNodeRegistry() {
    return {
      "userInput": {
        nodeClass: UserInputNode,
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
          next: ["preset-1"],
          initParams: ["characterId", "userInput", "number", "language", "username", "modelName", "apiKey", "baseUrl", "llmType", "temperature", "fastModel", "systemPresetType"],
          inputFields: [],
          outputFields: ["characterId", "userInput", "number", "language", "username", "modelName", "apiKey", "baseUrl", "llmType", "temperature", "fastModel", "systemPresetType"],
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
          inputFields: ["systemMessage", "userMessage", "modelName", "apiKey", "baseUrl", "llmType", "temperature", "language"],
          outputFields: ["llmResponse"],
        },
        {
          id: "regex-1",
          name: "regex",
          category: NodeCategory.MIDDLE,
          next: ["output-1"],
          initParams: [],
          inputFields: ["llmResponse", "characterId"],
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
