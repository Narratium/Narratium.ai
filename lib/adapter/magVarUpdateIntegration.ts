/**
 * MagVarUpdate 功能集成
 * 将 MagVarUpdate 的核心功能迁移到我们的变量管理系统
 */

import { getAllVariables, setvar, getvar } from "./sillyTavernFunctions";

// 定义 MagVarUpdate 风格的数据结构
export interface MagGameData {
  initialized_lorebooks: string[];
  stat_data: Record<string, any>;
  display_data: Record<string, any>;
  delta_data: Record<string, any>;
}

// 变量更新事件
export interface VariableUpdateEvent {
  path: string;
  oldValue: any;
  newValue: any;
  reason?: string;
  timestamp: string;
}

// 事件监听器类型
export type VariableUpdateListener = (event: VariableUpdateEvent) => void;

export class MagVarUpdateIntegration {
  private static listeners: VariableUpdateListener[] = [];
  private static gameData: MagGameData = {
    initialized_lorebooks: [],
    stat_data: {},
    display_data: {},
    delta_data: {},
  };

  /**
   * 添加变量更新监听器
   */
  static addUpdateListener(listener: VariableUpdateListener): void {
    this.listeners.push(listener);
  }

  /**
   * 移除变量更新监听器
   */
  static removeUpdateListener(listener: VariableUpdateListener): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * 触发变量更新事件
   */
  private static emitUpdate(event: VariableUpdateEvent): void {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error("Variable update listener error:", error);
      }
    });
  }

  /**
   * 解析 _.set 命令
   * 格式：_.set('path', oldValue, newValue); 或 _.set('path', oldValue, newValue, 'reason');
   */
  static parseSetCommands(text: string): Array<{
    path: string;
    oldValue: any;
    newValue: any;
    reason?: string;
  }> {
    const commands: Array<{
      path: string;
      oldValue: any;
      newValue: any;
      reason?: string;
    }> = [];

    // 匹配 _.set() 调用的正则表达式
    const setRegex = /_\.set\s*\(\s*["\`]([^"\`]+)["\`]\s*,\s*([^,]+)\s*,\s*([^,)]+)(?:\s*,\s*["\`]([^"\`]*)["\`]\s*)?\)\s*;?/g;
    
    let match;
    while ((match = setRegex.exec(text)) !== null) {
      const [, path, oldValueStr, newValueStr, reason] = match;
      
      try {
        // 解析值（支持字符串、数字、布尔值、null）
        const parseValue = (valueStr: string): any => {
          const trimmed = valueStr.trim();
          
          // 字符串值
          if ((trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
              (trimmed.startsWith("\'") && trimmed.endsWith("\'")) ||
              (trimmed.startsWith("`") && trimmed.endsWith("`"))) {
            return trimmed.slice(1, -1);
          }
          
          // 数字值
          if (/^-?\d+\.?\d*$/.test(trimmed)) {
            return trimmed.includes(".") ? parseFloat(trimmed) : parseInt(trimmed, 10);
          }
          
          // 布尔值
          if (trimmed === "true") return true;
          if (trimmed === "false") return false;
          
          // null 和 undefined
          if (trimmed === "null") return null;
          if (trimmed === "undefined") return undefined;
          
          // 尝试解析为 JSON
          try {
            return JSON.parse(trimmed);
          } catch {
            // 如果都失败了，返回原始字符串
            return trimmed;
          }
        };

        commands.push({
          path: path.trim(),
          oldValue: parseValue(oldValueStr),
          newValue: parseValue(newValueStr),
          reason: reason?.trim(),
        });
      } catch (error) {
        console.error(`Failed to parse _.set command: ${match[0]}`, error);
      }
    }

    return commands;
  }

  /**
   * 执行 _.set 风格的变量更新
   */
  static set(path: string, oldValue: any, newValue: any, reason?: string): boolean {
    try {
      // 获取当前值
      const currentValue = this.getValueByPath(path);
      
      // 验证旧值（如果不匹配，可以选择是否继续）
      if (oldValue !== undefined && oldValue !== null && currentValue !== oldValue) {
        console.warn(`Variable ${path}: expected ${oldValue}, got ${currentValue}. Proceeding anyway.`);
      }

      // 执行更新
      this.setValueByPath(path, newValue);
      
      // 更新 delta 数据
      this.updateDeltaData(path, currentValue, newValue);
      
      // 触发事件
      this.emitUpdate({
        path,
        oldValue: currentValue,
        newValue,
        reason,
        timestamp: new Date().toISOString(),
      });

      console.log(`[MagVarUpdate] ${path}: ${currentValue} → ${newValue}${reason ? ` (${reason})` : ""}`);
      return true;
    } catch (error) {
      console.error(`Failed to update variable ${path}:`, error);
      return false;
    }
  }

  /**
   * 通过路径获取值
   */
  private static getValueByPath(path: string): any {
    // 首先尝试从我们的变量系统获取
    const value = getvar(path);
    if (value !== undefined) {
      return value;
    }

    // 然后从 gameData 获取
    const pathParts = path.split(".");
    let current: any = this.gameData;
    
    for (const part of pathParts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = current[part];
    }
    
    return current;
  }

  /**
   * 通过路径设置值
   */
  private static setValueByPath(path: string, value: any): void {
    // 同时更新到我们的变量系统和 gameData
    setvar(path, value);
    
    const pathParts = path.split(".");
    let current = this.gameData.stat_data;
    
    // 创建嵌套结构
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (!current[part] || typeof current[part] !== "object") {
        current[part] = {};
      }
      current = current[part];
    }
    
    // 设置最终值
    const lastPart = pathParts[pathParts.length - 1];
    current[lastPart] = value;
  }

  /**
   * 更新 delta 数据
   */
  private static updateDeltaData(path: string, oldValue: any, newValue: any): void {
    // 计算变化量
    let delta: any;
    
    if (typeof oldValue === "number" && typeof newValue === "number") {
      delta = newValue - oldValue;
    } else if (Array.isArray(oldValue) && Array.isArray(newValue)) {
      delta = {
        added: newValue.filter(item => !oldValue.includes(item)),
        removed: oldValue.filter(item => !newValue.includes(item)),
      };
    } else {
      delta = { from: oldValue, to: newValue };
    }

    // 存储到 delta_data
    const pathParts = path.split(".");
    let current = this.gameData.delta_data;
    
    for (let i = 0; i < pathParts.length - 1; i++) {
      const part = pathParts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }
    
    const lastPart = pathParts[pathParts.length - 1];
    current[lastPart] = delta;
  }

  /**
   * 处理文本中的 _.set 命令
   */
  static processSetCommands(text: string): string {
    const commands = this.parseSetCommands(text);
    
    // 执行所有命令
    for (const command of commands) {
      this.set(command.path, command.oldValue, command.newValue, command.reason);
    }

    // 移除 _.set 命令从文本中
    return text.replace(/_\.set\s*\([^)]+\)\s*;?/g, "").trim();
  }

  /**
   * 获取游戏数据快照
   */
  static getGameDataSnapshot(): MagGameData {
    return JSON.parse(JSON.stringify(this.gameData));
  }

  /**
   * 恢复游戏数据
   */
  static restoreGameData(data: MagGameData): void {
    this.gameData = JSON.parse(JSON.stringify(data));
    
    // 同步到我们的变量系统
    this.syncToVariableSystem();
  }

  /**
   * 同步到我们的变量系统
   */
  private static syncToVariableSystem(): void {
    const syncObject = (obj: Record<string, any>, prefix = ""): void => {
      for (const [key, value] of Object.entries(obj)) {
        const fullPath = prefix ? `${prefix}.${key}` : key;
        
        if (value && typeof value === "object" && !Array.isArray(value)) {
          syncObject(value, fullPath);
        } else {
          setvar(fullPath, value);
        }
      }
    };

    syncObject(this.gameData.stat_data);
  }

  /**
   * 初始化默认变量
   */
  static initializeDefaults(defaults: Record<string, any>): void {
    for (const [path, value] of Object.entries(defaults)) {
      const currentValue = this.getValueByPath(path);
      if (currentValue === undefined) {
        this.set(path, undefined, value, "默认初始化");
      }
    }
  }

  /**
   * 清理过期的 delta 数据
   */
  static cleanupDeltaData(): void {
    this.gameData.delta_data = {};
  }
}

// 导出全局 _.set 函数，方便在模板中使用
(globalThis as any)._ = {
  set: (path: string, oldValue: any, newValue: any, reason?: string) => {
    return MagVarUpdateIntegration.set(path, oldValue, newValue, reason);
  },
};

console.log("[MagVarUpdate] Integration loaded");
