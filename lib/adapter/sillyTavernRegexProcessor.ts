/**
 * SillyTavern正则处理器
 * 处理AI输出中的变量更新指令，转换为setvar调用
 */

export class SillyTavernRegexProcessor {
  /**
   * 处理变量更新的正则表达式
   * 匹配格式：@变量名=旧值⇒新值@ 或 @变量名=新值@
   */
  private static readonly VARIABLE_UPDATE_REGEX = /@(.*?)=(?:.*?⇒)?(.*?)@/g;

  /**
   * 处理变量初始化的正则表达式
   * 匹配格式：|初始化变量| 或 [InitVar]初始化变量
   */
  private static readonly VARIABLE_INIT_REGEX = /(\|初始化变量\||\[InitVar\]初始化变量)/g;

  /**
   * 处理UpdateVariable标签的正则表达式
   * 匹配格式：<UpdateVariable>...</UpdateVariable>
   */
  private static readonly UPDATE_VARIABLE_REGEX = /<UpdateVariable>([\s\S]*?)<\/UpdateVariable>/g;

  /**
   * 处理_.set()语法的正则表达式
   * 匹配格式：_.set('变量名', 旧值, 新值)
   */
  private static readonly SET_SYNTAX_REGEX = /_\.set\(\s*['"`]([^'"`]+)['"`]\s*,\s*([^,]+)\s*,\s*([^)]+)\s*\)/g;

  /**
   * 处理AI输出文本，将变量更新指令转换为setvar调用
   * @param text AI输出的文本
   * @returns 处理后的文本
   */
  static processVariableUpdates(text: string): string {
    // 处理变量更新指令
    let processedText = text.replace(
      this.VARIABLE_UPDATE_REGEX,
      (match, variableName, newValue) => {
        // 转换为setvar调用
        return `{{setvar::${variableName.trim()}::${newValue.trim()}}}`;
      },
    );

    // 处理变量初始化指令（已弃用，使用processAllVariableSyntax代替）
    processedText = processedText.replace(
      this.VARIABLE_INIT_REGEX,
      () => {
        // 返回提示信息，建议使用新的通用初始化方法
        return "<!-- 请使用processAllVariableSyntax方法进行变量初始化 -->";
      },
    );

    return processedText;
  }

  /**
   * 处理UpdateVariable标签，提取并转换其中的变量更新指令
   * @param text 包含UpdateVariable标签的文本
   * @returns 处理后的文本和提取的变量更新
   */
  static processUpdateVariable(text: string): { processedText: string; variableUpdates: string[] } {
    const variableUpdates: string[] = [];
    
    const processedText = text.replace(
      this.UPDATE_VARIABLE_REGEX,
      (match, content) => {
        let processedContent = "";
        
        // 提取并处理 @变量=值@ 格式的更新
        const updates = content.match(this.VARIABLE_UPDATE_REGEX) || [];
        for (const update of updates) {
          processedContent += this.processVariableUpdates(update) + "\n";
          variableUpdates.push(update);
        }
        
        // 提取并处理 _.set() 格式的更新
        const setUpdates = content.match(this.SET_SYNTAX_REGEX) || [];
        for (const setUpdate of setUpdates) {
          processedContent += this.processSetSyntax(setUpdate) + "\n";
          variableUpdates.push(setUpdate);
        }
        
        // 返回处理后的setvar调用而不是空字符串
        return processedContent.trim();
      },
    );
    
    return { processedText, variableUpdates };
  }

  /**
   * 处理_.set()语法，转换为setvar调用
   * @param text 包含_.set()语法的文本
   * @returns 处理后的文本
   */
  static processSetSyntax(text: string): string {
    return text.replace(
      this.SET_SYNTAX_REGEX,
      (match, variableName, oldValue, newValue) => {
        // 清理引号和trim
        const cleanValue = newValue.trim().replace(/^["'`]|["'`]$/g, "");
        return `{{setvar::${variableName.trim()}::${cleanValue}}}`;
      },
    );
  }

  /**
   * 综合处理所有变量相关的语法（通用化版本）
   * @param text 原始文本
   * @param customVariables 自定义初始化变量
   * @param worldBookEntries 世界书条目，用于自动提取变量定义
   * @returns 处理后的文本
   */
  static processAllVariableSyntax(
    text: string, 
    customVariables?: Record<string, any>,
    worldBookEntries?: any[],
  ): string {
    let processedText = text;
    
    // 1. 处理变量初始化指令（通用化处理）
    processedText = processedText.replace(
      this.VARIABLE_INIT_REGEX,
      () => {
        return this.getInitializationScript(customVariables, worldBookEntries);
      },
    );
    
    // 2. 处理UpdateVariable标签
    const { processedText: afterUpdateVariable } = this.processUpdateVariable(processedText);
    processedText = afterUpdateVariable;
    
    // 3. 处理_.set()语法
    processedText = this.processSetSyntax(processedText);
    
    // 4. 处理@变量=值@格式
    processedText = this.processVariableUpdates(processedText);
    
    // 5. 处理调试指令
    processedText = this.processDebugCommands(processedText);
    
    return processedText;
  }

  /**
   * 检查文本中是否存在未初始化的变量引用
   * @param text 文本内容
   * @param initializedVars 已初始化的变量列表
   * @returns 未初始化的变量列表
   */
  static findUninitializedVariables(text: string, initializedVars: Set<string> = new Set()): string[] {
    const uninitializedVars: string[] = [];
    const getvarRegex = /\{\{getvar::([^}]+)\}\}/g;
    const ejsGetvarRegex = /<%=\s*getvar\(\s*['"`]([^'"`]+)['"`]\s*(?:,\s*([^)]+))?\s*\)\s*%>/g;
    
    let match;
    
    // 检查{{getvar::变量名}}格式
    while ((match = getvarRegex.exec(text)) !== null) {
      const varName = match[1].trim();
      if (!initializedVars.has(varName)) {
        uninitializedVars.push(varName);
      }
    }
    
    // 检查<%=getvar('变量名')%>格式
    while ((match = ejsGetvarRegex.exec(text)) !== null) {
      const varName = match[1].trim();
      if (!initializedVars.has(varName)) {
        uninitializedVars.push(varName);
      }
    }
    
    return [...new Set(uninitializedVars)]; // 去重
  }

  /**
   * 自动生成缺失变量的初始化脚本
   * @param uninitializedVars 未初始化的变量列表
   * @returns 初始化脚本
   */
  static generateMissingVariableInitialization(uninitializedVars: string[]): string {
    if (uninitializedVars.length === 0) {
      return "";
    }
    
    const initScripts = ["<!-- 自动生成的缺失变量初始化 -->"];
    
    for (const varName of uninitializedVars) {
      const defaultValue = this.inferDefaultValue(varName);
      initScripts.push(`{{setvar::${varName}::${defaultValue}}}`);
    }
    
    return initScripts.join("\n");
  }

  /**
   * 生成变量调试模板
   * @param type 调试类型：'report' | 'json' | 'search' | 'history' | 'branch'
   * @param params 参数
   * @returns 调试模板代码
   */
  static generateDebugTemplate(type: "report" | "json" | "search" | "history" | "branch", params?: any): string {
    switch (type) {
    case "report":
      return "<%_ print('\\n' + generateVariableReport() + '\\n') _%>";
      
    case "json":
      const prettify = params?.prettify !== false;
      return `<%_ print('\\n' + exportVariablesAsJSON(${prettify}) + '\\n') _%>`;
      
    case "search":
      const keyword = params?.keyword || "变量";
      const caseSensitive = params?.caseSensitive || false;
      return `<%_
          const results = searchVariables('${keyword}', ${caseSensitive});
          print('\\n=== 搜索结果: "${keyword}" ===\\n');
          results.forEach(r => print(\`\${r.path}: \${r.value}\\n\`));
          print('\\n');
        _%>`;
      
    case "history":
      const limit = params?.limit || 10;
      return `<%_
          const history = getVariableChangeHistory(${limit});
          print('\\n=== 变量变化历史 (最近${limit}条) ===\\n');
          history.forEach(h => {
            print(\`[\${h.timestamp}] \${h.operation}: \${h.path}\\n\`);
            print(\`  \${h.oldValue} → \${h.newValue}\\n\`);
          });
          print('\\n');
        _%>`;
      
    case "branch":
      return `<%_
          // 显示分支变量状态信息
          print('\\n=== 分支变量状态信息 ===\\n');
          print('当前分支变量功能已启用\\n');
          print('- 创建新对话节点时自动保存变量状态\\n');
          print('- 切换分支时自动恢复对应的变量状态\\n');
          print('- 支持差异存储和完整快照两种模式\\n');
          print('- 提供变量状态验证和修复功能\\n');
          print('\\n配置信息：\\n');
          print('- 启用快照: 是\\n');
          print('- 启用差异存储: 是\\n');
          print('- 快照间隔: 每5个节点\\n');
          print('- 压缩阈值: 100个变化\\n');
          print('\\n使用说明：\\n');
          print('1. 在对话中修改变量后，切换到其他分支\\n');
          print('2. 变量会自动恢复到该分支的状态\\n');
          print('3. 返回原分支时，变量状态会恢复\\n');
          print('4. 使用 [DEBUG:branch:validate] 验证状态完整性\\n');
          print('\\n');
        _%>`;
      
    default:
      return "<!-- 未知调试类型 -->";
    }
  }

  /**
   * 处理调试指令
   * @param text 包含调试指令的文本
   * @returns 处理后的文本
   */
  static processDebugCommands(text: string): string {
    let processedText = text;
    
    // 处理 [DEBUG:report] 指令
    processedText = processedText.replace(
      /\[DEBUG:report\]/g,
      () => this.generateDebugTemplate("report"),
    );
    
    // 处理 [DEBUG:json] 指令
    processedText = processedText.replace(
      /\[DEBUG:json(?::pretty=(true|false))?\]/g,
      (match, prettify) => this.generateDebugTemplate("json", { prettify: prettify !== "false" }),
    );
    
    // 处理 [DEBUG:search:关键词] 指令
    processedText = processedText.replace(
      /\[DEBUG:search:([^\]]+)\]/g,
      (match, keyword) => this.generateDebugTemplate("search", { keyword: keyword.trim() }),
    );
    
    // 处理 [DEBUG:history:数量] 指令
    processedText = processedText.replace(
      /\[DEBUG:history(?::(\d+))?\]/g,
      (match, limitStr) => {
        const limit = limitStr ? parseInt(limitStr, 10) : 10;
        return this.generateDebugTemplate("history", { limit });
      },
    );
    
    // 处理 [DEBUG:branch] 指令
    processedText = processedText.replace(
      /\[DEBUG:branch\]/g,
      () => this.generateDebugTemplate("branch"),
    );
    
    return processedText;
  }

  /**
   * 获取变量初始化脚本（通用化处理）
   * @param variables 要初始化的变量对象
   * @param worldBookEntries 世界书条目，用于提取变量定义
   * @returns 初始化脚本
   */
  private static getInitializationScript(
    variables?: Record<string, any>, 
    worldBookEntries?: any[],
  ): string {
    const initScripts: string[] = ["<!-- 变量初始化 -->"];
    
    // 1. 如果提供了自定义变量，使用自定义变量
    if (variables && Object.keys(variables).length > 0) {
      const processedVars = this.extractVariablesFromObject(variables);
      initScripts.push(...processedVars);
    }
    
    // 2. 从世界书中提取变量定义
    if (worldBookEntries && worldBookEntries.length > 0) {
      const worldBookVars = this.extractVariablesFromWorldBook(worldBookEntries);
      initScripts.push(...worldBookVars);
    }
    
    // 3. 如果没有找到任何变量定义，返回提示
    if (initScripts.length === 1) {
      initScripts.push("<!-- 未找到变量定义，请在世界书或自定义数据中定义变量 -->");
    }
    
    return initScripts.join("\n");
  }

  /**
   * 从对象中提取变量并生成setvar调用
   */
  private static extractVariablesFromObject(obj: any, prefix: string = "变量"): string[] {
    const results: string[] = [];
    
    const processObject = (current: any, currentPrefix: string) => {
      for (const [key, value] of Object.entries(current)) {
        const fullKey = `${currentPrefix}.${key}`;
        
        if (value && typeof value === "object" && !Array.isArray(value)) {
          processObject(value, fullKey);
        } else {
          // 处理基本类型和数组
          const initValue = Array.isArray(value) ? (value[0] ?? 0) : value;
          results.push(`{{setvar::${fullKey}::${initValue}}}`);
        }
      }
    };
    
    processObject(obj, prefix);
    return results;
  }

  /**
   * 从世界书条目中提取变量定义
   * @param worldBookEntries 世界书条目数组
   * @returns setvar调用数组
   */
  private static extractVariablesFromWorldBook(worldBookEntries: any[]): string[] {
    const results: string[] = [];
    const variableRegex = /\{\{setvar::([^:]+)::([^}]+)\}\}/g;
    const getvarRegex = /\{\{getvar::([^}]+)\}\}/g;
    const ejsGetvarRegex = /<%=\s*getvar\(\s*['"`]([^'"`]+)['"`]\s*(?:,\s*([^)]+))?\s*\)\s*%>/g;
    
    for (const entry of worldBookEntries) {
      const content = entry.content || "";
      const comment = entry.comment || "";
      const fullText = `${content}\n${comment}`;
      
      // 1. 提取已有的setvar调用作为模板
      let match;
      while ((match = variableRegex.exec(fullText)) !== null) {
        const [, varName, value] = match;
        results.push(`{{setvar::${varName.trim()}::${value.trim()}}}`);
      }
      
      // 2. 从getvar调用中推断变量，设置默认值
      const getvarMatches = new Set<string>();
      
      // 提取{{getvar::变量名}}格式
      while ((match = getvarRegex.exec(fullText)) !== null) {
        getvarMatches.add(match[1].trim());
      }
      
      // 提取<%=getvar('变量名')%>格式
      while ((match = ejsGetvarRegex.exec(fullText)) !== null) {
        getvarMatches.add(match[1].trim());
      }
      
      // 为推断的变量生成默认初始化
      for (const varName of getvarMatches) {
        // 检查是否已经有setvar定义
        const alreadyDefined = results.some(r => r.includes(`::${varName}::`));
        if (!alreadyDefined) {
          // 根据变量名推断默认值
          const defaultValue = this.inferDefaultValue(varName);
          results.push(`{{setvar::${varName}::${defaultValue}}}`);
        }
      }
    }
    
    return results;
  }

  /**
   * 根据变量名推断默认值
   * @param varName 变量名
   * @returns 推断的默认值
   */
  static inferDefaultValue(varName: string): string | number {
    const lowerName = varName.toLowerCase();
    
    // 数值类型变量
    if (lowerName.includes("数量") || 
        lowerName.includes("count") || 
        lowerName.includes("天数") || 
        lowerName.includes("day") ||
        lowerName.includes("等级") || 
        lowerName.includes("level") ||
        lowerName.includes("经验") || 
        lowerName.includes("exp") ||
        lowerName.includes("亲密度") ||
        lowerName.includes("好感") ||
        lowerName.includes("阶段") ) {
      return 0;
    }
    
    // 布尔类型变量（用0/1表示）
    if (lowerName.includes("是否") || 
        lowerName.includes("已") ||
        lowerName.includes("has") ||
        lowerName.includes("is") ||
        lowerName.includes("拥有") ||
        lowerName.includes("完成")) {
      return 0;
    }
    
    // 时间相关变量
    if (lowerName.includes("时间") || 
        lowerName.includes("time") ||
        lowerName.includes("日期") ||
        lowerName.includes("date")) {
      return "上午";
    }
    
    // 位置相关变量
    if (lowerName.includes("位置") || 
        lowerName.includes("地点") ||
        lowerName.includes("location") ||
        lowerName.includes("place")) {
      return "未知位置";
    }
    
    // 状态相关变量
    if (lowerName.includes("状态") || 
        lowerName.includes("state") ||
        lowerName.includes("模式") ||
        lowerName.includes("mode")) {
      return "正常";
    }
    
    // 默认为空字符串
    return "";
  }

  /**
   * 获取自定义变量初始化脚本
   * @param variables 要初始化的变量对象
   */
  static getCustomInitializationScript(variables: Record<string, any>): string {
    const initScripts: string[] = ["<!-- 变量初始化 -->"];
    
    const processObject = (obj: any, prefix: string = "变量") => {
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = `${prefix}.${key}`;
        
        if (typeof value === "object" && value !== null && !Array.isArray(value)) {
          processObject(value, fullKey);
        } else {
          // 处理数组，只初始化第一个元素
          const initValue = Array.isArray(value) ? value[0] || 0 : value;
          initScripts.push(`{{setvar::${fullKey}::${initValue}}}`);
        }
      }
    };

    if (variables && Object.keys(variables).length > 0) {
      processObject(variables);
    } else {
      // 如果没有提供变量，使用默认初始化
      return "";
    }
    
    return initScripts.join("\n");
  }

  /**
   * 隐藏AI分析过程和变量更新过程
   * @param text 文本内容
   * @returns 处理后的文本
   */
  static hideAnalysisProcess(text: string): string {
    // 隐藏 <UpdateVariable> 标签内的内容
    let processedText = text.replace(
      /<UpdateVariable>[\s\S]*?<\/UpdateVariable>/g,
      "",
    );

    // 隐藏 <Analysis> 标签内的内容
    processedText = processedText.replace(
      /<Analysis>[\s\S]*?<\/Analysis>/g,
      "",
    );

    return processedText;
  }

  /**
   * 转换传统SillyTavern语法到我们的EJS语法
   * @param text 包含传统语法的文本
   * @returns 转换后的文本
   */
  static convertLegacySyntax(text: string): string {
    // 转换 {{getvar::变量名}} 到 getvar('变量名')
    let processedText = text.replace(
      /\{\{getvar::([^}]+)\}\}/g,
      (match, variableName) => {
        return `<%= getvar('${variableName.trim()}') %>`;
      },
    );

    // 转换 {{setvar::变量名::值}} 到 setvar('变量名', '值')
    processedText = processedText.replace(
      /\{\{setvar::([^:]+)::([^}]+)\}\}/g,
      (match, variableName, value) => {
        return `<%_ setvar('${variableName.trim()}', '${value.trim()}') _%>`;
      },
    );

    return processedText;
  }

  /**
   * 生成YAML格式的变量定义模板
   * @param variables 变量定义对象
   * @returns YAML格式的字符串
   */
  static generateVariableDefinitionYAML(variables: Record<string, any>): string {
    const yamlLines: string[] = [];
    
    const processObject = (obj: any, prefix: string = "") => {
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        
        if (typeof value === "object" && value !== null) {
          yamlLines.push(`${key}:`);
          processObject(value, fullKey);
        } else {
          yamlLines.push(`  ${key}: '{{getvar::变量.${fullKey}}}'`);
        }
      }
    };

    processObject(variables);
    return yamlLines.join("\n");
  }

  /**
   * 生成Check List格式的更新规则
   * @param rules 更新规则数组
   * @returns 格式化的Check List
   */
  static generateCheckList(rules: string[]): string {
    const checkList = rules.map(rule => `  - ${rule}`).join("\n");
    return `check list:\n${checkList}`;
  }
 
}

export default SillyTavernRegexProcessor;
