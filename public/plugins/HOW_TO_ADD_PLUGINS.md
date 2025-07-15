# 如何添加插件

## 简单的插件管理系统

插件系统现在使用手动管理的方式，通过 `plugin-registry.json` 文件来管理插件。

## 添加新插件

### 1. 创建插件目录
在 `public/plugins/` 目录下创建你的插件文件夹：
```
public/plugins/
├── my-plugin/
│   ├── manifest.json
│   └── main.js
└── plugin-registry.json
```

### 2. 创建插件文件

**manifest.json**
```json
{
  "id": "my-plugin",
  "name": "我的插件",
  "version": "1.0.0",
  "description": "插件描述",
  "author": "作者名",
  "main": "main.js",
  "category": "utility",
  "enabled": true
}
```

**main.js**
```javascript
// 插件主文件
module.exports = {
  onLoad: async (context) => {
    console.log('插件加载');
  },
  
  onMessage: async (message, context) => {
    // 处理消息
    return message;
  },
  
  onResponse: async (response, context) => {
    // 处理响应
    return response;
  }
};
```

### 3. 更新插件注册表

编辑 `public/plugins/plugin-registry.json` 文件：
```json
{
  "plugins": [
    "dialogue-stats",
    "my-plugin"
  ]
}
```

## 管理插件

### 启用/禁用插件
- 在 `plugin-registry.json` 的 `plugins` 数组中添加或删除插件ID
- 或者在插件的 `manifest.json` 中设置 `"enabled": false`

### 插件顺序
`plugin-registry.json` 中的顺序决定了插件的加载顺序

## 注意事项

- 插件ID必须是小写字母、数字和连字符
- 每个插件必须有 `manifest.json` 和 `main.js` 文件
- 插件目录名必须与 `manifest.json` 中的 `id` 字段一致
- 只有在 `plugin-registry.json` 中列出的插件才会被加载 