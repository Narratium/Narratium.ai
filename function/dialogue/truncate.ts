import { LocalCharacterDialogueOperations } from "@/lib/data/roleplay/character-dialogue-operation";

interface SwitchDialogueBranchOptions {
  characterId: string;
  nodeId: string;
}

export async function switchDialogueBranch({ characterId, nodeId }: SwitchDialogueBranchOptions) {

  try {
    const dialogueTree = await LocalCharacterDialogueOperations.getDialogueTreeById(characterId);

    if (!dialogueTree) {
      throw new Error("Dialogue not found");
    }

    const updated = await LocalCharacterDialogueOperations.switchBranch(characterId, nodeId);
    if (!updated) {
      throw new Error("Failed to switch to the specified node");
    }

    const updatedDialogueTree = await LocalCharacterDialogueOperations.getDialogueTreeById(characterId);
    if (!updatedDialogueTree) {
      throw new Error("Failed to retrieve updated dialogue");
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
          thinkingContent: node.thinkingContent ?? "",
          content: node.userInput,
          parsedContent: null,
        });
      }

      if (node.assistantResponse) {
        msgs.push({
          id: node.nodeId,
          role: "assistant",
          thinkingContent: node.thinkingContent ?? "",
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
      message: "成功切换到指定对话节点",
      dialogue: processedDialogue,
    };
  } catch (error: any) {
    console.error("Error switching dialogue branch:", error);
    throw new Error(`Failed to switch dialogue branch: ${error.message}`);
  }
}
