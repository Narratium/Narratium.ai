# EJS在Narratium.ai项目中的使用指南

## 概述

Narratium.ai项目集成了EJS模板引擎，用于处理动态文本生成和变量管理。本系统兼容SillyTavern的语法，同时提供了更强大的EJS功能。

## 项目架构

### 核心文件

1. **`lib/adapter/ejsProcessor.ts`** - EJS处理器主文件
2. **`lib/adapter/sillyTavernFunctions.ts`** - SillyTavern兼容函数库
3. **`lib/adapter/sillyTavernRegexProcessor.ts`** - 正则表达式处理器
4. **`types/ejs-browser.d.ts`** - EJS TypeScript类型定义

### 集成位置

- **`lib/adapter/tagReplacer.ts`** - 文本适配器，集成了EJS处理
- **`lib/core/prompt-assembler.ts`** - 提示词组装器，支持EJS上下文

## EJS语法支持

### 基本语法

```ejs
<!-- 输出表达式 -->
<%= 变量或表达式 %>

<!-- 执行JavaScript代码（不输出） -->
<%_ JavaScript代码 _%>

<!-- 注释 -->
<%# 这是注释 %>
```

### 变量操作

#### 获取变量
```ejs
<!-- EJS方式 -->
<%= getvar('变量.路径') %>
<%= getvar('变量.路径', '默认值') %>

<!-- 传统SillyTavern方式（会自动转换为EJS） -->
{{getvar::变量.路径}}
```

#### 设置变量
```ejs
<!-- EJS方式 -->
<%_ setvar('变量.路径', '新值') _%>
<%_ setvar('变量.路径', '新值', 'global') _%>

<!-- MagVarUpdate方式 -->
<%_ _.set('变量.路径', oldValue, newValue, '变更原因') _%>

<!-- 传统SillyTavern方式（会自动转换为EJS） -->
{{setvar::变量.路径::新值}}
```

#### 数值操作
```ejs
<!-- 增加变量值 -->
<%_ incvar('变量.亲密度', 5) _%>

<!-- 减少变量值 -->
<%_ decvar('变量.亲密度', 2) _%>

<!-- 检查变量是否存在 -->
<% if (hasvar('变量.状态')) { %>
  变量存在！
<% } %>
```

### 条件判断和循环

```ejs
<!-- 条件判断 -->
<% if (getvar('变量.亲密度', 0) > 50) { %>
  关系很好！
<% } else { %>
  还需要增进感情。
<% } %>

<!-- 循环 -->
<% for (let i = 0; i < 3; i++) { %>
  重复内容 <%= i + 1 %>
<% } %>

<!-- 遍历数组 -->
<% chatHistory.slice(-3).forEach(msg => { %>
  <%= msg.content %>
<% }) %>
```

### 内置工具函数

```ejs
<!-- 随机选择 -->
<%= randomChoice(['选项1', '选项2', '选项3']) %>

<!-- 随机数字 -->
<%= randomInt(1, 100) %>

<!-- 日期格式化 -->
<%= formatDate() %>
<%= formatDate(new Date(), 'YYYY-MM-DD HH:mm') %>

<!-- 字符串处理 -->
<%= utils.capitalize('hello world') %>
<%= utils.truncate('很长的文本...', 10) %>
```

## 变量管理系统

### 变量作用域

系统支持多种变量作用域：
- `global` - 全局变量（默认）
- `local` - 本地变量
- `message` - 消息级变量
- `cache` - 缓存变量

```ejs
<%_ setvar('临时.状态', '激活', 'local') _%>
<%_ setvar('缓存.计数', 1, 'cache') _%>
```

### 变量初始化

#### 自动初始化
```ejs
<!-- 系统会自动检测并初始化未定义的变量 -->
<%= getvar('变量.新属性') %> <!-- 如果不存在会自动初始化为默认值 -->
```

#### 手动初始化
```ejs
<!-- 在模板开头初始化变量 -->
<%_ initializeDefaultVariables() _%>

<!-- 或使用自定义初始化 -->
<%_ initializeCustomVariables({
  变量: {
    角色: { 亲密度: 0, 好感度: 50 },
    世界: { 时间: '上午', 地点: '学校' }
  }
}) _%>
```

### 智能变量推断

系统根据变量名自动推断合适的默认值：

- **数值型**：`亲密度`、`等级`、`天数` → 默认值：0
- **布尔型**：`是否`、`已完成`、`拥有` → 默认值：0（表示false）
- **时间型**：`时间`、`阶段` → 默认值："上午"
- **位置型**：`地点`、`位置` → 默认值："未知位置"
- **状态型**：`状态`、`模式` → 默认值："正常"

## 世界书（WorldBook）集成

### 获取世界书信息

