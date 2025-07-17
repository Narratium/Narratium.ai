import { EjsProcessor } from "./ejsProcessor";
import { DialogueMessage } from "@/lib/models/character-dialogue-model";
import { WorldBookEntry } from "@/lib/models/world-book-model";

export function adaptText(
  text: string, 
  language: "en" | "zh", 
  username?: string, 
  charName?: string,
  chatHistory?: DialogueMessage[],
  worldBook?: WorldBookEntry[],
  customData?: Record<string, any>,
): string {
  let parsed = text.replace(/<br\s*\/?>/gi, "\n");
  
  // 处理传统的占位符
  const userReplacement = username ?? (language === "zh" ? "我" : "I");
  parsed = parsed.replace(/{{user}}/g, userReplacement);
  parsed = parsed.replace(/{{char}}/g, charName ?? "");
  return parsed;
}

export async function adaptTextAsync(
  text: string, 
  language: "en" | "zh", 
  username?: string, 
  charName?: string,
  chatHistory?: DialogueMessage[],
  worldBook?: WorldBookEntry[],
  customData?: Record<string, any>,
  character?: any,
): Promise<string> {
  let parsed = text.replace(/<br\s*\/?>/gi, "\n");
  
  // 处理EJS模板（支持异步）
  if (EjsProcessor.isEjsTemplate(parsed)) {
    parsed = await EjsProcessor.processTextAsync(
      parsed,
      language,
      username,
      charName,
      chatHistory,
      worldBook,
      customData,
      character,
    );
  }
  
  // 处理传统的占位符
  const userReplacement = username ?? (language === "zh" ? "我" : "I");
  parsed = parsed.replace(/{{user}}/g, userReplacement);
  parsed = parsed.replace(/{{char}}/g, charName ?? "");
  return parsed;
}
  
export function adaptCharacterData(
  characterData: any,
  language: "en" | "zh",
  username?: string,
  chatHistory?: DialogueMessage[],
  customData?: Record<string, any>,
): any {
  const result = { ...characterData };
  const charReplacement = characterData.name || "";
  
  const fieldsToProcess = [
    "description", "personality", "first_mes", "scenario",
    "mes_example", "creatorcomment", "creator_notes",
  ];
  
  // 获取世界书条目用于EJS上下文
  const worldBookEntries = result.character_book ? (
    Array.isArray(result.character_book)
      ? result.character_book
      : (result.character_book.entries || [])
  ) : [];
  
  for (const field of fieldsToProcess) {
    if (result[field]) {
      let processed = adaptText(
        result[field], 
        language, 
        username, 
        charReplacement,
        chatHistory,
        worldBookEntries,
        customData,
      );
      result[field] = processed;
    }
  }
  
  if (result.character_book) {
    const bookEntries = Array.isArray(result.character_book)
      ? result.character_book
      : (result.character_book.entries || []);
  
    result.character_book = bookEntries.map((entry: any) => {
      const processedEntry = { ...entry };
  
      if (processedEntry.comment) {
        let processed = adaptText(
          processedEntry.comment, 
          language, 
          username, 
          charReplacement,
          chatHistory,
          worldBookEntries,
          customData,
        );
        processedEntry.comment = processed;
      }
  
      if (processedEntry.content) {
        let processed = adaptText(
          processedEntry.content, 
          language, 
          username, 
          charReplacement,
          chatHistory,
          worldBookEntries,
          customData,
        );
        processedEntry.content = processed;
      }
  
      return processedEntry;
    });
  }
  
  if (Array.isArray(result.alternate_greetings)) {
    for (let i = 0; i < result.alternate_greetings.length; i++) {
      let greeting = result.alternate_greetings[i];
      greeting = adaptText(
        greeting, 
        language, 
        username, 
        charReplacement,
        chatHistory,
        worldBookEntries,
        customData,
      );
      result.alternate_greetings[i] = greeting;
    }
  }
  
  return result;
}

export function adaptCharacterDataAsync(
  characterData: any,
  language: "en" | "zh",
  username?: string,
  chatHistory?: DialogueMessage[],
  customData?: Record<string, any>,
): any {
  const result = { ...characterData };
  const charReplacement = characterData.name || "";
  
  const fieldsToProcess = [
    "description", "personality", "first_mes", "scenario",
    "mes_example", "creatorcomment", "creator_notes",
  ];
  
  // 获取世界书条目用于EJS上下文
  const worldBookEntries = result.character_book ? (
    Array.isArray(result.character_book)
      ? result.character_book
      : (result.character_book.entries || [])
  ) : [];
  
  for (const field of fieldsToProcess) {
    if (result[field]) {
      let processed = adaptTextAsync(
        result[field], 
        language, 
        username, 
        charReplacement,
        chatHistory,
        worldBookEntries,
        customData,
      );
      result[field] = processed;
    }
  }
  
  if (result.character_book) {
    const bookEntries = Array.isArray(result.character_book)
      ? result.character_book
      : (result.character_book.entries || []);
  
    result.character_book = bookEntries.map((entry: any) => {
      const processedEntry = { ...entry };
  
      if (processedEntry.comment) {
        let processed = adaptTextAsync(
          processedEntry.comment, 
          language, 
          username, 
          charReplacement,
          chatHistory,
          worldBookEntries,
          customData,
        );
        processedEntry.comment = processed;
      }
  
      if (processedEntry.content) {
        let processed = adaptTextAsync(
          processedEntry.content, 
          language, 
          username, 
          charReplacement,
          chatHistory,
          worldBookEntries,
          customData,
        );
        processedEntry.content = processed;
      }
  
      return processedEntry;
    });
  }
  
  if (Array.isArray(result.alternate_greetings)) {
    for (let i = 0; i < result.alternate_greetings.length; i++) {
      let greeting = result.alternate_greetings[i];
      greeting = adaptTextAsync(
        greeting, 
        language, 
        username, 
        charReplacement,
        chatHistory,
        worldBookEntries,
        customData,
      );
      result.alternate_greetings[i] = greeting;
    }
  }
  
  return result;
}
  
