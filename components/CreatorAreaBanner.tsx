/**
 * Creator Area Banner Component
 * 
 * A header banner component for the creator area interface.
 * Features:
 * - Integrated header within the normal document flow (like CharacterChatHeader)
 * - Fantasy-themed design with magical elements
 * - Responsive layout for mobile and desktop
 * - Session title and objective display
 * - Back navigation button
 * - Elegant background and border effects
 * 
 * Dependencies:
 * - framer-motion: For smooth animations
 * - lucide-react: For icons
 * - ResearchSession: From agent model definitions
 */

"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Sparkles } from "lucide-react";
import { ResearchSession } from "@/lib/models/agent-model";

interface CreatorAreaBannerProps {
  session: ResearchSession | null;
  onBack: () => void;
  fontClass: string;
  serifFontClass: string;
}

/**
 * Header banner component for creator area
 * 
 * @param session - Current research session data
 * @param onBack - Callback function for back navigation
 * @param fontClass - Font class for regular text
 * @param serifFontClass - Font class for serif text (titles)
 * @returns {JSX.Element} The header banner component
 */
export default function CreatorAreaBanner({ 
  session, 
  onBack, 
  fontClass, 
  serifFontClass, 
}: CreatorAreaBannerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#1a1816] border-b border-[#534741] p-4 flex items-center"
    >
      <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-4 flex-1">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="group p-2.5 bg-black/40 border border-amber-500/30 rounded-xl hover:bg-black/50 hover:border-amber-400/50 transition-all duration-200 backdrop-blur-sm flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-[#c0a480] group-hover:text-amber-400 transition-colors" />
          </button>
          
          <div className="flex items-center space-x-3">
            <h2 className={`text-lg md:text-xl text-[#eae6db] magical-text ${serifFontClass} truncate max-w-[200px] md:max-w-[300px]`}>
              {session?.title || "创作工坊"}
            </h2>
            <div className="p-1.5 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-400/20 border border-amber-500/30 flex-shrink-0">
              <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-amber-400 fantasy-glow" />
            </div>
          </div>
        </div>

        {session?.research_state?.main_objective && (
          <div className="flex-1 min-w-0">
            <p className={`text-[#c0a480]/80 text-xs md:text-sm leading-relaxed line-clamp-1 ${fontClass}`}>
              {session.research_state.main_objective}
            </p>
          </div>
        )}
      </div>

      {/* Right side - Optional status indicator */}
      <div className="flex items-center space-x-2 flex-shrink-0">
        <div className="hidden sm:flex items-center space-x-2">
          <div className="w-2 h-2 bg-amber-400 rounded-full animate-pulse"></div>
          <span className={`text-xs text-[#c0a480]/70 ${fontClass}`}>
            Active
          </span>
        </div>
      </div>
    </motion.div>
  );
} 
