import { LocalCharacterDialogueOperations } from "@/lib/data/roleplay/character-dialogue-operation";
import { LocalCharacterRecordOperations } from "@/lib/data/roleplay/character-record-operation";

interface IncrementalDialogueParams {
  characterId: string;
  lastKnownNodeIds?: string[];
  lastUpdateTime?: string;
  language?: "en" | "zh";
}

interface IncrementalDialogueResponse {
  success: boolean;
  hasNewData: boolean;
  newNodes: any[];
  updatedNodes: any[];
  deletedNodeIds: string[];
  currentNodeId: string;
  totalNodeCount: number;
  lastUpdateTime: string;
}

/**
 * Get incremental dialogue data - only returns new/updated nodes since last check
 * @param params - Parameters including characterId and last known state
 * @returns Only new or updated dialogue nodes
 */
export async function getIncrementalDialogue(params: IncrementalDialogueParams): Promise<IncrementalDialogueResponse> {
  const { characterId, lastKnownNodeIds = [], lastUpdateTime, language = "zh" } = params;

  if (!characterId) {
    throw new Error("Character ID is required");
  }

  try {
    // Get current dialogue tree
    const dialogueTree = await LocalCharacterDialogueOperations.getDialogueTreeById(characterId);
    
    if (!dialogueTree) {
      return {
        success: true,
        hasNewData: false,
        newNodes: [],
        updatedNodes: [],
        deletedNodeIds: [],
        currentNodeId: "root",
        totalNodeCount: 0,
        lastUpdateTime: new Date().toISOString(),
      };
    }

    const allNodes = dialogueTree.nodes || [];
    const lastKnownNodeIdsSet = new Set(lastKnownNodeIds);
    
    // Find new nodes (not in lastKnownNodeIds)
    const newNodes = allNodes.filter(node => !lastKnownNodeIdsSet.has(node.nodeId));
    
    // Find updated nodes (if lastUpdateTime is provided)
    let updatedNodes: any[] = [];
    if (lastUpdateTime) {
      const lastUpdateTimeMs = new Date(lastUpdateTime).getTime();
      updatedNodes = allNodes.filter(node => {
        const nodeUpdateTime = (node as any).updated_at ? new Date((node as any).updated_at).getTime() : 0;
        return lastKnownNodeIdsSet.has(node.nodeId) && nodeUpdateTime > lastUpdateTimeMs;
      });
    }

    // Find deleted nodes (in lastKnownNodeIds but not in current nodes)
    const currentNodeIds = new Set(allNodes.map(node => node.nodeId));
    const deletedNodeIds = Array.from(lastKnownNodeIdsSet).filter(nodeId => !currentNodeIds.has(nodeId));

    const hasNewData = newNodes.length > 0 || updatedNodes.length > 0 || deletedNodeIds.length > 0;

    return {
      success: true,
      hasNewData,
      newNodes,
      updatedNodes,
      deletedNodeIds,
      currentNodeId: dialogueTree.current_nodeId || "root",
      totalNodeCount: allNodes.length,
      lastUpdateTime: new Date().toISOString(),
    };

  } catch (error: any) {
    console.error("Failed to get incremental dialogue:", error);
    throw new Error(`Failed to get incremental dialogue: ${error.message}`);
  }
}

/**
 * Check if there are new dialogue nodes without fetching full data
 * @param characterId - Character ID to check
 * @param lastKnownNodeCount - Last known number of nodes
 * @returns Whether new dialogue nodes exist
 */
export async function hasNewDialogueNodes(characterId: string, lastKnownNodeCount: number): Promise<boolean> {
  try {
    const dialogueTree = await LocalCharacterDialogueOperations.getDialogueTreeById(characterId);
    
    if (!dialogueTree) {
      return false;
    }

    const currentNodeCount = dialogueTree.nodes?.length || 0;
    return currentNodeCount > lastKnownNodeCount;

  } catch (error) {
    console.error("Failed to check for new dialogue nodes:", error);
    return false;
  }
} 
 
