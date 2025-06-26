/**
 * Download Character Modal Component
 * 
 * This component provides a character download interface with the following features:
 * - GitHub character repository integration
 * - Character preview and selection
 * - Download and import functionality
 * - Character information extraction
 * - Loading states and error handling
 * - Grid-based character display
 * 
 * The component handles:
 * - GitHub API integration for character fetching
 * - Character file download and processing
 * - Character information parsing and display
 * - Import functionality integration
 * - Loading states and error management
 * - Modal state management and animations
 * 
 * Dependencies:
 * - useLanguage: For internationalization
 * - handleCharacterUpload: For character import functionality
 * - framer-motion: For animations
 */

"use client";
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { handleCharacterUpload } from "@/function/character/import";
import { useLanguage } from "@/app/i18n";

const GITHUB_API_URL = "https://api.github.com/repos/Narratium/Character-Card/contents";
const RAW_BASE_URL = "https://raw.githubusercontent.com/Narratium/Character-Card/main/";

/**
 * Interface definitions for the component's props and data structures
 */
interface DownloadCharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: () => void;
}

interface GithubFile {
  name: string;
  download_url: string;
}

interface CharacterInfo {
  displayName: string;
  author: string;
}

/**
 * Download character modal component
 * 
 * Provides a character download interface with:
 * - GitHub character repository integration
 * - Character preview and selection
 * - Download and import functionality
 * - Character information extraction
 * - Grid-based display and loading states
 * 
 * @param {DownloadCharacterModalProps} props - Component props
 * @returns {JSX.Element | null} The download character modal or null if closed
 */
export default function DownloadCharacterModal({ isOpen, onClose, onImport }: DownloadCharacterModalProps) {
  const { t, fontClass, serifFontClass } = useLanguage();
  const [characterFiles, setCharacterFiles] = useState<GithubFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    fetch(GITHUB_API_URL)
      .then(res => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setCharacterFiles(data.filter((item: any) => item.name.endsWith(".png")));
        } else {
          setError(t("downloadModal.fetchError"));
        }
      })
      .catch(() => setError(t("downloadModal.fetchError")))
      .finally(() => setLoading(false));
  }, [isOpen]);

  const handleDownloadAndImport = async (file: GithubFile) => {
    setImporting(file.name);
    setError(null);
    try {
      const res = await fetch(file.download_url || RAW_BASE_URL + file.name);
      if (!res.ok) throw new Error(t("downloadModal.downloadFailed"));
      const blob = await res.blob();
      const fileObj = new File([blob], file.name, { type: blob.type });
      await handleCharacterUpload(fileObj);
      onImport();
      onClose();
    } catch (e: any) {
      setError(e.message || t("downloadModal.importFailed"));
    } finally {
      setImporting(null);
    }
  };

  const extractCharacterInfo = (fileName: string): CharacterInfo => {
    const nameWithoutExt = fileName.replace(/\.png$/, "");
    const parts = nameWithoutExt.split(/--/);
    
    if (parts.length === 2) {
      const displayName = parts[0].trim();
      const author = parts[1].trim().length > 5 ? parts[1].trim().substring(0, 5) : parts[1].trim();
      return { displayName, author };
    } else {
      return { 
        displayName: nameWithoutExt, 
        author: t("downloadModal.unknownAuthor"), 
      };
    }
  };  

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 backdrop-blur-sm bg-opacity-50"
        onClick={onClose}
      />
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#1a1714] rounded-lg shadow-lg p-6 w-full max-w-2xl relative z-10">
        <button className="absolute top-2 right-2 text-[#c0a480] hover:text-[#ffd475]" onClick={onClose}>
          ×
        </button>
        <h2 className={`text-xl mb-4 text-[#eae6db] font-bold ${serifFontClass}`}>{t("downloadModal.title")}</h2>
        {loading ? (
          <div className={`text-[#c0a480] py-8 text-center ${fontClass}`}>{t("downloadModal.loading")}</div>
        ) : error ? (
          <div className={`text-red-400 py-8 text-center ${fontClass}`}>{error}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
            {characterFiles.map((file) => {
              const { displayName, author } = extractCharacterInfo(file.name);
              return (
                <div key={file.name} className="bg-[#252220] rounded-lg p-3 flex flex-col items-center">
                  <img src={RAW_BASE_URL + file.name} alt={file.name} className="w-32 h-32 object-cover rounded mb-2 border border-[#534741]" />
                  <div className={`text-[#eae6db] text-sm mb-1 line-clamp-1 ${fontClass}`}>{displayName}</div>
                  <div className={`text-[#c0a480] text-xs mb-2 ${fontClass}`}>{t("downloadModal.by")} {author}</div>
                  <button
                    disabled={!!importing}
                    className={`px-2 py-0.5 text-xs rounded bg-[#e0cfa0] text-[#534741] hover:bg-[#ffd475] border border-[#c0a480] ${fontClass} shadow-sm transition-all duration-150 ${importing === file.name ? "opacity-60 cursor-wait" : ""}`}
                    style={{ minWidth: 0, minHeight: 0, lineHeight: "1.1", fontWeight: 500, letterSpacing: "0.01em" }}
                    onClick={() => handleDownloadAndImport(file)}
                  >
                    {importing === file.name ? t("downloadModal.importing") : t("downloadModal.downloadAndImport")}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
