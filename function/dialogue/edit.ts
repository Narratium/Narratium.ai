import { LocalCharacterDialogueOperations } from "@/lib/data/roleplay/character-dialogue-operation";
import { CharacterDialogue } from "@/lib/core/character-dialogue";
import { parseEvent } from "@/utils/response-parser";
import { DialogueNode } from "@/lib/models/node-model";
import { LocalCharacterRecordOperations } from "@/lib/data/roleplay/character-record-operation";
import { Character } from "@/lib/core/character";

interface EditDialogueNodeRequest {
  characterId: string;
  nodeId: string;
  assistantResponse: string;
  model_name: string;
  api_key: string;
  base_url: string;
  llm_type: string;
  language: string;
}

export async function editDialaogueNodeContent(input: EditDialogueNodeRequest) {
  try {
    const { 
      characterId, 
      nodeId, 
      assistantResponse,
      model_name,
      api_key,
      base_url,
      llm_type,
      language, 
    } = input;
    
    const dialogueTree = await LocalCharacterDialogueOperations.getDialogueTreeById(characterId);
    if (!dialogueTree) {
      throw new Error("Dialogue tree not found");
    }
    
    const node = dialogueTree.nodes.find((n) => n.nodeId === nodeId);
    if (!node) {
      throw new Error("Node not found");
    }

    const characterRecord = await LocalCharacterRecordOperations.getCharacterById(characterId);
    if (!characterRecord) {
      throw new Error(`Character with ID ${characterId} not found`);
    }
    const character = new Character(characterRecord);
    
    const dialogue = new CharacterDialogue(character);
    await dialogue.initialize({
      modelName: model_name,
      apiKey: api_key,
      baseUrl: base_url,
      llmType: llm_type as "openai" | "ollama",
      language: language as "zh" | "en",
    });
    
    let summary = "";
    try {
      const compressedResult = await dialogue.compressStory(
        node.userInput || "",
        assistantResponse,
      );
      summary = parseEvent(compressedResult);
    } catch (compressionError) {
      console.error("Error generating summary:", compressionError);
      throw new Error("Failed to generate summary");
    }

    const nodeUpdates: Partial<DialogueNode> = {
      assistantResponse: assistantResponse,
      parsedContent: {
        compressedContent: summary,
      },
    };

    const updatedDialogue = await LocalCharacterDialogueOperations.updateNodeInDialogueTree(
      dialogueTree.id,
      nodeId,
      nodeUpdates,
    );
    
    if (!updatedDialogue) {
      throw new Error("Failed to update node content");
    }

    return {
      success: true,
      dialogue: updatedDialogue,
      summary: summary,
    };
  } catch (error) {
    console.error("Edit dialogue node content error:", error);
    throw new Error("Edit dialogue node content failed");
  }
}
