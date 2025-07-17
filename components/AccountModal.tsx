"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/app/i18n";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AccountModal({ isOpen, onClose }: AccountModalProps) {
  const { t, fontClass, serifFontClass } = useLanguage();
  const { user, logout, isAuthenticated, refreshAuth, updateUsername } = useAuth();
  const router = useRouter();
  const modalRef = useRef<HTMLDivElement>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedUsername, setEditedUsername] = useState(user?.username || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (user?.username) {
      setEditedUsername(user.username);
    }
  }, [user?.username]);

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

  const handleSaveUsername = async () => {
    if (!editedUsername.trim()) {
      setError(t("account.usernameRequired"));
      return;
    }
    
    if (editedUsername.trim().length < 3 || editedUsername.trim().length > 30) {
      setError(t("account.usernameLength"));
      return;
    }
    
    setIsLoading(true);
    setError("");
    setSuccessMessage("");
    
    try {
      const result = await updateUsername(editedUsername.trim());
      
      if (result.success) {
        setSuccessMessage(t("account.usernameUpdated"));
        setIsEditing(false);
        
        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage("");
        }, 3000);
      } else {
        setError(result.message || t("account.updateFailed"));
      }
    } catch (error) {
      console.error("Failed to update username:", error);
      setError(t("account.updateFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
  };

  const isGuest = localStorage.getItem("loginMode") === "guest";

  if (!isAuthenticated || !user) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
            onClick={onClose}
          />
          
          {/* Modal */}
          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md mx-4 bg-gradient-to-br from-[#1a1a1a] via-[#1e1e1e] to-[#1a1a1a] rounded-2xl shadow-2xl border border-[#3a3a3a]/50 overflow-hidden"
          >
            {/* Animated background */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-purple-500/5 opacity-60" />
            <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f59e0b' fill-opacity='0.03'%3E%3Cpath d='M30 30l30-30v60L30 30z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20" />
            
            {/* Header */}
            <div className="relative p-6 pb-4">
              <button 
                onClick={onClose}
                className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-[#888] hover:text-[#f4e8c1] transition-colors duration-200 rounded-lg hover:bg-white/5"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
              
              <h2 className={`text-xl font-bold text-[#f4e8c1] mb-2 ${serifFontClass}`}>
                {t("account.title")}
              </h2>
              
              {isGuest && (
                <div className="flex items-center gap-2 text-xs text-amber-400/80">
                  <div className="w-2 h-2 rounded-full bg-amber-400/60"></div>
                  <span className={fontClass}>{t("account.guestMode")}</span>
                </div>
              )}
            </div>

            {/* Avatar and User Info */}
            <div className="relative px-6 pb-6">
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 p-[2px] shadow-lg">
                    <div className="w-full h-full rounded-full bg-[#1a1a1a] flex items-center justify-center text-2xl font-bold text-amber-300">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                  </div>
                  
                  {/* Online indicator */}
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[#1a1a1a] p-1">
                    <div className="w-full h-full rounded-full bg-green-500"></div>
                  </div>
                </div>

                {/* User Details */}
                <div className="flex-1 pt-2">
                  {/* Username */}
                  <div className="mb-3">
                    <label className={`block text-xs font-medium text-[#a18d6f] mb-2 ${fontClass}`}>
                      {t("account.username")}
                    </label>
                    {isEditing ? (
                      <div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={editedUsername}
                            onChange={(e) => setEditedUsername(e.target.value)}
                            className="flex-1 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg px-3 py-2 text-[#f4e8c1] text-sm focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20"
                            autoFocus
                          />
                          <button
                            onClick={handleSaveUsername}
                            disabled={isLoading || !editedUsername.trim()}
                            className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs rounded-lg transition-colors duration-200"
                          >
                            {isLoading ? "..." : "✓"}
                          </button>
                          <button
                            onClick={() => {
                              setIsEditing(false);
                              setEditedUsername(user.username);
                              setError("");
                              setSuccessMessage("");
                            }}
                            className="px-3 py-2 bg-[#3a3a3a] hover:bg-[#4a4a4a] text-[#ccc] text-xs rounded-lg transition-colors duration-200"
                          >
                            ✕
                          </button>
                        </div>
                        
                        {/* Error message */}
                        {error && (
                          <div className="mt-2 text-xs text-red-400 flex items-center gap-1">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <circle cx="12" cy="12" r="10"></circle>
                              <line x1="15" y1="9" x2="9" y2="15"></line>
                              <line x1="9" y1="9" x2="15" y2="15"></line>
                            </svg>
                            <span>{error}</span>
                          </div>
                        )}
                        
                        {/* Success message */}
                        {successMessage && (
                          <div className="mt-2 text-xs text-green-400 flex items-center gap-1">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M9 12l2 2 4-4"></path>
                              <circle cx="12" cy="12" r="10"></circle>
                            </svg>
                            <span>{successMessage}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center justify-between group">
                        <span className={`text-[#f4e8c1] font-medium ${fontClass}`}>
                          {user.username}
                        </span>
                        <button
                          onClick={() => setIsEditing(true)}
                          className="opacity-0 group-hover:opacity-100 px-2 py-1 text-xs text-[#888] hover:text-amber-400 transition-all duration-200 rounded"
                        >
                          {t("account.edit")}
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Email - only for registered users */}
                  {!isGuest && user.email && (
                    <div className="mb-3">
                      <label className={`block text-xs font-medium text-[#a18d6f] mb-2 ${fontClass}`}>
                        {t("account.email")}
                      </label>
                      <div className="flex items-center justify-between">
                        <span className={`text-[#ccc] text-sm ${fontClass}`}>
                          {user.email}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-green-400">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M9 12l2 2 4-4"></path>
                            <circle cx="12" cy="12" r="10"></circle>
                          </svg>
                          <span>{t("account.verified")}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* User ID */}
                  <div className="mb-4">
                    <label className={`block text-xs font-medium text-[#a18d6f] mb-2 ${fontClass}`}>
                      {t("account.userId")}
                    </label>
                    <div className="flex items-center gap-2">
                      <span className={`text-[#888] text-sm font-mono ${fontClass}`}>
                        {user.id}
                      </span>
                      <button
                        onClick={() => navigator.clipboard.writeText(user.id)}
                        className="p-1 text-[#888] hover:text-amber-400 transition-colors duration-200"
                        title={t("account.copyId")}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="mx-6 h-[1px] bg-gradient-to-r from-transparent via-[#3a3a3a] to-transparent"></div>

            {/* Account Type Badge */}
            <div className="px-6 py-4">
              <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg ${
                isGuest 
                  ? "bg-amber-500/10 border border-amber-500/20" 
                  : "bg-green-500/10 border border-green-500/20"
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  isGuest ? "bg-amber-400" : "bg-green-400"
                }`}></div>
                <span className={`text-xs font-medium ${
                  isGuest ? "text-amber-300" : "text-green-300"
                } ${fontClass}`}>
                  {isGuest ? t("account.guestAccount") : t("account.verifiedAccount")}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="p-6 pt-2">
              <button
                onClick={handleLogout}
                className="w-full group relative overflow-hidden bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 hover:border-red-500/50 text-red-400 hover:text-red-300 rounded-xl py-3 px-4 transition-all duration-300 font-medium"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-red-600/0 via-red-600/5 to-red-600/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                
                <div className="relative flex items-center justify-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  <span className={`${fontClass}`}>{t("account.logout")}</span>
                </div>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
} 
 