```ejs
<!-- 获取世界书条目内容 -->
<%= getwi('条目键名') %>
<%= getwi(0, 'content') %> <!-- 按索引获取 -->
<%= getwi('键名', 'comment') %> <!-- 获取评论 -->

<!-- 异步获取世界书信息 -->
<%- await getWorldInfo('分类', '键名') %>
```

### 激活世界书条目

```ejs
<!-- 激活特定条目 -->
<%_ activateWorldInfo('重要事件') _%>
<%_ activewi(0) _%> <!-- 别名 -->

<!-- 按关键词激活多个条目 -->
<%_ activateWorldInfoByKeywords(['战斗', '魔法']) _%>

<!-- 获取激活的条目 -->
<% getEnabledWorldInfoEntries().forEach(entry => { %>
  激活的条目：<%= entry.comment %>
<% }) %>
```

## 对话历史处理

```ejs
<!-- 获取最近几条消息 -->
<% getChatHistory(5).forEach(msg => { %>
  <strong><%= msg.role %>:</strong> <%= msg.content %>
<% }) %>

<!-- 获取最后一条用户消息 -->
<%= getLastMessage('user') %>

<!-- 获取特定索引的消息 -->
<%= getChatMessage(-1) %> <!-- 最后一条消息 -->
```

## 调试功能

### 变量状态报告

```ejs
<!-- 生成完整的变量状态报告 -->
<%_ print(generateVariableReport()) _%>

<!-- 导出变量为JSON -->
<%_ print(exportVariablesAsJSON(true)) _%>

<!-- 搜索变量 -->
<%_ 
const results = searchVariables('亲密度');
results.forEach(r => print(`${r.path}: ${r.value}\n`));
_%>
```

### 调试指令

在文本中使用以下调试指令：

```text
[DEBUG:report] - 显示变量状态报告
[DEBUG:json] - 导出变量为JSON
[DEBUG:search:关键词] - 搜索包含关键词的变量
[DEBUG:history:10] - 显示最近10条变量变化历史
```

### 变量变化追踪

```ejs
<!-- 查看变量变化历史 -->
<%_ 
const history = getVariableChangeHistory(5);
history.forEach(h => {
  print(`[${h.timestamp}] ${h.operation}: ${h.path}\n`);
  print(`  ${h.oldValue} → ${h.newValue}\n`);
});
_%>

<!-- 清空变化历史 -->
<%_ clearVariableHistory() _%>
```

## 安全配置

EJS处理器配置了以下安全措施：

```typescript
const options = {
  strict: true,          // 严格模式
  escape: (str) => str,  // 防止XSS
  cache: false,          // 禁用缓存
  _with: false,          // 禁用with语句
  includer: undefined,   // 禁用文件包含
};
```

## 错误处理

当EJS模板出现错误时，系统会：

1. 在控制台输出详细错误信息
2. 返回包含错误信息的原始模板
3. 不会中断整个应用程序

```text
[EJS Error: 具体错误信息]
原始模板内容...
```

## 兼容性说明

### SillyTavern语法转换

系统自动转换传统SillyTavern语法为EJS语法：

```text
{{getvar::变量名}} → <%= getvar('变量名') %>
{{setvar::变量名::值}} → <%_ setvar('变量名', '值') _%>
```

### 变量更新指令处理

支持多种变量更新格式：

```text
@变量名=新值@ → {{setvar::变量名::新值}}
@变量名=旧值⇒新值@ → {{setvar::变量名::新值}}
_.set('变量名', 旧值, 新值) → {{setvar::变量名::新值}}
_.set('变量名', 旧值, 新值, '原因') → {{setvar::变量名::新值}}
```

## 最佳实践

### 1. 变量命名规范
```ejs
<!-- 推荐：使用点号分隔的层级结构 -->
<%= getvar('变量.角色.亲密度') %>
<%= getvar('变量.世界.当前时间') %>

<!-- 避免：扁平化命名 -->
<%= getvar('角色亲密度') %>
```

### 2. 初始化管理
```ejs
<!-- 在模板开头统一初始化 -->
<%_ if (!hasvar('变量.角色.亲密度')) {
  setvar('变量.角色.亲密度', 0);
} _%>
```

### 3. 条件渲染
```ejs
<!-- 使用条件渲染避免重复 -->
<% const intimacy = getvar('变量.角色.亲密度', 0); %>
<% if (intimacy > 80) { %>
  <%= randomChoice(['亲密的称呼1', '亲密的称呼2']) %>
<% } else if (intimacy > 40) { %>
  <%= randomChoice(['友好的称呼1', '友好的称呼2']) %>
<% } else { %>
  <%= randomChoice(['普通的称呼1', '普通的称呼2']) %>
<% } %>
```

