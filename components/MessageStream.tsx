/**
 * Enhanced MessageStream Component with Fantasy Styling
 * 
 * Displays a continuous stream of messages with intelligent content parsing and fantasy-themed design.
 * Features:
 * - Smart content parsing (code blocks, lists, emphasis) with fantasy styling
 * - Hierarchical typography based on message type
 * - Fantasy-themed status indicators and visual elements
 * - Improved visual hierarchy and readability
 * - Warm, magical color scheme
 * 
 * Dependencies:
 * - framer-motion: For smooth animations
 * - Message model: From agent model definitions
 */

"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Message } from "@/lib/models/agent-model";
import { Bot, User, BrainCircuit, Terminal, AlertTriangle, Info, Sparkles, Download, Image, Search, Loader2 } from "lucide-react";

/**
 * Parses message content if it's a JSON string.
 */
const parseContent = (content: string) => {
  try {
    return JSON.parse(content);
  } catch (e) {
    return { raw: content };
  }
};

/**
 * A container for agent thinking messages.
 */
const AgentThinking = ({ message }: { message: Message }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-start gap-3"
  >
    <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-full flex-shrink-0">
      <BrainCircuit className="w-5 h-5 text-amber-400 animate-pulse" />
    </div>
    <div className="flex-1 pt-1.5 min-w-0">
      <p className="text-[#c0a480] text-sm italic">{message.content}</p>
    </div>
  </motion.div>
);

/**
 * A container for agent action/tool execution messages.
 */
