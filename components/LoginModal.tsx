"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "@/app/i18n";
import { Toast } from "@/components/Toast";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const { t, serifFontClass } = useLanguage();
  const [guestName, setGuestName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

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

  const resetForm = () => {
    setGuestName("");
    setErrorToast({ isVisible: false, message: "" } ); // Clear error toast
  };

  const renderInput = (
    type: "text",
    value: string,
    onChange: (value: string) => void,
    placeholder: string,
  ) => {
    return (
      <div className="relative w-full group">
        <div className="relative magical-input min-h-[60px] flex items-center justify-center">
          <input
            type={type}
            className={`bg-transparent border-0 outline-none w-full text-center text-base text-[#eae6db] placeholder-[#a18d6f] shadow-none focus:ring-0 focus:border-0 ${serifFontClass}`}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
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
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Guest login mode - only requires a name
    if (!guestName.trim()) {
      showErrorToast(t("auth.nameRequired"));
      return;
    }

    setIsLoading(true);
    setErrorToast({ isVisible: false, message: "" }); // Clear error toast

    try {
      // Store guest data in localStorage
      localStorage.setItem("username", guestName.trim());
      localStorage.setItem("userId", `guest_${Date.now()}`);
      localStorage.setItem("email", "");
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("loginMode", "guest");

      onClose();
      resetForm();
      window.location.reload();
    } catch (err) {
      console.error("Guest login error:", err);
      showErrorToast(t("auth.loginFailed"));
    } finally {
      setIsLoading(false);
    }
  };

  const getTitle = () => {
    return t("auth.guestLogin");
  };

  const getSubmitButtonText = () => {
    return isLoading ? t("auth.entering") : t("auth.enterAsGuest");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          <motion.div 
            key="login-modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            key="login-modal-content"
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
                {getTitle()}
              </h1>
            </div>

            {/* Error Toast */}
            <Toast
              isVisible={errorToast.isVisible}
              message={errorToast.message}
              onClose={hideErrorToast}
              type="error"
            />

            <form onSubmit={handleSubmit} className="w-full space-y-4">
              <>
                {/* Guest: Name Input */}
                <div>
                  {renderInput(
                    "text",
                    guestName,
                    setGuestName,
                    t("auth.guestNamePlaceholder"),
                  )}
                </div>
              </>

              {/* Submit Button */}
              <div className="text-center mt-8">
                <div className="flex items-center justify-center gap-3">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`group relative px-6 py-2.5 bg-transparent border border-[#c0a480] text-[#c0a480] rounded-full text-sm font-medium transition-all duration-500 hover:border-[#f9c86d] hover:text-[#f9c86d] hover:shadow-lg hover:shadow-[#c0a480]/20 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden ${serifFontClass}`}
                  >
                    {/* Animated background */}
                    <div className="absolute inset-0 bg-gradient-to-r from-[#c0a480]/0 via-[#c0a480]/10 to-[#c0a480]/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                  
                    {/* Subtle inner glow */}
                    <div className="absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-[#f9c86d]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  
                    {/* Button content */}
                    <div className="relative z-10 flex items-center justify-center gap-2">
                      {isLoading ? (
                        <>
                          <div className="animate-spin w-3.5 h-3.5 border border-[#c0a480] border-t-transparent rounded-full"></div>
                          <span className="tracking-wide">{getSubmitButtonText()}</span>
                        </>
                      ) : (
                        <>
                          <span className="tracking-wide">{getSubmitButtonText()}</span>
                          {/* Elegant arrow icon */}
                          <svg 
                            className="w-3.5 h-3.5 transition-transform duration-300 group-hover:translate-x-0.5" 
                            fill="none" 
                            stroke="currentColor" 
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </>
                      )}
                    </div>
                  
                    {/* Subtle border animation */}
                    <div className="absolute inset-0 rounded-full border border-[#f9c86d]/20 scale-105 opacity-0 group-hover:opacity-100 transition-all duration-300"></div>
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

  );
}
