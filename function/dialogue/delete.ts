import { LocalCharacterDialogueOperations } from "@/lib/data/roleplay/character-dialogue-operation";

interface DeleteDialogueNodeOptions {
  characterId: string;
  nodeId: string;
}

export async function deleteDialogueNode({ characterId, nodeId }: DeleteDialogueNodeOptions) {
  try {
    const updatedDialogueTree = await LocalCharacterDialogueOperations.deleteNode(characterId, nodeId);
    
    if (!updatedDialogueTree) {
      throw new Error("Failed to delete node or node not found");
    }

    const currentPath =
      updatedDialogueTree.current_nodeId !== "root"
        ? await LocalCharacterDialogueOperations.getDialoguePathToNode(
          characterId,
          updatedDialogueTree.current_nodeId,
        )
        : [];

    const messages = currentPath.flatMap((node) => {
      const msgs = [];

      if (node.userInput) {
        msgs.push({
          id: node.nodeId,
          role: "user",
          content: node.userInput,
          parsedContent: null,
        });
      }

      if (node.assistantResponse) {
        msgs.push({
          id: node.nodeId,
          role: "assistant",
          content: node.assistantResponse,
          parsedContent: node.parsedContent || null,
          nodeId: node.nodeId,
        });
      }

      return msgs;
    });

    const processedDialogue = {
      id: updatedDialogueTree.id,
      character_id: updatedDialogueTree.character_id,
      current_nodeId: updatedDialogueTree.current_nodeId,
      messages,
      tree: {
        nodes: updatedDialogueTree.nodes,
        currentNodeId: updatedDialogueTree.current_nodeId,
      },
    };

    return {
      success: true,
      message: "Successfully deleted dialogue node",
      dialogue: processedDialogue,
    };
  } catch (error: any) {
    console.error("Error deleting dialogue node:", error);
    throw new Error(`Failed to delete dialogue node: ${error.message}`);
  }
} 
