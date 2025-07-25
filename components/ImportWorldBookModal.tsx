/**
 * Import World Book Modal Component
 * 
 * This component provides a comprehensive world book import interface with the following features:
 * - File-based import from JSON files with drag-and-drop support
 * - Global world book import from shared library
 * - Import result tracking and error handling
 * - Save as global world book functionality
 * - Tabbed interface for different import methods
 * - Batch import processing and validation
 * 
 * The component handles:
 * - File upload and drag-and-drop interactions
 * - JSON parsing and validation
 * - Global world book management and selection
 * - Import result display and error reporting
 * - Modal state management and animations
 * - Character-specific world book integration
 * 
 * Dependencies:
 * - useLanguage: For internationalization
 * - importWorldBookFromJson: For file-based imports
 * - Global world book functions: For shared library management
 * - react-hot-toast: For notifications
 */

"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { useLanguage } from "@/app/i18n";
import { importWorldBookFromJson } from "@/function/worldbook/import";
import { listGlobalWorldBooks, importFromGlobalWorldBook, GlobalWorldBook, deleteGlobalWorldBook } from "@/function/worldbook/global";
import { Toast } from "@/components/Toast";

/**
 * Interface definitions for the component's props
 */
interface ImportWorldBookModalProps {
  isOpen: boolean;
  characterId: string;
  onClose: () => void;
  onImportSuccess: () => void;
}

/**
 * Import world book modal component
 * 
 * Provides a comprehensive world book import interface with:
 * - File-based import with drag-and-drop support
 * - Global world book import functionality
 * - Import result tracking and validation
 * - Save as global world book options
 * - Tabbed interface for different import methods
 * 
 * @param {ImportWorldBookModalProps} props - Component props
 * @returns {JSX.Element | null} The import world book modal or null if closed
 */
