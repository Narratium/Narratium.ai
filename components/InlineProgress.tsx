/**
 * Inline Progress Component
 * 
 * A collapsible progress display that can be embedded within agent action messages.
 * Features:
 * - Minimalist design that doesn't disrupt chat flow
 * - Collapsible/expandable interface
 * - Shows current task, completed tasks, and generation progress
 * - Subtle animations and fantasy-themed styling
 * 
 * Dependencies:
 * - framer-motion: For smooth animations
 * - lucide-react: For icons
 */

"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, CheckCircle, Clock, FileText, User } from "lucide-react";

interface InlineProgressProps {
  progress: {
    completedTasks: number;
    totalIterations: number;
    knowledgeBaseSize: number;
  };
  status: string;
  currentTask?: string;
  generationOutput?: any;
}

/**
 * Inline progress component for agent actions
 * 
 * @param progress - Current progress statistics
 * @param status - Current agent status
 * @param currentTask - Current task being executed
 * @param generationOutput - Generated content data
 * @returns {JSX.Element} The collapsible progress display
 */
export default function InlineProgress({ 
  progress, 
  status, 
  currentTask,
  generationOutput, 
}: InlineProgressProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const hasCharacterData = generationOutput?.character_data;
  const hasWorldbookData = generationOutput?.status_data || 
                          generationOutput?.user_setting_data || 
                          generationOutput?.world_view_data || 
                          (generationOutput?.supplement_data && generationOutput.supplement_data.length > 0);

  const getStatusColor = (status: string) => {
    switch (status) {
    case "thinking": return "text-amber-400";
    case "executing": return "text-blue-400";
    case "waiting_user": return "text-purple-400";
    case "completed": return "text-green-400";
    default: return "text-[#c0a480]";
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
    case "thinking": return "思考中";
    case "executing": return "执行中";
    case "waiting_user": return "等待用户";
    case "completed": return "已完成";
    default: return "空闲";
    }
  };

  return (
    <div className="mt-3 border-t border-slate-500/20 pt-3">
      {/* Collapsible Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left hover:bg-black/10 rounded-md p-2 transition-colors duration-200"
      >
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <Clock className="w-3 h-3 text-[#c0a480]/60" />
            <span className="text-xs text-[#c0a480]/80">进度详情</span>
          </div>
          <div className="flex items-center space-x-4">
            <span className={`text-xs font-medium ${getStatusColor(status)}`}>
              {getStatusText(status)}
            </span>
            {progress.completedTasks > 0 && (
              <span className="text-xs text-[#c0a480]/60">
                {progress.completedTasks} 个任务已完成
              </span>
            )}
          </div>
        </div>
        
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-[#c0a480]/60" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#c0a480]/60" />
        )}
      </button>

      {/* Expandable Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-3 bg-black/5 rounded-md mt-2 space-y-3">
              {/* Current Task */}
              {currentTask && (
                <div className="flex items-start space-x-2">
                  <Clock className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs text-[#c0a480]/80 font-medium">当前任务</p>
                    <p className="text-xs text-[#c0a480] mt-1">{currentTask}</p>
                  </div>
                </div>
              )}

              {/* Progress Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <div>
                    <p className="text-xs text-[#c0a480]/80">已完成任务</p>
                    <p className="text-xs text-green-400 font-medium">{progress.completedTasks}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <div>
                    <p className="text-xs text-[#c0a480]/80">知识库条目</p>
                    <p className="text-xs text-amber-400 font-medium">{progress.knowledgeBaseSize}</p>
                  </div>
                </div>
              </div>

              {/* Generation Output Status */}
              {(hasCharacterData || hasWorldbookData) && (
                <div className="border-t border-slate-500/20 pt-3">
                  <p className="text-xs text-[#c0a480]/80 font-medium mb-2">生成内容</p>
                  <div className="flex items-center space-x-4">
                    {hasCharacterData && (
                      <div className="flex items-center space-x-1">
                        <User className="w-3 h-3 text-green-400" />
                        <span className="text-xs text-green-400">角色卡</span>
                      </div>
                    )}
                    {hasWorldbookData && (
                      <div className="flex items-center space-x-1">
                        <FileText className="w-3 h-3 text-green-400" />
                        <span className="text-xs text-green-400">世界书</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 
