import { readData, writeData, CHARACTER_DIALOGUES_FILE } from "@/lib/data/local-storage";
import { DialogueNode, DialogueTree } from "@/lib/models/node-model";
import { v4 as uuidv4 } from "uuid";
import { ParsedResponse } from "@/lib/models/parsed-response";
import { BranchVariableManager } from "@/lib/core/branch-variable-manager";

export class LocalCharacterDialogueOperations {
  static async createDialogueTree(characterId: string): Promise<DialogueTree> {
    const dialogues = await readData(CHARACTER_DIALOGUES_FILE);
    
    const filteredDialogues = dialogues.filter((d: any) => d.character_id !== characterId);
    
    const dialogueTree = new DialogueTree(
      characterId,
      characterId,
      [],
      "root",
    );
    
    filteredDialogues.push(dialogueTree); 
    await writeData(CHARACTER_DIALOGUES_FILE, filteredDialogues);

    await this.addNodeToDialogueTree(characterId, "", "", "", "", "", undefined, "root");
    return dialogueTree;
  }
  
  static async getDialogueTreeById(dialogueId: string): Promise<DialogueTree | null> {
    const dialogues = await readData(CHARACTER_DIALOGUES_FILE);
    const dialogue = dialogues.find((d: any) => d.id === dialogueId);
    
    if (!dialogue) return null;
    
    return new DialogueTree(
      dialogue.id,
      dialogue.character_id,
      dialogue.nodes?.map((node: any) => {
        const dialogueNode = new DialogueNode(
          node.nodeId,
          node.parentNodeId,
          node.userInput,
          node.assistantResponse,
          node.fullResponse,
          node.thinkingContent,
          node.parsedContent,
        );
        
        // 加载变量状态相关数据
        dialogueNode.variableSnapshot = node.variableSnapshot;
        dialogueNode.variableChanges = node.variableChanges;
        dialogueNode.variableMetadata = node.variableMetadata;
        
        return dialogueNode;
      }) || [],
      dialogue.current_nodeId,
    );
  }
  
  static async addNodeToDialogueTree(
    dialogueId: string, 
    parentNodeId: string,
    userInput: string,
    assistantResponse: string,
    fullResponse: string,
    thinkingContent?: string,
    parsedContent?: ParsedResponse,
    nodeId?: string,
  ): Promise<string> {
    const dialogues = await readData(CHARACTER_DIALOGUES_FILE);
    const index = dialogues.findIndex((d: any) => d.id === dialogueId);
    
    if (!nodeId) {
      nodeId = uuidv4();
    }
    
    // 获取父节点的变量快照
    let parentSnapshot: Record<string, any> | undefined;
    if (parentNodeId && dialogues[index].nodes) {
      const parentNode = dialogues[index].nodes.find((n: any) => n.nodeId === parentNodeId);
      if (parentNode && parentNode.variableSnapshot) {
        parentSnapshot = parentNode.variableSnapshot;
      }
    }
    
    // 创建变量状态快照
    const isImportantNode = userInput.includes("|初始化变量|") || 
                           assistantResponse.includes("{{setvar::") ||
                           (parentNodeId === "root");
    
    const variableData = BranchVariableManager.createVariableSnapshot(
      nodeId,
      parentNodeId,
      parentSnapshot,
      isImportantNode, // 重要节点强制创建快照
    );
    
    const newNode = new DialogueNode(
      nodeId,
      parentNodeId,
      userInput,
      assistantResponse,
      fullResponse,
      thinkingContent,
      parsedContent,
    );
    
    // 添加变量状态数据
    newNode.variableSnapshot = variableData.variableSnapshot;
    newNode.variableChanges = variableData.variableChanges;
    newNode.variableMetadata = variableData.variableMetadata;
    
    if (!dialogues[index].nodes) {
      dialogues[index].nodes = [];
    }
    
    dialogues[index].nodes.push(newNode);
    dialogues[index].current_nodeId = nodeId;
    
    await writeData(CHARACTER_DIALOGUES_FILE, dialogues);
    
    if (variableData.variableMetadata.hasChanges || variableData.variableSnapshot) {
      console.log(`[分支变量] 已为节点 ${nodeId} 保存变量状态`, {
        hasSnapshot: !!variableData.variableSnapshot,
        changesCount: variableData.variableChanges?.length || 0,
        size: variableData.variableMetadata.size,
        isImportantNode,
      });
    }
    
    return nodeId;
  }

