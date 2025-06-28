import { NodeTool } from "@/lib/nodeflow/NodeTool";
import { LocalCharacterDialogueOperations } from "@/lib/data/roleplay/character-dialogue-operation";
import { DialogueMessage } from "@/lib/models/character-dialogue-model";
import { DialogueStory } from "@/lib/core/character-history";

export class ContextNodeTools extends NodeTool {
  protected static readonly toolType: string = "context";
  protected static readonly version: string = "1.0.0";

  static getToolType(): string {
    return this.toolType;
  }

  static async executeMethod(methodName: string, ...params: any[]): Promise<any> {
    const method = (this as any)[methodName];
    
    if (typeof method !== "function") {
      console.error(`Method lookup failed: ${methodName} not found in ContextNodeTools`);
      console.log("Available methods:", Object.getOwnPropertyNames(this).filter(name => 
        typeof (this as any)[name] === "function" && !name.startsWith("_"),
      ));
      throw new Error(`Method ${methodName} not found in ${this.getToolType()}Tool`);
    }

    try {
      this.logExecution(methodName, params);
      return await (method as Function).apply(this, params);
    } catch (error) {
      this.handleError(error as Error, methodName);
    }
  }

  static async assembleChatHistory(
    userMessage: string,
    characterId: string,
    memoryLength: number = 10,
  ): Promise<{ userMessage: string; messages: DialogueMessage[] }> {
    try {
      if (!userMessage.includes("{{chatHistory}}")) {
        return { userMessage, messages: [] };
      }

      const historyData = await this.loadCharacterHistory(characterId);
      const chatHistoryContent = this.formatChatHistory(historyData, memoryLength);

      const assembledUserMessage = userMessage.replace("{{chatHistory}}", chatHistoryContent);

      console.log(`Assembled chat history for character ${characterId}`);

      return {
        userMessage: assembledUserMessage,
        messages: [],
      };
    } catch (error) {
      this.handleError(error as Error, "assembleChatHistory");
    }
  }

  static async loadCharacterHistory(
    characterId: string,
  ): Promise<{
    systemMessage: string;
    recentDialogue: DialogueStory;
    historyDialogue: DialogueStory;
  }> {
    try {
      const recentDialogue = new DialogueStory("en");
      const historyDialogue = new DialogueStory("en");
      let systemMessage = "";

      const dialogueTree = await LocalCharacterDialogueOperations.getDialogueTreeById(characterId);
      if (!dialogueTree) {
        console.warn(`Dialogue tree not found for character ${characterId}`);
        return { systemMessage, recentDialogue, historyDialogue };
      }

      const nodePath = dialogueTree.current_nodeId !== "root"
        ? await LocalCharacterDialogueOperations.getDialoguePathToNode(characterId, dialogueTree.current_nodeId)
        : [];
      
      for (const node of nodePath) {
        if (node.parentNodeId === "root" && node.assistantResponse) {
          systemMessage = node.assistantResponse;
          continue;
        }
        if (node.userInput) {
          recentDialogue.userInput.push(node.userInput);
          historyDialogue.userInput.push(node.userInput);
        }
        if (node.assistantResponse) {
          recentDialogue.responses.push(node.assistantResponse);
          const compressedContent = node.parsedContent?.compressedContent || "";
          historyDialogue.responses.push(compressedContent);
        }
      }

      return { systemMessage, recentDialogue, historyDialogue };
    } catch (error) {
      this.handleError(error as Error, "loadCharacterHistory");
    }
  }

  static formatChatHistory(
    historyData: {
      systemMessage: string;
      recentDialogue: DialogueStory;
      historyDialogue: DialogueStory;
    },
    memoryLength: number,
  ): string {
    try {
      const parts: string[] = [];

      if (historyData.systemMessage) {
        parts.push(`开场白：${historyData.systemMessage}`);
      }

      // Use DialogueStory.getStory directly for compressed history
      const compressedHistory = historyData.historyDialogue.getStory(0, Math.max(0, historyData.historyDialogue.responses.length - memoryLength));
      if (compressedHistory) {
        parts.push(`历史信息：${compressedHistory}`);
      }

      // Use DialogueStory.getStory directly for recent history
      const recentHistory = historyData.recentDialogue.getStory(Math.max(0, historyData.recentDialogue.userInput.length - memoryLength));
      if (recentHistory) {
        parts.push(`最近故事：${recentHistory}`);
      }

      return parts.filter(Boolean).join("\n\n");
    } catch (error) {
      this.handleError(error as Error, "formatChatHistory");
    }
  }

  /**
   * Generate conversation context for memory system
   */
  static async generateConversationContext(
    characterId: string,
    currentUserInput: string,
    memoryLength: number = 3,
  ): Promise<string> {
    try {
      const historyData = await this.loadCharacterHistory(characterId);
      
      // Get recent dialogue for context using DialogueStory.getStory directly
      const recentHistory = historyData.recentDialogue.getStory(Math.max(0, historyData.recentDialogue.userInput.length - memoryLength));
      
      // Build conversation context
      const contextLines = [];
      
      if (recentHistory) {
        contextLines.push(recentHistory);
      }
      
      // Add current user input
      contextLines.push(`User: ${currentUserInput}`);
      
      return contextLines.join("\n");
    } catch (error) {
      this.handleError(error as Error, "generateConversationContext");
      return `User: ${currentUserInput}`;
    }
  }
} 

