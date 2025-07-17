import { ParsedResponse } from "@/lib/models/parsed-response";

export class DialogueNode {
  nodeId: string;
  parentNodeId: string;
  userInput: string;
  assistantResponse: string;
  fullResponse: string;
  thinkingContent?: string;
  parsedContent?: ParsedResponse;
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
