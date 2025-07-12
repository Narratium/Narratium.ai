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
import { Bot, User, BrainCircuit, Terminal, AlertTriangle, Info } from "lucide-react";

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
    <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-full">
      <BrainCircuit className="w-5 h-5 text-amber-400" />
    </div>
    <div className="flex-1 pt-1.5">
      <p className="text-[#c0a480] text-sm italic">{message.content}</p>
    </div>
  </motion.div>
);

/**
 * A container for agent action/tool execution messages.
 */
const AgentAction = ({ message }: { message: Message }) => {
  const data = message.metadata || {};
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3"
    >
      <div className="p-2 bg-blue-500/10 border border-blue-500/20 rounded-full">
        <Terminal className="w-5 h-5 text-blue-400" />
      </div>
      <div className="flex-1 bg-black/20 border border-slate-500/20 rounded-lg p-4">
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
    <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-full">
      <AlertTriangle className="w-5 h-5 text-rose-400" />
    </div>
    <div className="flex-1 bg-rose-500/10 border border-rose-500/20 rounded-lg p-4">
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
    <div className="flex-1 max-w-xl bg-amber-900/40 border border-amber-500/30 rounded-lg p-3">
      <p className="text-[#f4e8c1] text-sm whitespace-pre-wrap">{message.content}</p>
    </div>
    <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-full">
      <User className="w-5 h-5 text-amber-400" />
    </div>
  </motion.div>
);

/**
 * Main component to stream and render messages based on their type.
 */
const MessageStream = ({ messages }: { messages: Message[] }) => {
  const renderMessage = (message: Message) => {
    switch (message.type) {
    case "agent_thinking":
      return <AgentThinking key={message.id} message={message} />;
    case "agent_action":
      return <AgentAction key={message.id} message={message} />;
    case "tool_failure":
      return <ToolFailure key={message.id} message={message} />;
    case "system_info":
      return <SystemInfo key={message.id} message={message} />;
    case "user_input":
      return <UserMessage key={message.id} message={message} />;
    default:
      // Default rendering for unknown agent messages
      return (
        <motion.div
          key={message.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-3"
        >
          <div className="p-2 bg-slate-500/10 border border-slate-500/20 rounded-full">
            <Bot className="w-5 h-5 text-slate-400" />
          </div>
          <div className="flex-1 pt-1.5">
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
