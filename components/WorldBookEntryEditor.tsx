"use client";

import { useLanguage } from "@/app/i18n";
import { useState, useRef, useEffect } from "react";

interface EditingEntry {
  entry_id: string;
  id?: number;
  comment: string;
  keys: string[];
  secondary_keys: string[];
  content: string;
  position: number;
  depth: number;
  enabled: boolean;
  use_regex: boolean;
  selective: boolean;
  constant: boolean;
  insertion_order: number;
}

interface WorldBookEntryEditorProps {
  isOpen: boolean;
  editingEntry: EditingEntry | null;
  isSaving: boolean;
  onClose: () => void;
  onSave: () => void;
  onEntryChange: (entry: EditingEntry) => void;
}

export default function WorldBookEntryEditor({
  isOpen,
  editingEntry,
  isSaving,
  onClose,
  onSave,
  onEntryChange,
}: WorldBookEntryEditorProps) {
  const { t, fontClass, serifFontClass } = useLanguage();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);
  const fullscreenModalRef = useRef<HTMLDivElement>(null);

  // Add click outside handler effect
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isFullscreen) {
        // Handle fullscreen modal click outside
        if (fullscreenModalRef.current && !fullscreenModalRef.current.contains(event.target as Node)) {
          setIsFullscreen(false);
        }
      } else {
        // Handle main modal click outside
        if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
          onClose();
        }
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen, isFullscreen, onClose]);

  if (!isOpen || !editingEntry) return null;

  const handleKeywordChange = (index: number, value: string) => {
    const newKeys = [...editingEntry.keys];
    newKeys[index] = value;
    onEntryChange({ ...editingEntry, keys: newKeys });
  };

  const handleRemoveKeyword = (index: number) => {
    const newKeys = editingEntry.keys.filter((_, i) => i !== index);
    onEntryChange({ ...editingEntry, keys: newKeys });
  };

  const handleAddKeyword = () => {
    onEntryChange({ ...editingEntry, keys: [...editingEntry.keys, ""] });
  };

  const handleSecondaryKeywordChange = (index: number, value: string) => {
    const newKeys = [...editingEntry.secondary_keys];
    newKeys[index] = value;
    onEntryChange({ ...editingEntry, secondary_keys: newKeys });
  };

  const handleRemoveSecondaryKeyword = (index: number) => {
    const newKeys = editingEntry.secondary_keys.filter((_, i) => i !== index);
    onEntryChange({ ...editingEntry, secondary_keys: newKeys });
  };

  const handleAddSecondaryKeyword = () => {
    onEntryChange({ ...editingEntry, secondary_keys: [...editingEntry.secondary_keys, ""] });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 backdrop-blur-sm"></div>
      <div 
        ref={modalRef}
        className="bg-[#1e1c1b] bg-opacity-75 border border-[#534741] rounded-xl w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-2xl shadow-black/50 relative z-10 backdrop-filter backdrop-blur-sm"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5 pointer-events-none"></div>
        
        <div className="relative border-b border-[#534741]/60">
          <div className="p-4 bg-[#252220]/90">
            <div className="flex items-center justify-between">
              <h3 className={`text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-300 to-yellow-300 ${serifFontClass}`}>
                {editingEntry.id ? t("worldBook.editEntry") : t("worldBook.newEntry")}
              </h3>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center text-[#a18d6f] hover:text-[#eae6db] transition-all duration-300 rounded-lg hover:bg-[#333]/50 group"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:scale-110 group-hover:rotate-90">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="relative p-5 overflow-y-auto fantasy-scrollbar max-h-[calc(85vh-140px)]">
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className={`block text-sm font-medium text-[#c0a480] ${fontClass}`}>
                  {t("worldBook.commentTitle")}
                </label>
                <input
                  type="text"
                  value={editingEntry.comment}
                  onChange={(e) => onEntryChange({ ...editingEntry, comment: e.target.value })}
                  className={`w-full bg-[#252220]/80 border border-[#534741]/60 rounded-lg px-3 py-2.5 text-[#eae6db] focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all duration-300 backdrop-blur-sm ${fontClass}`}
                  placeholder={t("worldBook.commentPlaceholder")}
                />
              </div>
              
              <div className="space-y-2">
                <label className={`block text-sm font-medium text-[#c0a480] ${fontClass}`}>
                  {t("worldBook.insertionOrder")}
                </label>
                <input
                  type="number"
                  value={editingEntry.insertion_order}
                  onChange={(e) => onEntryChange({ ...editingEntry, insertion_order: Number(e.target.value) })}
                  className={`w-full bg-[#252220]/80 border border-[#534741]/60 rounded-lg px-3 py-2.5 text-[#eae6db] focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all duration-300 backdrop-blur-sm ${fontClass}`}
                />
              </div>
            </div>

            <div className="space-y-3">
              <label className={`block text-sm font-medium text-[#c0a480] ${fontClass}`}>
                {t("worldBook.primaryKeywords")}
              </label>
              <div className="space-y-2">
                {editingEntry.keys.map((key, index) => (
                  <div key={index} className="flex items-center space-x-2 group">
                    <input
                      type="text"
                      value={key}
                      onChange={(e) => handleKeywordChange(index, e.target.value)}
                      className={`flex-1 bg-[#252220]/80 border border-[#534741]/60 rounded-lg px-3 py-2.5 text-[#eae6db] focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all duration-300 backdrop-blur-sm ${fontClass}`}
                      placeholder={t("worldBook.keywordPlaceholder")}
                    />
                    {editingEntry.keys.length > 1 && (
                      <button
                        onClick={() => handleRemoveKeyword(index)}
                        className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-300 transition-all duration-300 rounded-lg hover:bg-red-500/10 opacity-0 group-hover:opacity-100"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={handleAddKeyword}
                  className={`text-sm text-amber-400 hover:text-amber-300 transition-all duration-300 flex items-center space-x-1 group ${fontClass}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:scale-110">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  <span>{t("worldBook.addKeyword")}</span>
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <label className={`block text-sm font-medium text-[#c0a480] ${fontClass}`}>
                {t("worldBook.secondaryKeywords")}
              </label>
              <div className="space-y-2">
                {editingEntry.secondary_keys.map((key, index) => (
                  <div key={index} className="flex items-center space-x-2 group">
                    <input
                      type="text"
                      value={key}
                      onChange={(e) => handleSecondaryKeywordChange(index, e.target.value)}
                      className={`flex-1 bg-[#252220]/80 border border-[#534741]/60 rounded-lg px-3 py-2.5 text-[#eae6db] focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-300 backdrop-blur-sm ${fontClass}`}
                      placeholder={t("worldBook.keywordPlaceholder")}
                    />
                    <button
                      onClick={() => handleRemoveSecondaryKeyword(index)}
                      className="w-8 h-8 flex items-center justify-center text-red-400 hover:text-red-300 transition-all duration-300 rounded-lg hover:bg-red-500/10 opacity-0 group-hover:opacity-100"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    </button>
                  </div>
                ))}
                <button
                  onClick={handleAddSecondaryKeyword}
                  className={`text-sm text-blue-400 hover:text-blue-300 transition-all duration-300 flex items-center space-x-1 group ${fontClass}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:scale-110">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                  </svg>
                  <span>{t("worldBook.addKeyword")}</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className={`block text-sm font-medium text-[#c0a480] ${fontClass}`}>
                  {t("worldBook.position")}
                </label>
                <select
                  value={editingEntry.position}
                  onChange={(e) => onEntryChange({ ...editingEntry, position: Number(e.target.value) })}
                  className={`w-full bg-[#252220]/80 border border-[#534741]/60 rounded-lg px-3 py-2.5 text-[#eae6db] focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all duration-300 backdrop-blur-sm ${fontClass}`}
                >
                  <option value={0}>{t("worldBook.positionOptions.systemPromptStart")}</option>
                  <option value={1}>{t("worldBook.positionOptions.afterSystemPrompt")}</option>
                  <option value={2}>{t("worldBook.positionOptions.userMessageStart")}</option>
                  <option value={3}>{t("worldBook.positionOptions.afterResponseMode")}</option>
                  <option value={4}>{t("worldBook.positionOptions.basedOnDepth")}</option>
                </select>
              </div>
        
              <div className="space-y-2">
                <label className={`block text-sm font-medium text-[#c0a480] ${fontClass}`}>
                  {t("worldBook.depthLabel")}
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={editingEntry.depth}
                  onChange={(e) => onEntryChange({ ...editingEntry, depth: Number(e.target.value) })}
                  className={`w-full bg-[#252220]/80 border border-[#534741]/60 rounded-lg px-3 py-2.5 text-[#eae6db] focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all duration-300 backdrop-blur-sm ${fontClass}`}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <label className={`flex items-center space-x-3 cursor-pointer p-3 rounded-lg bg-[#252220]/40 border border-[#534741]/40 hover:bg-[#252220]/60 hover:border-[#534741]/60 transition-all duration-300 group ${fontClass}`}>
                <input
                  type="checkbox"
                  checked={editingEntry.enabled}
                  onChange={(e) => onEntryChange({ ...editingEntry, enabled: e.target.checked })}
                  className="w-4 h-4 rounded border-[#534741] bg-[#1a1816] text-amber-500 focus:ring-amber-500/50 focus:ring-2 transition-all duration-300"
                />
                <span className="text-sm text-[#eae6db] group-hover:text-amber-200 transition-colors duration-300">{t("worldBook.enabledLabel")}</span>
              </label>
              
              <label className={`flex items-center space-x-3 cursor-pointer p-3 rounded-lg bg-[#252220]/40 border border-[#534741]/40 hover:bg-[#252220]/60 hover:border-[#534741]/60 transition-all duration-300 group ${fontClass}`}>
                <input
                  type="checkbox"
                  checked={editingEntry.use_regex}
                  onChange={(e) => onEntryChange({ ...editingEntry, use_regex: e.target.checked })}
                  className="w-4 h-4 rounded border-[#534741] bg-[#1a1816] text-blue-500 focus:ring-blue-500/50 focus:ring-2 transition-all duration-300"
                />
                <span className="text-sm text-[#eae6db] group-hover:text-blue-200 transition-colors duration-300">{t("worldBook.regexLabel")}</span>
              </label>
              
              <label className={`flex items-center space-x-3 cursor-pointer p-3 rounded-lg bg-[#252220]/40 border border-[#534741]/40 hover:bg-[#252220]/60 hover:border-[#534741]/60 transition-all duration-300 group ${fontClass}`}>
                <input
                  type="checkbox"
                  checked={editingEntry.selective}
                  onChange={(e) => onEntryChange({ ...editingEntry, selective: e.target.checked })}
                  className="w-4 h-4 rounded border-[#534741] bg-[#1a1816] text-green-500 focus:ring-green-500/50 focus:ring-2 transition-all duration-300"
                />
                <span className="text-sm text-[#eae6db] group-hover:text-green-200 transition-colors duration-300">{t("worldBook.selectiveLabel")}</span>
              </label>
              
              <label className={`flex items-center space-x-3 cursor-pointer p-3 rounded-lg bg-[#252220]/40 border border-[#534741]/40 hover:bg-[#252220]/60 hover:border-[#534741]/60 transition-all duration-300 group ${fontClass}`}>
                <input
                  type="checkbox"
                  checked={editingEntry.constant}
                  onChange={(e) => onEntryChange({ ...editingEntry, constant: e.target.checked })}
                  className="w-4 h-4 rounded border-[#534741] bg-[#1a1816] text-purple-500 focus:ring-purple-500/50 focus:ring-2 transition-all duration-300"
                />
                <span className="text-sm text-[#eae6db] group-hover:text-purple-200 transition-colors duration-300">{t("worldBook.constantLabel")}</span>
              </label>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className={`block text-sm font-medium text-[#c0a480] ${fontClass}`}>
                  {t("worldBook.contentLabel")}
                </label>
                <div className="flex items-center space-x-2">
                  <span className={`text-xs text-[#a18d6f]/70 bg-[#252220]/60 px-2 py-1 rounded-md ${fontClass}`}>
                    {editingEntry.content.length} {t("worldBook.characters")}
                  </span>
                  <button
                    onClick={() => setIsFullscreen(true)}
                    className="w-7 h-7 flex items-center justify-center text-[#a18d6f] hover:text-[#eae6db] transition-colors duration-300 rounded-md hover:bg-[#333]/50 group"
                    title={t("worldBook.fullscreenContent")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:scale-110">
                      <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"></path>
                    </svg>
                  </button>
                </div>
              </div>
              <textarea
                value={editingEntry.content}
                onChange={(e) => onEntryChange({ ...editingEntry, content: e.target.value })}
                className={`w-full h-36 bg-[#252220]/80 border border-[#534741]/60 rounded-lg px-3 py-3 text-[#eae6db] focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all duration-300 resize-none fantasy-scrollbar backdrop-blur-sm ${fontClass}`}
                placeholder={t("worldBook.contentPlaceholder")}
              />
            </div>
          </div>
        </div>

        <div className="relative p-4 border-t border-[#534741]/60 bg-[#1e1c1b]/90 backdrop-blur-sm flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isSaving}
            className={`px-4 py-2.5 text-sm text-[#a18d6f] hover:text-[#eae6db] transition-all duration-300 disabled:opacity-50 rounded-lg hover:bg-[#333]/30 ${fontClass}`}
          >
            {t("worldBook.cancel")}
          </button>
          <button
            onClick={onSave}
            className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${fontClass} ${"bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-105"
            }`}
          >
            {isSaving ? (
              <span className="flex items-center">
                <div className="relative w-4 h-4 mr-2">
                  <div className="absolute inset-0 rounded-full border-2 border-t-white border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                </div>
                {t("worldBook.saving")}
              </span>
            ) : t("worldBook.save")}
          </button>
        </div>
      </div>

      {isFullscreen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div className="absolute inset-0 backdrop-blur-md"></div>
          <div 
            ref={fullscreenModalRef}
            className="relative w-full max-w-5xl h-[85vh] bg-[#1e1c1b] bg-opacity-95 border border-[#534741] rounded-xl overflow-hidden shadow-2xl shadow-black/50 backdrop-filter backdrop-blur-sm"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-orange-500/5 pointer-events-none"></div>
            <div className="relative border-b border-[#534741]/60">
              <div className="p-4 bg-[#252220]/90">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <h3 className={`text-lg font-semibold text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-orange-300 to-yellow-300 ${serifFontClass}`}>
                      {t("worldBook.contentLabel")} - {editingEntry.comment || t("worldBook.newEntry")}
                    </h3>
                    <span className={`text-sm text-[#a18d6f]/70 bg-[#252220]/60 px-3 py-1.5 rounded-md ${fontClass}`}>
                      {editingEntry.content.length} {t("worldBook.characters")}
                    </span>
                  </div>
                  <button
                    onClick={() => setIsFullscreen(false)}
                    className="w-8 h-8 flex items-center justify-center text-[#a18d6f] hover:text-[#eae6db] transition-all duration-300 rounded-lg hover:bg-[#333]/50 group"
                    title={t("worldBook.exitFullscreen")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:scale-110 group-hover:rotate-90">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <div className="relative p-6 h-[calc(85vh-80px)]">
              <textarea
                value={editingEntry.content}
                onChange={(e) => onEntryChange({ ...editingEntry, content: e.target.value })}
                className={`w-full h-full bg-[#252220]/80 border border-[#534741]/60 rounded-lg px-4 py-4 text-[#eae6db] focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/50 transition-all duration-300 resize-none fantasy-scrollbar backdrop-blur-sm text-base leading-relaxed ${fontClass}`}
                placeholder={t("worldBook.contentPlaceholder")}
                style={{ fontSize: "16px", lineHeight: "1.6" }}
                autoFocus
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
