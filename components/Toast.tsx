import React, { useEffect } from "react";
import { useLanguage } from "@/app/i18n";

export type ToastType = "success" | "warning" | "error";

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  type?: ToastType;
  title?: string;
  autoClose?: boolean;
  duration?: number;
}

interface ErrorToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
}

// Enhanced Toast component with multiple states
export function Toast({ 
  message, 
  isVisible, 
  onClose, 
  type = "error", 
  title,
  autoClose = true,
  duration = 5000,
}: ToastProps) {
  const { t } = useLanguage();

  useEffect(() => {
    if (isVisible && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose, autoClose, duration]);

  if (!isVisible) return null;

  const getToastConfig = (type: ToastType) => {
    switch (type) {
    case "success":
      return {
        borderColor: "border-green-600",
        iconColor: "text-green-400",
        titleColor: "text-green-100",
        messageColor: "text-green-200",
        defaultTitle: t("toast.success") || "Success",
        icon: (
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        ),
      };
    case "warning":
      return {
        borderColor: "border-yellow-600",
        iconColor: "text-yellow-400",
        titleColor: "text-yellow-100",
        messageColor: "text-yellow-200",
        defaultTitle: t("toast.warning") || "Warning",
        icon: (
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        ),
      };
    case "error":
    default:
      return {
        borderColor: "border-[#a18d6f]",
        iconColor: "text-[#c0a480]",
        titleColor: "text-[#f4e8c1]",
        messageColor: "text-[#c0a480]",
        defaultTitle: t("characterChat.requestFailed") || "Error",
        icon: (
          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        ),
      };
    }
  };

  const config = getToastConfig(type);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className={`bg-[#252220] ${config.borderColor} border rounded-lg shadow-lg p-4 max-w-sm mx-4`}>
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <div className={config.iconColor}>
              {config.icon}
            </div>
          </div>
          <div className="ml-3 flex-1">
            <p className={`text-sm ${config.titleColor} font-medium`}>
              {title || config.defaultTitle}
            </p>
            <p className={`text-sm ${config.messageColor} mt-1`}>
              {message}
            </p>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={onClose}
              className="inline-flex text-[#a18d6f] hover:text-[#c0a480] focus:outline-none"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
 
