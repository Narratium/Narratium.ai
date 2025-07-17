import { DialogueMessage } from "@/lib/models/character-dialogue-model";
import { WorldBookEntry } from "@/lib/models/world-book-model";
import { CharacterData } from "@/lib/models/character-model";
import * as ejs from "ejs-browser";
import { 
  sillyTavernFunctions, 
  setSillyTavernContext,
  initializeDefaultVariables,
  initializeCustomVariables,
  getAllVariables,
  exportVariablesAsJSON,
  generateVariableReport,
  searchVariables,
  getVariableChangeHistory,
  clearVariableHistory,
} from "./sillyTavernFunctions";
import { SillyTavernRegexProcessor } from "./sillyTavernRegexProcessor";
import { MagVarUpdateIntegration } from "./magVarUpdateIntegration";

export interface EjsContext {
  user: string;
  char: string;
  username?: string;
  charName?: string;
  language: "en" | "zh";
  chatHistory: DialogueMessage[];
  worldBook?: WorldBookEntry[];
  customData?: Record<string, any>;
  // 常用的工具函数
  utils: {
    formatDate: (date?: Date) => string;
    randomChoice: <T>(array: T[]) => T;
    randomInt: (min: number, max: number) => number;
    capitalize: (str: string) => string;
    truncate: (str: string, length: number) => string;
  };
  // SillyTavern兼容函数
  getvar: (variablePath: string, defaultValue?: any) => any;
  setvar: (variablePath: string, value: any, scope?: string) => void;
  getwi: (keyOrIndex: string | number, field?: string) => string;
  getchr: (field?: string) => string;
  getWorldInfo: (category: string, key: string) => Promise<string>;
  getChatHistory: (limit?: number) => DialogueMessage[];
  getLastMessage: (role?: "user" | "assistant") => string;
  hasvar: (variablePath: string) => boolean;
  addvar: (variablePath: string, increment?: number) => number;
  incvar: (variablePath: string, increment?: number, scope?: string) => number;
  decvar: (variablePath: string, decrement?: number, scope?: string) => number;
  getCharaData: () => CharacterData | null;
  getWorldInfoData: () => WorldBookEntry[];
  getEnabledWorldInfoEntries: () => WorldBookEntry[];
  activateWorldInfo: (keyOrIndex: string | number) => boolean;
  activewi: (keyOrIndex: string | number) => boolean;
  activateWorldInfoByKeywords: (keywords: string[]) => number;
  print: (...args: any[]) => string;
  evalTemplate: (template: string, context?: Record<string, any>) => string;
  define: (name: string, value: any) => void;
  execute: (command: string) => string;
  selectActivatedEntries: (filter?: (entry: WorldBookEntry) => boolean) => WorldBookEntry[];
  getChatMessage: (index: number) => string;
  randomChoice: <T>(array: T[]) => T | undefined;
  randomInt: (min: number, max: number) => number;
  formatDate: (date?: Date | number, format?: string) => string;
  // 调试和查询函数
  getAllVariables: () => Record<string, any>;
  exportVariablesAsJSON: (prettify?: boolean) => string;
  generateVariableReport: () => string;
  searchVariables: (keyword: string, caseSensitive?: boolean) => Array<{path: string, value: any}>;
  getVariableChangeHistory: (limit?: number) => Array<{timestamp: string, path: string, oldValue: any, newValue: any, operation: string}>;
  clearVariableHistory: () => void;
  // MagVarUpdate 函数
  _: {
    set: (path: string, oldValue: any, newValue: any, reason?: string) => boolean;
  };
  // 游戏数据访问
  getGameData: () => any;
  initDefaults: (defaults: Record<string, any>) => void;
}

export class EjsProcessor {
  /**
   * 提取文本中已存在的变量（从setvar调用中提取）
   * @param text 文本内容
   * @returns 已存在的变量名数组
   */
  private static extractExistingVariables(text: string): string[] {
    const existingVars: string[] = [];
    const setvarRegex = /\{\{setvar::([^:]+)::[^}]+\}\}/g;
    
