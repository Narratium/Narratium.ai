import { DialogueMessage } from "@/lib/models/character-dialogue-model";
import { WorldBookEntry } from "@/lib/models/world-book-model";
import { CharacterData } from "@/lib/models/character-model";

/**
 * SillyTavern兼容函数库
 * 实现与SillyTavern角色卡兼容的模板函数
 */

// 全局变量存储
let globalVariables: Record<string, any> = {};

// 作用域变量存储
let scopedVariables: Record<string, Record<string, any>> = {
  global: {},
  local: {},
  message: {},
  cache: {},
};

// 世界书数据存储
let worldBookData: WorldBookEntry[] = [];

// 角色数据存储
let characterData: CharacterData | null = null;

// 对话历史存储
let chatHistoryData: DialogueMessage[] = [];

// 激活的世界书条目
let activatedWorldInfo: WorldBookEntry[] = [];

/**
 * 设置全局数据，供模板函数使用
 */
export function setSillyTavernContext(
  variables: Record<string, any> = {},
  worldBook: WorldBookEntry[] = [],
  character: CharacterData | null = null,
  chatHistory: DialogueMessage[] = [],
) {
  globalVariables = { ...variables };
  scopedVariables.global = { ...variables };
  worldBookData = [...worldBook];
  characterData = character;
  chatHistoryData = [...chatHistory];
  activatedWorldInfo = [];
}

/**
 * 初始化默认变量
 */
export function initializeDefaultVariables(): void {
  const defaultVars = {
    变量: {
      络络: {
        亲密度: 0,
        是否添加微信好友: 0,
        恋爱天数: 0,
      },
      世界: {
        当前时间阶段: "上午",
        当前所在世界: "现实世界",
        高考倒计时天数: 100,
      },
      傅雪: {
        情感天平: 0,
      },
      顾清: {
        情感天平: 0,
      },
    },
  };
  
  // 合并到全局变量
  globalVariables = { ...globalVariables, ...defaultVars };
  scopedVariables.global = { ...scopedVariables.global, ...defaultVars };
}

/**
 * 初始化自定义变量
 * @param variables 要初始化的变量对象
 */
export function initializeCustomVariables(variables: Record<string, any>): void {
  // 合并到全局变量，保持现有变量不被覆盖
  const mergeDeep = (target: any, source: any): any => {
    for (const key in source) {
      if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
        if (!target[key]) target[key] = {};
        mergeDeep(target[key], source[key]);
      } else {
        // 只在变量不存在时才设置，避免覆盖已有值
        if (target[key] === undefined) {
          target[key] = source[key];
        }
      }
    }
    return target;
  };
  
  globalVariables = mergeDeep(globalVariables, variables);
  scopedVariables.global = mergeDeep(scopedVariables.global, variables);
}

/**
 * 获取所有变量的当前状态（调试用）
 * @returns 包含所有变量的对象
 */
export function getAllVariables(): Record<string, any> {
  return {
    global: globalVariables,
    scoped: scopedVariables,
    worldBook: worldBookData.length,
    character: characterData?.name || "未设置",
    chatHistory: chatHistoryData.length,
    activatedWorldInfo: activatedWorldInfo.length,
  };
}

/**
 * 导出变量为JSON格式（用于调试和保存）
 * @param prettify 是否格式化输出
 * @returns JSON字符串
 */
export function exportVariablesAsJSON(prettify: boolean = true): string {
  const exportData = {
    timestamp: new Date().toISOString(),
    globalVariables,
    scopedVariables,
    metadata: {
      worldBookEntries: worldBookData.length,
      characterName: characterData?.name || null,
      chatMessages: chatHistoryData.length,
      activatedEntries: activatedWorldInfo.length,
    },
  };
  
  return prettify ? JSON.stringify(exportData, null, 2) : JSON.stringify(exportData);
}

/**
 * 生成变量状态报告（用于调试）
 * @returns 格式化的状态报告
 */
