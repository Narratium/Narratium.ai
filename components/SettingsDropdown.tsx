"use client";

import { useState, useRef, useEffect } from "react";
import { useLanguage } from "@/app/i18n";
import { useSoundContext } from "@/contexts/SoundContext";
import { useTour } from "@/hooks/useTour";
import { exportDataToFile, importDataFromFile, generateExportFilename, downloadFile } from "@/function/data/export-import";
import { backupToGoogle, getFolderList, getGoogleCodeByUrl, getGoogleLoginUrl, getBackUpFile } from "@/function/data/google-control";

interface SettingsDropdownProps {
  toggleModelSidebar: () => void;
}

export default function SettingsDropdown({ toggleModelSidebar }: SettingsDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { language, setLanguage, t } = useLanguage();
  const { soundEnabled, toggleSound } = useSoundContext();
  const { resetTour } = useTour();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const toggleLanguage = () => {
    const newLanguage = language === "zh" ? "en" : "zh";
    setLanguage(newLanguage);
    document.documentElement.lang = newLanguage;
  };

  const openModelSettings = () => {
    toggleModelSidebar();
    setIsOpen(false);
  };

  const handleExportData = async () => {
    try {
      const blob = await exportDataToFile();
      const filename = generateExportFilename();
      downloadFile(blob, filename);
      setIsOpen(false);
    } catch (error) {
      console.error("Export failed:", error);
      alert(t("common.exportFailed"));
    }
  };

  const handleImportData = async () => {
    try {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json";
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          await importDataFromFile(file);
          setIsOpen(false);
          window.location.reload();
        }
      };
      input.click();
    } catch (error) {
      console.error("Import failed:", error);
      alert(t("common.importFailed"));
    }
  };

  async function handleImportDataFromGoogle() {
    const token = localStorage.getItem('google_drive_token')
    if(token) {
      const res = await getFolderList()
      if(res?.id) {
        const file = await getBackUpFile(res.id)
        if(file) {
          await importDataFromFile(file);
          setIsOpen(false);
          alert('导入成功！')
          window.location.reload();
        }
      }
    } else {
      const url = getGoogleLoginUrl();
      window.location.href = url
    }
  }

  async function handleExportDataToGoogle() {
    const token = localStorage.getItem('google_drive_token')
    if(token) {
      const blob = await exportDataToFile();
      const filename = generateExportFilename();
      const res = await getFolderList()
      if(res?.id) {
        await backupToGoogle({
          blob,
          filename,
          folderId: res.id
        })
        // todo
        alert('上传成功')
      } 
    } else {
      const url = getGoogleLoginUrl();
      window.location.href = url
    }
  }

  const useFirst = useRef(false);
  useEffect(() => {
    if(useFirst.current) return
    useFirst.current = true
    getGoogleCodeByUrl(window.location);
  }, [])

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        data-tour="settings-button"
        className="w-8 h-8 flex items-center justify-center text-[#f4e8c1] bg-[#1c1c1c] rounded-lg border border-[#333333] shadow-inner transition-all duration-300 hover:bg-[#252525] hover:border-[#444444] hover:text-amber-400 hover:shadow-[0_0_8px_rgba(251,146,60,0.4)]"
        aria-label={t("common.settings")}
        aria-expanded={isOpen}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-300 ${isOpen ? "rotate-90" : ""}`}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-[#1c1c1c] border border-[#333333] z-50 overflow-hidden">
          <div className="py-1">
            <button
              onClick={toggleLanguage}
              className="flex items-center w-full px-4 py-2 text-sm text-[#f4e8c1] hover:bg-[#252525] transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <path d="M5 8l6 6"></path>
                <path d="M4 14l6-6 2-3"></path>
                <path d="M2 5h12"></path>
                <path d="M7 2h1"></path>
                <path d="M22 22l-5-10-5 10"></path>
                <path d="M14 18h6"></path>
              </svg>
              {language === "zh" ? t("common.switchToEnglish") : t("common.switchToChinese")}
            </button>
            
            <button
              onClick={openModelSettings}
              className="flex items-center w-full px-4 py-2 text-sm text-[#f4e8c1] hover:bg-[#252525] transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="3" y1="9" x2="21" y2="9"></line>
                <line x1="9" y1="21" x2="9" y2="9"></line>
              </svg>
              {t("modelSettings.title")}
            </button>
            
            <button
              onClick={toggleSound}
              className="flex items-center w-full px-4 py-2 text-sm text-[#f4e8c1] hover:bg-[#252525] transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                {soundEnabled ? (
                  <>
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                    <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
                  </>
                ) : (
                  <>
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                    <line x1="23" y1="9" x2="17" y2="15"></line>
                    <line x1="17" y1="9" x2="23" y2="15"></line>
                  </>
                )}
              </svg>
              {soundEnabled ? t("common.soundOff") : t("common.soundOn")}
            </button>
            
            <button
              onClick={() => {
                resetTour();
                setIsOpen(false);
                window.location.reload();
              }}
              className="flex items-center w-full px-4 py-2 text-sm text-[#f4e8c1] hover:bg-[#252525] transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                <path d="M21 3v5h-5" />
                <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                <path d="M3 21v-5h5" />
              </svg>
              {t("tour.resetTour")}
            </button>
            
            <div className="border-t border-[#333333] my-1"></div>
            
            <button
              onClick={handleExportData}
              className="flex items-center w-full px-4 py-2 text-sm text-[#f4e8c1] hover:bg-[#252525] transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              {t("common.exportData")}
            </button>

            <button
              onClick={handleImportData}
              className="flex items-center w-full px-4 py-2 text-sm text-[#f4e8c1] hover:bg-[#252525] transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              {t("common.importData")}
            </button>

            <button
              onClick={handleExportDataToGoogle}
              className="flex items-center w-full px-4 py-2 text-sm text-[#f4e8c1] hover:bg-[#252525] transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              {t("common.exportDataToGoogle")}
            </button>

            <button
              onClick={handleImportDataFromGoogle}
              className="flex items-center w-full px-4 py-2 text-sm text-[#f4e8c1] hover:bg-[#252525] transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
              {t("common.importDataFromGoogle")}
            </button>
          </div>
        </div>
      )}      
    </div>
  );
}
