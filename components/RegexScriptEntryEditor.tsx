"use client";

import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/app/i18n";
import { RegexScript } from "@/lib/models/regex-script-model";
import { toast } from "react-hot-toast";

interface RegexScriptEntryEditorProps {
  isOpen: boolean;
  editingScript: Partial<RegexScript> | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: (script: Partial<RegexScript>) => Promise<void>;
  onScriptChange: (script: Partial<RegexScript>) => void;
}

export default function RegexScriptEntryEditor({
  isOpen,
  editingScript,
  isSaving,
  onClose,
  onSave,
  onScriptChange,
}: RegexScriptEntryEditorProps) {
  const { t, fontClass, serifFontClass } = useLanguage();
  const modalRef = useRef<HTMLDivElement>(null);
  const [localScript, setLocalScript] = useState<Partial<RegexScript>>({
    scriptName: "",
    findRegex: "",
    replaceString: "",
    placement: [999],
    disabled: false,
    trimStrings: [],
  });

  useEffect(() => {
    if (editingScript) {
      setLocalScript({
        ...editingScript,
        // Ensure replaceString is always a string, even if undefined
        replaceString: editingScript.replaceString || "",
      });
    } else {
      setLocalScript({
        scriptName: "",
        findRegex: "",
        replaceString: "",
        placement: [999],
        disabled: false,
        trimStrings: [],
      });
    }
  }, [editingScript]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen, onClose]);

  const updateScript = (updates: Partial<RegexScript>) => {
    const newScript = { ...localScript, ...updates };
    setLocalScript(newScript);
    onScriptChange(newScript);
  };

  const handleSave = async () => {
    // Only scriptName and findRegex are required, replaceString can be empty
    if (!localScript.scriptName?.trim() || !localScript.findRegex?.trim()) {
      toast.error(t("regexScriptEditor.requiredFields") || "Please fill in script name and find regex");
      return;
    }
    try {
      // Ensure replaceString is always a string, even if empty
      const scriptToSave = {
        ...localScript,
        replaceString: localScript.replaceString || "",
      };
      await onSave(scriptToSave);
      onClose();
    } catch (error) {
      console.error("Error saving script:", error);
      toast.error(t("regexScriptEditor.saveError") || "Failed to save script");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div 
        ref={modalRef}
        className="bg-gradient-to-br from-[#1a1816] via-[#252220] to-[#1a1816] rounded-xl p-5 w-full max-w-2xl border border-[#534741]/60 shadow-2xl shadow-black/30 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/3 via-transparent to-amber-500/3 opacity-50"></div>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500/30 to-transparent"></div>
        
        <div className="relative z-10">
          <div className="flex justify-between items-center mb-5">
            <h2 className={`text-lg text-[#eae6db] ${serifFontClass} font-medium`}>
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-orange-300 to-yellow-400">
                {editingScript?.id ? t("regexScriptEditor.editScript") : t("regexScriptEditor.newScript")}
              </span>
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-[#a18d6f] hover:text-[#f4e8c1] transition-all duration-300 rounded-lg hover:bg-[#333]/50 group"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className={`block text-xs text-[#a18d6f] mb-1.5 font-medium ${fontClass}`}>
                {t("regexScriptEditor.scriptName")} <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={localScript.scriptName || ""}
                onChange={(e) => updateScript({ scriptName: e.target.value })}
                className="w-full px-3 py-2 bg-gradient-to-br from-[#1a1816] to-[#252220] border border-[#534741]/60 rounded-lg text-[#f4e8c1] 
                  focus:border-amber-500/60 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all duration-300
                  placeholder-[#a18d6f]/70 hover:border-[#534741] text-sm"
                placeholder={t("regexScriptEditor.scriptNamePlaceholder")}
              />
            </div>

            <div>
              <label className={`block text-xs text-[#a18d6f] mb-1.5 font-medium ${fontClass}`}>
                {t("regexScriptEditor.findRegex")} <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={localScript.findRegex || ""}
                onChange={(e) => updateScript({ findRegex: e.target.value })}
                className="w-full px-3 py-2 bg-gradient-to-br from-[#1a1816] to-[#252220] border border-[#534741]/60 rounded-lg text-[#f9c86d] 
                  focus:border-amber-500/60 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all duration-300
                  placeholder-[#a18d6f]/70 hover:border-[#534741] font-mono text-sm"
                placeholder={t("regexScriptEditor.findRegexPlaceholder")}
              />
            </div>

            <div>
              <label className={`block text-xs text-[#a18d6f] mb-1.5 font-medium ${fontClass}`}>
                {t("regexScriptEditor.replaceString")} <span className="text-[#a18d6f] text-[10px]">({t("regexScriptEditor.optional") || "optional"})</span>
              </label>
              <input
                type="text"
                value={localScript.replaceString || ""}
                onChange={(e) => updateScript({ replaceString: e.target.value })}
                className="w-full px-3 py-2 bg-gradient-to-br from-[#1a1816] to-[#252220] border border-[#534741]/60 rounded-lg text-[#93c5fd] 
                  focus:border-amber-500/60 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all duration-300
                  placeholder-[#a18d6f]/70 hover:border-[#534741] font-mono text-sm"
                placeholder={t("regexScriptEditor.replaceStringPlaceholder") || "Leave empty to remove matched text"}
              />
              <div className={`mt-1 text-[10px] text-[#a18d6f]/80 ${fontClass}`}>
                {(localScript.replaceString || "").length === 0 ? 
                  <span className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {t("regexScriptEditor.emptyReplaceHint") || "Empty: Will remove matched text"}
                  </span> : 
                  `${(localScript.replaceString || "").length} characters`
                }
              </div>
            </div>

            <div className="flex items-end space-x-4">
              <div className="flex-shrink-0">
                <label className={`block text-xs text-[#a18d6f] mb-1.5 font-medium ${fontClass}`}>
                  {t("regexScriptEditor.priority")}
                </label>
                <input
                  type="number"
                  value={localScript.placement?.[0] || 999}
                  onChange={(e) => updateScript({ placement: [parseInt(e.target.value) || 999] })}
                  className="w-20 px-3 py-2 bg-gradient-to-br from-[#1a1816] to-[#252220] border border-[#534741]/60 rounded-lg text-[#f4e8c1] 
                    focus:border-amber-500/60 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all duration-300
                    hover:border-[#534741] text-sm text-center"
                  min="0"
                  max="999"
                />
              </div>
              <label className="flex items-center space-x-2 pb-2 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={localScript.disabled || false}
                    onChange={(e) => updateScript({ disabled: e.target.checked })}
                    className="sr-only"
                  />
                  <div className={`w-5 h-5 rounded border-2 transition-all duration-300 flex items-center justify-center ${
                    localScript.disabled 
                      ? "bg-gradient-to-br from-orange-600 to-orange-700 border-orange-500/60" 
                      : "bg-gradient-to-br from-[#1a1816] to-[#252220] border-[#534741]/60 group-hover:border-amber-500/40"
                  }`}>
                    {localScript.disabled && (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className={`text-xs text-[#f4e8c1] font-medium ${fontClass} group-hover:text-amber-200 transition-colors`}>
                  {t("regexScriptEditor.disabled")}
                </span>
              </label>
            </div>

            <div className="flex justify-end space-x-3 mt-6 pt-4 border-t border-[#534741]/30">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gradient-to-br from-[#252220] to-[#1a1816] hover:from-[#342f25] hover:to-[#252220] 
                  text-[#f4e8c1] rounded-lg border border-[#534741]/60 transition-all duration-300 text-sm font-medium
                  hover:border-[#534741] hover:shadow-lg group"
              >
                <span className={`${serifFontClass} group-hover:scale-105 transition-transform inline-block`}>
                  {t("regexScriptEditor.cancel")}
                </span>
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="px-4 py-2 bg-gradient-to-br from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 
                  text-[#1a1816] rounded-lg font-medium transition-all duration-300 text-sm
                  disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-amber-500/25 group
                  disabled:hover:shadow-none"
              >
                <span className={`${serifFontClass} flex items-center group-hover:scale-105 transition-transform ${isSaving ? "" : "group-hover:text-white"}`}>
                  {isSaving && (
                    <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-[#1a1816]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  )}
                  {isSaving ? t("regexScriptEditor.saving") : t("regexScriptEditor.save")}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