### 4. 性能优化
```ejs
<!-- 缓存频繁使用的值 -->
<% const userName = user || '我'; %>
<% const charName = char || '角色'; %>

<!-- 批量处理变量更新 -->
<%_ 
setvar('变量.角色.亲密度', intimacy + 5);
setvar('变量.世界.当前时间', '下午');
setvar('变量.角色.心情', '开心');
_%>
```

## 常见问题

### Q: 为什么变量没有保存？
A: 确保使用`setvar()`函数，并检查变量路径是否正确。

### Q: 如何在不同分支间保持变量状态？
A: 系统内置了分支变量管理，会自动处理变量状态的保存和恢复。

### Q: 如何调试变量问题？
A: 使用调试指令如`[DEBUG:report]`或在EJS中调用`generateVariableReport()`。

### Q: 性能如何优化？
A: 避免在循环中频繁调用`getvar()`，可以先缓存变量值。

## MagVarUpdate 增强功能

### _.set 语法支持

Narrativium.ai 集成了 MagVarUpdate 的核心功能，提供更强大的变量管理能力。

#### 基本语法
```javascript
// 基本格式
_.set('变量路径', 期望的旧值, 新值, '变更原因');

// 示例
_.set('user.身份', '未知', '新来的牧师', '故事开始设定');
_.set('理.好感度', 0, 15, '初始关系值');
_.set('user.level', undefined, 1, '角色初始化');
```

#### 类型智能转换
```javascript
// 字符串和数字自动转换
_.set('user.level', '1', 2, '等级提升');  // 自动处理类型转换

// 数组操作
_.set('user.inventory', [], ['sword', 'potion'], '获得初始装备');

// 对象操作
_.set('user.stats', {}, { hp: 100, mp: 50 }, '初始化属性');
```

#### 在EJS模板中使用
```ejs
<!-- 条件变量更新 -->
<% if (getvar('user.exp', 0) >= 1000) { %>
  <%_ _.set('user.level', getvar('user.level'), getvar('user.level') + 1, '经验满足升级') _%>
  <%_ _.set('user.exp', getvar('user.exp'), 0, '升级后经验清零') _%>
  
  *你感到一股力量涌入体内，等级提升到了 <%= getvar('user.level') %> 级！*
<% } %>

<!-- 动态属性修改 -->
<% const damage = randomInt(10, 20); %>
<%_ _.set('enemy.hp', getvar('enemy.hp', 100), getvar('enemy.hp', 100) - damage, `受到${damage}点伤害`) _%>

敌人受到了 <%= damage %> 点伤害，剩余生命值：<%= getvar('enemy.hp') %>
```

#### 角色卡中的初始化
```ejs
<!-- 角色属性初始化 -->
<% if (!getvar('user.initialized')) { %>
  <%_ _.set('user.initialized', false, true, '角色初始化标记') _%>
  <%_ _.set('user.身份', undefined, '冒险者', '默认职业') _%>
  <%_ _.set('user.level', undefined, 1, '初始等级') _%>
  <%_ _.set('user.hp', undefined, 100, '初始生命值') _%>
  <%_ _.set('user.maxHp', undefined, 100, '最大生命值') _%>
  <%_ _.set('user.mp', undefined, 50, '初始魔法值') _%>
  <%_ _.set('user.maxMp', undefined, 50, '最大魔法值') _%>
  <%_ _.set('user.exp', undefined, 0, '初始经验值') _%>
  <%_ _.set('user.inventory', undefined, [], '初始背包') _%>
  
  *系统已为你初始化角色属性*
<% } %>

你是一名<%=getvar('user.身份', '冒险者')%>，当前等级<%=getvar('user.level', 1)%>。

当前状态：
- 生命值：<%=getvar('user.hp', 100)%>/<%=getvar('user.maxHp', 100)%>
- 魔法值：<%=getvar('user.mp', 50)%>/<%=getvar('user.maxMp', 50)%>
- 经验值：<%=getvar('user.exp', 0)%>/1000
```

#### WorldBook中的动态事件
```ejs
<!-- 关键词：商店购买 -->
<% const itemPrice = 50; %>
<% const userGold = getvar('user.gold', 100); %>

欢迎来到武器商店！

<% if (userGold >= itemPrice) { %>
  <%_ _.set('user.gold', userGold, userGold - itemPrice, '购买钢铁剑') _%>
  <%_ 
  const inventory = getvar('user.inventory', []);
  inventory.push({ name: '钢铁剑', attack: 25, type: 'weapon' });
  _.set('user.inventory', getvar('user.inventory', []), inventory, '获得钢铁剑');
  _%>
  
  *你花费了 <%= itemPrice %> 金币购买了钢铁剑！*
  *当前金币：<%= getvar('user.gold') %>*
<% } else { %>
  *你的金币不足，需要 <%= itemPrice %> 金币才能购买钢铁剑。*
  *当前金币：<%= userGold %>*
<% } %>
```

