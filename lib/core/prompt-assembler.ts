import { WorldBookEntry } from "@/lib/models/world-book-model";
import { WorldBookManager } from "@/lib/core/world-book";
import { DialogueMessage } from "@/lib/models/character-dialogue-model";
import { adaptText } from "@/lib/adapter/tagReplacer";

export interface PromptAssemblerOptions {
  language: "zh" | "en";
  contextWindow?: number;
}

export class PromptAssembler {
  private language: "zh" | "en";
  private contextWindow: number;
  
  constructor(options: PromptAssemblerOptions) {
    this.language = options.language || "zh";
    this.contextWindow = options.contextWindow || 5;
  }

  assemblePrompt(
    worldBook: WorldBookEntry[] | Record<string, WorldBookEntry> | undefined,
    baseSystemMessage: string,
    userMessage: string,
    chatHistory: DialogueMessage[],
    currentUserInput: string,
    username?: string,
    charName?: string,
  ): { systemMessage: string; userMessage: string } {
    
    let finalSystemMessage = baseSystemMessage;
    let finalUserMessage = userMessage;

    if (finalUserMessage.includes("{{userInput}}")) {
      finalUserMessage = finalUserMessage.replace("{{userInput}}", currentUserInput);
    }

    const hasSystemMarkers = finalSystemMessage.includes("{{worldInfoBefore}}") || finalSystemMessage.includes("{{worldInfoAfter}}");
    const hasUserMarkers = finalUserMessage.includes("<userInput>");
    
    if (!worldBook || (Array.isArray(worldBook) ? worldBook.length === 0 : Object.keys(worldBook).length === 0)) {
      if (hasSystemMarkers) {
        finalSystemMessage = finalSystemMessage
          .replace("{{worldInfoBefore}}", "")
          .replace("{{worldInfoAfter}}", "");
      }
      return { systemMessage: finalSystemMessage, userMessage: finalUserMessage };
    }

    if (!hasSystemMarkers && !hasUserMarkers) {
      return { systemMessage: finalSystemMessage, userMessage: finalUserMessage };
    }

    const adjustedChatHistory = this.adjustChatHistoryByTurns(chatHistory);
    const contextWithCurrentMessage = [...adjustedChatHistory];

    if (currentUserInput) {
      contextWithCurrentMessage.push({
        role: "user",
        content: currentUserInput,
        id: adjustedChatHistory.length,
      });
    }

    const matchingEntries = WorldBookManager.getMatchingEntries(
      worldBook,
      currentUserInput,
      contextWithCurrentMessage,
      { contextWindow: this.contextWindow },
    );

    if (matchingEntries.length === 0) {
      if (hasSystemMarkers) {
        finalSystemMessage = finalSystemMessage
          .replace("{{worldInfoBefore}}", "")
          .replace("{{worldInfoAfter}}", "");
      }
      return { systemMessage: finalSystemMessage, userMessage: finalUserMessage };
    }

    const position0_1Entries = matchingEntries.filter(entry => Number(entry.position || 0) <= 1);
    const position2Entries = matchingEntries.filter(entry => Number(entry.position || 0) === 2);
    const position3Entries = matchingEntries.filter(entry => Number(entry.position || 0) === 3);
    const position4Entries = matchingEntries.filter(entry => Number(entry.position || 0) === 4);

    if (hasSystemMarkers) {
      const worldInfoBeforeContent = this.formatWorldBookEntries(position0_1Entries, username, charName);
      const worldInfoAfterContent = this.formatWorldBookEntries(position2Entries, username, charName);

      finalSystemMessage = finalSystemMessage.replace("{{worldInfoBefore}}", worldInfoBeforeContent);
      finalSystemMessage = finalSystemMessage.replace("{{worldInfoAfter}}", worldInfoAfterContent);
    }

    if (hasUserMarkers && (position3Entries.length > 0 || position4Entries.length > 0)) {
      const position3Content = this.formatWorldBookEntries(position3Entries, username, charName);
      const position4Content = this.formatWorldBookEntries(position4Entries, username, charName);

      if (position3Content && finalUserMessage.includes("<userInput>")) {
        const beforeUserInput = position3Content + "\n\n";
        finalUserMessage = finalUserMessage.replace(
          "<userInput>",
          beforeUserInput + "<userInput>",
        );
      }

      if (position4Content && finalUserMessage.includes("</userInput>")) {
        const afterUserInput = "\n\n" + position4Content;
        finalUserMessage = finalUserMessage.replace(
          "</userInput>",
          "</userInput>" + afterUserInput,
        );
      }
    }
    return { systemMessage: finalSystemMessage, userMessage: finalUserMessage };
  }

  private formatWorldBookEntries(
    entries: WorldBookEntry[],
    username?: string,
    charName?: string,
  ): string {
    if (entries.length === 0) return "";
    
    return entries.map(entry => {
      const tagName = entry.comment || "worldbook_entry";
      let content = entry.content || "";
      content = adaptText(content, this.language, username, charName);
      
      return `
      <world information>
      <tag>
      ${tagName}
      </tag>
      <content>
      ${content}
      </content>
      </world information>`;
    }).join("\n\n");
  }
  
  private adjustChatHistoryByTurns(chatHistory: DialogueMessage[]): DialogueMessage[] {
    if (chatHistory.length === 0) {
      return [];
    }
    
    const adjustedHistory: DialogueMessage[] = [];
    const conversationTurns: { user: DialogueMessage, assistant?: DialogueMessage }[] = [];
    
    let currentTurn: { user?: DialogueMessage, assistant?: DialogueMessage } = {};
    
    for (const message of chatHistory) {
      if (message.role === "user") {
        if (currentTurn.user) {
          conversationTurns.push(currentTurn as { user: DialogueMessage, assistant?: DialogueMessage });
          currentTurn = { user: message };
        } else {
          currentTurn.user = message;
        }
      } else if (message.role === "assistant") {
        if (currentTurn.user) {
          currentTurn.assistant = message;
          conversationTurns.push(currentTurn as { user: DialogueMessage, assistant?: DialogueMessage });
          currentTurn = {};
        }
      }
    }
    
    if (currentTurn.user) {
      conversationTurns.push(currentTurn as { user: DialogueMessage, assistant?: DialogueMessage });
    }
    
    const recentTurns = conversationTurns.slice(-this.contextWindow);
    
    for (const turn of recentTurns) {
      adjustedHistory.push(turn.user);
      if (turn.assistant) {
        adjustedHistory.push(turn.assistant);
      }
    }
    
    return adjustedHistory;
  }
}