const AgentAction = ({ message, progress, status, result }: { 
  message: Message, 
  progress?: {
    completedTasks: number;
    totalIterations: number;
    knowledgeBaseSize: number;
  },
  status?: string,
  result?: any
}) => {
  const data = message.metadata || {};
  const [isProgressExpanded, setIsProgressExpanded] = useState(false);
  const [isResultsExpanded, setIsResultsExpanded] = useState(false);
  
  const getStatusConfig = (status: string) => {
    const statusMap: { [key: string]: { color: string; label: string; icon: React.ReactNode; pulse?: boolean } } = {
      idle: { color: "text-slate-400", label: "空闲", icon: <BrainCircuit className="w-4 h-4" /> },
      thinking: { color: "text-amber-400", label: "思考中", icon: <BrainCircuit className="w-4 h-4" />, pulse: true },
      executing: { color: "text-blue-400", label: "执行中", icon: <Terminal className="w-4 h-4" />, pulse: true },
      waiting_user: { color: "text-amber-400", label: "等待输入", icon: <User className="w-4 h-4" />, pulse: true },
      completed: { color: "text-green-400", label: "已完成", icon: <BrainCircuit className="w-4 h-4" /> },
      failed: { color: "text-rose-400", label: "失败", icon: <AlertTriangle className="w-4 h-4" /> },
    };
    return statusMap[status] || { color: "text-slate-400", label: "未知", icon: <BrainCircuit className="w-4 h-4" /> };
  };

  const statusConfig = status ? getStatusConfig(status) : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3"
    >
      <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-full flex-shrink-0">
        <Terminal className="w-5 h-5 text-blue-400" />
      </div>
      <div className="flex-1 bg-black/20 border border-slate-500/20 rounded-lg p-4 min-w-0">
        <div className="flex items-center gap-3 mb-2">
          <p className="font-semibold text-blue-400 text-sm">Executing Tool: {data.tool || "Unknown"}</p>
          {statusConfig && (
            <div className="flex items-center gap-2">
              <div className={`${statusConfig.color} ${statusConfig.pulse ? "animate-pulse" : ""}`}>
                {statusConfig.icon}
              </div>
              <span className={`text-xs ${statusConfig.color}`}>
                {statusConfig.label}
              </span>
            </div>
          )}
        </div>
        {data.reasoning && (
          <p className="text-[#c0a480]/80 text-xs italic mb-3">"{data.reasoning}"</p>
        )}
        
        {/* Progress Information */}
        {progress && (
          <div className="mt-3 space-y-2">
            <button
              onClick={() => setIsProgressExpanded(!isProgressExpanded)}
              className="w-full flex items-center justify-between p-2 rounded-md hover:bg-black/30 transition-colors"
            >
              <span className="text-xs font-medium text-[#c0a480]">执行统计</span>
              {isProgressExpanded ? (
                <svg className="w-4 h-4 text-[#c0a480]/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-[#c0a480]/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>
            
            {isProgressExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-2 px-2 pb-2"
              >
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#c0a480]/80">已完成任务</span>
                  <span className="font-semibold text-[#f4e8c1]">{progress.completedTasks}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#c0a480]/80">迭代次数</span>
                  <span className="font-semibold text-[#f4e8c1]">{progress.totalIterations}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[#c0a480]/80">知识库大小</span>
                  <span className="font-semibold text-[#f4e8c1]">{progress.knowledgeBaseSize}</span>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* Generation Results */}
        {result && (
          <div className="mt-3 space-y-2">
            <button
              onClick={() => setIsResultsExpanded(!isResultsExpanded)}
              className="w-full flex items-center justify-between p-2 rounded-md hover:bg-black/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-medium text-[#c0a480]">生成结果</span>
              </div>
              {isResultsExpanded ? (
                <svg className="w-4 h-4 text-[#c0a480]/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              ) : (
                <svg className="w-4 h-4 text-[#c0a480]/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              )}
            </button>
            
            {isResultsExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-2 px-2 pb-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-[#c0a480]">
                    <User className="w-3 h-3 text-amber-400" />
                    <span>角色卡</span>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${
                    result.character_data ? "bg-green-400" : "bg-slate-600"
                  }`} />
                </div>
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-[#c0a480]">
                    <Info className="w-3 h-3 text-amber-400" />
                    <span>世界书</span>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${
                    result.world_data ? "bg-green-400" : "bg-slate-600"
                  }`} />
                </div>
              </motion.div>
            )}
          </div>
        )}

        {data.parameters && (
          <div className="mt-3">
            <h4 className="text-[#f4e8c1] font-medium text-xs mb-1">Parameters:</h4>
            <pre className="text-xs bg-black/30 p-2 rounded-md text-slate-300 overflow-x-auto fantasy-scrollbar">
              <code>{JSON.stringify(data.parameters, null, 2)}</code>
            </pre>
          </div>
        )}
      </div>
    </motion.div>
  );
};

/**
 * A container for agent preparing to execute tool messages.
 */
const AgentPreparingTool = ({ message }: { message: Message }) => {
  const data = message.metadata || {};
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3"
    >
      <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-full flex-shrink-0">
        <Terminal className="w-5 h-5 text-blue-400 animate-pulse" />
      </div>
      <div className="flex-1 pt-1.5 min-w-0">
        <p className="text-[#c0a480] text-sm italic">
          Agent is thinking about {data.tool ? `using ${data.tool}` : "next steps"}...
        </p>
      </div>
    </motion.div>
  );
};

/**
 * A container for tool failure messages.
 */
const ToolFailure = ({ message }: { message: Message }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-start gap-3"
  >
    <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-full flex-shrink-0">
      <AlertTriangle className="w-5 h-5 text-rose-400" />
    </div>
    <div className="flex-1 bg-rose-500/10 border border-rose-500/20 rounded-lg p-4 min-w-0">
      <p className="font-semibold text-rose-400 text-sm mb-1">Tool Execution Failed</p>
      <p className="text-[#c0a480] text-xs">{message.content}</p>
    </div>
  </motion.div>
);

/**
 * A container for system information messages.
 */
const SystemInfo = ({ message }: { message: Message }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-center gap-3 text-xs text-slate-400/80 my-4"
  >
    <Info className="w-4 h-4" />
    <span>{message.content}</span>
    <div className="flex-1 h-px bg-slate-500/20"></div>
  </motion.div>
);

/**
 * A container for user messages.
 */
const UserMessage = ({ message }: { message: Message }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-start gap-3 justify-end"
  >
    <div className="bg-amber-900/40 border border-amber-500/30 rounded-lg p-3 max-w-xl">
      <p className="text-[#f4e8c1] text-sm whitespace-pre-wrap">{message.content}</p>
    </div>
    <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-full flex-shrink-0">
      <User className="w-5 h-5 text-amber-400" />
    </div>
  </motion.div>
);

/**
 * A container for completion actions after generation is finished.
 */
const CompletionActions = ({ message, onAction }: { message: Message, onAction?: (action: string) => void }) => {
  const data = message.metadata || {};
  const actions = data.actions || [];
  const [isLoading, setIsLoading] = useState<string | null>(null);

  const handleAction = async (action: string) => {
    setIsLoading(action);
    try {
      await handleCompletionAction(action);
    } finally {
      setIsLoading(null);
    }
    onAction?.(action);
  };

  const handleCompletionAction = async (action: string) => {
    const sessionId = data.sessionId;
    const characterData = data.characterData;
    const llmConfig = data.llmConfig;

    switch (action) {
    case "generate_avatar":
      try {
        if (!characterData) {
          alert("未找到角色数据");
          return;
        }
          
        // Create image description based on character data
        const description = `Portrait of ${characterData.name || "character"}, ${characterData.description || "fantasy character"}, high quality, detailed, professional art style`;
          
        // Import and call the function directly
        const { generateImage } = await import("@/function/image/generate");
        const response = await generateImage({
          description,
          characterData,
          llmConfig,
        });
          
        const result = await response.json();
          
        if (result.success && result.imageUrl) {
          // Show success message with image preview
          const imageWindow = window.open("", "_blank");
          if (imageWindow) {
            imageWindow.document.write(`
                <html>
                  <head><title>Generated Avatar</title></head>
                  <body style="margin: 0; padding: 20px; background: #000; color: #fff; font-family: Arial;">
                    <h2>Generated Avatar for ${characterData.name || "Character"}</h2>
                    <img src="${result.imageUrl}" style="max-width: 100%; height: auto; border-radius: 8px;" />
                    <p>Image URL: <a href="${result.imageUrl}" target="_blank" style="color: #4a9eff;">${result.imageUrl}</a></p>
                  </body>
                </html>
              `);
          }
        } else {
          alert(`头像生成失败: ${result.error || "未知错误"}`);
        }
      } catch (error) {
        console.error("Generate avatar error:", error);
        alert("头像生成失败，请检查配置");
      }
      break;
        
    case "search_avatar":
      try {
        if (!characterData) {
          alert("未找到角色数据");
          return;
        }
          
        // Create search query based on character data
        const query = `${characterData.name || "character"} ${characterData.description || "fantasy character"} portrait art`;
          
        // Import and call the function directly
        const { searchImages } = await import("@/function/image/search");
        const response = await searchImages({
          query,
          tavilyApiKey: llmConfig?.tavily_api_key || "",
        });
          
        const result = await response.json();
          
        if (result.success && result.images && result.images.length > 0) {
          // Show search results in a new window
          const searchWindow = window.open("", "_blank");
          if (searchWindow) {
            const imageGallery = result.images.map((url: string, index: number) => 
              `<img src="${url}" style="width: 200px; height: 200px; object-fit: cover; margin: 10px; border-radius: 8px; cursor: pointer;" onclick="window.open('${url}', '_blank')" />`,
            ).join("");
              
            searchWindow.document.write(`
                <html>
                  <head><title>Avatar Search Results</title></head>
                  <body style="margin: 0; padding: 20px; background: #000; color: #fff; font-family: Arial;">
                    <h2>Search Results for "${query}"</h2>
                    <p>Found ${result.images.length} images. Click on any image to open in full size.</p>
                    <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                      ${imageGallery}
                    </div>
                  </body>
                </html>
              `);
          }
        } else {
          alert(`头像搜索失败: ${result.error || "未找到合适的图片"}`);
        }
      } catch (error) {
        console.error("Search avatar error:", error);
        alert("头像搜索失败，请检查配置");
      }
      break;
        
    case "download_character":
      try {
        if (!characterData) {
          alert("未找到角色数据");
          return;
        }
          
        const blob = new Blob([JSON.stringify(characterData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${characterData.name || "character"}_card.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
          
        alert("角色卡下载成功！");
      } catch (error) {
        console.error("Download character error:", error);
        alert("角色卡下载失败");
      }
      break;
        
    case "download_worldbook":
      try {
        const worldbookData = data.worldbookData || { entries: [], name: "Generated Worldbook" };
          
        const blob = new Blob([JSON.stringify(worldbookData, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${worldbookData.name || "worldbook"}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
          
        alert("世界书下载成功！");
      } catch (error) {
        console.error("Download worldbook error:", error);
        alert("世界书下载失败");
      }
      break;
        
    default:
      alert(`未知操作: ${action}`);
    }
  };

  const getActionConfig = (action: string) => {
    const actionMap: { [key: string]: { icon: React.ReactNode; label: string; color: string; description: string } } = {
      "generate_avatar": { 
        icon: <Image className="w-5 h-5" />, 
        label: "生成头像", 
        color: "text-purple-400 border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20",
        description: "为角色生成AI头像",
      },
      "search_avatar": { 
        icon: <Search className="w-5 h-5" />, 
        label: "搜索头像", 
        color: "text-blue-400 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20",
        description: "在线搜索合适的头像",
      },
      "download_character": { 
        icon: <Download className="w-5 h-5" />, 
        label: "下载角色卡", 
        color: "text-green-400 border-green-500/30 bg-green-500/10 hover:bg-green-500/20",
        description: "下载生成的角色卡文件",
      },
      "download_worldbook": { 
        icon: <Download className="w-5 h-5" />, 
        label: "下载世界书", 
        color: "text-amber-400 border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20",
        description: "下载生成的世界书文件",
      },
    };
    return actionMap[action] || { 
      icon: <Terminal className="w-5 h-5" />, 
      label: action, 
      color: "text-slate-400 border-slate-500/30 bg-slate-500/10 hover:bg-slate-500/20",
      description: "执行操作",
    };
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3"
    >
      <div className="p-2 bg-green-500/10 border border-green-500/20 rounded-full flex-shrink-0">
        <Sparkles className="w-5 h-5 text-green-400" />
      </div>
      <div className="flex-1 bg-black/20 border border-slate-500/20 rounded-lg p-4 min-w-0">
        <div className="flex items-center gap-3 mb-3">
          <p className="font-semibold text-green-400 text-sm">生成完成</p>
        </div>
        <p className="text-[#c0a480]/80 text-sm mb-4">{message.content}</p>
        
        <div className="space-y-3">
          <h4 className="text-[#f4e8c1] font-medium text-sm">选择后续操作：</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {actions.map((action: string, index: number) => {
              const config = getActionConfig(action);
              return (
                <button
                  key={index}
                  onClick={() => handleAction(action)}
                  disabled={isLoading === action}
                  className={`p-3 rounded-lg border transition-all duration-200 hover:scale-105 ${config.color} ${isLoading === action ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    {isLoading === action ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      config.icon
                    )}
                    <div className="text-left">
                      <p className="font-medium text-sm">
                        {isLoading === action ? "处理中..." : config.label}
                      </p>
                      <p className="text-xs opacity-80">{config.description}</p>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

/**
 * Main component to stream and render messages based on their type.
 */
const MessageStream = ({ messages, progress, status, result, onAction }: { 
  messages: Message[],
  progress?: {
    completedTasks: number;
    totalIterations: number;
    knowledgeBaseSize: number;
  },
  status?: string,
  result?: any,
  onAction?: (action: string) => void
}) => {
  const renderMessage = (message: Message) => {
    switch (message.type) {
    case "agent_thinking":
      return <AgentThinking key={message.id} message={message} />;
    case "agent_action":
      return <AgentAction key={message.id} message={message} progress={progress} status={status} result={result} />;
    case "agent_preparing_tool":
      return <AgentPreparingTool key={message.id} message={message} />;
    case "tool_failure":
      return <ToolFailure key={message.id} message={message} />;
    case "system_info":
      return <SystemInfo key={message.id} message={message} />;
    case "user_input":
      return <UserMessage key={message.id} message={message} />;
    case "completion_actions":
      return <CompletionActions key={message.id} message={message} onAction={onAction} />;
    default:
      // Default rendering for unknown agent messages
      return (
        <motion.div
          key={message.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3"
        >
          <div className="p-2 bg-slate-500/10 border border-slate-500/20 rounded-full flex-shrink-0">
            <Bot className="w-5 h-5 text-slate-400" />
          </div>
          <div className="flex-1 pt-1.5 min-w-0">
            <p className="text-[#c0a480] text-sm">{message.content}</p>
          </div>
        </motion.div>
      );
    }
  };

  return (
    <div className="space-y-6">
      {messages.map((msg) => renderMessage(msg))}
    </div>
  );
};

export default MessageStream; 
