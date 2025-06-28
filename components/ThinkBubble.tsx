/**
 * ThinkBubble Component
 * 
 * A collapsible component to display character thinking content.
 * Shows the internal thought process of AI characters with expand/collapse functionality.
 */

"use client";

import { useState } from "react";

interface Props {
  thinkingContent: string;
  characterName: string;
  fontClass: string;
  serifFontClass: string;
  t: (key: string) => string;
}

export default function ThinkBubble({
  thinkingContent,
  characterName,
  fontClass,
  serifFontClass,
  t,
}: Props) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Don't render if no thinking content
  if (!thinkingContent || thinkingContent.trim() === "") {
    return null;
  }

  return (
    <div className="mb-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 px-3 py-2 bg-[#2a261f]/70 hover:bg-[#342f25]/80 border border-[#534741]/60 rounded-lg transition-all duration-300 group"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-4 w-4 text-[#a18d6f] group-hover:text-[#c0a480] transition-transform duration-300 ${
            isExpanded ? "rotate-90" : ""
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        
        <div className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 text-[#8a7a6b]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <span className={`text-sm text-[#a18d6f] group-hover:text-[#c0a480] ${fontClass}`}>
            {characterName} {t("characterChat.thinking") || "的思考"}
            {!isExpanded && (
              <span className="text-xs text-[#8a7a6b] ml-1">
                ({thinkingContent.length} {t("characterChat.characters") || "字符"})
              </span>
            )}
          </span>
        </div>
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? "max-h-96 opacity-100 mt-2" : "max-h-0 opacity-0"
        }`}
      >
        <div className="bg-[#1f1d1a]/80 border border-[#534741]/40 rounded-lg p-4 backdrop-blur-sm">
          <div className={`text-sm text-[#c0a480] leading-relaxed whitespace-pre-wrap ${serifFontClass}`}>
            {thinkingContent}
          </div>
        </div>
      </div>
    </div>
  );
} 
