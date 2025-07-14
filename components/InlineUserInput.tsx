/**
 * InlineUserInput Component
 * 
 * Provides an elegant inline user input interface inspired by cursor-style design.
 * Features:
 * - Cursor-style inline appearance
 * - Option buttons with hover effects
 * - Custom input with bottom border design
 * - Smooth animations and transitions
 * - Keyboard support (Enter to send)
 * - Loading states with spinner
 * - Dynamic width matching content length
 * - Auto line wrapping for long content
 * 
 * Dependencies:
 * - framer-motion: For smooth animations
 * - React hooks: For state management
 */

"use client";

import React, { useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { PenSquare, Send, Plus } from "lucide-react";

interface InlineUserInputProps {
  question: string;
  options?: string[];
  onResponse: (response: string) => void;
  isLoading?: boolean;
}

/**
 * InlineUserInput component for elegant user interaction
 * 
 * @param {InlineUserInputProps} props - Component props
 * @returns {JSX.Element} The inline user input component
 */
const InlineUserInput: React.FC<InlineUserInputProps> = ({ 
  question, 
  options, 
  onResponse, 
  isLoading, 
}) => {
  const [customInput, setCustomInput] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-resize textarea height
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [customInput]);

  const handleCustomSubmit = () => {
    if (customInput.trim()) {
      onResponse(customInput.trim());
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleCustomSubmit();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="relative"
    >
      {/* Redesigned Question Header */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-3 text-amber-400 font-medium text-sm">
          <PenSquare className="w-4 h-4" />
          <span>需要您的输入</span>
        </div>
        <div className="pl-6 text-sm leading-relaxed text-[#c0a480]/90">
          {question}
        </div>
      </div>

      {/* Elegant Reference Options */}
      {options && options.length > 0 && (
        <div className="pl-6 mb-4">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="bg-black/20 border border-amber-500/25 rounded-xl p-4 mb-3 backdrop-blur-sm"
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-gradient-to-b from-amber-400 to-amber-600 rounded-full"></div>
              <span className="text-xs text-amber-400/90 font-medium tracking-wide">参考选项</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {options.map((option, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05, duration: 0.25 }}
                  className="inline-flex items-center px-3 py-1.5 text-xs text-[#c0a480]/80 bg-black/30 border border-amber-500/20 rounded-full hover:bg-black/40 hover:border-amber-400/40 hover:text-[#f4e8c1] transition-all duration-200 cursor-pointer"
                  onClick={() => {
                    setCustomInput(option);
                    if (inputRef.current) {
                      inputRef.current.focus();
                    }
                  }}
                >
                  {option}
                </motion.button>
              ))}
            </div>
          </motion.div>
        </div>
      )}

      {/* Elegant Compact Input */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="pl-6"
      >
        <div className="relative inline-flex items-center min-w-[280px] max-w-lg">
          <input
            ref={inputRef}
            type="text"
            value={customInput}
            onChange={(e) => setCustomInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="输入您的回复..."
            disabled={isLoading}
            className="w-full pl-4 pr-12 py-2.5 text-sm text-[#f4e8c1] bg-black/30 border border-amber-500/30 rounded-full focus:outline-none focus:border-amber-400/60 focus:bg-black/40 placeholder-[#c0a480]/60 transition-all duration-300 hover:border-amber-500/40"
            autoFocus
          />
          <button
            onClick={handleCustomSubmit}
            disabled={isLoading || !customInput.trim()}
            className="absolute right-1.5 p-1.5 text-amber-400 rounded-full hover:bg-amber-500/15 disabled:text-[#c0a480]/40 disabled:hover:bg-transparent transition-all duration-200"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-[#c0a480]/40 border-t-amber-400 rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default InlineUserInput; 
