"use client";

import React, { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/app/i18n";

interface PresetInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  presetName: string;
}

export default function PresetInfoModal({ 
  isOpen, 
  onClose, 
  presetName, 
}: PresetInfoModalProps) {
  const { t, fontClass, serifFontClass, language } = useLanguage();
  const modalRef = useRef<HTMLDivElement>(null);

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

  const getPresetInfo = (presetName: string) => {
    const presetInfoMap: { [key: string]: { title: string; description: string; features: string[] } } = {
      "mirror_realm": {
        title: t("presetInfo.mirrorRealm.title"),
        description: t("presetInfo.mirrorRealm.description"),
        features: [
          t("presetInfo.mirrorRealm.feature1"),
          t("presetInfo.mirrorRealm.feature2"),
          t("presetInfo.mirrorRealm.feature3"),
          t("presetInfo.mirrorRealm.feature4"),
        ],
      },
      "novel_king": {
        title: t("presetInfo.novelKing.title"),
        description: t("presetInfo.novelKing.description"),
        features: [
          t("presetInfo.novelKing.feature1"),
          t("presetInfo.novelKing.feature2"),
          t("presetInfo.novelKing.feature3"),
          t("presetInfo.novelKing.feature4"),
        ],
      },
      "professional_heart": {
        title: t("presetInfo.professionalHeart.title"),
        description: t("presetInfo.professionalHeart.description"),
        features: [
          t("presetInfo.professionalHeart.feature1"),
          t("presetInfo.professionalHeart.feature2"),
          t("presetInfo.professionalHeart.feature3"),
          t("presetInfo.professionalHeart.feature4"),
        ],
      },
      "magician": {
        title: t("presetInfo.magician.title"),
        description: t("presetInfo.magician.description"),
        features: [
          t("presetInfo.magician.feature1"),
          t("presetInfo.magician.feature2"),
          t("presetInfo.magician.feature3"),
          t("presetInfo.magician.feature4"),
        ],
      },
      "whisperer": {
        title: t("presetInfo.whisperer.title"),
        description: t("presetInfo.whisperer.description"),
        features: [
          t("presetInfo.whisperer.feature1"),
          t("presetInfo.whisperer.feature2"),
          t("presetInfo.whisperer.feature3"),
          t("presetInfo.whisperer.feature4"),
        ],
      },
    };

    return presetInfoMap[presetName] || {
      title: t("presetInfo.unknown.title"),
      description: t("presetInfo.unknown.description"),
      features: [],
    };
  };

  const presetInfo = getPresetInfo(presetName);

  const getPresetIcon = (presetName: string) => {
    const iconMap: { [key: string]: React.ReactNode } = {
      "mirror_realm": (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M16 8v5a3 3 0 0 0 6 0v-5a4 4 0 1 0-8 8" />
          <path d="M2 16a4 4 0 1 0 8-8v5a3 3 0 0 1-6 0Z" />
        </svg>
      ),
      "novel_king": (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
          <path d="M9 6h6" />
          <path d="M9 10h6" />
          <path d="M9 14h6" />
        </svg>
      ),
      "professional_heart": (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5Z" />
          <path d="M12 5L8 21l4-7 4 7-4-16" />
        </svg>
      ),
      "magician": (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 4V2a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v2" />
          <path d="M7 4h10l4 4v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8l4-4Z" />
          <path d="M12 11v6" />
          <path d="M9 14h6" />
        </svg>
      ),
      "whisperer": (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2c-4.4 0-8 3.6-8 8v2c0 1.1.9 2 2 2h2v-2c0-3.3 2.7-6 6-6s6 2.7 6 6v2h2c1.1 0 2-.9 2-2v-2c0-4.4-3.6-8-8-8Z" />
          <path d="M12 15v5" />
          <path d="M8 21h8" />
        </svg>
      ),
    };

    return iconMap[presetName] || (
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>
    );
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="fantasy-bg bg-opacity-75 border border-[#534741] rounded-xl shadow-2xl p-4 sm:p-6 w-full max-w-lg relative z-10 backdrop-filter backdrop-blur-sm mx-4 max-h-[85vh] overflow-hidden"
          >
            {/* Close button */}
            <button 
              onClick={onClose}
              className="absolute top-3 right-3 sm:top-4 sm:right-4 text-[#a18d6f] hover:text-[#f9c86d] transition-colors z-20"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" className="sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
            
            {/* Header */}
            <div className="text-center mb-6">
              <div className="flex items-center justify-center mb-3">
                <div className="w-12 h-12 flex items-center justify-center text-[#f9c86d] bg-[#1c1c1c] rounded-xl border border-[#534741] shadow-inner">
                  {getPresetIcon(presetName)}
                </div>
              </div>
              <h1 className={`text-xl sm:text-2xl font-bold text-[#f9c86d] mb-2 ${serifFontClass}`}>
                {presetInfo.title}
              </h1>
              <p className={`text-sm text-[#a18d6f] ${fontClass}`}>
                {t("presetInfo.modalTitle")}
              </p>
            </div>

            {/* Content */}
            <div className="overflow-y-auto max-h-[50vh] space-y-4">
              {/* Description */}
              <div className="p-4 bg-gradient-to-br from-[#2a261f]/60 via-[#1a1816]/40 to-[#2a261f]/60 rounded-lg border border-[#534741]/50">
                <h3 className={`text-sm font-medium text-[#f4e8c1] mb-2 ${serifFontClass}`}>
                  {t("presetInfo.description")}
                </h3>
                <p className={`text-xs sm:text-sm text-[#c0a480] leading-relaxed ${fontClass}`}>
                  {presetInfo.description}
                </p>
              </div>

              {/* Features */}
              <div className="p-4 bg-gradient-to-br from-[#2a261f]/60 via-[#1a1816]/40 to-[#2a261f]/60 rounded-lg border border-[#534741]/50">
                <h3 className={`text-sm font-medium text-[#f4e8c1] mb-3 ${serifFontClass}`}>
                  {t("presetInfo.features")}
                </h3>
                <ul className="space-y-2">
                  {presetInfo.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <div className="w-1.5 h-1.5 rounded-full bg-[#f9c86d] mt-2 mr-3 flex-shrink-0"></div>
                      <span className={`text-xs sm:text-sm text-[#c0a480] ${fontClass}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Usage tip */}
              <div className="p-3 bg-gradient-to-r from-amber-900/20 to-orange-900/20 border border-amber-500/30 rounded-lg">
                <div className="flex items-start">
                  <div className="w-4 h-4 flex items-center justify-center text-amber-400 mr-2 mt-0.5 flex-shrink-0">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 16v-4" />
                      <path d="M12 8h.01" />
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                  </div>
                  <p className={`text-xs text-amber-300 leading-relaxed ${fontClass}`}>
                    {t("presetInfo.tip")}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
} 
