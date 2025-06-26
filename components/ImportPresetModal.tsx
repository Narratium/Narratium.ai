/**
 * Import Preset Modal Component
 * 
 * This component provides a preset import interface with the following features:
 * - Single file import from JSON files with drag-and-drop support
 * - Custom preset naming and preview functionality
 * - Import result tracking and validation
 * - File validation and error handling
 * - Import guidelines and user instructions
 * - Modal-based import workflow
 * 
 * The component handles:
 * - File upload and drag-and-drop interactions
 * - JSON parsing and validation
 * - Custom preset naming with preview
 * - Import result display and error reporting
 * - Modal state management and animations
 * - User guidance and import guidelines
 * 
 * Dependencies:
 * - useLanguage: For internationalization
 * - importPresetFromJson: For preset import functionality
 * - react-hot-toast: For notifications
 */

"use client";

import React, { useState, useRef } from "react";
import { toast } from "react-hot-toast";
import { useLanguage } from "@/app/i18n";
import { importPresetFromJson } from "@/function/preset/import";

/**
 * Interface definitions for the component's props
 */
interface ImportPresetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: () => void;
}

/**
 * Import preset modal component
 * 
 * Provides a preset import interface with:
 * - File-based import with drag-and-drop support
 * - Custom preset naming and preview
 * - Import result tracking and validation
 * - User guidance and import guidelines
 * - Modal-based workflow management
 * 
 * @param {ImportPresetModalProps} props - Component props
 * @returns {JSX.Element | null} The import preset modal or null if closed
 */
