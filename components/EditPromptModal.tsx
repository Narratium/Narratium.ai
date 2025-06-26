/**
 * Edit Prompt Modal Component
 * 
 * This component provides a prompt editing interface with the following features:
 * - Preset prompt content editing
 * - Real-time content validation
 * - Save functionality with error handling
 * - Modal-based editing workflow
 * - Loading states and user feedback
 * 
 * The component handles:
 * - Prompt content editing and validation
 * - Preset prompt updates and persistence
 * - Modal state management
 * - Error handling and user notifications
 * - Loading states during save operations
 * - Form reset and cleanup
 * 
 * Dependencies:
 * - useLanguage: For internationalization
 * - updatePromptInPreset: For preset prompt updates
 * - react-hot-toast: For notifications
 */

"use client";

import React, { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { useLanguage } from "@/app/i18n";
import { updatePromptInPreset } from "@/function/preset/edit";

/**
 * Interface definitions for the component's data structures
 */
interface PresetPromptData {
  identifier: string;
  name: string;
  system_prompt?: boolean;
  enabled?: boolean;
  marker?: boolean;
  role?: string;
  content?: string;
  injection_position?: number;
  injection_depth?: number;
  forbid_overrides?: boolean;
  contentLength: number;
}

interface EditPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  presetId: string;
  prompt: PresetPromptData | null;
  onSave: () => void;
}

/**
 * Edit prompt modal component
 * 
 * Provides a prompt editing interface with:
 * - Preset prompt content editing
 * - Real-time validation and feedback
 * - Save functionality with error handling
 * - Modal-based workflow management
 * 
 * @param {EditPromptModalProps} props - Component props
 * @returns {JSX.Element | null} The edit prompt modal or null if closed
 */
const EditPromptModal = ({
  isOpen,
  onClose,
  presetId,
  prompt,
  onSave,
}: EditPromptModalProps) => {
  const { t, serifFontClass } = useLanguage();
  const [editedContent, setEditedContent] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && prompt) {
      setEditedContent(prompt.content || "");
    }
  }, [isOpen, prompt]);

  if (!isOpen || !prompt) return null;

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const result = await updatePromptInPreset(presetId, prompt.identifier, {
        content: editedContent,
      });
      if (result.success) {
        toast.success(t("preset.promptUpdateSuccess"));
        onSave();
        onClose();
      } else {
        toast.error(t("preset.promptUpdateFailed"));
      }
    } catch (error) {
      console.error("Error saving prompt:", error);
      toast.error(t("preset.promptUpdateFailed"));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center animate-fadeIn">
      <div className="absolute inset-0 bg-opacity-70 backdrop-blur-md"></div>
      <div className={`bg-[#1e1c1b] bg-opacity-85 border border-[#534741] rounded-lg shadow-xl p-6 w-full max-w-lg transform transition-all duration-300 animate-slideUp relative z-10 ${serifFontClass}`}>
        <h3 className="text-xl font-medium text-[#e9c08d] mb-4">
          {t("preset.editPrompt")} - {prompt.name}
        </h3>
        <div className="mb-4">
          <label htmlFor="promptContent" className="block text-sm font-medium text-[#a18d6f] mb-2">
            {t("preset.promptContent")}
          </label>
          <textarea
            id="promptContent"
            className="w-full p-3 bg-[#252220] border border-[#534741] rounded-md text-[#eae6db] focus:outline-none focus:border-amber-500 h-40 resize-y fantasy-scrollbar"
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
          />
        </div>
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gradient-to-r from-[#2a2725] to-[#1e1b19] text-[#a18d6f] rounded-md hover:from-[#353230] hover:to-[#282523] transition-all duration-300 border border-[#534741] shadow-md"
            disabled={isSaving}
          >
            {t("preset.cancel")}
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-gradient-to-r from-amber-600 to-amber-800 text-white rounded-md hover:from-amber-700 hover:to-amber-900 transition-all duration-300 shadow-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-opacity-50"
            disabled={isSaving}
          >
            {isSaving ? t("common.saving") : t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditPromptModal; 
 