export default function ImportWorldBookModal({
  isOpen,
  characterId,
  onClose,
  onImportSuccess,
}: ImportWorldBookModalProps) {
  const { t, fontClass, serifFontClass } = useLanguage();
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);
  const [saveAsGlobal, setSaveAsGlobal] = useState(false);
  const [globalName, setGlobalName] = useState("");
  const [globalDescription, setGlobalDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<"file" | "global">("file");
  const [globalWorldBooks, setGlobalWorldBooks] = useState<GlobalWorldBook[]>([]);
  const [selectedGlobalId, setSelectedGlobalId] = useState<string>("");
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Add ErrorToast state
  const [errorToast, setErrorToast] = useState({
    isVisible: false,
    message: "",
  });

  const showErrorToast = useCallback((message: string) => {
    setErrorToast({
      isVisible: true,
      message,
    });
  }, []);

  const hideErrorToast = useCallback(() => {
    setErrorToast({
      isVisible: false,
      message: "",
    });
  }, []);

  useEffect(() => {
    if (activeTab === "global" && isOpen) {
      loadGlobalWorldBooks();
    }
  }, [activeTab, isOpen]);

  const loadGlobalWorldBooks = async () => {
    setIsLoadingGlobal(true);
    try {
      const result = await listGlobalWorldBooks();
      if (result.success) {
        setGlobalWorldBooks(result.globalWorldBooks);
      } else {
        showErrorToast("Failed to load global world books");
      }
    } catch (error) {
      console.error("Failed to load global world books:", error);
      showErrorToast("Failed to load global world books");
    } finally {
      setIsLoadingGlobal(false);
    }
  };

  const handleImportFromGlobal = async () => {
    if (!selectedGlobalId) {
      showErrorToast("Please select a global world book");
      return;
    }

    setIsImporting(true);
    try {
      const result = await importFromGlobalWorldBook(characterId, selectedGlobalId);
      
      if (result.success) {
        setImportResult({
          success: true,
          message: result.message,
          importedCount: result.importedCount,
          skippedCount: 0,
          errors: [],
        });
        toast.success(result.message);
        onImportSuccess();
      } else {
        showErrorToast(result.message);
      }
    } catch (error: any) {
      console.error("Import from global failed:", error);
      showErrorToast(`Import failed: ${error.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  const handleFileSelect = async (file: File) => {
    if (!file.type.includes("json")) {
      showErrorToast("Please select a JSON file");
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      const text = await file.text();
      const jsonData = JSON.parse(text);

      const options = saveAsGlobal ? {
        saveAsGlobal: true,
        globalName: globalName.trim() || file.name.replace(".json", ""),
        globalDescription: globalDescription.trim(),
        sourceCharacterName: undefined,
      } : undefined;

      const result = await importWorldBookFromJson(characterId, jsonData, options);
      setImportResult(result);

      if (result.success) {
        toast.success(result.message);
        onImportSuccess();
      } else {
        showErrorToast(result.message);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      showErrorToast(`Failed to import: ${errorMessage}`);
      setImportResult({
        success: false,
        message: `Failed to import: ${errorMessage}`,
        errors: [errorMessage],
        importedCount: 0,
        skippedCount: 0,
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

  const handleClose = () => {
    setImportResult(null);
    setSaveAsGlobal(false);
    setGlobalName("");
    setGlobalDescription("");
    setActiveTab("file");
    setSelectedGlobalId("");
    onClose();
  };

  const handleDeleteGlobalWorldBook = async (globalId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    event.preventDefault();
    
    setIsDeleting(globalId);
    try {
      const result = await deleteGlobalWorldBook(globalId);
      if (result.success) {
        toast.success(t("worldBook.globalWorldBookDeleted"));
        loadGlobalWorldBooks();
        if (selectedGlobalId === globalId) {
          setSelectedGlobalId("");
        }
      } else {
        showErrorToast(result.message || t("worldBook.failedToDeleteGlobalWorldBook"));
      }
    } catch (error: any) {
      console.error("Failed to delete global world book:", error);
      showErrorToast(`${t("worldBook.failedToDeleteGlobalWorldBook")}: ${error.message}`);
    } finally {
      setIsDeleting(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3">
      <div className="relative bg-gradient-to-br from-[#1a1816]/95 via-[#252220]/95 to-[#1a1816]/95 backdrop-blur-xl border border-[#534741]/60 rounded-xl shadow-2xl max-w-xl w-full max-h-[85vh] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-blue-500/5 opacity-50 animate-pulse"></div>

        <div className="relative p-3 border-b border-[#534741]/40 bg-gradient-to-r from-[#252220]/80 via-[#1a1816]/60 to-[#252220]/80 backdrop-blur-sm">
          <div className="flex justify-between items-center">
            <h2 className={`text-base font-semibold text-[#eae6db] ${serifFontClass} bg-gradient-to-r from-amber-300 via-amber-200 to-amber-300 bg-clip-text text-transparent`}>
              {t("worldBook.importWorldBook")}
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
          
          {/* Compact Tab Navigation */}
          <div className="flex mt-2 space-x-0.5 bg-[#1a1816]/60 backdrop-blur-sm rounded-lg p-0.5 border border-[#534741]/30">
            <button
              onClick={() => setActiveTab("file")}
              className={`relative flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all duration-300 ${
                activeTab === "file"
                  ? "bg-gradient-to-r from-amber-600/90 to-amber-700/90 text-white shadow-lg shadow-amber-500/20"
                  : "text-[#a18d6f] hover:text-[#eae6db] hover:bg-[#252220]/50"
              } ${serifFontClass}`}
            >
              <span className="relative z-10 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                </svg>
                {t("worldBook.importFromJson")}
              </span>
              {activeTab === "file" && (
                <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 to-amber-600/20 rounded-md animate-pulse"></div>
              )}
            </button>
            <button
              onClick={() => setActiveTab("global")}
              className={`relative flex-1 px-2 py-1.5 text-xs font-medium rounded-md transition-all duration-300 ${
                activeTab === "global"
                  ? "bg-gradient-to-r from-blue-600/90 to-blue-700/90 text-white shadow-lg shadow-blue-500/20"
                  : "text-[#a18d6f] hover:text-[#eae6db] hover:bg-[#252220]/50"
              } ${serifFontClass}`}
            >
              <span className="relative z-10 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path>
                  <path d="M2 12h20"></path>
                </svg>
                {t("worldBook.importFromGlobal")}
              </span>
              {activeTab === "global" && (
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-blue-600/20 rounded-md animate-pulse"></div>
              )}
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="relative p-3 max-h-[55vh] overflow-y-auto scrollbar-thin scrollbar-track-[#1a1816] scrollbar-thumb-[#534741] hover:scrollbar-thumb-[#6b5b4f]">
          {activeTab === "file" ? (
            // File Import Tab
            <div className="space-y-3">
              {/* Compact Drag & Drop Area */}
              <div
                className={`relative border-2 border-dashed rounded-lg p-4 text-center transition-all duration-300 cursor-pointer group ${
                  isDragging
                    ? "border-amber-500/60 bg-amber-500/10 shadow-lg shadow-amber-500/20"
                    : "border-[#534741]/60 hover:border-[#6b5b4f]/80 hover:bg-[#252220]/30"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-blue-500/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="relative flex flex-col items-center space-y-2">
                  <div className="relative">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#a18d6f] group-hover:text-amber-400 transition-colors duration-300">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 animate-pulse"></div>
                  </div>
                  <div>
                    <p className={`text-[#eae6db] font-medium text-sm ${serifFontClass}`}>{t("worldBook.dragDropJson")}</p>
                    <p className="text-[#a18d6f] text-xs mt-0.5">{t("worldBook.jsonFileOnly")}</p>
                  </div>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>

              {/* Compact Save as Global Option */}
              <div className="bg-gradient-to-br from-[#252220]/60 via-[#1a1816]/40 to-[#252220]/60 backdrop-blur-sm border border-[#534741]/40 rounded-lg p-3">
                <label className="flex items-center space-x-2 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={saveAsGlobal}
                      onChange={(e) => setSaveAsGlobal(e.target.checked)}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded border-2 transition-all duration-300 ${
                      saveAsGlobal 
                        ? "bg-gradient-to-br from-amber-500 to-amber-600 border-amber-500 shadow-lg shadow-amber-500/30" 
                        : "border-[#534741] group-hover:border-[#6b5b4f]"
                    }`}>
                      {saveAsGlobal && (
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="absolute inset-0">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className={`text-[#eae6db] text-sm font-medium ${serifFontClass}`}>
                    {t("worldBook.saveAsGlobalWorldBook")}
                  </span>
                </label>
                
                {saveAsGlobal && (
                  <div className="mt-2 space-y-2 animate-in slide-in-from-top-2 duration-300">
                    <div>
                      <label className={`block text-xs font-medium text-[#a18d6f] mb-1 ${serifFontClass}`}>
                        {t("worldBook.globalName")}
                      </label>
                      <input
                        type="text"
                        value={globalName}
                        onChange={(e) => setGlobalName(e.target.value)}
                        placeholder={t("worldBook.enterGlobalWorldBookName")}
                        className="w-full px-2 py-1.5 text-sm bg-[#1a1816]/60 backdrop-blur-sm border border-[#534741]/60 rounded-md text-[#eae6db] placeholder-[#a18d6f]/60 focus:border-amber-500/60 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all duration-300"
                      />
                    </div>
                    <div>
                      <label className={`block text-xs font-medium text-[#a18d6f] mb-1 ${serifFontClass}`}>
                        {t("worldBook.description")}
                      </label>
                      <textarea
                        value={globalDescription}
                        onChange={(e) => setGlobalDescription(e.target.value)}
                        placeholder={t("worldBook.enterDescriptionForThisGlobalWorldBook")}
                        rows={2}
                        className="w-full px-2 py-1.5 text-sm bg-[#1a1816]/60 backdrop-blur-sm border border-[#534741]/60 rounded-md text-[#eae6db] placeholder-[#a18d6f]/60 focus:border-amber-500/60 focus:outline-none focus:ring-2 focus:ring-amber-500/20 resize-none transition-all duration-300"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {isLoadingGlobal ? (
                <div className="flex items-center justify-center py-6">
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                      <div className="absolute inset-0 w-4 h-4 border-2 border-transparent border-r-blue-400 rounded-full animate-spin animate-reverse"></div>
                    </div>
                    <span className={`text-[#a18d6f] text-sm ${serifFontClass}`}>{t("worldBook.loading")}</span>
                  </div>
                </div>
              ) : globalWorldBooks.length === 0 ? (
                <div className="text-center py-6">
                  <div className="relative inline-block">
                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-3 text-[#a18d6f]/50">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-blue-400/50 to-blue-600/50 rounded-full animate-pulse"></div>
                  </div>
                  <p className={`text-[#a18d6f] text-sm ${serifFontClass}`}>{t("worldBook.noGlobalWorldBooks")}</p>
                  <p className="text-[#a18d6f]/70 text-xs mt-1">{t("worldBook.createGlobalWorldBookFirst")}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <h3 className={`text-xs font-medium text-[#a18d6f] mb-2 ${serifFontClass}`}>
                    {t("worldBook.selectGlobalWorldBook")}
                  </h3>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin scrollbar-track-[#1a1816] scrollbar-thumb-[#534741]">
                    {globalWorldBooks.map((globalBook) => (
                      <label
                        key={globalBook.id}
                        className={`relative block p-2.5 border rounded-lg cursor-pointer transition-all duration-300 group ${
                          selectedGlobalId === globalBook.id
                            ? "border-blue-500/60 bg-gradient-to-br from-blue-500/10 via-blue-400/5 to-blue-500/10 shadow-lg shadow-blue-500/10"
                            : "border-[#534741]/60 hover:border-[#6b5b4f]/80 hover:bg-[#252220]/30"
                        }`}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <input
                          type="radio"
                          name="globalWorldBook"
                          value={globalBook.id}
                          checked={selectedGlobalId === globalBook.id}
                          onChange={(e) => setSelectedGlobalId(e.target.value)}
                          className="sr-only"
                        />
                        <div className="relative flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <h4 className={`text-[#eae6db] font-medium text-sm truncate ${serifFontClass}`}>{globalBook.name}</h4>
                            {globalBook.description && (
                              <p className="text-[#a18d6f] text-xs mt-0.5 line-clamp-2">{globalBook.description}</p>
                            )}
                            <div className="flex items-center space-x-3 mt-1.5 text-xs text-[#a18d6f]/80">
                              <span className="flex items-center">
                                <span className="w-1.5 h-1.5 bg-blue-400/60 rounded-full mr-1"></span>
                                {globalBook.entryCount}
                              </span>
                              <span className="flex items-center">
                                <span className="w-1.5 h-1.5 bg-amber-400/60 rounded-full mr-1"></span>
                                {new Date(globalBook.createdAt).toLocaleDateString()}
                              </span>
                              {globalBook.sourceCharacterName && (
                                <span className="flex items-center truncate">
                                  <span className="w-1.5 h-1.5 bg-green-400/60 rounded-full mr-1"></span>
                                  <span className="truncate">{globalBook.sourceCharacterName}</span>
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={(e) => handleDeleteGlobalWorldBook(globalBook.id, e)}
                              disabled={isDeleting === globalBook.id}
                              className="w-6 h-6 flex items-center justify-center text-[#a18d6f]/70 hover:text-red-400 transition-all duration-300 rounded-full hover:bg-red-500/10 group-hover:opacity-100 opacity-0"
                              title={t("worldBook.deleteGlobalWorldBook")}
                            >
                              {isDeleting === globalBook.id ? (
                                <div className="w-3 h-3 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin"></div>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M3 6h18"></path>
                                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                                </svg>
                              )}
                            </button>
                            <div className={`relative w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                              selectedGlobalId === globalBook.id
                                ? "border-blue-500 bg-gradient-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-500/30"
                                : "border-[#534741] group-hover:border-[#6b5b4f]"
                            }`}>
                              {selectedGlobalId === globalBook.id && (
                                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse"></div>
                              )}
                            </div>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Compact Import Results */}
          {importResult && (
            <div className="mt-3 p-2.5 bg-gradient-to-br from-[#252220]/60 via-[#1a1816]/40 to-[#252220]/60 backdrop-blur-sm border border-[#534741]/40 rounded-lg animate-in slide-in-from-bottom-2 duration-300">
              <h3 className={`text-xs font-medium text-[#eae6db] mb-1.5 ${serifFontClass}`}>
                {t("worldBook.importResults")}
              </h3>
              <div className="space-y-1 text-xs">
                <p className="text-green-400 flex items-center">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                  {t("worldBook.importedEntries").replace("{count}", importResult.importedCount.toString())}
                </p>
                {importResult.skippedCount > 0 && (
                  <p className="text-yellow-400 flex items-center">
                    <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full mr-2"></span>
                    {t("worldBook.skippedEntries").replace("{count}", importResult.skippedCount.toString())}
                  </p>
                )}
                {importResult.errors && importResult.errors.length > 0 && (
                  <div>
                    <p className="text-red-400 font-medium flex items-center">
                      <span className="w-1.5 h-1.5 bg-red-400 rounded-full mr-2"></span>
                      {t("worldBook.importErrors")}:
                    </p>
                    <ul className="list-none text-red-400/80 ml-3 space-y-0.5">
                      {importResult.errors.map((error: string, index: number) => (
                        <li key={index} className="flex items-start">
                          <span className="w-1 h-1 bg-red-400/60 rounded-full mr-2 mt-1.5 flex-shrink-0"></span>
                          <span className="text-xs">{error}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Compact Footer */}
        <div className="relative p-3 border-t border-[#534741]/40 bg-gradient-to-r from-[#252220]/80 via-[#1a1816]/60 to-[#252220]/80 backdrop-blur-sm flex justify-end space-x-2">
          <button
            onClick={handleClose}
            className={`px-3 py-1.5 text-xs text-[#a18d6f] hover:text-[#eae6db] transition-all duration-300 rounded-md hover:bg-[#333]/30 ${serifFontClass}`}
          >
            {t("common.cancel")}
          </button>
          {activeTab === "global" && (
            <button
              onClick={handleImportFromGlobal}
              disabled={isImporting || !selectedGlobalId}
              className={`relative px-3 py-1.5 bg-gradient-to-r from-blue-600/90 to-blue-700/90 hover:from-blue-500/90 hover:to-blue-600/90 text-white rounded-md transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-1.5 text-xs font-medium shadow-lg shadow-blue-500/20 ${serifFontClass}`}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-blue-400/20 to-blue-600/20 rounded-md opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
              {isImporting && (
                <div className="relative w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin"></div>
              )}
              <span className="relative">{isImporting ? t("worldBook.importing") : t("worldBook.importFromGlobal")}</span>
            </button>
          )}
        </div>
      </div>
      
      <Toast
        isVisible={errorToast.isVisible}
        message={errorToast.message}
        onClose={hideErrorToast}
        type="error"
      />
    </div>
  );
} 