export default function ImportPresetModal({
  isOpen,
  onClose,
  onImport,
}: ImportPresetModalProps) {
  const { t, fontClass, serifFontClass } = useLanguage();
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [customName, setCustomName] = useState("");
  const [fileName, setFileName] = useState("");
  const [jsonData, setJsonData] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file.type.includes("json")) {
      toast.error(t("importPreset.selectJsonFile"));
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const parsedData = JSON.parse(text);
      setJsonData(parsedData);
      
      // 从文件名提取默认名称（不含扩展名）
      const defaultName = file.name.replace(/\.json$/, "");
      setFileName(defaultName);
      setCustomName(defaultName);
      
      // 不立即导入，显示预览和自定义表单
    
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error(`${t("importPreset.failedToImport")}: ${errorMessage}`);
      setImportResult({
        success: false,
        error: errorMessage,
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleImport = async () => {
    if (!jsonData) return;
    
    setIsImporting(true);
    try {
      // 使用用户自定义的名称进行导入
      const result = await importPresetFromJson(JSON.stringify(jsonData), customName.trim() || fileName);
      setImportResult(result);

      if (result.success) {
        toast.success(t("importPreset.importSuccess"));
        onImport();
      } else {
        toast.error(t("importPreset.importFailed"));
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      toast.error(`${t("importPreset.failedToImport")}: ${errorMessage}`);
      setImportResult({
        success: false,
        error: errorMessage,
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleClose = () => {
    setImportResult(null);
    setIsDragging(false);
    setJsonData(null);
    setCustomName("");
    setFileName("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3">
      <div className="relative bg-gradient-to-br from-[#1a1816]/95 via-[#252220]/95 to-[#1a1816]/95 backdrop-blur-xl border border-[#534741]/60 rounded-xl shadow-2xl max-w-xl w-full max-h-[85vh] overflow-hidden">
        {/* Animated background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-blue-500/5 opacity-50 animate-pulse"></div>
        
        {/* Header */}
        <div className="relative p-3 border-b border-[#534741]/40 bg-gradient-to-r from-[#252220]/80 via-[#1a1816]/60 to-[#252220]/80 backdrop-blur-sm">
          <div className="flex justify-between items-center">
            <h2 className={`text-base font-semibold text-[#eae6db] ${serifFontClass} bg-gradient-to-r from-amber-300 via-amber-200 to-amber-300 bg-clip-text text-transparent`}>
              {t("importPreset.title")}
            </h2>
            <button
              onClick={handleClose}
              className="w-7 h-7 flex items-center justify-center text-[#a18d6f] hover:text-[#eae6db] transition-all duration-300 rounded-lg hover:bg-[#333]/50 group"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:scale-110 group-hover:rotate-90">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        </div>
        
        {/* Content */}
        <div className="relative p-4 max-h-[70vh] overflow-y-auto fantasy-scrollbar">
          {/* File Upload Area */}
          <div className="space-y-4">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300 ${
                isDragging
                  ? "border-amber-500/60 bg-amber-500/10 scale-[1.02]"
                  : "border-[#534741]/60 hover:border-amber-500/40 hover:bg-amber-500/5"
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-amber-500/5 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"></div>
              
              <div className="relative z-10 space-y-3">
                <div className="flex justify-center">
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/30 flex items-center justify-center transition-transform duration-300 ${
                    isDragging ? "scale-110 animate-pulse" : ""
                  }`}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                  </div>
                </div>
                
                <div>
                  <h3 className={`text-lg font-medium text-[#eae6db] ${serifFontClass}`}>
                    {isDragging ? t("importPreset.dropFileHere") : t("importPreset.dragDropFile")}
                  </h3>
                  <p className={`text-sm text-[#a18d6f] mt-1 ${fontClass}`}>
                    {t("importPreset.dragAndDrop")}
                  </p>
                </div>
                
                <div>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting}
                    className="px-4 py-2 bg-gradient-to-r from-amber-600/80 to-amber-500/80 hover:from-amber-500/90 hover:to-amber-400/90 text-white font-medium rounded-lg transition-all duration-300 shadow-lg hover:shadow-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isImporting ? t("importPreset.importing") : t("importPreset.browseFiles")}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileInputChange}
                    className="hidden"
                  />
                </div>
              </div>
            </div>
            
            {/* Preview and Naming Form */}
            {jsonData && !importResult && (
              <div className="p-4 bg-[#252220]/50 backdrop-blur-sm border border-[#534741]/40 rounded-lg animate-fadeIn">
                <h4 className={`text-sm font-medium text-[#eae6db] mb-3 ${serifFontClass}`}>{t("importPreset.customizePreset")}</h4>
                
                <div className="space-y-4">
                  <div>
                    <label htmlFor="presetName" className={`block text-xs text-[#a18d6f] mb-1 ${fontClass}`}>
                      {t("importPreset.presetName")}
                    </label>
                    <input
                      id="presetName"
                      type="text"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder={fileName}
                      className="w-full px-3 py-2 bg-[#1a1816]/80 border border-[#534741]/60 rounded-lg text-[#eae6db] placeholder-[#534741]/80 focus:outline-none focus:ring-1 focus:ring-amber-500/40 transition-all duration-300"
                    />
                    <p className={`mt-1 text-xs text-[#a18d6f]/70 ${fontClass}`}>{t("importPreset.presetNameDesc")}</p>
                  </div>
                  
                  <div className="flex justify-end space-x-2 pt-2">
                    <button
                      onClick={handleClose}
                      className="px-3 py-1.5 bg-[#252220]/80 hover:bg-[#252220] border border-[#534741]/60 text-[#a18d6f] hover:text-[#eae6db] rounded-lg transition-all duration-300"
                    >
                      {t("importPreset.cancel")}
                    </button>
                    <button
                      onClick={handleImport}
                      disabled={isImporting}
                      className="px-4 py-1.5 bg-gradient-to-r from-amber-600/80 to-amber-500/80 hover:from-amber-500/90 hover:to-amber-400/90 text-white font-medium rounded-lg transition-all duration-300 shadow-lg hover:shadow-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isImporting ? t("importPreset.importing") : t("importPreset.confirmImport")}
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Import Result */}
            {importResult && (
              <div className={`p-4 rounded-lg border ${
                importResult.success
                  ? "bg-emerald-900/20 border-emerald-500/30 text-emerald-200"
                  : "bg-red-900/20 border-red-500/30 text-red-200"
              }`}>
                <div className="flex items-center space-x-2 mb-2">
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                    importResult.success ? "bg-emerald-500/20" : "bg-red-500/20"
                  }`}>
                    {importResult.success ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                      </svg>
                    )}
                  </div>
                  <h4 className={`font-medium ${serifFontClass}`}>
                    {importResult.success ? t("importPreset.importSuccess") : t("importPreset.importFailed")}
                  </h4>
                </div>
                <p className={`text-sm ${fontClass}`}>
                  {importResult.success ? t("importPreset.presetImported") : importResult.error || t("importPreset.importError")}
                </p>
              </div>
            )}
            
            {/* Import Guidelines */}
            <div className="bg-[#252220]/40 backdrop-blur-sm border border-[#534741]/30 rounded-lg p-4">
              <h4 className={`text-sm font-medium text-[#eae6db] mb-2 ${serifFontClass}`}>{t("importPreset.guidelines")}</h4>
              <ul className={`text-xs text-[#a18d6f] space-y-1 ${fontClass}`}>
                <li>• {t("importPreset.jsonFormat")}</li>
                <li>• {t("importPreset.validStructure")}</li>
                <li>• {t("importPreset.noOverwrite")}</li>
                <li>• {t("importPreset.maxFileSize")}</li>
              </ul>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="relative p-3 border-t border-[#534741]/40 bg-gradient-to-r from-[#252220]/60 via-[#1a1816]/40 to-[#252220]/60 backdrop-blur-sm">
          <div className="flex justify-end space-x-2">
            <button
              onClick={handleClose}
              className="px-3 py-1.5 text-sm font-medium text-[#a18d6f] hover:text-[#eae6db] transition-colors duration-300 rounded-md hover:bg-[#333]/50"
            >
              {t("importPreset.cancel")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
} 
