/**
 * Dialogue Statistics Plugin - 对话统计插件
 * 
 * 中文 (Chinese):
 * 专注于对话内容统计分析，提供实时的字数、Token用量、响应时间等统计信息
 * - 直接统计AI响应的完整内容字数
 * - 实时显示总字数、Token使用情况和响应时间
 * - 支持中文字符统计，适合中文对话场景
 * 
 * English:
 * Focused on dialogue content statistics and analysis with real-time metrics
 * - Directly counts total characters in AI responses
 * - Real-time display of total characters, token usage, and response time
 * - Supports Chinese character counting, optimized for Chinese dialogue scenarios
 * 
 * Compatible with Narratium.ai plugin system
 */

// Plugin state
let pluginContext = null;
let isEnabled = false;

// Message statistics tracking
let messageStats = {
  startTime: null,
  messageCount: 0,
  totalTokens: 0,
  totalCharacters: 0,
};

// 存储最新的token usage信息
let latestTokenUsage = null;

// 监听token usage事件
if (typeof window !== "undefined") {
  window.addEventListener("llm-token-usage", (event) => {
    latestTokenUsage = event.detail.tokenUsage;
    console.log("📊 Plugin received token usage event:", latestTokenUsage);
  });
}

// UI helper functions

/**
 * Insert statistics notification into the chat interface
 */
function insertStatsText(stats) {
  try {
    // Find the button container (三个按钮的容器)
    const buttonContainer = document.querySelector("div.flex.justify-start.gap-1\\.5") ||
                           document.querySelector("div.flex.gap-1\\.5") ||
                           document.querySelector("div[class*='flex'][class*='gap-1.5']");
    
    if (!buttonContainer) {
      console.warn("📊 Dialogue Stats: Could not find button container");
      return;
    }
    
    // Remove existing stats text
    const existingStats = document.getElementById("dialogue-stats-text");
    if (existingStats) {
      existingStats.remove();
    }
    
    // Create stats text element
    const statsText = document.createElement("p");
    statsText.id = "dialogue-stats-text";
    statsText.style.cssText = `
      margin-top: 8px;
      margin-bottom: 0;
      font-size: 11px;
      color: #a18d6f;
      text-align: left;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 100%;
      word-wrap: break-word;
    `;
    
    // Format time display
    const formatTime = (ms) => {
      if (ms < 1000) return `${ms}ms`;
      if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
      return `${(ms / 60000).toFixed(1)}m`;
    };
    
    // Format number display  
    const formatNumber = (num) => {
      if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
      if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
      return num.toString();
    };
    
    // Create simplified stats content
    const { tokenUsage, totalCharCount } = stats;
    statsText.innerHTML = `
      📊 消息 #${stats.messageNumber} | 响应时间: ${formatTime(stats.responseTime)} | 
      总字数: ${formatNumber(totalCharCount)} | 
      Token: ${formatNumber(tokenUsage.total_tokens)} (输入: ${formatNumber(tokenUsage.prompt_tokens)}, 输出: ${formatNumber(tokenUsage.completion_tokens)}) | 
      累计Token: ${formatNumber(stats.totalTokens)}
    `;
    
    // Insert after button container
    buttonContainer.parentNode.insertBefore(statsText, buttonContainer.nextSibling);
    
    console.log("✅ Dialogue Stats: Stats text inserted under buttons");
    
  } catch (error) {
    console.error("❌ Dialogue Stats: Failed to insert stats text:", error);
  }
}

// Lifecycle hooks

/**
 * Called when plugin is first loaded
 */
async function onLoad(context) {
  console.log("📊 Dialogue Stats Plugin loaded");
  pluginContext = context;
  
  // 注册事件监听器
  if (typeof window !== "undefined") {
    window.addEventListener("llm-token-usage", (event) => {
      latestTokenUsage = event.detail.tokenUsage;
      console.log("📊 Plugin received token usage event:", latestTokenUsage);
    });
  }
  
  try {
    console.log("✅ Dialogue Statistics plugin loaded successfully");
  } catch (error) {
    console.error("❌ Failed to load Dialogue Statistics plugin:", error);
    throw error;
  }
}

/**
 * Called when plugin is enabled
 */
async function onEnable(context) {
  console.log("📊 Dialogue Statistics plugin enabling...");
  isEnabled = true;
  
  console.log("✅ Dialogue Statistics plugin enabled");
}

/**
 * Called when plugin is disabled
 */
async function onDisable(context) {
  console.log("📊 Dialogue Statistics plugin disabling...");
  isEnabled = false;
  
  // Reset message statistics
  messageStats = {
    startTime: null,
    messageCount: 0,
    totalTokens: 0,
    totalCharacters: 0,
  };
  
  // Remove existing stats text
  const existingStats = document.getElementById("dialogue-stats-text");
  if (existingStats) {
    existingStats.remove();
  }
  
  console.log("✅ Dialogue Statistics plugin disabled");
}

