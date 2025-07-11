/**
 * MessageStream Component
 * 
 * Displays a continuous stream of messages in an elegant chatbot-style interface.
 * Features:
 * - Unified message flow without individual card borders
 * - Color-coded message type tags with emoji icons
 * - Smooth animations and hover effects
 * - Metadata display on hover
 * - Clean, borderless, natural appearance
 * 
 * Dependencies:
 * - framer-motion: For smooth animations
 * - Message model: From agent model definitions
 */

"use client";

import React from "react";
import { motion } from "framer-motion";
import { Message } from "@/lib/models/agent-model";

// Message type configuration with colors, icons, and labels
const MESSAGE_TYPE_CONFIG = {
  agent_thinking: { 
    label: "思考", 
    color: "text-purple-400", 
    bgColor: "bg-purple-500/10",
    icon: "🤔", 
  },
  agent_action: { 
    label: "执行", 
    color: "text-blue-400", 
    bgColor: "bg-blue-500/10",
    icon: "⚡", 
  },
  user_input: { 
    label: "用户", 
    color: "text-green-400", 
    bgColor: "bg-green-500/10",
    icon: "👤", 
  },
  tool_execution: { 
    label: "工具", 
    color: "text-amber-400", 
    bgColor: "bg-amber-500/10",
    icon: "🔧", 
  },
  quality_evaluation: { 
    label: "评估", 
    color: "text-emerald-400", 
    bgColor: "bg-emerald-500/10",
    icon: "✅", 
  },
  system_prompt: { 
    label: "系统", 
    color: "text-cyan-400", 
    bgColor: "bg-cyan-500/10",
    icon: "⚙️", 
  },
  system_info: { 
    label: "信息", 
    color: "text-cyan-400", 
    bgColor: "bg-cyan-500/10",
    icon: "ℹ️", 
  },
  tool_failure: { 
    label: "错误", 
    color: "text-red-400", 
    bgColor: "bg-red-500/10",
    icon: "❌", 
  },
  user_response: { 
    label: "回复", 
    color: "text-green-400", 
    bgColor: "bg-green-500/10",
    icon: "💬", 
  },
  tool_result: { 
    label: "结果", 
    color: "text-amber-400", 
    bgColor: "bg-amber-500/10",
    icon: "📊", 
  },
  agent_message: { 
    label: "消息", 
    color: "text-blue-400", 
    bgColor: "bg-blue-500/10",
    icon: "🤖", 
  },
  system_message: { 
    label: "系统", 
    color: "text-cyan-400", 
    bgColor: "bg-cyan-500/10",
    icon: "💻", 
  },
  error: { 
    label: "异常", 
    color: "text-red-400", 
    bgColor: "bg-red-500/10",
    icon: "🚨", 
  },
};

interface MessageStreamProps {
  messages: Message[];
  streamingMessage?: Message | null;
}

/**
 * MessageStream component for displaying agent conversation messages
 * 
 * @param {MessageStreamProps} props - Component props
 * @returns {JSX.Element} The message stream component
 */
const MessageStream: React.FC<MessageStreamProps> = ({ messages, streamingMessage }) => {
  // Combine regular messages with streaming message
  const allMessages = [...messages];
  if (streamingMessage) {
    allMessages.push(streamingMessage);
  }

  return (
    <div className="space-y-4 text-[#c0a480]">
      {allMessages.map((message, index) => {
        const config = MESSAGE_TYPE_CONFIG[message.type] || MESSAGE_TYPE_CONFIG.agent_message;
        
        return (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.03, 0.5) }}
            className="group relative"
          >
            {/* Message header with inline tag */}
            <div className="flex items-center gap-3 mb-2">
              <span 
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${config.color} ${config.bgColor} border border-current/20`}
              >
                <span className="text-sm">{config.icon}</span>
                {config.label}
              </span>
            </div>
            
            {/* Message content */}
            <div className="ml-1 text-sm leading-relaxed whitespace-pre-wrap break-words text-[#c0a480]/90">
              {message.content || "No content available"}
              {/* Add blinking cursor for streaming messages */}
              {message.metadata?.streaming && (
                <span className="ml-1 animate-pulse text-purple-400">▋</span>
              )}
            </div>
            
            {/* Metadata (only show on hover) */}
            {message.metadata && (message.metadata.tool || message.metadata.reasoning) && (
              <div className="ml-1 mt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                <div className="text-xs text-[#c0a480]/50 bg-black/10 rounded-lg p-3 border border-amber-500/10">
                  {message.metadata.tool && (
                    <div className="mb-1">
                      <span className="font-medium text-[#c0a480]/70">工具:</span> {message.metadata.tool}
                    </div>
                  )}
                  {message.metadata.reasoning && (
                    <div>
                      <span className="font-medium text-[#c0a480]/70">推理:</span> {message.metadata.reasoning}
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
};

export default MessageStream; 