export function generateVariableReport(): string {
  const report = [];
  
  report.push("=== SillyTavern 变量状态报告 ===");
  report.push(`生成时间: ${new Date().toLocaleString()}`);
  report.push("");
  
  // 全局变量统计
  const globalVarCount = Object.keys(globalVariables).length;
  report.push(`📊 全局变量总数: ${globalVarCount}`);
  
  if (globalVarCount > 0) {
    report.push("🌍 全局变量结构:");
    const printObjectStructure = (obj: any, prefix: string = "", depth: number = 0) => {
      if (depth > 3) return; // 限制深度避免过长
      
      for (const [key, value] of Object.entries(obj)) {
        const indent = "  ".repeat(depth + 1);
        if (typeof value === "object" && value !== null && !Array.isArray(value)) {
          report.push(`${indent}${prefix}${key}/ (对象)`);
          printObjectStructure(value, "", depth + 1);
        } else {
          const valueStr = Array.isArray(value) ? `[${value.length}项]` : String(value);
          const truncated = valueStr.length > 30 ? valueStr.substring(0, 30) + "..." : valueStr;
          report.push(`${indent}${prefix}${key}: ${truncated}`);
        }
      }
    };
    
    printObjectStructure(globalVariables);
  }
  
  report.push("");
  
  // 作用域变量统计
  report.push("🎯 作用域变量统计:");
  for (const [scope, vars] of Object.entries(scopedVariables)) {
    const count = Object.keys(vars).length;
    report.push(`  ${scope}: ${count} 个变量`);
  }
  
  report.push("");
  
  // 世界书和角色信息
  report.push("📚 上下文信息:");
  report.push(`  世界书条目: ${worldBookData.length} 个`);
  report.push(`  激活的世界书: ${activatedWorldInfo.length} 个`);
  report.push(`  角色: ${characterData?.name || "未设置"}`);
  report.push(`  对话历史: ${chatHistoryData.length} 条消息`);
  
  return report.join("\n");
}

/**
 * 查找包含特定关键词的变量
 * @param keyword 搜索关键词
 * @param caseSensitive 是否区分大小写
 * @returns 匹配的变量列表
 */
export function searchVariables(keyword: string, caseSensitive: boolean = false): Array<{path: string, value: any}> {
  const results: Array<{path: string, value: any}> = [];
  const searchTerm = caseSensitive ? keyword : keyword.toLowerCase();
  
  const searchInObject = (obj: any, basePath: string = "") => {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = basePath ? `${basePath}.${key}` : key;
      const searchKey = caseSensitive ? key : key.toLowerCase();
      
      // 检查键名是否匹配
      if (searchKey.includes(searchTerm)) {
        results.push({ path: currentPath, value });
      }
      
      // 检查值是否匹配（对于字符串值）
      if (typeof value === "string") {
        const searchValue = caseSensitive ? value : value.toLowerCase();
        if (searchValue.includes(searchTerm)) {
          results.push({ path: currentPath, value });
        }
      }
      
      // 递归搜索对象
      if (typeof value === "object" && value !== null && !Array.isArray(value)) {
        searchInObject(value, currentPath);
      }
    }
  };
  
  searchInObject(globalVariables);
  return results;
}

/**
 * 获取变量变化历史（简单版本）
 */
let variableChangeHistory: Array<{
  timestamp: string;
  path: string;
  oldValue: any;
  newValue: any;
  operation: "set" | "add" | "inc" | "dec";
}> = [];

/**
 * 记录变量变化
 */
function recordVariableChange(path: string, oldValue: any, newValue: any, operation: "set" | "add" | "inc" | "dec") {
  variableChangeHistory.push({
    timestamp: new Date().toISOString(),
    path,
    oldValue,
    newValue,
    operation,
  });
  
  // 限制历史记录数量
  if (variableChangeHistory.length > 100) {
    variableChangeHistory = variableChangeHistory.slice(-50);
  }
}

/**
 * 获取变量变化历史
 * @param limit 返回的记录数量限制
 * @returns 变量变化历史
 */
export function getVariableChangeHistory(limit?: number): typeof variableChangeHistory {
  return limit ? variableChangeHistory.slice(-limit) : [...variableChangeHistory];
}

/**
 * 清空变量变化历史
 */
export function clearVariableHistory(): void {
  variableChangeHistory = [];
}

/**
 * getvar - 获取变量值
 * 兼容SillyTavern的getvar函数
 * @param variablePath 变量路径，支持点号分隔的嵌套路径
 * @param defaultValue 默认值
 * @returns 变量值或默认值
 */
