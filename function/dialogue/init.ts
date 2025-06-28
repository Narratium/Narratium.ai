import { Character } from "@/lib/core/character";
import { CharacterDialogue } from "@/lib/core/character-dialogue";
import { LocalCharacterDialogueOperations } from "@/lib/data/roleplay/character-dialogue-operation";
import { LocalCharacterRecordOperations } from "@/lib/data/roleplay/character-record-operation";
import { adaptText } from "@/lib/adapter/tagReplacer";
import { RegexProcessor } from "@/lib/core/regex-processor";

interface InitCharacterDialogueOptions {
  username?: string;
  characterId: string;
  language?: "zh" | "en";
  modelName: string;
  baseUrl: string;
  apiKey: string;
  llmType: "openai" | "ollama";
}

export async function initCharacterDialogue(options: InitCharacterDialogueOptions) {
  const { username, characterId, language = "zh", modelName, baseUrl, apiKey, llmType } = options;

  if (!characterId) {
    throw new Error("Missing required parameters");
  }

  try {
    const characterRecord = await LocalCharacterRecordOperations.getCharacterById(characterId);
    if (!characterRecord) {
      throw new Error("Character not found");
    }

    const character = new Character(characterRecord);
    const dialogue = new CharacterDialogue(character);

    await dialogue.initialize({
      modelName,
      baseUrl,
      apiKey,
      llmType,
      language,
    });

    const firstAssistantMessage = await dialogue.getFirstMessage();
    let dialogueTree = await LocalCharacterDialogueOperations.getDialogueTreeById(characterId);

    if (!dialogueTree) {
      dialogueTree = await LocalCharacterDialogueOperations.createDialogueTree(characterId);
    }

    let nodeIds: string[] = [];
    const adaptedMessages: string[] = [];
    const processedMessages: string[] = [];
    if (firstAssistantMessage) {
      const messagesToProcess = [...firstAssistantMessage];
      let firstProcessedMessage = "";

      if (messagesToProcess.length > 0) {
        const firstMessage = messagesToProcess[0];
        const adaptedFirstMessage = adaptText(firstMessage, language, username);
        
        const firstRegexResult = await RegexProcessor.processFullContext(
          adaptedFirstMessage, 
          { 
            ownerId: characterId, 
          },
        );
        
        firstProcessedMessage = firstRegexResult.replacedText;
        adaptedMessages.push(adaptedFirstMessage);
        processedMessages.push(firstProcessedMessage);
      }

      for (const message of [...messagesToProcess].reverse()) {
        const adaptedMessage = adaptText(message, language, username);
        
        const regexResult = await RegexProcessor.processFullContext(
          adaptedMessage, 
          { 
            ownerId: characterId, 
          },
        );
        
        const processedMessage = regexResult.replacedText;
        
        if (message !== messagesToProcess[messagesToProcess.length - 1]) {
          adaptedMessages.push(adaptedMessage);
          processedMessages.push(processedMessage);
        }

        const nodeId = await LocalCharacterDialogueOperations.addNodeToDialogueTree(
          characterId,
          "root",
          "",
          adaptedMessage,
          adaptedMessage,
          "",
          {
            nextPrompts: [],
            regexResult: processedMessage,
            compressedContent: "",
          },
          undefined,
        );
        nodeIds.push(nodeId);
      }
      
      return {
        success: true,
        characterId,
        firstMessage: firstProcessedMessage,
        nodeId: nodeIds[0],
      };
    }

    throw new Error("No assistant message generated");
  } catch (error: any) {
    console.error("Failed to initialize character dialogue:", error);
    throw new Error(`Failed to initialize dialogue: ${error.message}`);
  }
}
