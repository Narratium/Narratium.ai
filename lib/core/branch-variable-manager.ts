/**
 * 分支变量状态管理器
 * 负责管理剧情分支中的变量状态，实现分支切换时的变量同步
 */

import { VariableChange, BranchVariableConfig } from "@/lib/models/node-model";
import { 
  getAllVariables, 
  exportVariablesAsJSON, 
  setSillyTavernContext,
  initializeCustomVariables,
  getVariableChangeHistory,
  clearVariableHistory,
} from "@/lib/adapter/sillyTavernFunctions";

export class BranchVariableManager {
  private static config: BranchVariableConfig = {
    enableSnapshots: true,
    enableDifferentialStorage: true,
    maxSnapshotInterval: 5, // 每5个节点保存一次完整快照
    compressionThreshold: 100, // 当差异超过100个时压缩
  };

  /**
   * 配置分支变量管理器
   */
  static configure(config: Partial<BranchVariableConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * 获取当前配置
   */
  static getConfig(): BranchVariableConfig {
    return { ...this.config };
  }

  /**
   * 为节点创建变量状态快照
   * @param nodeId 节点ID
   * @param parentNodeId 父节点ID
   * @param parentSnapshot 父节点的变量快照
   * @param forceSnapshot 强制创建完整快照
   * @returns 节点变量状态数据
   */
  static createVariableSnapshot(
    nodeId: string,
    parentNodeId: string,
    parentSnapshot?: Record<string, any>,
    forceSnapshot: boolean = false,
  ): {
    variableSnapshot?: Record<string, any>;
    variableChanges?: VariableChange[];
    variableMetadata: {
      timestamp: string;
      hasChanges: boolean;
      parentSnapshot: boolean;
      size?: number;
    };
  } {
    const currentVariables = getAllVariables();
    const timestamp = new Date().toISOString();
    const recentChanges = getVariableChangeHistory();

    // 计算自父节点以来的变量变化
    let variableChanges: VariableChange[] = [];
    let hasChanges = false;

    if (parentSnapshot) {
      variableChanges = this.calculateVariableChanges(
        parentSnapshot.global || {},
        currentVariables.global || {},
      );
      hasChanges = variableChanges.length > 0;
    }

    // 决定存储策略
    const shouldCreateSnapshot = forceSnapshot || this.shouldCreateSnapshot(
      nodeId,
      parentNodeId,
      variableChanges.length,
    );

    const result: any = {
      variableMetadata: {
        timestamp,
        hasChanges,
        parentSnapshot: !shouldCreateSnapshot,
      },
    };

    if (shouldCreateSnapshot) {
      // 保存完整快照
      result.variableSnapshot = this.createOptimizedSnapshot(currentVariables);
      result.variableMetadata.size = JSON.stringify(result.variableSnapshot).length;
    } else if (this.config.enableDifferentialStorage && hasChanges) {
      // 只保存变化
      result.variableChanges = variableChanges;
      result.variableMetadata.size = JSON.stringify(variableChanges).length;
    }

    return result;
  }

  /**
   * 恢复节点的变量状态
   * @param nodeId 目标节点ID
   * @param nodeData 节点数据
   * @param pathToNode 从根节点到目标节点的路径
   * @returns 恢复的变量状态
   */
  static async restoreVariableState(
    nodeId: string,
    nodeData: any,
    pathToNode: any[],
  ): Promise<Record<string, any>> {
    let finalVariables: Record<string, any> = {};
    const startTime = Date.now();

    // 构建变量状态：从路径中重建
    for (const node of pathToNode) {
      if (node.variableSnapshot) {
        // 如果有完整快照，直接使用
        finalVariables = this.deepClone(node.variableSnapshot);
      } else if (node.variableChanges && node.variableChanges.length > 0) {
        // 应用变量变化
        finalVariables = this.applyVariableChanges(finalVariables, node.variableChanges);
      }
    }

    // 恢复变量状态到SillyTavern系统
    if (Object.keys(finalVariables).length > 0) {
      // 清空当前历史
      clearVariableHistory();
      
      // 重新初始化变量
      if (finalVariables.global) {
        initializeCustomVariables(finalVariables.global);
      }

      const timeElapsed = Date.now() - startTime;
      console.log(`[BranchVariableManager] 已恢复节点 ${nodeId} 的变量状态 (耗时: ${timeElapsed}ms)`);
    }
    
    return finalVariables;
  }

  /**
   * 计算两个变量状态之间的差异
   */
  private static calculateVariableChanges(
    oldState: Record<string, any>,
    newState: Record<string, any>,
  ): VariableChange[] {
    const changes: VariableChange[] = [];
    const timestamp = new Date().toISOString();

    // 递归比较对象
    const compareObjects = (
      old: any,
      current: any,
      path: string = "",
    ) => {
      const allKeys = new Set([
        ...Object.keys(old || {}),
        ...Object.keys(current || {}),
      ]);

      for (const key of allKeys) {
        const fullPath = path ? `${path}.${key}` : key;
        const oldValue = old?.[key];
        const currentValue = current?.[key];

        if (oldValue === undefined && currentValue !== undefined) {
          // 新增变量
          changes.push({
            path: fullPath,
            oldValue: undefined,
            newValue: currentValue,
            operation: "add",
            timestamp,
          });
        } else if (oldValue !== undefined && currentValue === undefined) {
          // 删除变量
          changes.push({
            path: fullPath,
            oldValue,
            newValue: undefined,
            operation: "delete",
            timestamp,
          });
        } else if (
          typeof oldValue === "object" &&
          typeof currentValue === "object" &&
          oldValue !== null &&
          currentValue !== null
        ) {
          // 递归比较对象
          compareObjects(oldValue, currentValue, fullPath);
        } else if (oldValue !== currentValue) {
          // 值发生变化
          changes.push({
            path: fullPath,
            oldValue,
            newValue: currentValue,
            operation: "set",
            timestamp,
          });
        }
      }
    };

    compareObjects(oldState, newState);
    return changes;
  }

  /**
   * 应用变量变化到状态对象
   */
  private static applyVariableChanges(
    baseState: Record<string, any>,
    changes: VariableChange[],
  ): Record<string, any> {
    const result = this.deepClone(baseState);

    for (const change of changes) {
      const pathParts = change.path.split(".");
      let current = result;

      // 创建路径
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        if (!current[part] || typeof current[part] !== "object") {
          current[part] = {};
        }
        current = current[part];
      }

      const lastKey = pathParts[pathParts.length - 1];

      switch (change.operation) {
      case "set":
      case "add":
        current[lastKey] = change.newValue;
        break;
      case "delete":
        delete current[lastKey];
        break;
      case "inc":
        current[lastKey] = (current[lastKey] || 0) + (change.newValue || 1);
        break;
      case "dec":
        current[lastKey] = (current[lastKey] || 0) - (change.newValue || 1);
        break;
      }
    }

    return result;
  }

