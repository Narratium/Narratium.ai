"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/app/i18n";
import { setDisplayUsername, resetDisplayUsername } from "@/utils/username-helper";

interface UserNameSettingModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDisplayName?: string;
  onSave: (newDisplayName: string) => void;
}

export default function UserNameSettingModal({ 
  isOpen, 
  onClose, 
  currentDisplayName = "",
  onSave, 
}: UserNameSettingModalProps) {
  const { t, fontClass, serifFontClass } = useLanguage();
  const [displayName, setDisplayName] = useState(currentDisplayName);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDisplayName(currentDisplayName);
    setError("");
  }, [currentDisplayName, isOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }
    
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!displayName.trim()) {
      setError(t("userNameSetting.nameRequired"));
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      // Save the display name using helper function
      setDisplayUsername(displayName.trim());
      onSave(displayName.trim());
      onClose();
    } catch (err) {
      console.error("Save display name error:", err);
      setError(t("userNameSetting.saveFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    if (typeof window !== "undefined") {
      resetDisplayUsername();
      const loginUsername = localStorage.getItem("username") || "";
      setDisplayName(loginUsername);
    }
    setError("");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fantasy-bg bg-opacity-75 border border-[#534741] rounded-lg shadow-lg p-4 sm:p-8 w-full max-w-sm sm:max-w-md relative z-10 backdrop-filter backdrop-blur-sm mx-4"
          >
            <button 
              onClick={onClose}
              className="absolute top-2 right-2 sm:top-4 sm:right-4 text-[#a18d6f] hover:text-[#f9c86d] transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" className="sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            
            <div className="text-center mb-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#f9c86d] mb-2 font-cinzel">
                {t("userNameSetting.title")}
              </h1>
              <p className={`text-sm text-[#a18d6f] ${fontClass}`}>
                {t("userNameSetting.description")}
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-red-400 text-xs sm:text-sm text-center mb-4 p-2 bg-red-900/20 rounded border border-red-500/20"
              >
                {error}
              </motion.div>
            )}

            <form onSubmit={handleSubmit} className="w-full space-y-6">
              {/* Current Login Username Display */}
              <div>
                <label className={`block text-sm text-[#c0a480] mb-2 ${fontClass}`}>
                  {t("userNameSetting.loginUsername")}
                </label>
                <div className="relative magical-input min-h-[50px] flex items-center justify-center bg-[#2a261f]/50 border border-[#534741]/50">
                  <span className={`text-center text-sm text-[#8a8a8a] ${serifFontClass}`}>
                    {typeof window !== "undefined" ? (localStorage.getItem("username") || t("userNameSetting.notLoggedIn")) : t("userNameSetting.notLoggedIn")}
                  </span>
                </div>
              </div>

              {/* Display Username Input */}
              <div>
                <label className={`block text-sm text-[#c0a480] mb-2 ${fontClass}`}>
                  {t("userNameSetting.displayUsername")}
                </label>
                <div className="relative w-full group">
                  <div className="relative magical-input min-h-[60px] flex items-center justify-center">
                    <input
                      type="text"
                      className={`bg-transparent border-0 outline-none w-full text-center text-base text-[#eae6db] placeholder-[#a18d6f] shadow-none focus:ring-0 focus:border-0 ${serifFontClass}`}
                      placeholder={t("userNameSetting.displayNamePlaceholder")}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      disabled={isLoading}
                      autoComplete="off"
                      style={{
                        caretColor: "#f9c86d",
                        caretShape: "bar",
                        background: "transparent",
                        boxShadow: "none",
                        border: "none",
                        borderWidth: "0",
                        borderColor: "transparent",
                        letterSpacing: "0.05em",
                      }}
                    />
                    <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-32 h-0.5 opacity-100 transition-opacity duration-300">
                      <div className="w-full h-full bg-gradient-to-r from-transparent via-[#c0a480] to-transparent"></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-center items-center">
                {/* Reset Button */}
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={isLoading}
                  className={`group relative px-4 py-2 bg-transparent border border-[#8a7660] text-[#8a7660] rounded-full text-sm font-medium transition-all duration-300 hover:border-[#a18d6f] hover:text-[#a18d6f] disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden ${fontClass}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#8a7660]/0 via-[#8a7660]/5 to-[#8a7660]/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-600"></div>
                  <div className="relative z-10 flex items-center justify-center gap-2">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="tracking-wide">{t("userNameSetting.reset")}</span>
                  </div>
                </button>

                {/* Save Button */}
                <button
                  type="submit"
                  disabled={isLoading || !displayName.trim()}
                  className={`group relative px-6 py-2 bg-transparent border border-[#c0a480] text-[#c0a480] rounded-full text-sm font-medium transition-all duration-500 hover:border-[#f9c86d] hover:text-[#f9c86d] hover:shadow-lg hover:shadow-[#c0a480]/20 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden ${serifFontClass}`}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-[#c0a480]/0 via-[#c0a480]/10 to-[#c0a480]/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-[#f9c86d]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative z-10 flex items-center justify-center gap-2">
                    {isLoading ? (
                      <>
                        <div className="animate-spin w-3.5 h-3.5 border border-[#c0a480] border-t-transparent rounded-full"></div>
                        <span className="tracking-wide">{t("userNameSetting.saving")}</span>
                      </>
                    ) : (
                      <>
                        <span className="tracking-wide">{t("userNameSetting.save")}</span>
                        <svg 
                          className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      </>
                    )}
                  </div>
                  <div className="absolute inset-0 rounded-full border border-[#f9c86d]/20 scale-105 opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                </button>
              </div>

              {/* Helper Text */}
              <div className={`text-center mt-4 text-xs text-[#a18d6f] ${fontClass}`}>
                <p>{t("userNameSetting.helperText")}</p>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
} 
