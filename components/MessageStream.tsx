/**
 * MessageStream Component
 * 
 * Displays a continuous stream of messages in an elegant chatbot-style interface.
 * Features:
 * - Unified message flow without individual card borders
 * - Color-coded message type tags with modern visual indicators
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
import { 
  BrainCircuit, 
  Zap, 
  Wrench,
  PenSquare,
  MessageSquare,
  Cog,
  ShieldCheck,
  ClipboardCheck,
  Bot,
  AlertTriangle,
  Info,
} from "lucide-react";

// Simplified message type configuration with Lucide icons
const MESSAGE_TYPE_CONFIG = {
  // Thinking and decision-making
  agent_thinking: { 
    label: "思考中", 
    color: "text-purple-400", 
    icon: BrainCircuit, 
    pulse: true,
  },
  
  // Actions and execution
  agent_action: { 
    label: "执行", 
    color: "text-blue-400", 
    icon: Zap,
    pulse: false,
  },
  tool_execution: { 
    label: "工具调用", 
    color: "text-amber-400", 
    icon: Wrench,
    pulse: false,
  },
  
  // User interactions
  user_input: { 
    label: "用户输入", 
    color: "text-emerald-400", 
    icon: PenSquare,
    pulse: false,
  },
  user_response: { 
    label: "用户回复", 
    color: "text-emerald-400", 
    icon: MessageSquare,
    pulse: false,
  },
  
  // System and quality
  system_info: { 
    label: "系统信息", 
    color: "text-slate-400", 
    icon: Info,
    pulse: false,
  },
  system_prompt: { 
    label: "系统提示", 
    color: "text-slate-400", 
    icon: Cog,
    pulse: false,
  },
  system_message: { 
    label: "系统消息", 
    color: "text-slate-400", 
    icon: Info,
    pulse: false,
  },
  quality_evaluation: { 
    label: "质量评估", 
    color: "text-teal-400", 
    icon: ShieldCheck,
    pulse: false,
  },
  
  // Results and errors
  tool_result: { 
    label: "执行结果", 
    color: "text-cyan-400", 
    icon: ClipboardCheck,
    pulse: false,
  },
  agent_message: { 
    label: "智能体", 
    color: "text-indigo-400", 
    icon: Bot,
    pulse: false,
  },
  
  // Errors
  tool_failure: { 
    label: "执行失败", 
    color: "text-red-400", 
    icon: AlertTriangle,
    pulse: true,
  },
  error: { 
    label: "错误", 
    color: "text-red-400", 
    icon: AlertTriangle,
    pulse: true,
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
    <div className="space-y-3 text-[#c0a480]">
      {allMessages.map((message, index) => {
        const config = MESSAGE_TYPE_CONFIG[message.type] || MESSAGE_TYPE_CONFIG.agent_message;
        
        return (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.02, 0.4) }}
            className="group relative"
          >
            {/* Simplified message header: Icon + Text */}
            <div className={`flex items-center gap-2 mb-2.5 font-medium text-sm ${config.color} ${config.pulse ? "animate-pulse" : ""}`}>
              <config.icon className="w-4 h-4" />
              <span className="tracking-wide">{config.label}</span>
            </div>
            
            {/* Message content with improved typography */}
            <div className="pl-6 text-sm leading-relaxed whitespace-pre-wrap break-words text-[#c0a480]/90">
              {message.content || "No content available"}
              {/* Modern blinking cursor for streaming messages */}
              {message.metadata?.streaming && (
                <span className="ml-1 inline-block w-0.5 h-4 bg-purple-400 animate-pulse"></span>
              )}
            </div>
            
            {/* Enhanced metadata display */}
            {message.metadata && (message.metadata.tool || message.metadata.reasoning) && (
              <div className="pl-6 mt-3 opacity-0 group-hover:opacity-100 transition-all duration-300">
                <div className="text-xs text-[#c0a480]/60 bg-black/10 rounded-lg p-3 border border-amber-500/10">
                  {message.metadata.tool && (
                    <div className="mb-1">
                      <span className="font-semibold text-[#c0a480]/80">工具:</span> 
                      <span className="ml-1 text-[#c0a480]/70">{message.metadata.tool}</span>
                    </div>
                  )}
                  {message.metadata.reasoning && (
                    <div>
                      <span className="font-semibold text-[#c0a480]/80">推理:</span> 
                      <span className="ml-1 text-[#c0a480]/70">{message.metadata.reasoning}</span>
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
