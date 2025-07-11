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
      {/* Question with subtle styling */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium text-amber-400 bg-amber-500/10 border border-amber-400/20">
            <span className="text-sm">🤔</span>
            需要您的输入
          </span>
        </div>
        <div className="text-sm leading-relaxed text-[#c0a480]/90 ml-1">
          {question}
        </div>
      </div>

      {/* Options with cursor-style design */}
      {options && options.length > 0 && !showCustomInput && (
        <div className="space-y-2 mb-4">
          {options.map((option, index) => (
            <motion.button
              key={index}
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.08, duration: 0.3 }}
              onClick={() => handleOptionSelect(option)}
              disabled={isLoading}
              className="group block w-full text-left px-4 py-3 text-sm text-[#c0a480] rounded-lg border border-amber-500/15 hover:border-amber-500/30 bg-black/5 hover:bg-black/10 transition-all duration-200 disabled:opacity-50"
            >
              <div className="flex items-center justify-between">
                <span className="group-hover:text-[#eae6db]">{option}</span>
                <span className="opacity-0 group-hover:opacity-100 text-xs text-amber-400 transition-opacity">
                  按 Enter 选择
                </span>
              </div>
            </motion.button>
          ))}
          
          {/* Custom input toggle with subtle style */}
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            onClick={() => setShowCustomInput(true)}
            className="flex items-center gap-2 text-xs text-[#c0a480]/60 hover:text-[#c0a480] transition-colors ml-1 mt-3"
          >
            <span className="w-4 h-4 border border-dashed border-current rounded flex items-center justify-center">+</span>
            自定义输入
          </motion.button>
        </div>
      )}

      {/* Custom input with cursor-style */}
      {(showCustomInput || (!options || options.length === 0)) && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.3 }}
          className="bg-black/5 rounded-lg border border-amber-500/15 p-3"
        >
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="输入您的回复..."
                disabled={isLoading}
                className="w-full px-0 py-2 text-sm text-[#c0a480] bg-transparent border-0 border-b border-amber-500/20 focus:outline-none focus:border-amber-500/40 placeholder-[#c0a480]/40"
                autoFocus
              />
            </div>
            <button
              onClick={handleCustomSubmit}
              disabled={isLoading || !customInput.trim()}
              className="px-4 py-2 text-xs font-medium text-black bg-amber-400 rounded-md hover:bg-amber-300 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex-shrink-0"
            >
              {isLoading ? (
                <div className="w-4 h-4 border border-black/20 border-t-black rounded-full animate-spin" />
              ) : (
                "发送"
              )}
            </button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};

export default InlineUserInput; 
