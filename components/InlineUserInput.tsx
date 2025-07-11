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
 * 
 * Dependencies:
 * - framer-motion: For smooth animations
 * - React hooks: For state management
 */

"use client";

import React, { useState } from "react";
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
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [customInput, setCustomInput] = useState<string>("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  const handleOptionSelect = (option: string) => {
    setSelectedOption(option);
    onResponse(option);
  };

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

      {/* Redesigned Options */}
      {options && options.length > 0 && !showCustomInput && (
        <div className="pl-6 space-y-2 mb-4">
          {options.map((option, index) => (
            <motion.button
              key={index}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.07, duration: 0.25 }}
              onClick={() => handleOptionSelect(option)}
              disabled={isLoading}
              className="group block w-full text-left px-4 py-2.5 text-sm text-[#c0a480] rounded-lg border border-transparent hover:border-amber-500/30 bg-black/10 hover:bg-black/20 transition-all duration-200 disabled:opacity-50"
            >
              <span className="group-hover:text-amber-400 transition-colors">{option}</span>
            </motion.button>
          ))}
          
          {/* Redesigned custom input toggle */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            onClick={() => setShowCustomInput(true)}
            className="flex items-center gap-2 text-xs text-[#c0a480]/60 hover:text-amber-400 transition-colors pt-2"
          >
            <Plus className="w-3 h-3" />
            <span>自定义输入</span>
          </motion.button>
        </div>
      )}

      {/* Redesigned Custom Input */}
      {(showCustomInput || (!options || options.length === 0)) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="pl-6"
        >
          <div className="relative flex items-center">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入您的回复..."
              disabled={isLoading}
              className="w-full pl-4 pr-12 py-3 text-sm text-[#eae6db] bg-black/20 rounded-lg border border-amber-500/20 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 placeholder-[#c0a480]/50 transition-all"
              autoFocus
            />
            <button
              onClick={handleCustomSubmit}
              disabled={isLoading || !customInput.trim()}
              className="absolute right-2 p-2 text-amber-400 rounded-md hover:bg-amber-500/10 disabled:text-slate-400 disabled:bg-transparent transition-all duration-200"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-slate-400/50 border-t-amber-400 rounded-full animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default InlineUserInput; 
