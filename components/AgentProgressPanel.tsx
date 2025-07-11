/**
 * Agent Progress Panel Component
 * 
 * Displays real-time agent execution progress and status information.
 * Features:
 * - Modern status indicator with enhanced visual design
 * - Elegant progress ring visualization
 * - Component completion tracking with step indicators
 * - Generation output monitoring
 * - Export functionality
 * - Avatar generation integration
 * 
 * Dependencies:
 * - framer-motion: For animations
 * - lucide-react: For icons
 * - GenerationOutput model: From agent model definitions
 */

"use client";

import React from "react";
import { motion } from "framer-motion";
import { 
  Clock, 
  CheckCircle, 
  Download, 
  User, 
  FileText, 
  Globe, 
  Plus,
  Loader2,
  Brain,
  Zap,
} from "lucide-react";
import { GenerationOutput } from "@/lib/models/agent-model";
import AvatarGenerationSection from "@/components/AvatarGenerationSection";

interface SessionProgress {
  completedTasks: number;
  totalIterations: number;
  knowledgeBaseSize: number;
}

interface AgentProgressPanelProps {
  progress: SessionProgress;
  status: string;
  result?: GenerationOutput;
  sessionId: string | null;
  onExport?: () => void;
}

/**
 * AgentProgressPanel component for displaying execution progress
 * 
 * @param {AgentProgressPanelProps} props - Component props
 * @returns {JSX.Element} The progress panel component
 */