export function getvar(variablePath: string, defaultValue: any = undefined): any {
  if (!variablePath || typeof variablePath !== "string") {
    return defaultValue;
  }

  // 处理数组索引语法 variablePath[0]
  const pathWithIndex = variablePath.replace(/\[(\d+)\]/g, ".$1");
  const keys = pathWithIndex.split(".");
  
  let current = globalVariables;
  
  for (const key of keys) {
    if (current === null || current === undefined) {
      return defaultValue;
    }
    
    if (typeof current === "object" && key in current) {
      current = current[key];
    } else {
      return defaultValue;
    }
  }
  
  return current !== undefined ? current : defaultValue;
}

/**
 * setvar - 设置变量值
 * 兼容SillyTavern的setvar函数
 * @param variablePath 变量路径
 * @param value 要设置的值
 * @param scope 作用域 (global, local, message, cache)
 */
export function setvar(variablePath: string, value: any, scope: string = "global"): void {
  if (!variablePath || typeof variablePath !== "string") {
    return;
  }

  // 处理数组索引语法
  const pathWithIndex = variablePath.replace(/\[(\d+)\]/g, ".$1");
  const keys = pathWithIndex.split(".");
  const lastKey = keys.pop();
  
  if (!lastKey) return;
  
  // 根据作用域选择存储位置
  let current = scopedVariables[scope] || scopedVariables.global;
  
  // 记录旧值用于历史记录
  const oldValue = getvar(variablePath);
  
  // 创建嵌套对象路径
  for (const key of keys) {
    if (!(key in current) || typeof current[key] !== "object") {
      current[key] = {};
    }
    current = current[key];
  }
  
  current[lastKey] = value;
  
  // 记录变量变化
  recordVariableChange(variablePath, oldValue, value, "set");
  
  // 同时更新全局变量以保持兼容性
  if (scope === "global") {
    let globalCurrent = globalVariables;
    const globalKeys = pathWithIndex.split(".");
    const globalLastKey = globalKeys.pop();
    
    if (globalLastKey) {
      for (const key of globalKeys) {
        if (!(key in globalCurrent) || typeof globalCurrent[key] !== "object") {
          globalCurrent[key] = {};
        }
        globalCurrent = globalCurrent[key];
      }
      globalCurrent[globalLastKey] = value;
    }
  }
}

/**
 * getwi - 获取世界书信息
 * 兼容SillyTavern的getwi函数
 * @param keyOrIndex 世界书条目的键或索引
 * @param field 要获取的字段名
 * @returns 世界书条目的指定字段值
 */
export function getwi(keyOrIndex: string | number, field: string = "content"): string {
  if (!worldBookData || worldBookData.length === 0) {
    return "";
  }

  let entry: WorldBookEntry | undefined;

  if (typeof keyOrIndex === "number") {
    // 按索引获取
    entry = worldBookData[keyOrIndex];
  } else {
    // 按键或评论查找
    entry = worldBookData.find(e => 
      e.keys?.includes(keyOrIndex) || 
      e.comment === keyOrIndex,
    );
  }

  if (!entry) {
    return "";
  }

  switch (field.toLowerCase()) {
  case "content":
    return entry.content || "";
  case "comment":
    return entry.comment || "";
  case "keys":
    return entry.keys?.join(", ") || "";
  case "enabled":
    return entry.enabled !== false ? "true" : "false";
  case "constant":
    return entry.constant === true ? "true" : "false";
  case "position":
    return String(entry.position || 0);
  default:
    return entry.content || "";
  }
}

/**
 * getchr - 获取角色信息
 * 兼容SillyTavern的getchr函数
 * @param field 要获取的字段名
 * @returns 角色的指定字段值
 */
export function getchr(field: string = "name"): string {
  if (!characterData) {
    return "";
  }

  switch (field.toLowerCase()) {
  case "name":
    return characterData.name || "";
  case "description":
    return characterData.description || "";
  case "personality":
    return characterData.personality || "";
  case "scenario":
    return characterData.scenario || "";
  case "first_mes":
  case "first_message":
    return characterData.first_mes || "";
  case "mes_example":
  case "example_dialogue":
    return characterData.mes_example || "";
  case "creator_notes":
    return characterData.creator_notes || "";
  case "avatar":
    return characterData.avatar || "";
  default:
    return characterData.name || "";
  }
}

/**
 * getWorldInfo - 获取世界书信息的异步版本
 * 兼容某些SillyTavern模板中的异步调用
 * @param category 类别或标签
 * @param key 键值
 * @returns Promise<string>
 */