  static async updateDialogueTree(dialogueId: string, updatedDialogue: DialogueTree): Promise<boolean> {
    const dialogues = await readData(CHARACTER_DIALOGUES_FILE);
    const index = dialogues.findIndex((d: any) => d.id === dialogueId);
    
    if (index === -1) {
      return false;
    }
    
    dialogues[index] = {
      ...updatedDialogue,
    };
    
    await writeData(CHARACTER_DIALOGUES_FILE, dialogues);
    return true;
  }

  static async updateNodeInDialogueTree(
    dialogueId: string, 
    nodeId: string, 
    updates: Partial<DialogueNode>,
  ): Promise<DialogueTree | null> {
    const dialogueTree = await this.getDialogueTreeById(dialogueId);
    
    if (!dialogueTree) {
      return null;
    }
    
    const nodeIndex = dialogueTree.nodes.findIndex(node => node.nodeId === nodeId);
    
    if (nodeIndex === -1) {
      return null;
    }
    
    dialogueTree.nodes[nodeIndex] = {
      ...dialogueTree.nodes[nodeIndex],
      ...updates,
    };
    
    await this.updateDialogueTree(dialogueId, dialogueTree);
    
    return dialogueTree;
  }
  
  static async switchBranch(dialogueId: string, nodeId: string): Promise<DialogueTree | null> {
    const dialogueTree = await this.getDialogueTreeById(dialogueId);
    
    if (!dialogueTree) {
      return null;
    }
    
    const node = dialogueTree.nodes.find(n => n.nodeId === nodeId);
    
    if (!node) {
      return null;
    }
    
    // 获取到目标节点的完整路径
    const pathToNode = await this.getDialoguePathToNode(dialogueId, nodeId);
    
    // 恢复目标节点的变量状态
    try {
      const startTime = Date.now();
      
      // 先验证变量状态完整性
      const validation = BranchVariableManager.validateVariableState(pathToNode);
      if (!validation.isValid) {
        console.warn("[分支变量] 检测到变量状态链问题，尝试修复...");
        const repaired = await BranchVariableManager.repairVariableStateChain(pathToNode);
        if (!repaired) {
          console.error("[分支变量] 变量状态链修复失败");
          // 继续尝试恢复，但可能不完整
        }
      }
      
      const restoredVariables = await BranchVariableManager.restoreVariableState(nodeId, node, pathToNode);
      const timeElapsed = Date.now() - startTime;
      
      console.log(`[分支变量] 已切换到节点 ${nodeId} 并恢复变量状态 (耗时: ${timeElapsed}ms)`);
      
      // 获取存储统计
      const stats = BranchVariableManager.getStorageStatistics(pathToNode);
      console.log("[分支变量] 存储统计:", {
        节点数: stats.totalNodes,
        快照数: stats.snapshotCount,
        变更集数: stats.changeSetCount,
        压缩率: `${(stats.compressionRatio * 100).toFixed(1)}%`,
      });
    } catch (error) {
      console.error("[分支变量] 恢复变量状态失败:", error);
      // 尝试使用默认变量
      console.warn("[分支变量] 尝试使用默认变量状态");
    }
    
    dialogueTree.current_nodeId = nodeId;
    
    await this.updateDialogueTree(dialogueId, dialogueTree);
    
    return dialogueTree;
  }
  