const AgentProgressPanel: React.FC<AgentProgressPanelProps> = ({
  progress,
  status,
  result,
  sessionId,
  onExport,
}) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
    case "idle": 
      return { 
        color: "text-slate-400", 
        bgColor: "bg-slate-400/20", 
        label: "待机中",
        icon: <Clock className="w-4 h-4" />,
        pulse: false,
      };
    case "thinking": 
      return { 
        color: "text-purple-400", 
        bgColor: "bg-purple-400/20", 
        label: "思考中",
        icon: <Brain className="w-4 h-4" />,
        pulse: true,
      };
    case "executing": 
      return { 
        color: "text-blue-400", 
        bgColor: "bg-blue-400/20", 
        label: "执行中",
        icon: <Zap className="w-4 h-4" />,
        pulse: true,
      };
    case "waiting_user": 
      return { 
        color: "text-amber-400", 
        bgColor: "bg-amber-400/20", 
        label: "等待输入",
        icon: <User className="w-4 h-4" />,
        pulse: true,
      };
    case "completed": 
      return { 
        color: "text-emerald-400", 
        bgColor: "bg-emerald-400/20", 
        label: "已完成",
        icon: <CheckCircle className="w-4 h-4" />,
        pulse: false,
      };
    case "failed": 
      return { 
        color: "text-red-400", 
        bgColor: "bg-red-400/20", 
        label: "执行失败",
        icon: <Clock className="w-4 h-4" />,
        pulse: false,
      };
    default: 
      return { 
        color: "text-slate-400", 
        bgColor: "bg-slate-400/20", 
        label: "未知状态",
        icon: <Clock className="w-4 h-4" />,
        pulse: false,
      };
    }
  };

  const getProgressPercentage = () => {
    if (!result) return 0;
    
    // Calculate based on character completion and worldbook progress
    let characterProgress = 0;
    let worldbookProgress = 0;
    
    if (result.character_data) {
      const fields = ["name", "description", "personality", "scenario", 
        "first_mes", "mes_example", "creator_notes", "tags"];
      const completedFields = fields.filter(field => 
        result.character_data?.[field] && result.character_data?.[field]?.length > 0,
      );
      characterProgress = (completedFields.length / fields.length) * 50; // 50% for character
    }
    
    if (result.status_data) worldbookProgress += 12.5;
    if (result.user_setting_data) worldbookProgress += 12.5;
    if (result.world_view_data) worldbookProgress += 12.5;
    if (result.supplement_data && result.supplement_data.length >= 5) worldbookProgress += 12.5;
    
    return Math.round(characterProgress + worldbookProgress);
  };

  const handleExportResult = () => {
    if (onExport) {
      onExport();
    } else {
      // Default export logic
      const dataStr = JSON.stringify(result, null, 2);
      const dataBlob = new Blob([dataStr], { type: "application/json" });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `agent_result_${Date.now()}.json`;
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  const statusConfig = getStatusConfig(status);
  const progressPercentage = getProgressPercentage();
  const isCompleted = status === "completed";
  const hasResult = result && (result.character_data || result.status_data);

  return (
    <div className="bg-black/40 border border-amber-500/20 rounded-lg p-6 space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-[#c0a480] font-cinzel mb-2">
          创作进度
        </h3>
        <p className="text-sm text-[#c0a480]/60">
          实时监控AI创作过程
        </p>
      </div>

      {/* Enhanced Status Indicator */}
      <div className="relative">
        <div className={`flex items-center justify-between p-4 rounded-lg border ${statusConfig.bgColor} border-current/20`}>
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${statusConfig.bgColor} ${statusConfig.pulse ? "animate-pulse" : ""}`}>
              <div className={statusConfig.color}>
                {statusConfig.icon}
              </div>
            </div>
            <div>
              <span className={`text-sm font-medium ${statusConfig.color}`}>
                {statusConfig.label}
              </span>
              <p className="text-xs text-[#c0a480]/50 mt-0.5">
                当前执行状态
              </p>
            </div>
          </div>
          
          {(status === "thinking" || status === "executing") && (
            <Loader2 className="w-5 h-5 text-[#c0a480]/60 animate-spin" />
          )}
        </div>
      </div>

      {/* Progress Ring with Enhanced Design */}
      <div className="flex items-center justify-center">
        <div className="relative w-36 h-36">
          <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 144 144">
            {/* Background ring */}
            <circle
              cx="72"
              cy="72"
              r="64"
              stroke="rgba(196, 164, 128, 0.1)"
              strokeWidth="8"
              fill="transparent"
            />
            {/* Progress ring */}
            <motion.circle
              cx="72"
              cy="72"
              r="64"
              stroke="url(#progressGradient)"
              strokeWidth="8"
              fill="transparent"
              strokeLinecap="round"
              initial={{ strokeDasharray: "0 402.124" }}
              animate={{ 
                strokeDasharray: `${(progressPercentage / 100) * 402.124} 402.124`,
              }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
            {/* Define gradient */}
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#f9c86d" />
                <stop offset="100%" stopColor="#d1a35c" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <span className="text-2xl font-bold text-[#f9c86d] block">
                {progressPercentage}%
              </span>
              <span className="text-xs text-[#c0a480]/60 mt-1">
                总体进度
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Statistics Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-black/30 to-black/10 rounded-lg p-3 border border-emerald-500/10">
          <div className="flex items-center space-x-2 mb-2">
            <CheckCircle className="w-4 h-4 text-emerald-400" />
            <span className="text-xs text-[#c0a480]/70">已完成任务</span>
          </div>
          <p className="text-lg font-bold text-emerald-400">
            {progress.completedTasks}
          </p>
        </div>
        
        <div className="bg-gradient-to-br from-black/30 to-black/10 rounded-lg p-3 border border-blue-500/10">
          <div className="flex items-center space-x-2 mb-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-[#c0a480]/70">迭代次数</span>
          </div>
          <p className="text-lg font-bold text-blue-400">
            {progress.totalIterations}
          </p>
        </div>
        
        <div className="bg-gradient-to-br from-black/30 to-black/10 rounded-lg p-3 border border-amber-500/10">
          <div className="flex items-center space-x-2 mb-2">
            <FileText className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-[#c0a480]/70">知识条目</span>
          </div>
          <p className="text-lg font-bold text-amber-400">
            {progress.knowledgeBaseSize}
          </p>
        </div>
        
        <div className="bg-gradient-to-br from-black/30 to-black/10 rounded-lg p-3 border border-purple-500/10">
          <div className="flex items-center space-x-2 mb-2">
            <Globe className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-[#c0a480]/70">生成状态</span>
          </div>
          <p className="text-sm font-medium text-purple-400">
            {!result ? "未开始" :
              result.character_data && result.status_data ? "完整" :
                result.character_data ? "角色" : "进行中"}
          </p>
        </div>
      </div>

      {/* Enhanced Component Status with Step Indicators */}
      {result && (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-[#c0a480]/90 flex items-center gap-2">
            <div className="w-1 h-4 bg-gradient-to-b from-amber-400 to-orange-400 rounded"></div>
            生成组件状态
          </h4>
          
          <div className="space-y-3">
            {/* Character Card */}
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-blue-500/5 to-blue-500/10 border border-blue-500/20"
            >
              <div className="flex items-center space-x-3">
                <div className="p-1.5 rounded-lg bg-blue-500/20">
                  <User className="w-4 h-4 text-blue-400" />
                </div>
                <span className="text-sm font-medium text-[#c0a480]">角色卡片</span>
              </div>
              <div className={`w-3 h-3 rounded-full border-2 ${
                result.character_data 
                  ? "bg-emerald-400 border-emerald-400 shadow-emerald-400/50 shadow-lg" 
                  : "border-slate-400 bg-transparent"
              }`} />
            </motion.div>
            
            {/* Status System */}
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-cyan-500/5 to-cyan-500/10 border border-cyan-500/20"
            >
              <div className="flex items-center space-x-3">
                <div className="p-1.5 rounded-lg bg-cyan-500/20">
                  <FileText className="w-4 h-4 text-cyan-400" />
                </div>
                <span className="text-sm font-medium text-[#c0a480]">状态系统</span>
              </div>
              <div className={`w-3 h-3 rounded-full border-2 ${
                result.status_data 
                  ? "bg-emerald-400 border-emerald-400 shadow-emerald-400/50 shadow-lg" 
                  : "border-slate-400 bg-transparent"
              }`} />
            </motion.div>
            
            {/* User Setting */}
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-emerald-500/5 to-emerald-500/10 border border-emerald-500/20"
            >
              <div className="flex items-center space-x-3">
                <div className="p-1.5 rounded-lg bg-emerald-500/20">
                  <User className="w-4 h-4 text-emerald-400" />
                </div>
                <span className="text-sm font-medium text-[#c0a480]">用户设定</span>
              </div>
              <div className={`w-3 h-3 rounded-full border-2 ${
                result.user_setting_data 
                  ? "bg-emerald-400 border-emerald-400 shadow-emerald-400/50 shadow-lg" 
                  : "border-slate-400 bg-transparent"
              }`} />
            </motion.div>
            
            {/* World View */}
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-purple-500/5 to-purple-500/10 border border-purple-500/20"
            >
              <div className="flex items-center space-x-3">
                <div className="p-1.5 rounded-lg bg-purple-500/20">
                  <Globe className="w-4 h-4 text-purple-400" />
                </div>
                <span className="text-sm font-medium text-[#c0a480]">世界观</span>
              </div>
              <div className={`w-3 h-3 rounded-full border-2 ${
                result.world_view_data 
                  ? "bg-emerald-400 border-emerald-400 shadow-emerald-400/50 shadow-lg" 
                  : "border-slate-400 bg-transparent"
              }`} />
            </motion.div>
            
            {/* Supplement Entries */}
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-amber-500/5 to-amber-500/10 border border-amber-500/20"
            >
              <div className="flex items-center space-x-3">
                <div className="p-1.5 rounded-lg bg-amber-500/20">
                  <Plus className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <span className="text-sm font-medium text-[#c0a480]">补充条目</span>
                  <p className="text-xs text-[#c0a480]/60">
                    {result.supplement_data?.length || 0}/5 条目完成
                  </p>
                </div>
              </div>
              <div className={`w-3 h-3 rounded-full border-2 ${
                (result.supplement_data?.length || 0) >= 5 
                  ? "bg-emerald-400 border-emerald-400 shadow-emerald-400/50 shadow-lg" 
                  : "border-slate-400 bg-transparent"
              }`} />
            </motion.div>
          </div>
        </div>
      )}

      {/* Avatar Generation */}
      {isCompleted && hasResult && (
        <AvatarGenerationSection sessionId={sessionId} />
      )}

      {/* Enhanced Export Button */}
      {hasResult && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleExportResult}
          className="w-full bg-gradient-to-r from-amber-500 to-orange-400 hover:from-amber-400 hover:to-orange-300 text-black rounded-lg py-3 px-4 font-semibold text-sm transition-all duration-200 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
        >
          <Download className="w-4 h-4" />
          <span>导出结果</span>
        </motion.button>
      )}
    </div>
  );
};

export default AgentProgressPanel; 