export async function getWorldInfo(category: string, key: string): Promise<string> {
  if (!worldBookData || worldBookData.length === 0) {
    return "";
  }

  // 首先尝试按评论查找
  let entry = worldBookData.find(e => e.comment === key);
  
  if (!entry) {
    // 然后尝试按键查找
    entry = worldBookData.find(e => e.keys?.includes(key));
  }
  
  if (!entry) {
    // 最后尝试按分类查找
    entry = worldBookData.find(e => 
      e.comment?.includes(category) || 
      e.keys?.some(k => k.includes(category)),
    );
  }

  return entry?.content || "";
}

/**
 * 获取对话历史
 * @param limit 限制返回的消息数量
 * @returns 对话历史数组
 */
export function getChatHistory(limit: number = 10): DialogueMessage[] {
  if (!chatHistoryData || chatHistoryData.length === 0) {
    return [];
  }
  
  return chatHistoryData.slice(-limit);
}

/**
 * 获取最后一条消息
 * @param role 角色类型 ('user' | 'assistant')
 * @returns 最后一条指定角色的消息
 */
export function getLastMessage(role?: "user" | "assistant"): string {
  if (!chatHistoryData || chatHistoryData.length === 0) {
    return "";
  }
  
  if (role) {
    const filtered = chatHistoryData.filter(msg => msg.role === role);
    return filtered.length > 0 ? filtered[filtered.length - 1].content : "";
  }
  
  return chatHistoryData[chatHistoryData.length - 1]?.content || "";
}

/**
 * 检查变量是否存在
 * @param variablePath 变量路径
 * @returns 是否存在
 */
export function hasvar(variablePath: string): boolean {
  return getvar(variablePath) !== undefined;
}

/**
 * 增加数值变量
 * @param variablePath 变量路径
 * @param increment 增量（默认为1）
 * @returns 新的值
 */
export function addvar(variablePath: string, increment: number = 1): number {
  const currentValue = getvar(variablePath, 0);
  const numValue = typeof currentValue === "number" ? currentValue : 0;
  const newValue = numValue + increment;
  setvar(variablePath, newValue);
  return newValue;
}

/**
 * 随机选择数组中的一个元素
 * @param array 数组
 * @returns 随机选择的元素
 */
