/**
 * Import Character Modal Component
 * 
 * This component provides a character import interface with the following features:
 * - PNG file upload with drag-and-drop support
 * - File validation and error handling
 * - Upload progress tracking and loading states
 * - Character upload integration
 * - Modal-based import workflow
 * 
 * The component handles:
 * - File upload and drag-and-drop interactions
 * - PNG file validation and type checking
 * - Upload progress and error state management
 * - Character import functionality
 * - Modal state management and animations
 * - Form reset and cleanup
 * 
 * Dependencies:
 * - useLanguage: For internationalization
 * - handleCharacterUpload: For character upload functionality
 * - trackButtonClick: For analytics tracking
 * - framer-motion: For animations
 */

"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/app/i18n";
import { trackButtonClick } from "@/utils/google-analytics";
import { handleCharacterUpload } from "@/function/character/import";
import { Toast } from "@/components/Toast";

/**
 * Interface definitions for the component's props
 */
interface ImportCharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: () => void;
}

/**
 * Import character modal component
 * 
 * Provides a character import interface with:
 * - PNG file upload with drag-and-drop support
 * - File validation and error handling
 * - Upload progress tracking
 * - Character import integration
 * - Modal-based workflow management
 * 
 * @param {ImportCharacterModalProps} props - Component props
 * @returns {JSX.Element | null} The import character modal or null if closed
 */