#### 高级功能：状态机管理
```ejs
<!-- 游戏状态管理 -->
<%
const gameState = getvar('game.state', 'start');
const userLevel = getvar('user.level', 1);

switch(gameState) {
  case 'start':
    if (userLevel >= 5) {
%>
      <%_ _.set('game.state', 'start', 'chapter1', '达到等级要求，进入第一章') _%>
      <%_ _.set('user.title', getvar('user.title', '无名冒险者'), '初级冒险者', '获得新称号') _%>
      
      *随着实力的增长，你感受到了来自远方的神秘召唤...*
      *你获得了新称号：初级冒险者*
<%  } 
    break;
    
  case 'chapter1':
    if (getvar('story.dragon_defeated')) {
%>
      <%_ _.set('game.state', 'chapter1', 'chapter2', '击败巨龙，进入第二章') _%>
      <%_ _.set('user.title', getvar('user.title'), '屠龙者', '获得屠龙者称号') _%>
      
      *你成功击败了巨龙，成为了传说中的屠龙者！*
<%  }
    break;
}
%>

当前游戏状态：<%= gameState %>
你的称号：<%= getvar('user.title', '无名冒险者') %>
```

#### 事件监听和回调
```ejs
<!-- 生命值监控 -->
<%
const currentHp = getvar('user.hp', 100);
const maxHp = getvar('user.maxHp', 100);
const hpPercentage = (currentHp / maxHp) * 100;

if (hpPercentage <= 20 && !getvar('status.low_hp_warning')) {
%>
  <%_ _.set('status.low_hp_warning', false, true, '生命值过低警告') _%>
  
  *⚠️ 警告：你的生命力正在急速流失，需要立即治疗！*
<% } else if (hpPercentage > 50 && getvar('status.low_hp_warning')) { %>
  <%_ _.set('status.low_hp_warning', true, false, '生命值恢复正常') _%>
  
  *✅ 你的生命力已经恢复到安全水平。*
<% } %>
```

### 游戏数据管理

#### 获取完整游戏数据
```ejs
<!-- 查看所有游戏数据 -->
当前游戏数据：
<pre><%=JSON.stringify(getGameData(), null, 2)%></pre>

<!-- 初始化默认值 -->
<%_ initDefaults({
  'user.hp': 100,
  'user.maxHp': 100,
  'user.level': 1,
  'user.exp': 0,
  'game.state': 'start'
}) _%>
```

#### 调试和监控
```ejs
<!-- 变量搜索 -->
查找包含"user"的变量：
<pre><%=JSON.stringify(searchVariables('user'), null, 2)%></pre>

<!-- 变量变化历史 -->
最近的变量变化：
<pre><%=JSON.stringify(getVariableChangeHistory(5), null, 2)%></pre>
```

### 分支管理增强

MagVarUpdate 功能完全集成到分支管理系统中：

- ✅ **自动保存**：_.set 操作会自动保存到当前对话节点
- ✅ **分支恢复**：切换分支时自动恢复 MagVarUpdate 数据
- ✅ **状态验证**：自动验证变量状态完整性
- ✅ **事件追踪**：记录所有变量变化的详细历史

### 最佳实践

#### 1. 命名规范
```javascript
// 推荐：使用有意义的命名空间
_.set('user.属性', oldValue, newValue, '变更原因');
_.set('npc.角色名.好感度', oldValue, newValue, '交互影响');
_.set('world.地点.状态', oldValue, newValue, '环境变化');
_.set('game.系统变量', oldValue, newValue, '游戏逻辑');

// 避免：扁平化命名
_.set('用户等级', oldValue, newValue); // 不推荐
```

#### 2. 变更原因记录
```javascript
// 推荐：提供清晰的变更原因
_.set('user.exp', currentExp, currentExp + 100, '击败哥布林获得经验');
_.set('npc.艾莉娅.好感度', oldValue, newValue, '帮助完成任务');

// 避免：没有原因或原因不明确
_.set('user.exp', currentExp, newValue); // 没有原因
_.set('user.exp', currentExp, newValue, '更新'); // 原因不明确
```

#### 3. 类型一致性
```javascript
// 推荐：保持类型一致
_.set('user.level', 1, 2, '等级提升'); // 数字到数字
_.set('user.name', 'old_name', 'new_name', '改名'); // 字符串到字符串

// 注意：系统会自动处理类型转换，但最好保持一致
_.set('user.level', '1', 2, '等级提升'); // 可以工作，但不推荐
```

## 更新日志

- **v1.0** - 基础EJS集成和SillyTavern兼容
- **v1.1** - 增加智能变量初始化和调试功能
- **v1.2** - 添加分支变量管理和性能优化
- **v1.3** - 完善错误处理和安全配置
- **v1.4** - 集成MagVarUpdate功能，添加_.set语法和事件系统