  static async clearDialogueHistory(dialogueId: string): Promise<DialogueTree | null> {
    const dialogueTree = await this.getDialogueTreeById(dialogueId);
    
    if (!dialogueTree) {
      return null;
    }
    
    dialogueTree.nodes = [];
    dialogueTree.current_nodeId = "root";
    
    await this.updateDialogueTree(dialogueId, dialogueTree);
    
    return dialogueTree;
  }

  static async deleteDialogueTree(dialogueId: string): Promise<boolean> {
    const dialogues = await readData(CHARACTER_DIALOGUES_FILE);
    const initialLength = dialogues.length;
    
    const filteredDialogues = dialogues.filter((d: any) => d.id !== dialogueId);
    
    if (filteredDialogues.length === initialLength) {
      return false;
    }
    
    await writeData(CHARACTER_DIALOGUES_FILE, filteredDialogues);
    
    return true;
  }

  static async deleteNode(dialogueId: string, nodeId: string): Promise<DialogueTree | null> {
    const dialogueTree = await this.getDialogueTreeById(dialogueId);
    
    if (!dialogueTree || nodeId === "root") {
      return null;
    }
    
    const nodeToDelete = dialogueTree.nodes.find(node => node.nodeId === nodeId);
    if (!nodeToDelete) {
      return null;
    }

    const nodesToDelete = new Set<string>();
    const collectNodesToDelete = (currentNodeId: string) => {
      nodesToDelete.add(currentNodeId);
      const children = dialogueTree.nodes.filter(node => node.parentNodeId === currentNodeId);
      children.forEach(child => collectNodesToDelete(child.nodeId));
    };
    
    collectNodesToDelete(nodeId);
    dialogueTree.nodes = dialogueTree.nodes.filter(node => !nodesToDelete.has(node.nodeId));
    if (nodesToDelete.has(dialogueTree.current_nodeId)) {
      dialogueTree.current_nodeId = nodeToDelete.parentNodeId;
      const newCurrentNode = dialogueTree.nodes.find(node => node.nodeId === dialogueTree.current_nodeId);
    }
    
    await this.updateDialogueTree(dialogueId, dialogueTree);
    
    return dialogueTree;
  }

  static async getDialoguePathToNode(dialogueId: string, nodeId: string): Promise<DialogueNode[]> {
    const dialogueTree = await this.getDialogueTreeById(dialogueId);
    
    if (!dialogueTree) {
      return [];
    }
    
    const path: DialogueNode[] = [];
    let currentNode = dialogueTree.nodes.find(node => node.nodeId === nodeId);
    
    while (currentNode) {
      path.unshift(currentNode);
      
      if (currentNode.nodeId === "root") {
        break;
      }
      
      currentNode = dialogueTree.nodes.find(node => node.nodeId === currentNode?.parentNodeId);
    }
    
    return path;
  }

  static async getChildNodes(dialogueId: string, parentNodeId: string): Promise<DialogueNode[]> {
    const dialogueTree = await this.getDialogueTreeById(dialogueId);
    
    if (!dialogueTree) {
      return [];
    }
    
    return dialogueTree.nodes.filter(node => node.parentNodeId === parentNodeId);
  }

  static async getSystemMessage(characterId: string): Promise<string> {
    const dialogueTree = await this.getDialogueTreeById(characterId);
    if (!dialogueTree || !dialogueTree.nodes || dialogueTree.nodes.length === 0) {
      return "";
    }
    const rootNode = dialogueTree.nodes.find(node => node.parentNodeId === "root");
    return rootNode?.assistantResponse || "";
  }
  
  static async getLastNodeId(characterId: string): Promise<string> {
    const dialogueTree = await this.getDialogueTreeById(characterId);
    return dialogueTree?.current_nodeId || "root";
  }

  static async nodeExists(characterId: string, nodeId: string): Promise<boolean> {
    if (nodeId === "root") return true;
    
    const dialogueTree = await this.getDialogueTreeById(characterId);
    if (!dialogueTree || !dialogueTree.nodes || dialogueTree.nodes.length === 0) {
      return false;
    }

    return dialogueTree.nodes.some(node => node.nodeId === nodeId);
  }
}
