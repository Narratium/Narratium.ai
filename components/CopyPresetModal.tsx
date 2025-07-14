"use client";

import { useState, useEffect } from "react";
import { useLanguage } from "@/app/i18n";
import { createPreset, getPreset } from "@/function/preset/global";
import { toast } from "react-hot-toast";

interface CopyPresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  sourcePresetId: string;
  sourcePresetName: string;
}

export default function CopyPresetModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  sourcePresetId, 
  sourcePresetName, 
}: CopyPresetModalProps) {
  const { t, fontClass, serifFontClass } = useLanguage();
  const [presetName, setPresetName] = useState("");
  const [isCopying, setIsCopying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPresetName(`${sourcePresetName} (Copy)`);
    }
  }, [isOpen, sourcePresetName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!presetName.trim()) {
      toast.error(t("preset.presetNameRequired"));
      return;
    }

    if (!sourcePresetId) {
      toast.error(t("preset.sourcePresetNotFound"));
      return;
    }

    setIsCopying(true);
    
    try {
      // 获取源预设的完整数据
      const sourceResult = await getPreset(sourcePresetId);
      
      if (!sourceResult.success || !sourceResult.data) {
        toast.error(t("preset.loadSourceFailed"));
        return;
      }

      // 创建新预设，复制源预设的所有数据
      const newPreset = {
        name: presetName.trim(),
        enabled: false, // 新复制的预设默认不启用
        prompts: sourceResult.data.prompts || [],
      };

      const result = await createPreset(newPreset);
      if (result.success) {
        toast.success(t("preset.copySuccess"));
        onSuccess();
        handleClose();
      } else {
        toast.error(t("preset.copyFailed"));
      }
    } catch (error) {
      console.error("Copy preset failed:", error);
      toast.error(t("preset.copyFailed"));
    } finally {
      setIsCopying(false);
    }
  };

  const handleClose = () => {
    setPresetName("");
    setIsCopying(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-gradient-to-br from-[#1a1816] via-[#252220] to-[#1a1816] rounded-lg border border-[#534741] shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-[#534741] bg-gradient-to-r from-blue-500/5 to-transparent">
          <div className="flex items-center justify-between">
            <h3 className={`text-lg font-medium text-[#eae6db] ${serifFontClass}`}>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-cyan-400 to-teal-300">
                {t("preset.copyPreset")}
              </span>
            </h3>
            <button
              onClick={handleClose}
              className="w-7 h-7 flex items-center justify-center text-[#a18d6f] hover:text-[#eae6db] transition-colors duration-300 rounded-md hover:bg-[#333] group"
              disabled={isCopying}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:scale-110">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className={`block text-sm font-medium text-[#a18d6f] mb-2 ${fontClass}`}>
              {t("preset.sourcePreset")}
            </label>
            <div className="px-3 py-2 bg-[#252220]/50 text-[#a18d6f] rounded-md border border-[#534741]/50 text-sm">
              {sourcePresetName}
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium text-[#a18d6f] mb-2 ${fontClass}`}>
              {t("preset.newPresetName")}
            </label>
            <input
              type="text"
              value={presetName}
              onChange={(e) => setPresetName(e.target.value)}
              placeholder={t("preset.newPresetNamePlaceholder")}
              disabled={isCopying}
              className={`w-full px-3 py-2 bg-gradient-to-br from-[#1a1816] via-[#252220] to-[#1a1816] 
                text-[#eae6db] rounded-md border border-[#534741] 
                focus:border-blue-500/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20 
                transition-all duration-300 hover:border-[#534741] backdrop-blur-sm
                shadow-inner ${fontClass}
                disabled:opacity-50 disabled:cursor-not-allowed`}
              autoFocus
            />
          </div>

          {/* Footer */}
          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={isCopying}
              className={`px-4 py-2 text-sm font-medium text-[#a18d6f] hover:text-[#eae6db] 
                bg-gradient-to-br from-[#1a1816] via-[#252220] to-[#1a1816] 
                border border-[#534741] rounded-md 
                hover:border-[#534741] transition-all duration-300 backdrop-blur-sm
                disabled:opacity-50 disabled:cursor-not-allowed ${fontClass}`}
            >
              {t("preset.cancel")}
            </button>
            <button
              type="submit"
              disabled={isCopying || !presetName.trim()}
              className={`px-4 py-2 text-sm font-medium 
                bg-gradient-to-r from-[#1a1613] to-[#0f0d0b] 
                hover:from-[#1f1c19] hover:to-[#141108] 
                text-[#8db4e9] hover:text-[#aec7f6] 
                rounded-md transition-all duration-300 
                shadow-lg hover:shadow-blue-500/20 
                border border-[#334050]
                disabled:opacity-50 disabled:cursor-not-allowed ${fontClass}
                flex items-center`}
            >
              {isCopying && (
                <div className="w-4 h-4 mr-2 border-2 border-[#8db4e9] border-t-transparent rounded-full animate-spin"></div>
              )}
              {isCopying ? t("preset.copying") : t("preset.copy")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 
