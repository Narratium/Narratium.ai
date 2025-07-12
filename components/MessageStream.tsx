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

import React from "react";
import { motion } from "framer-motion";
import { Message } from "@/lib/models/agent-model";
import { Bot, User, BrainCircuit, Terminal, AlertTriangle, Info, FileText, Download } from "lucide-react";
import InlineProgress from "./InlineProgress";

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
const AgentAction = ({ message, showProgress = false, progress, status, generationOutput }: { 
  message: Message; 
  showProgress?: boolean;
  progress?: any;
  status?: string;
  generationOutput?: any;
}) => {
  const data = message.metadata || {};
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
        </div>
        {data.reasoning && (
          <p className="text-[#c0a480]/80 text-xs italic mb-3">"{data.reasoning}"</p>
        )}
        {data.parameters && (
          <div>
            <h4 className="text-[#f4e8c1] font-medium text-xs mb-1">Parameters:</h4>
            <pre className="text-xs bg-black/30 p-2 rounded-md text-slate-300 overflow-x-auto fantasy-scrollbar">
              <code>{JSON.stringify(data.parameters, null, 2)}</code>
            </pre>
          </div>
        )}
        
        {/* Inline Progress for the latest executing tool */}
        {showProgress && progress && status && (
          <InlineProgress 
            progress={progress}
            status={status}
            currentTask={data.reasoning}
            generationOutput={generationOutput}
          />
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
 * A container for generation output messages (character data, worldbook data, etc.).
 */
const GenerationOutput = ({ message }: { message: Message }) => {
  const data = message.metadata || {};
  const { outputType, generationData } = data;
  
  const getOutputIcon = (type: string) => {
    switch (type) {
    case "character_data": return <User className="w-5 h-5 text-green-400" />;
    case "worldbook_data":
    case "status_data":
    case "user_setting_data":
    case "world_view_data":
    case "supplement_data":
      return <FileText className="w-5 h-5 text-blue-400" />;
    default: return <FileText className="w-5 h-5 text-slate-400" />;
    }
  };

  const getOutputTitle = (type: string) => {
    switch (type) {
    case "character_data": return "角色卡已生成";
    case "status_data": return "状态系统已生成";
    case "user_setting_data": return "用户设定已生成";
    case "world_view_data": return "世界观已生成";
    case "supplement_data": return "补充内容已生成";
    case "worldbook_data": return "世界书已生成";
    default: return "内容已生成";
    }
  };

  const getOutputColor = (type: string) => {
    switch (type) {
    case "character_data": return "border-green-500/20 bg-green-500/10";
    case "worldbook_data":
    case "status_data":
    case "user_setting_data":
    case "world_view_data":
    case "supplement_data":
      return "border-blue-500/20 bg-blue-500/10";
    default: return "border-slate-500/20 bg-slate-500/10";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3"
    >
      <div className="p-2 bg-green-500/10 border border-green-500/20 rounded-full flex-shrink-0">
        {getOutputIcon(outputType || "")}
      </div>
      <div className={`flex-1 border rounded-lg p-4 min-w-0 ${getOutputColor(outputType || "")}`}>
        <div className="flex items-center justify-between mb-2">
          <p className="font-semibold text-green-400 text-sm">{getOutputTitle(outputType || "")}</p>
          <Download className="w-4 h-4 text-[#c0a480]/60 cursor-pointer hover:text-[#c0a480] transition-colors" />
        </div>
        
        <p className="text-[#c0a480] text-sm mb-3">{message.content}</p>
        
        {generationData && (
          <div className="bg-black/20 rounded-md p-3">
            <h4 className="text-[#f4e8c1] font-medium text-xs mb-2">生成详情</h4>
            <div className="text-xs text-[#c0a480]/80 space-y-1">
              {outputType === "character_data" && generationData.name && (
                <p><span className="text-[#f4e8c1]">角色名:</span> {generationData.name}</p>
              )}
              {generationData.wordCount && (
                <p><span className="text-[#f4e8c1]">字数:</span> {generationData.wordCount}</p>
              )}
              {generationData.entries && (
                <p><span className="text-[#f4e8c1]">条目数:</span> {generationData.entries}</p>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};

/**
 * Main component to stream and render messages based on their type.
 */
const MessageStream = ({ messages, progress, status, generationOutput }: { 
  messages: Message[]; 
  progress?: any;
  status?: string;
  generationOutput?: any;
}) => {
  const renderMessage = (message: Message, index: number) => {
    // Show progress only on the last agent_action message
    const isLastAgentAction = message.type === "agent_action" && 
      index === messages.length - 1 || 
      (index === messages.length - 2 && messages[messages.length - 1].type === "user_input");
    
    switch (message.type) {
    case "agent_thinking":
      return <AgentThinking key={message.id} message={message} />;
    case "agent_action":
      return <AgentAction 
        key={message.id} 
        message={message} 
        showProgress={isLastAgentAction}
        progress={progress}
        status={status}
        generationOutput={generationOutput}
      />;
    case "agent_preparing_tool":
      return <AgentPreparingTool key={message.id} message={message} />;
    case "tool_failure":
      return <ToolFailure key={message.id} message={message} />;
    case "system_info":
      return <SystemInfo key={message.id} message={message} />;
    case "user_input":
      return <UserMessage key={message.id} message={message} />;
    case "generation_output":
      return <GenerationOutput key={message.id} message={message} />;
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
      {messages.map((msg, index) => renderMessage(msg, index))}
    </div>
  );
};

export default MessageStream; 