  /**
   * 判断是否应该创建完整快照
   */
  private static shouldCreateSnapshot(
    nodeId: string,
    parentNodeId: string,
    changesCount: number,
  ): boolean {
    if (!this.config.enableSnapshots) return false;
    if (!parentNodeId) return true; // 根节点总是创建快照

    // 根据变化数量决定
    if (changesCount > this.config.compressionThreshold) {
      return true;
    }

    // 根据节点间隔决定（简化实现，实际可以根据节点深度）
    const nodeNumber = parseInt(nodeId.slice(-3)) || 0;
    return nodeNumber % this.config.maxSnapshotInterval === 0;
  }

  /**
   * 创建优化的变量快照
   */
  private static createOptimizedSnapshot(variables: Record<string, any>): Record<string, any> {
    // 只保存全局变量，忽略临时变量
    return {
      global: this.deepClone(variables.global || {}),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * 深度克隆对象（优化版）
   */
  private static deepClone(obj: any): any {
    if (obj === null || typeof obj !== "object") return obj;
    if (obj instanceof Date) return new Date(obj);
    if (obj instanceof Array) return obj.map(item => this.deepClone(item));
    if (obj instanceof RegExp) return new RegExp(obj);
    if (obj instanceof Map) return new Map(Array.from(obj.entries()).map(([k, v]) => [k, this.deepClone(v)]));
    if (obj instanceof Set) return new Set(Array.from(obj).map(v => this.deepClone(v)));
    if (typeof obj === "object") {
      const clonedObj: any = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          clonedObj[key] = this.deepClone(obj[key]);
        }
      }
      return clonedObj;
    }
    return obj;
  }

