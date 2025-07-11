/**
 * Agent Progress Panel Component
 * 
 * Displays real-time agent execution progress and status information.
 * Features:
 * - Status indicator with color coding
 * - Progress ring visualization
 * - Task completion statistics
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
  const getStatusColor = (status: string) => {
    switch (status) {
    case "idle": return "text-gray-400";
    case "thinking": return "text-blue-400";
    case "executing": return "text-yellow-400";
    case "waiting_user": return "text-orange-400";
    case "completed": return "text-green-400";
    case "failed": return "text-red-400";
    default: return "text-gray-400";
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

  const progressPercentage = getProgressPercentage();
  const isCompleted = status === "completed";
  const hasResult = result && (result.character_data || result.status_data);

  return (
    <div className="bg-black/40 backdrop-blur-sm border border-amber-500/20 rounded-lg p-6 space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-[#c0a480] font-cinzel mb-2">
          创作进度
        </h3>
        <p className="text-sm text-[#c0a480]/60">
          实时监控AI创作过程
        </p>
      </div>

      {/* Status Indicator */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${
            status === "thinking" || status === "executing" ? "animate-pulse" : ""
          } ${
            status === "idle" ? "bg-gray-400" :
              status === "thinking" ? "bg-blue-400" :
                status === "executing" ? "bg-yellow-400" :
                  status === "waiting_user" ? "bg-orange-400" :
                    status === "completed" ? "bg-green-400" :
                      status === "failed" ? "bg-red-400" : "bg-gray-400"
          }`} />
          <span className={`text-sm font-medium ${getStatusColor(status)}`}>
            {status === "idle" ? "待机中" :
              status === "thinking" ? "思考中" :
                status === "executing" ? "执行中" :
                  status === "waiting_user" ? "等待输入" :
                    status === "completed" ? "已完成" :
                      status === "failed" ? "执行失败" : "未知状态"}
          </span>
        </div>
        
        {(status === "thinking" || status === "executing") && (
          <Loader2 className="w-4 h-4 text-[#c0a480]/60 animate-spin" />
        )}
      </div>

      {/* Progress Ring */}
      <div className="flex items-center justify-center">
        <div className="relative w-32 h-32">
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="54"
              stroke="#534741"
              strokeWidth="6"
              fill="transparent"
            />
            <motion.circle
              cx="60"
              cy="60"
              r="54"
              stroke="#f9c86d"
              strokeWidth="6"
              fill="transparent"
              strokeLinecap="round"
              initial={{ strokeDasharray: "0 339.292" }}
              animate={{ 
                strokeDasharray: `${(progressPercentage / 100) * 339.292} 339.292`,
              }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold text-[#f9c86d]">
              {progressPercentage}%
            </span>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-black/20 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-1">
            <CheckCircle className="w-4 h-4 text-green-400" />
            <span className="text-xs text-[#c0a480]/60">已完成任务</span>
          </div>
          <p className="text-lg font-semibold text-[#c0a480]">
            {progress.completedTasks}
          </p>
        </div>
        
        <div className="bg-black/20 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-1">
            <Clock className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-[#c0a480]/60">迭代次数</span>
          </div>
          <p className="text-lg font-semibold text-[#c0a480]">
            {progress.totalIterations}
          </p>
        </div>
        
        <div className="bg-black/20 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-1">
            <FileText className="w-4 h-4 text-amber-400" />
            <span className="text-xs text-[#c0a480]/60">知识条目</span>
          </div>
          <p className="text-lg font-semibold text-[#c0a480]">
            {progress.knowledgeBaseSize}
          </p>
        </div>
        
        <div className="bg-black/20 rounded-lg p-3">
          <div className="flex items-center space-x-2 mb-1">
            <Globe className="w-4 h-4 text-purple-400" />
            <span className="text-xs text-[#c0a480]/60">生成状态</span>
          </div>
          <p className="text-sm font-medium text-[#c0a480]">
            {!result ? "未开始" :
              result.character_data && result.status_data ? "完整" :
                result.character_data ? "角色" : "进行中"}
          </p>
        </div>
      </div>

      {/* Generation Components Status */}
      {result && (
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-[#c0a480]/80">生成组件状态</h4>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-blue-400" />
                <span className="text-sm text-[#c0a480]/70">角色卡片</span>
              </div>
              <div className={`w-2 h-2 rounded-full ${
                result.character_data ? "bg-green-400" : "bg-gray-400"
              }`} />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span className="text-sm text-[#c0a480]/70">状态系统</span>
              </div>
              <div className={`w-2 h-2 rounded-full ${
                result.status_data ? "bg-green-400" : "bg-gray-400"
              }`} />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <User className="w-4 h-4 text-green-400" />
                <span className="text-sm text-[#c0a480]/70">用户设定</span>
              </div>
              <div className={`w-2 h-2 rounded-full ${
                result.user_setting_data ? "bg-green-400" : "bg-gray-400"
              }`} />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Globe className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-[#c0a480]/70">世界观</span>
              </div>
              <div className={`w-2 h-2 rounded-full ${
                result.world_view_data ? "bg-green-400" : "bg-gray-400"
              }`} />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Plus className="w-4 h-4 text-amber-400" />
                <span className="text-sm text-[#c0a480]/70">
                  补充条目 ({result.supplement_data?.length || 0}/5)
                </span>
              </div>
              <div className={`w-2 h-2 rounded-full ${
                (result.supplement_data?.length || 0) >= 5 ? "bg-green-400" : "bg-gray-400"
              }`} />
            </div>
          </div>
        </div>
      )}

      {/* Avatar Generation */}
      {isCompleted && hasResult && (
        <AvatarGenerationSection sessionId={sessionId} />
      )}

      {/* Export Button */}
      {hasResult && (
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          onClick={handleExportResult}
          className="w-full bg-gradient-to-r from-amber-500 to-orange-400 text-black rounded-lg py-3 px-4 font-medium text-sm hover:from-amber-400 hover:to-orange-300 transition-all duration-200 flex items-center justify-center space-x-2"
        >
          <Download className="w-4 h-4" />
          <span>导出结果</span>
        </motion.button>
      )}
    </div>
  );
};

export default AgentProgressPanel; 
