/**
 * Advanced Settings Editor Component
 * 
 * This component provides an advanced settings interface that includes:
 * - Tag color editing capabilities
 * - Modal-based settings management
 * - Tabbed interface for different setting categories
 * - Responsive design with backdrop blur effects
 * - Smooth animations and transitions
 * 
 * The component handles:
 * - Modal display and positioning
 * - Tab navigation between different settings
 * - Click outside to close functionality
 * - Animation states and transitions
 * 
 * Dependencies:
 * - useLanguage: For internationalization
 * - TagColorEditor: For tag color management
 * - fantasy-ui.css: For styling
 */

import React, { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/app/i18n";
import { TagColorEditor } from "@/components/TagColorEditor";
import "@/app/styles/fantasy-ui.css";

/**
 * Interface definitions for the component's props
 */
interface AdvancedSettingsEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onViewSwitch?: () => void;
}

/**
 * Advanced settings editor modal component
 * 
 * Provides a comprehensive settings interface with:
 * - Modal overlay with backdrop blur
 * - Tabbed navigation for different setting categories
 * - Smooth animations and transitions
 * - Responsive design adaptation
 * 
 * @param {AdvancedSettingsEditorProps} props - Component props
 * @returns {JSX.Element | null} The advanced settings modal or null if closed
 */
const AdvancedSettingsEditor: React.FC<AdvancedSettingsEditorProps> = ({ isOpen, onClose, onViewSwitch }) => {
  const { t, fontClass, serifFontClass } = useLanguage();
  const [activeTab, setActiveTab] = useState<string>("tagColors");
  const modalRef = useRef<HTMLDivElement>(null);
  const [animationComplete, setAnimationComplete] = useState(false);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      const timer = setTimeout(() => setAnimationComplete(true), 100);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        clearTimeout(timer);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden p-2 sm:p-4">
      <div className="absolute inset-0 backdrop-blur-md"></div>
      <div 
        ref={modalRef} 
        className="relative bg-gradient-to-br from-[#232323] to-[#1a1a1a] rounded-xl shadow-2xl w-full max-w-3xl h-[85vh] sm:h-[calc(100vh-4rem)] max-h-[500px] sm:max-h-[700px] flex flex-col overflow-hidden border border-neutral-700/50 transform transition-all duration-300 ease-in-out scale-95 opacity-0 animate-fadeInScaleUp"
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-gradient-to-br from-amber-500/10 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-gradient-to-tr from-amber-500/10 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-amber-500/5 to-transparent rounded-full blur-3xl"></div>
        </div>

        <div className="flex items-center justify-between p-2 sm:p-5 border-b border-neutral-700/50 relative">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div className="w-5 h-5 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-600/30 flex items-center justify-center border border-amber-500/30 shadow-lg shadow-amber-500/10">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                <path d="M2 17l10 5 10-5"></path>
                <path d="M2 12l10 5 10-5"></path>
              </svg>
            </div>
            <h2 className={`text-sm sm:text-xl font-semibold ${serifFontClass} bg-clip-text text-transparent bg-gradient-to-r from-amber-500 via-orange-400 to-yellow-300`}>
              {t("characterChat.advancedSettings")}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-5 h-5 sm:w-7 sm:h-7 flex items-center justify-center text-[#a18d6f] hover:text-[#eae6db] transition-colors duration-300 rounded-md hover:bg-[#333] group relative"
            aria-label={t("common.close")}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="relative z-10 transition-transform duration-300 group-hover:scale-110">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <div className="w-24 sm:w-56 border-r border-neutral-700/50 p-2 sm:p-5 bg-neutral-800/20 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-50"></div>
            <div className="relative z-10 space-y-1 sm:space-y-2">
              <button
                className={`w-full text-left px-1.5 sm:px-3 py-1.5 sm:py-2.5 rounded-lg transition-all duration-200 ease-in-out text-[10px] sm:text-sm font-medium ${fontClass} ${
                  activeTab === "tagColors"
                    ? "bg-gradient-to-r from-slate-700/80 via-amber-800/60 to-slate-700/80 text-amber-200 shadow-sm border border-amber-600/30 hover:shadow-lg hover:shadow-amber-500/20"
                    : "text-neutral-400 hover:bg-neutral-700/40 hover:text-neutral-200"
                }`}
                onClick={() => setActiveTab("tagColors")}
              >
                <div className="flex items-center space-x-1 sm:space-x-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
                    <circle cx="13.5" cy="6.5" r=".5"></circle>
                    <circle cx="17.5" cy="10.5" r=".5"></circle>
                    <circle cx="8.5" cy="7.5" r=".5"></circle>
                    <circle cx="6.5" cy="12.5" r=".5"></circle>
                    <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"></path>
                  </svg>
                  <span className="truncate">{t("characterChat.tagColorEditor")}</span>
                </div>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 sm:p-6 bg-neutral-900/30 fantasy-scrollbar relative">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-30"></div>
            <div className="relative z-10">
              {activeTab === "tagColors" && (
                <TagColorEditor
                  onSave={(colors) => {
                  }}
                  onViewSwitch={onViewSwitch}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fadeInScaleUp {
          0% {
            opacity: 0;
            transform: scale(0.95);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        .animate-fadeInScaleUp {
          animation: fadeInScaleUp 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
};

export default AdvancedSettingsEditor;