export function randomChoice<T>(array: T[]): T | undefined {
  if (!Array.isArray(array) || array.length === 0) {
    return undefined;
  }
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * 生成随机整数
 * @param min 最小值
 * @param max 最大值
 * @returns 随机整数
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 格式化日期
 * @param date 日期对象或时间戳
 * @param format 格式字符串
 * @returns 格式化后的日期字符串
 */
export function formatDate(date?: Date | number, format?: string): string {
  const d = date ? new Date(date) : new Date();
  
  if (format) {
    return format
      .replace("YYYY", d.getFullYear().toString())
      .replace("MM", (d.getMonth() + 1).toString().padStart(2, "0"))
      .replace("DD", d.getDate().toString().padStart(2, "0"))
      .replace("HH", d.getHours().toString().padStart(2, "0"))
      .replace("mm", d.getMinutes().toString().padStart(2, "0"))
      .replace("ss", d.getSeconds().toString().padStart(2, "0"));
  }
  
  return d.toLocaleDateString();
}

/**
 * incvar - 递增变量值
 * @param variablePath 变量路径
 * @param increment 增量（默认为1）
 * @param scope 作用域
 * @returns 新的值
 */
export function incvar(variablePath: string, increment: number = 1, scope: string = "global"): number {
  const currentValue = getvar(variablePath, 0);
  const numValue = typeof currentValue === "number" ? currentValue : 0;
  const newValue = numValue + increment;
  setvar(variablePath, newValue, scope);
  return newValue;
}

/**
 * decvar - 递减变量值
 * @param variablePath 变量路径
 * @param decrement 递减量（默认为1）
 * @param scope 作用域
 * @returns 新的值
 */
export function decvar(variablePath: string, decrement: number = 1, scope: string = "global"): number {
  const currentValue = getvar(variablePath, 0);
  const numValue = typeof currentValue === "number" ? currentValue : 0;
  const newValue = numValue - decrement;
  setvar(variablePath, newValue, scope);
  return newValue;
}

/**
 * getCharaData - 获取原始角色数据
 * @returns 角色数据对象
 */
export function getCharaData(): CharacterData | null {
  return characterData;
}

/**
 * getWorldInfoData - 获取原始世界书数据
 * @returns 世界书数据数组
 */
export function getWorldInfoData(): WorldBookEntry[] {
  return worldBookData;
}

/**
 * getEnabledWorldInfoEntries - 获取启用的世界书条目
 * @returns 启用的世界书条目数组
 */
export function getEnabledWorldInfoEntries(): WorldBookEntry[] {
  return worldBookData.filter(entry => entry.enabled !== false);
}

/**
 * activateWorldInfo - 激活特定世界书条目
 * @param keyOrIndex 世界书条目的键或索引
 * @returns 是否成功激活
 */
export function activateWorldInfo(keyOrIndex: string | number): boolean {
  let entry: WorldBookEntry | undefined;

  if (typeof keyOrIndex === "number") {
    entry = worldBookData[keyOrIndex];
  } else {
    entry = worldBookData.find(e => 
      e.keys?.includes(keyOrIndex) || 
      e.comment === keyOrIndex,
    );
  }

  if (entry && !activatedWorldInfo.includes(entry)) {
    activatedWorldInfo.push(entry);
    return true;
  }

  return false;
}

/**
 * activewi - activateWorldInfo的别名
 */
export const activewi = activateWorldInfo;

/**
 * activateWorldInfoByKeywords - 通过关键词激活世界书条目
 * @param keywords 关键词数组
 * @returns 激活的条目数量
 */
export function activateWorldInfoByKeywords(keywords: string[]): number {
  let activatedCount = 0;

  for (const entry of worldBookData) {
    if (entry.enabled === false) continue;

    const hasMatchingKeyword = keywords.some(keyword => 
      entry.keys?.some(key => key.includes(keyword)) ||
      entry.comment?.includes(keyword) ||
      entry.content?.includes(keyword),
    );

    if (hasMatchingKeyword && !activatedWorldInfo.includes(entry)) {
      activatedWorldInfo.push(entry);
      activatedCount++;
    }
  }

  return activatedCount;
}

/**
 * print - 输出一个或多个字符串
 * @param args 要输出的字符串参数
 * @returns 连接后的字符串
 */
export function print(...args: any[]): string {
  return args.map(arg => String(arg)).join("");
}

/**
 * evalTemplate - 处理模板字符串
 * @param template 模板字符串
 * @param context 上下文对象
 * @returns 处理后的字符串
 */
export function evalTemplate(template: string, context: Record<string, any> = {}): string {
  // 简化的模板处理，实际应该调用EJS处理器
  try {
    // 这里应该调用EJS处理器，但为了避免循环依赖，暂时返回原字符串
    return template;
  } catch (error) {
    return template;
  }
}

/**
 * define - 定义全局变量或函数
 * @param name 变量名
 * @param value 变量值
 */
export function define(name: string, value: any): void {
  globalVariables[name] = value;
  scopedVariables.global[name] = value;
}

/**
 * execute - 执行命令（安全限制版本）
 * @param command 命令字符串
 * @returns 执行结果
 */
export function execute(command: string): string {
  // 出于安全考虑，不实际执行命令
  console.warn("execute() function is disabled for security reasons");
  return "";
}

/**
 * selectActivatedEntries - 过滤激活的世界书条目
 * @param filter 过滤函数
 * @returns 过滤后的条目数组
 */
export function selectActivatedEntries(filter?: (entry: WorldBookEntry) => boolean): WorldBookEntry[] {
  return filter ? activatedWorldInfo.filter(filter) : [...activatedWorldInfo];
}

/**
 * getChatMessage - 获取特定聊天消息内容
 * @param index 消息索引
 * @returns 消息内容
 */
export function getChatMessage(index: number): string {
  const message = chatHistoryData[index];
  return message?.content || "";
}

// 导出所有函数供EJS模板使用
export const sillyTavernFunctions = {
  getvar,
  setvar,
  getwi,
  getchr,
  getWorldInfo,
  getChatHistory,
  getLastMessage,
  hasvar,
  addvar,
  randomChoice,
  randomInt,
  formatDate,
  incvar,
  decvar,
  getCharaData,
  getWorldInfoData,
  getEnabledWorldInfoEntries,
  activateWorldInfo,
  activewi,
  activateWorldInfoByKeywords,
  print,
  evalTemplate,
  define,
  execute,
  selectActivatedEntries,
  getChatMessage,
};