    let match;
    while ((match = setvarRegex.exec(text)) !== null) {
      existingVars.push(match[1].trim());
    }
    
    return existingVars;
  }

  /**
   * 处理 MagVarUpdate 风格的 _.set 命令
   * @param text 包含 _.set 命令的文本
   * @returns 处理后的文本
   */
  private static handleMagVarUpdateCommands(text: string): string {
    // 检查是否包含 _.set 命令
    if (text.includes("_.set(")) {
      console.log("[EJS] 检测到 MagVarUpdate 命令，开始处理...");
      return MagVarUpdateIntegration.processSetCommands(text);
    }
    return text;
  }

  /**
   * 智能变量初始化处理
   * @param text 原始文本
   * @param processedText 处理后的文本
   * @param customData 自定义数据
   * @returns 更新后的处理文本
   */
  private static handleSmartVariableInitialization(
    text: string,
    processedText: string,
    customData?: Record<string, any>,
  ): string {
    // 如果包含显式初始化指令，先执行
    if (text.includes("|初始化变量|") || text.includes("[InitVar]初始化变量")) {
      if (customData && Object.keys(customData).length > 0) {
        initializeCustomVariables(customData);
      } else {
        initializeDefaultVariables();
      }
    }
    
    // 检查并自动初始化缺失的变量
    const existingVars = this.extractExistingVariables(processedText);
    const uninitializedVars = SillyTavernRegexProcessor.findUninitializedVariables(
      processedText, 
      new Set(existingVars),
    );
    
    if (uninitializedVars.length > 0) {
      const missingInitScript = SillyTavernRegexProcessor.generateMissingVariableInitialization(uninitializedVars);
      processedText = missingInitScript + "\n" + processedText;
      
      // 将缺失的变量添加到上下文中
      const mergedCustomData = { ...customData };
      for (const varName of uninitializedVars) {
        const defaultValue = SillyTavernRegexProcessor.inferDefaultValue(varName);
        const varPath = varName.split(".");
        let current = mergedCustomData;
        for (let i = 0; i < varPath.length - 1; i++) {
          if (!current[varPath[i]]) current[varPath[i]] = {};
          current = current[varPath[i]];
        }
        current[varPath[varPath.length - 1]] = defaultValue;
      }
      
      initializeCustomVariables(mergedCustomData);
    }
    
    return processedText;
  }

  private static createSafeContext(
    language: "en" | "zh",
    username?: string,
    charName?: string,
    chatHistory: DialogueMessage[] = [],
    worldBook?: WorldBookEntry[],
    customData?: Record<string, any>,
    character?: CharacterData,
  ): EjsContext {
    const userReplacement = username ?? (language === "zh" ? "我" : "I");
    const charReplacement = charName ?? "";

    // 设置SillyTavern上下文
    setSillyTavernContext(
      customData || {},
      worldBook || [],
      character || null,
      chatHistory,
    );

    return {
      user: userReplacement,
      char: charReplacement,
      username,
      charName,
      language,
      chatHistory,
      worldBook,
      customData: customData || {},
      utils: {
        formatDate: (date?: Date) => {
          const d = date || new Date();
          return d.toLocaleDateString(language === "zh" ? "zh-CN" : "en-US");
        },
        randomChoice: <T>(array: T[]): T => {
          if (array.length === 0) throw new Error("Array is empty");
          return array[Math.floor(Math.random() * array.length)];
        },
        randomInt: (min: number, max: number): number => {
          return Math.floor(Math.random() * (max - min + 1)) + min;
        },
        capitalize: (str: string): string => {
          return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
        },
        truncate: (str: string, length: number): string => {
          return str.length > length ? str.substring(0, length) + "..." : str;
        },
      },
      // SillyTavern兼容函数
      ...sillyTavernFunctions,
      // 调试和查询函数
      getAllVariables,
      exportVariablesAsJSON,
      generateVariableReport,
      searchVariables,
      getVariableChangeHistory,
      clearVariableHistory,
      // MagVarUpdate 函数
      _: {
        set: (path: string, oldValue: any, newValue: any, reason?: string) => {
          return MagVarUpdateIntegration.set(path, oldValue, newValue, reason);
        },
      },
      // 游戏数据访问
      getGameData: () => MagVarUpdateIntegration.getGameDataSnapshot(),
      initDefaults: (defaults: Record<string, any>) => MagVarUpdateIntegration.initializeDefaults(defaults),
    };
  }

  static async renderTemplate(
    template: string,
    language: "en" | "zh",
    username?: string,
    charName?: string,
    chatHistory: DialogueMessage[] = [],
    worldBook?: WorldBookEntry[],
    customData?: Record<string, any>,
    character?: CharacterData,
  ): Promise<string> {
    try {
      // 创建安全的上下文
      const context = this.createSafeContext(
        language,
        username,
        charName,
        chatHistory,
        worldBook,
        customData,
        character,
      );

      // 配置EJS选项，确保安全性
      const options = {
        // 防止执行危险代码
        strict: true,
        // 转义输出以防止XSS
        escape: (str: string) => str,
        // 限制包含文件
        filename: undefined,
        // 禁用缓存以避免内存泄漏
        cache: false,
        // 自定义定界符
        delimiter: "%",
        // 禁用with语句
        _with: false,
        // 禁用包含功能
        includer: undefined,
      };

      // 使用ejs-browser的render方法
      const result = ejs.render(template, context, options);
      return result;
    } catch (error) {
      console.error("EJS template rendering error:", error);
      // 返回原始模板，添加错误信息
      return `[EJS Error: ${error instanceof Error ? error.message : "Unknown error"}]\n${template}`;
    }
  }

  static isEjsTemplate(text: string): boolean {
    // 检查是否包含EJS标记
    return text.includes("<%") && text.includes("%>");
  }

  static processText(
    text: string,
    language: "en" | "zh",
    username?: string,
    charName?: string,
    chatHistory: DialogueMessage[] = [],
    worldBook?: WorldBookEntry[],
    customData?: Record<string, any>,
    character?: CharacterData,
  ): string {
    // 预处理：处理所有变量相关语法（包括智能初始化）
    let processedText = SillyTavernRegexProcessor.processAllVariableSyntax(text, customData, worldBook);
    
    // 处理 MagVarUpdate 风格的 _.set 命令
    processedText = this.handleMagVarUpdateCommands(processedText);
    
    // 转换传统SillyTavern语法
    processedText = SillyTavernRegexProcessor.convertLegacySyntax(processedText);
    
    // 智能变量初始化处理
    processedText = this.handleSmartVariableInitialization(text, processedText, customData);
    
    // 如果不是EJS模板，直接返回原文
    if (!this.isEjsTemplate(processedText)) {
      return processedText;
    }

    // 创建安全的上下文
    const context = this.createSafeContext(
      language,
      username,
      charName,
      chatHistory,
      worldBook,
      customData,
      character,
    );

    try {
      // 配置EJS选项，确保安全性
      const options = {
        // 防止执行危险代码
        strict: true,
        // 转义输出以防止XSS
        escape: (str: string) => str,
        // 限制包含文件
        filename: undefined,
        // 禁用缓存以避免内存泄漏
        cache: false,
        // 自定义定界符
        delimiter: "%",
        // 禁用with语句
        _with: false,
        // 禁用包含功能
        includer: undefined,
      };

      // 使用ejs-browser的render方法
      const result = ejs.render(processedText, context, options);
      return result;
    } catch (error) {
      console.error("EJS template rendering error:", error);
      // 返回原始模板，添加错误信息
      return `[EJS Error: ${error instanceof Error ? error.message : "Unknown error"}]\n${processedText}`;
    }
  }

  static async processTextAsync(
    text: string,
    language: "en" | "zh",
    username?: string,
    charName?: string,
    chatHistory: DialogueMessage[] = [],
    worldBook?: WorldBookEntry[],
    customData?: Record<string, any>,
    character?: CharacterData,
  ): Promise<string> {
    // 预处理：处理所有变量相关语法（包括智能初始化）
    let processedText = SillyTavernRegexProcessor.processAllVariableSyntax(text, customData, worldBook);
    
    // 处理 MagVarUpdate 风格的 _.set 命令
    processedText = this.handleMagVarUpdateCommands(processedText);
    
    // 转换传统SillyTavern语法
    processedText = SillyTavernRegexProcessor.convertLegacySyntax(processedText);
    
    // 智能变量初始化处理
    processedText = this.handleSmartVariableInitialization(text, processedText, customData);
    
    // 如果不是EJS模板，直接返回原文
    if (!this.isEjsTemplate(processedText)) {
      return processedText;
    }

    // 创建安全的上下文
    const context = this.createSafeContext(
      language,
      username,
      charName,
      chatHistory,
      worldBook,
      customData,
      character,
    );

    try {
      // 配置EJS选项，支持异步
      const options = {
        // 防止执行危险代码
        strict: true,
        // 转义输出以防止XSS
        escape: (str: string) => str,
        // 限制包含文件
        filename: undefined,
        // 禁用缓存以避免内存泄漏
        cache: false,
        // 自定义定界符
        delimiter: "%",
        // 禁用with语句
        _with: false,
        // 禁用包含功能
        includer: undefined,
        // 支持异步函数
        async: true,
      };

      // 使用ejs-browser的render方法支持异步
      const result = ejs.render(processedText, context, options);
      return result;
    } catch (error) {
      console.error("EJS template rendering error:", error);
      // 返回原始模板，添加错误信息
      return `[EJS Error: ${error instanceof Error ? error.message : "Unknown error"}]\n${processedText}`;
    }
  }

  static batchProcessTexts(
    texts: string[],
    language: "en" | "zh",
    username?: string,
    charName?: string,
    chatHistory: DialogueMessage[] = [],
    worldBook?: WorldBookEntry[],
    customData?: Record<string, any>,
    character?: CharacterData,
  ): string[] {
    return texts.map(text => 
      this.processText(text, language, username, charName, chatHistory, worldBook, customData, character),
    );
  }

  static async batchProcessTextsAsync(
    texts: string[],
    language: "en" | "zh",
    username?: string,
    charName?: string,
    chatHistory: DialogueMessage[] = [],
    worldBook?: WorldBookEntry[],
    customData?: Record<string, any>,
    character?: CharacterData,
  ): Promise<string[]> {
    return Promise.all(
      texts.map(text => 
        this.processTextAsync(text, language, username, charName, chatHistory, worldBook, customData, character),
      ),
    );
  }

  static processWorldBookEntries(
    entries: WorldBookEntry[],
    language: "en" | "zh",
    username?: string,
    charName?: string,
    chatHistory: DialogueMessage[] = [],
    customData?: Record<string, any>,
    character?: CharacterData,
  ): WorldBookEntry[] {
    return entries.map(entry => {
      const processedEntry = { ...entry };
      
      // 处理内容
      if (processedEntry.content) {
        processedEntry.content = this.processText(
          processedEntry.content,
          language,
          username,
          charName,
          chatHistory,
          entries,
          customData,
          character,
        );
      }

      // 处理评论
      if (processedEntry.comment) {
        processedEntry.comment = this.processText(
          processedEntry.comment,
          language,
          username,
          charName,
          chatHistory,
          entries,
          customData,
          character,
        );
      }

      return processedEntry;
    });
  }
}
