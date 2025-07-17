import { ParsedResponse } from "@/lib/models/parsed-response";

/**
 * 变量变化记录
 */
export interface VariableChange {
  path: string;
  oldValue: any;
  newValue: any;
  operation: "set" | "add" | "inc" | "dec" | "delete";
  timestamp: string;
}

/**
 * 分支变量状态管理器配置
 */
export interface BranchVariableConfig {
  enableSnapshots: boolean; // 是否启用快照
  enableDifferentialStorage: boolean; // 是否启用差异存储
  maxSnapshotInterval: number; // 最大快照间隔（节点数）
  compressionThreshold: number; // 压缩阈值
}

export class DialogueNode {
  nodeId: string;
  parentNodeId: string;
  userInput: string;
  assistantResponse: string;
  fullResponse: string;
  thinkingContent?: string;
  parsedContent?: ParsedResponse;
  // 新增：节点变量状态快照
  variableSnapshot?: Record<string, any>;
  // 新增：变量变化记录（相对于父节点的差异）
  variableChanges?: VariableChange[];
  // 新增：变量状态元数据
  variableMetadata?: {
    timestamp: string;
    hasChanges: boolean;
    parentSnapshot: boolean; // 是否继承自父节点
  };
  constructor(
    nodeId: string,
    parentNodeId: string,
    userInput: string,
    assistantResponse: string,
    fullResponse: string,
    thinkingContent?: string,
    parsedContent?: ParsedResponse,
  ) {
    this.nodeId = nodeId;
    this.parentNodeId = parentNodeId;
    this.userInput = userInput;
    this.assistantResponse = assistantResponse;
    this.fullResponse = fullResponse;
    this.thinkingContent = thinkingContent;
    this.parsedContent = parsedContent;
  }
}

export class DialogueTree {
  id: string;
  character_id: string;
  current_nodeId: string;
  
  nodes: DialogueNode[];
  
  constructor(
    id: string,
    character_id: string,
    nodes: DialogueNode[] = [],
    current_nodeId: string = "root",
  ) {
    this.id = id;
    this.character_id = character_id;
    this.nodes = nodes;
    this.current_nodeId = current_nodeId;
  }
}