  /**
   * 获取变量状态摘要信息
   */
  static getVariableStateSummary(nodeData: any): {
    hasSnapshot: boolean;
    hasChanges: boolean;
    changesCount: number;
    timestamp?: string;
  } {
    return {
      hasSnapshot: !!nodeData.variableSnapshot,
      hasChanges: !!nodeData.variableChanges?.length,
      changesCount: nodeData.variableChanges?.length || 0,
      timestamp: nodeData.variableMetadata?.timestamp,
    };
  }

  /**
   * 验证变量状态完整性
   */
  static validateVariableState(pathToNode: any[]): {
    isValid: boolean;
    missingSnapshots: string[];
    brokenChain: boolean;
  } {
    let hasSnapshot = false;
    const missingSnapshots: string[] = [];
    
    for (const node of pathToNode) {
      if (node.variableSnapshot) {
        hasSnapshot = true;
      } else if (!hasSnapshot && node.variableChanges) {
        // 没有基础快照就有变化，链条断裂
        missingSnapshots.push(node.nodeId);
      }
    }

    return {
      isValid: hasSnapshot || pathToNode.length === 0,
      missingSnapshots,
      brokenChain: !hasSnapshot && missingSnapshots.length > 0,
    };
  }

  /**
   * 导出变量状态用于调试
   */
  static exportBranchVariableState(nodeData: any): string {
    const summary = this.getVariableStateSummary(nodeData);
    const exportData = {
      summary,
      snapshot: nodeData.variableSnapshot,
      changes: nodeData.variableChanges,
      metadata: nodeData.variableMetadata,
    };
    
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * 获取变量存储统计信息
   */
  static getStorageStatistics(pathToNode: any[]): {
    totalNodes: number;
    snapshotCount: number;
    changeSetCount: number;
    totalSize: number;
    averageChangeSize: number;
    compressionRatio: number;
  } {
    let snapshotCount = 0;
    let changeSetCount = 0;
    let totalSize = 0;
    let changesSizes: number[] = [];
    
    for (const node of pathToNode) {
      if (node.variableSnapshot) {
        snapshotCount++;
      }
      if (node.variableChanges) {
        changeSetCount++;
        changesSizes.push(node.variableMetadata?.size || 0);
      }
      totalSize += node.variableMetadata?.size || 0;
    }
    
    const averageChangeSize = changesSizes.length > 0 
      ? changesSizes.reduce((a, b) => a + b, 0) / changesSizes.length 
      : 0;
    
    const compressionRatio = snapshotCount > 0 
      ? changeSetCount / (snapshotCount + changeSetCount) 
      : 0;
    
    return {
      totalNodes: pathToNode.length,
      snapshotCount,
      changeSetCount,
      totalSize,
      averageChangeSize,
      compressionRatio,
    };
  }

  /**
   * 修复损坏的变量状态链
   */
  static async repairVariableStateChain(pathToNode: any[]): Promise<boolean> {
    try {
      // 找到最近的有效快照
      let lastValidSnapshot: Record<string, any> = {};
      let repairFromIndex = 0;

      for (let i = pathToNode.length - 1; i >= 0; i--) {
        if (pathToNode[i].variableSnapshot) {
          lastValidSnapshot = pathToNode[i].variableSnapshot;
          repairFromIndex = i + 1;
          break;
        }
      }

      // 从有效快照开始重新应用变化
      let currentState = this.deepClone(lastValidSnapshot);
      
      for (let i = repairFromIndex; i < pathToNode.length; i++) {
        const node = pathToNode[i];
        if (node.variableChanges) {
          currentState = this.applyVariableChanges(currentState, node.variableChanges);
        }
      }

      // 恢复修复后的状态
      if (currentState.global) {
        clearVariableHistory();
        initializeCustomVariables(currentState.global);
      }

      console.log(`[BranchVariableManager] 已修复变量状态链，修复了 ${pathToNode.length - repairFromIndex} 个节点`);
      return true;
    } catch (error) {
      console.error("[BranchVariableManager] 修复变量状态链失败:", error);
      return false;
    }
  }
}