export default function ImportCharacterModal({ isOpen, onClose, onImport }: ImportCharacterModalProps) {
  const { t, fontClass, serifFontClass } = useLanguage();
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Toast state
  const [toast, setToast] = useState({
    isVisible: false,
    message: "",
    type: "error" as "success" | "error" | "warning",
  });

  const showToast = (message: string, type: "success" | "error" | "warning" = "error") => {
    setToast({
      isVisible: true,
      message,
      type,
    });
  };

  const hideToast = () => {
    setToast({
      isVisible: false,
      message: "",
      type: "error",
    });
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      const pngFiles = files.filter(file => file.type === "image/png");
      
      if (pngFiles.length > 0) {
        setSelectedFiles(pngFiles);
        setError("");
        
        // Show warning if some files were not PNG
        if (pngFiles.length < files.length) {
          const warningMessage = t("importCharacterModal.someFilesSkipped");
          showToast(warningMessage, "warning");
        }
      } else {
        const errorMessage = t("importCharacterModal.pngOnly");
        setError(errorMessage);
        showToast(errorMessage, "error");
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      const pngFiles = files.filter(file => file.type === "image/png");
      
      if (pngFiles.length > 0) {
        setSelectedFiles(pngFiles);
        setError("");
        
        // Show warning if some files were not PNG
        if (pngFiles.length < files.length) {
          const warningMessage = t("importCharacterModal.someFilesSkipped");
          showToast(warningMessage, "warning");
        }
      } else {
        const errorMessage = t("importCharacterModal.pngOnly");
        setError(errorMessage);
        showToast(errorMessage, "error");
      }
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      const errorMessage = t("importCharacterModal.noFileSelected");
      setError(errorMessage);
      showToast(errorMessage, "error");
      return;
    }

    setIsUploading(true);
    setError("");

    try {
      let successCount = 0;
      let failCount = 0;
      const errors: string[] = [];

      // Upload files sequentially to avoid overwhelming the server
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        try {
          const response = await handleCharacterUpload(file);
          
          if (response.success) {
            successCount++;
          } else {
            failCount++;
            errors.push(`${file.name}: ${t("importCharacterModal.uploadFailed")}`);
          }
        } catch (err) {
          failCount++;
          const errorMsg = typeof err === "string" ? err : t("importCharacterModal.uploadFailed");
          errors.push(`${file.name}: ${errorMsg}`);
        }
      }

      // Show results
      if (successCount > 0 && failCount === 0) {
        showToast(
          selectedFiles.length === 1 
            ? t("importCharacterModal.uploadSuccess")
            : `${successCount} characters imported successfully`,
          "success",
        );
        onImport();
        onClose();
      } else if (successCount > 0 && failCount > 0) {
        showToast(
          `${successCount} characters imported, ${failCount} failed`,
          "warning",
        );
        if (errors.length > 0) {
          setError(errors.slice(0, 3).join("; ") + (errors.length > 3 ? "..." : ""));
        }
        onImport(); // Refresh the character list
      } else {
        // All failed
        const errorMessage = errors.length > 0 ? errors[0] : t("importCharacterModal.uploadFailed");
        setError(errorMessage);
        showToast(errorMessage, "error");
      }
    } catch (err) {
      console.error("Error uploading characters:", err);
      const errorMessage = typeof err === "string" ? err : t("importCharacterModal.uploadFailed");
      setError(errorMessage);
      showToast(errorMessage, "error");
    } finally {
      setIsUploading(false);
    }
  };

  const resetForm = () => {
    setSelectedFiles([]);
    setError("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 backdrop-blur-sm bg-opacity-50"
            onClick={handleClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-[#1e1c1b] bg-opacity-75 border border-[#534741] rounded-lg shadow-xl w-full max-w-md relative z-10 overflow-hidden fantasy-bg backdrop-filter backdrop-blur-sm"
          >
            <div className="p-6">
              <h2 className={`text-xl text-[#eae6db] mb-4 ${serifFontClass}`}>{t("importCharacterModal.title")}</h2>
              
              <p className={`text-[#c0a480] mb-6 text-sm ${fontClass}`}>
                {t("importCharacterModal.description")}
              </p>
              
              <div
                className={`border-2 border-dashed rounded-lg p-8 mb-4 text-center transition-colors duration-300 ${isDragging ? "border-[#f9c86d] bg-[#252220]" : "border-[#534741] hover:border-[#a18d6f]"}`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/png"
                  multiple
                  onChange={handleFileSelect}
                />
                
                <div className="flex flex-col items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className={`w-12 h-12 mb-3 ${selectedFiles.length > 0 ? "text-[#f9c86d]" : "text-[#a18d6f]"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  
                  {selectedFiles.length > 0 ? (
                    <div className={`text-[#eae6db] ${fontClass} max-w-full`}>
                      {selectedFiles.length === 1 ? (
                        <div>
                          <p className="font-medium truncate">{selectedFiles[0].name}</p>
                          <p className="text-xs text-[#a18d6f] mt-1">{(selectedFiles[0].size / 1024).toFixed(1)} KB</p>
                        </div>
                      ) : (
                        <div>
                          <p className="font-medium">{selectedFiles.length} files selected</p>
                          <p className="text-xs text-[#a18d6f] mt-1">
                            Total: {(selectedFiles.reduce((sum, file) => sum + file.size, 0) / 1024).toFixed(1)} KB
                          </p>
                          <div className="mt-2 max-h-16 overflow-y-auto text-xs space-y-1">
                            {selectedFiles.slice(0, 3).map((file, index) => (
                              <p key={index} className="text-[#c0a480] truncate">{file.name}</p>
                            ))}
                            {selectedFiles.length > 3 && (
                              <p className="text-[#a18d6f]">... and {selectedFiles.length - 3} more</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={`text-[#a18d6f] ${fontClass}`}>
                      <p>{t("importCharacterModal.dragOrClick")}</p>
                      <p className="text-xs mt-1">{t("importCharacterModal.pngFormat")}</p>
                      <p className="text-xs mt-1 text-[#8a7c6a]">Multiple files supported</p>
                    </div>
                  )}
                </div>
              </div>
              
              {error && (
                <div className="text-[#e57373] text-sm mb-4 text-center">
                  {error}
                </div>
              )}
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleClose}
                  className={`px-4 py-2 text-[#c0a480] hover:text-[#ffd475] transition-colors ${fontClass}`}
                >
                  {t("common.cancel")}  
                </button>
                
                <button
                  onClick={(e) => {trackButtonClick("ImportCharacterModal", "导入角色");handleUpload();}}
                  disabled={selectedFiles.length === 0 || isUploading}
                  className={`px-4 py-2 bg-[#252220] hover:bg-[#3a2a2a] border border-[#534741] rounded-md text-[#f9c86d] transition-colors ${fontClass} ${(selectedFiles.length === 0 || isUploading) ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {isUploading ? (
                    <div className="flex items-center">
                      <div className="w-4 h-4 mr-2 rounded-full border-2 border-t-[#f9c86d] border-r-[#c0a480] border-b-[#a18d6f] border-l-transparent animate-spin"></div>
                      {selectedFiles.length > 1 
                        ? `${t("importCharacterModal.uploading")} (${selectedFiles.length} files)`
                        : t("importCharacterModal.uploading")
                      }
                    </div>
                  ) : (
                    selectedFiles.length > 1 
                      ? `${t("importCharacterModal.import")} (${selectedFiles.length})`
                      : t("importCharacterModal.import")
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      <Toast
        type={toast.type}
        isVisible={toast.isVisible}
        message={toast.message}
        onClose={hideToast}
      />
    </AnimatePresence>
  );
}
