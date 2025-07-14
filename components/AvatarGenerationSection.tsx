/**
 * Avatar Generation Section Component
 * 
 * Provides avatar generation functionality for completed character cards.
 * Features:
 * - Style selection (anime, realistic, fantasy, etc.)
 * - Generation method choice (search vs AI generation)
 * - Progress indication during generation
 * - Download functionality for generated images
 * - Error handling for generation failures
 * 
 * Dependencies:
 * - generateAvatar: API function for avatar generation
 * - framer-motion: For animations
 * - lucide-react: For icons
 */

"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  Palette, 
  Download, 
  ImageIcon,
  Loader2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { generateAvatar } from "@/function/agent/avatar";

interface AvatarGenerationSectionProps {
  sessionId: string | null;
}

/**
 * AvatarGenerationSection component for character avatar generation
 * 
 * @param {AvatarGenerationSectionProps} props - Component props
 * @returns {JSX.Element} The avatar generation section component
 */
const AvatarGenerationSection: React.FC<AvatarGenerationSectionProps> = ({ sessionId }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageChoice, setImageChoice] = useState<"search" | "generate">("search");
  const [imageStyle, setImageStyle] = useState("anime");
  const [avatarResult, setAvatarResult] = useState<any>(null);
  const [showOptions, setShowOptions] = useState(false);

  const handleGenerateAvatar = async () => {
    if (!sessionId) return;
    
    setIsGenerating(true);
    try {      
      const params = new URLSearchParams({
        sessionId,
        imageChoice,
        imageStyle,
      });
      
      const result = await generateAvatar(params);
      
      if (result.success) {
        setAvatarResult(result.data);
      } else {
        console.error("Avatar generation failed:", result.error);
      }
    } catch (error) {
      console.error("Avatar generation error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadAvatar = async () => {
    if (!avatarResult?.imageUrl) return;
    
    try {
      // Fetch the image data from the remote URL
      const response = await fetch(avatarResult.imageUrl);
      const blob = await response.blob();
      
      // Create a local blob URL
      const blobUrl = URL.createObjectURL(blob);
      
      // Create download link with the blob URL
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = `character-card-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
      // Fallback: open in new tab if download fails
      window.open(avatarResult.imageUrl, "_blank");
    }
  };

  const imageStyleOptions = [
    { value: "kawaii", label: "Cute/Kawaii" },
    { value: "anime", label: "Japanese Anime" },
    { value: "scifi", label: "Sci-fi/Tech" },
    { value: "realistic", label: "Realistic/Photo" },
    { value: "fantasy", label: "Fantasy" },
    { value: "gothic", label: "Dark/Gothic" },
    { value: "minimalist", label: "Minimalist" },
    { value: "vintage", label: "Retro/Vintage" },
  ];

  return (
    <div className="bg-black/20 backdrop-blur-sm border border-amber-500/15 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ImageIcon className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-medium text-[#c0a480]">
            头像生成
          </span>
        </div>
        <button
          onClick={() => setShowOptions(!showOptions)}
          className="text-[#c0a480]/60 hover:text-[#c0a480] transition-colors"
        >
          {showOptions ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Options */}
      {showOptions && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-3"
        >
          {/* Generation method */}
          <div>
            <label className="text-xs text-[#c0a480]/80 mb-2 block">
              生成方式
            </label>
            <div className="flex space-x-2">
              <button
                onClick={() => setImageChoice("search")}
                className={`flex-1 py-2 px-3 text-xs rounded-lg border transition-all ${
                  imageChoice === "search"
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                    : "bg-black/10 border-amber-500/20 text-[#c0a480]/60 hover:text-[#c0a480]"
                }`}
              >
                搜索图片
              </button>
              <button
                onClick={() => setImageChoice("generate")}
                className={`flex-1 py-2 px-3 text-xs rounded-lg border transition-all ${
                  imageChoice === "generate"
                    ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                    : "bg-black/10 border-amber-500/20 text-[#c0a480]/60 hover:text-[#c0a480]"
                }`}
              >
                AI生成
              </button>
            </div>
          </div>

          {/* Style selection */}
          <div>
            <label className="text-xs text-[#c0a480]/80 mb-2 block">
              图片风格
            </label>
            <select
              value={imageStyle}
              onChange={(e) => setImageStyle(e.target.value)}
              className="w-full bg-black/10 border border-amber-500/20 rounded-lg px-3 py-2 text-xs text-[#c0a480] focus:outline-none focus:border-amber-500/40"
            >
              {imageStyleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Generate button */}
          <button
            onClick={handleGenerateAvatar}
            disabled={isGenerating}
            className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 disabled:from-gray-600 disabled:to-gray-500 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>生成中...</span>
              </>
            ) : (
              <>
                <Palette className="w-4 h-4" />
                <span>生成角色卡</span>
              </>
            )}
          </button>
        </motion.div>
      )}

      {/* Generated result */}
      {avatarResult && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-green-500/10 border border-green-500/20 rounded-lg p-3"
        >
          <div className="text-green-400 text-sm font-medium mb-2">
            头像生成成功！
          </div>
          <div className="text-amber-400 text-xs mb-3">
            ⚡ 角色数据已嵌入PNG - 可直接导入使用！
          </div>
          
          {avatarResult.imageUrl && (
            <div className="space-y-3">
              <img
                src={avatarResult.imageUrl}
                alt="Generated Avatar"
                className="w-full h-48 object-cover rounded-lg border border-green-500/20"
              />
              <button
                onClick={handleDownloadAvatar}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
              >
                <Download className="w-4 h-4" />
                <span>下载角色卡</span>
              </button>
            </div>
          )}
          
          {avatarResult.imageDescription && (
            <div className="text-[#c0a480] text-xs mt-3 leading-relaxed">
              {avatarResult.imageDescription}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default AvatarGenerationSection; 
