"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { useLanguage } from "@/app/i18n";

interface PWAInstallButtonProps {
  isOpen: boolean;
  animationComplete: boolean;
  fontClass: string;
  onOpenDownloadModal: () => void;
}

export default function PWAInstallButton({ isOpen, animationComplete, fontClass, onOpenDownloadModal }: PWAInstallButtonProps) {
  const { t } = useLanguage();

  return (
    <div>
      <button
        onClick={onOpenDownloadModal}
        className={`focus:outline-none group relative overflow-hidden rounded-md w-full transition-all duration-300 ${!isOpen ? "p-2 flex justify-center" : "py-1.5 px-2 flex items-center justify-center"} cursor-pointer`}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-[#242424]/0 to-[#1a1a1a]/0 opacity-0 group-hover:opacity-80 transition-opacity duration-300"></div>
        <div className="relative flex items-center justify-center transition-all duration-300 z-10">
          <div className={`${isOpen ? "w-6 h-6" : "w-8 h-8"} flex items-center justify-center flex-shrink-0 text-[#f8d36a] group-hover:text-[#ffc107] transition-colors duration-300`}>
            <Download size={isOpen ? 14 : 16} className="transition-transform duration-300 group-hover:scale-110" />
          </div>
          {isOpen && (
            <div className="ml-2 transition-all duration-300 ease-in-out overflow-hidden" style={{ transitionDelay: isOpen ? "50ms" : "0ms", opacity: isOpen ? 1 : 0 }}>
              <span className={`magical-text whitespace-nowrap block text-xs font-medium bg-clip-text text-transparent bg-gradient-to-r from-[#f8d36a] to-[#ffc107] ${fontClass}`}>
                {isOpen && t("sidebar.downloadApp").split("").map((char, index) => (
                  <span 
                    key={index} 
                    className="inline-block transition-all duration-300" 
                    style={{ 
                      opacity: animationComplete ? 1 : 0,
                      transform: animationComplete ? "translateY(0)" : "translateY(8px)",
                      transitionDelay: `${250 + index * 30}ms`,
                      width: char === " " ? "0.25em" : "auto",
                    }}
                  >
                    {char}
                  </span>
                ))}
              </span>
            </div>
          )}
        </div>
        <div className="absolute inset-0 w-full h-full bg-[#333] opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
        <div className="absolute bottom-0 left-0 h-[1px] bg-gradient-to-r from-transparent via-[#f8d36a] to-transparent w-0 group-hover:w-full transition-all duration-500"></div>
      </button>
    </div>
  );
} 
