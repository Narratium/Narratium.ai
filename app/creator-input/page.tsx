"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Send, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useLanguage } from "../i18n";
import { initAgentSession } from "@/function/agent/session";
import { Toast } from "@/components/Toast";

export default function CreatorInputPage() {
  const router = useRouter();
  const { t, fontClass, serifFontClass, titleFontClass } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [inputValue, setInputValue] = useState("");
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

  useEffect(() => {
    setMounted(true);
    const yellowImg = new Image();
    const redImg = new Image();
    
    yellowImg.src = "/background_yellow.png";
    redImg.src = "/background_red.png";
    
    Promise.all([
      new Promise(resolve => yellowImg.onload = resolve),
      new Promise(resolve => redImg.onload = resolve),
    ]).then(() => {
      setImagesLoaded(true);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    
    setIsLoading(true);
    
    try {
      // Create new agent session
      const response = await initAgentSession(inputValue.trim());
      
      if (!response.success) {
        throw new Error(response.error || "Failed to create session");
      }
      
      // // Navigate to creator-area with session ID
      // router.push(`/creator-area?id=${response.sessionId}`);
      
    } catch (error: any) {
      console.error("Error creating session:", error);
      showErrorToast(error.message || "Failed to start creation process");
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen w-full h-full overflow-auto login-fantasy-bg relative flex flex-col items-center justify-center">
      <div
        className={`absolute inset-0 z-0 opacity-35 transition-opacity duration-500 ${
          imagesLoaded ? "opacity-35" : "opacity-0"
        }`}
        style={{
          backgroundImage: "url('/background_yellow.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      <div
        className={`absolute inset-0 z-1 opacity-45 transition-opacity duration-500 ${
          imagesLoaded ? "opacity-45" : "opacity-0"
        }`}
        style={{
          backgroundImage: "url('/background_red.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          mixBlendMode: "multiply",
        }}
      />

      <div className="flex flex-col items-center justify-center w-full max-w-4xl px-4 py-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h1 className={"text-3xl md:text-5xl font-bold mb-4 font-cinzel bg-clip-text text-transparent bg-gradient-to-r from-amber-500 via-orange-400 to-yellow-300 drop-shadow-[0_0_10px_rgba(251,146,60,0.5)]"}>
            {t("creatorInput.title")}
          </h1>
          <p className={`text-[#c0a480] text-sm md:text-base ${serifFontClass} italic`}>
            {t("creatorInput.subtitle")}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="w-full max-w-2xl"
        >
          <form onSubmit={handleSubmit} className="relative">
            <div className="relative bg-black/20 backdrop-blur-sm border border-amber-500/30 rounded-2xl p-1 shadow-[0_0_20px_rgba(251,146,60,0.3)] hover:shadow-[0_0_30px_rgba(251,146,60,0.4)] transition-all duration-300">
              <textarea
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={t("creatorInput.placeholder")}
                className={`w-full bg-transparent text-[#c0a480] placeholder-[#c0a480]/60 ${serifFontClass} resize-none border-0 outline-none p-4 pr-16 min-h-[60px] max-h-[200px] text-sm md:text-base`}
                disabled={isLoading}
              />
              
              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="absolute right-3 bottom-3 p-2 bg-gradient-to-r from-amber-500 to-orange-400 text-black rounded-xl hover:from-amber-400 hover:to-orange-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-[0_0_10px_rgba(251,146,60,0.5)] hover:shadow-[0_0_15px_rgba(251,146,60,0.7)]"
              >
                {isLoading ? (
                  <Sparkles className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>

            <div className="flex justify-between items-center mt-3 px-2">
              <span className={`text-[#c0a480]/60 text-xs ${fontClass}`}>
                {isLoading ? "Creating your session..." : t("creatorInput.enterToSend")}
              </span>
              <span className="text-[#c0a480]/60 text-xs font-cinzel">
                {inputValue.length}/1000
              </span>
            </div>
            <div className="flex justify-between items-center mt-3 px-2">
              <span className={`text-[#c0a480]/60 text-xs ${fontClass}`}>
                {t("creatorInput.exampleStories")}
              </span>
            </div>
          </form>
        </motion.div>
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