/**
 * Called when user sends a message
 */
async function onMessage(message, context) {
  if (!isEnabled) {
    return message;
  }
  
  // Record start time for response measurement
  messageStats.startTime = Date.now();
  messageStats.messageCount++;
  
  // Log message for debugging
  console.log("📝 Dialogue Stats: Message received:", message.content.substring(0, 100) + "...");
  
  return message;
}

/**
 * Called when AI assistant responds
 */
async function onResponse(message, context) {
  if (!isEnabled) {
    return message;
  }
  
  // Calculate response statistics
  const endTime = Date.now();
  const responseTime = messageStats.startTime ? endTime - messageStats.startTime : 0;
  
  // Get complete response content and calculate total character count
  const content = message.content || "";
  const totalCharCount = content.length;
  
  // Get real token usage from API response
  let realTokenUsage = null;
  
  // 尝试从多种来源获取token使用信息
  if (latestTokenUsage) {
    realTokenUsage = latestTokenUsage;
    messageStats.totalTokens += realTokenUsage.total_tokens;
    console.log("📊 Using real token usage from event:", realTokenUsage);
    latestTokenUsage = null; // 清理已使用的token usage
  } else if (window.lastTokenUsage) {
    realTokenUsage = window.lastTokenUsage;
    messageStats.totalTokens += realTokenUsage.total_tokens;
    console.log("📊 Using real token usage from API:", realTokenUsage);
    window.lastTokenUsage = null; // 清理已使用的token usage
  } else if (message.tokenUsage) {
    realTokenUsage = message.tokenUsage;
    messageStats.totalTokens += realTokenUsage.total_tokens;
    console.log("📊 Using token usage from message:", realTokenUsage);
  } else if (context && context.tokenUsage) {
    realTokenUsage = context.tokenUsage;
    messageStats.totalTokens += realTokenUsage.total_tokens;
    console.log("📊 Using token usage from context:", realTokenUsage);
  } else {
    // Fallback to estimation if no real data available
    const estimatedTokens = Math.ceil(totalCharCount / 4);
    realTokenUsage = {
      prompt_tokens: Math.ceil(estimatedTokens * 0.7),
      completion_tokens: Math.ceil(estimatedTokens * 0.3),
      total_tokens: estimatedTokens,
    };
    messageStats.totalTokens += realTokenUsage.total_tokens;
    console.log("📊 Using estimated token usage (no real data available):", realTokenUsage);
  }
  
  // Update cumulative stats
  messageStats.totalCharacters += totalCharCount;
  
  // Log response for debugging
  console.log("📊 Dialogue Stats: Response received:", content.substring(0, 100) + "...");
  console.log("📊 Response Stats:", {
    responseTime: responseTime + "ms",
    totalCharacters: totalCharCount,
    tokenUsage: realTokenUsage,
    totalMessages: messageStats.messageCount,
  });
  
  // Insert statistics text under buttons
  insertStatsText({
    responseTime,
    totalCharCount,
    tokenUsage: realTokenUsage,
    messageNumber: messageStats.messageCount,
    totalTokens: messageStats.totalTokens,
    totalCharacters: messageStats.totalCharacters,
  });
  
  return message;
}

/**
 * Called when plugin settings are changed
 */
async function onSettingsChange(settings, context) {
  console.log("⚙️ Dialogue Stats: Settings changed:", settings);
  
  // Handle settings changes
  if (settings.enabled !== undefined) {
    if (settings.enabled && !isEnabled) {
      await onEnable(context);
    } else if (!settings.enabled && isEnabled) {
      await onDisable(context);
    }
  }
}

/**
 * Called when plugin is unloaded
 */
async function onUnload(context) {
  console.log("📊 Dialogue Statistics plugin unloading...");
  
  // Cleanup
  if (isEnabled) {
    await onDisable(context);
  }
  
  pluginContext = null;
  
  console.log("✅ Dialogue Statistics plugin unloaded");
}

// Export all functions using CommonJS
module.exports = {
  // Lifecycle hooks
  onLoad,
  onEnable,
  onDisable,
  onMessage,
  onResponse,
  onSettingsChange,
  onUnload,
  
  // Plugin info
  pluginInfo: {
    id: "dialogue-stats",
    name: "对话统计 (Dialogue Statistics)",
    version: "2.0.0",
    description: "专注于对话内容统计分析，提供实时的字数、Token用量、响应时间等统计信息",
    author: "Narratium Team",
  },
}; 
 
