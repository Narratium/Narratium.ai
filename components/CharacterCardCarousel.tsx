/**
 * Character Card Carousel Component
 * 
 * This component provides a 3D carousel display for character cards with the following features:
 * - 3D circular carousel layout with perspective
 * - Smooth rotation animations
 * - Dynamic card scaling and opacity based on position
 * - Interactive navigation controls
 * - Card tilt effect with glare
 * - Quick action buttons for chat, edit, and delete
 * 
 * The component handles:
 * - 3D carousel rendering and layout
 * - Rotation animations and transitions
 * - Card positioning and perspective
 * - Navigation controls
 * - Responsive design adaptation
 * 
 * Dependencies:
 * - framer-motion: For animations
 * - useLanguage: For internationalization
 * - CharacterAvatarBackground: For avatar display
 */

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useState } from "react";
import { useLanguage } from "@/app/i18n";
import { CharacterAvatarBackground } from "@/components/CharacterAvatarBackground";
import { trackButtonClick } from "@/utils/google-analytics";

/**
 * Interface definitions for the component's data structures
 */
interface Character {
  id: string;
  name: string;
  personality: string;
  scenario?: string;
  first_mes?: string;
  creatorcomment?: string;
  created_at: string;
  avatar_path?: string;
}

interface CharacterCardCarouselProps {
  characters: Character[];
  onEditClick: (character: Character, e: React.MouseEvent) => void;
  onDeleteClick: (characterId: string) => void;
}

/**
 * Main carousel component for displaying character cards in a 3D circular layout
 * 
 * @param {CharacterCardCarouselProps} props - Component props
 * @returns {JSX.Element} The rendered 3D carousel of character cards
 */
const CharacterCardCarousel: React.FC<CharacterCardCarouselProps> = ({
  characters,
  onEditClick,
  onDeleteClick,
}) => {
  const { t, fontClass, serifFontClass } = useLanguage();
  const [currentCenterIndex, setCurrentCenterIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Calculate carousel parameters based on number of cards
  const cardCount = Math.min(characters.length, 8);
  const angleStep = cardCount > 0 ? 360 / cardCount : 120;
  const translateZDistance = cardCount <= 3 ? 30 : Math.max(25, 30 - (cardCount - 3) * 2);

  /**
   * Handle carousel rotation to the left
   * Prevents multiple rotations during animation
   */
  const handleRotateLeft = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentCenterIndex(prev => (prev + 1) % cardCount);
    setTimeout(() => setIsAnimating(false), 800);
  };

  /**
   * Handle carousel rotation to the right
   * Prevents multiple rotations during animation
   */
  const handleRotateRight = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentCenterIndex(prev => (prev - 1 + cardCount) % cardCount);
    setTimeout(() => setIsAnimating(false), 800);
  };

  return (
    <div className="relative w-full h-[70vh] max-h-[600px] my-12 pt-40 flex items-center justify-center" style={{ perspective: "1500px" }}>
      {/* 3D carousel container */}
      <div 
        className="w-full h-full absolute transform-style-preserve-3d"
        style={{
          transformOrigin: "center center 0px",
          transformStyle: "preserve-3d",
          transform: `translateZ(-${translateZDistance}vw)`,
        }}
      >
        {characters.slice(0, cardCount).map((character, index) => {
          // Calculate card position and visual properties
          const relativePosition = (index - currentCenterIndex + cardCount) % cardCount;
          const rotateY = relativePosition * angleStep;

          const isCentered = relativePosition === 0;
          const isBackface = rotateY > 90 && rotateY < 270;
          const isSideface = !isCentered && !isBackface;

          // Determine card appearance based on position
          let opacity, filter, boxShadow, scale;
          if (isCentered) {
            opacity = 1;
            filter = "none";
            boxShadow = "0 8px 25px rgba(0, 0, 0, 0.4)";
            scale = 1;
          } else if (isSideface) {
            opacity = 0.7;
            filter = "none";
            boxShadow = "0 4px 15px rgba(0, 0, 0, 0.2)";
            scale = 0.9;
          } else {
            opacity = 0.4;
            filter = "none";
            boxShadow = "0 2px 10px rgba(0, 0, 0, 0.1)";
            scale = 0.8;
          }
          
          return (
            <motion.div
              key={character.id}
              className="absolute w-full h-full flex items-center justify-center"
              style={{
                transform: `rotateY(${rotateY}deg) translateZ(${translateZDistance}vw) scale(${scale})`,
                transformOrigin: "center center",
                maxWidth: "280px",
                maxHeight: "350px",
                width: "40vw",
                height: "50vw",
                left: "calc(50% - 10vw)",
                top: "calc(50% - 15vw)",
                boxShadow,
                opacity,
                filter,
                borderRadius: "8px",
                transition: isAnimating ? "all 0.8s cubic-bezier(0.77, 0, 0.175, 1)" : "opacity 0.3s ease, filter 0.3s ease, box-shadow 0.3s ease",
              }}
            >
              {/* Character card content */}
              <div className="relative session-card h-full w-full transition-all duration-300 overflow-hidden rounded">
                {/* Action buttons */}
                <div className="absolute top-2 right-2 flex space-x-1 z-10">
                  <Link
                    href={`/character?id=${character.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 bg-[#252220] hover:bg-[#3a2a2a] rounded-full text-[#c0a480] hover:text-[#ffd475] transition-colors"
                    title={t("characterCardsPage.chat")}
                    aria-label={t("characterCardsPage.chat")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#c0a480] hover:text-[#ffd475] transition-colors">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                  </Link>
                  <button
                    onClick={(e) => {trackButtonClick("edit_character_btn", "编辑角色"); onEditClick(character, e);}}
                    className="p-1.5 bg-[#252220] hover:bg-[#3a2a2a] rounded-full text-[#c0a480] hover:text-[#ffd475] transition-colors"
                    title={t("characterCardsPage.edit")}
                    aria-label={t("characterCardsPage.edit")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      trackButtonClick("delete_character_btn", "删除角色");
                      e.stopPropagation();
                      onDeleteClick(character.id);
                    }}
                    className="p-1.5 bg-[#252220] hover:bg-[#3a2a2a] rounded-full text-[#c0a480] hover:text-[#ffd475] transition-colors"
                    title={t("characterCardsPage.delete")}
                    aria-label={t("characterCardsPage.delete")}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
                    
                <Link
                  href={`/character?id=${character.id}`}
                  className="block h-full flex flex-col"
                >
                  {/* Character avatar */}
                  <div className="relative w-full overflow-hidden rounded aspect-[4/5]">
                    {character.avatar_path ? (
                      <CharacterAvatarBackground avatarPath={character.avatar_path} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-[#252220]">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-[#534741]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                  </div>
                
                  {/* Character info */}
                  <div className="p-4 relative">
                    <h2 className={`text-lg text-[#eae6db] line-clamp-1 magical-text ${serifFontClass}`}>{character.name}</h2>
                    <div className={`text-xs text-[#a18d6f] mt-2 italic ${fontClass}`}>
                      <span className="inline-block mr-1 opacity-70">✨</span>
                      <span className="line-clamp-2">{character.personality}</span>
                    </div>

                    {/* Navigation controls for centered card */}
                    {isCentered && cardCount > 1 && (
                      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-2 z-30">
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRotateLeft();
                          }}
                          disabled={isAnimating}
                          className="p-2 bg-[#252220]/90 hover:bg-[#3a2a2a]/95 rounded-full text-[#c0a480] hover:text-[#ffd475] transition-all duration-300 backdrop-blur-sm border border-[#3a2a2a]/50 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                          aria-label="向左旋转"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="15 18 9 12 15 6"></polyline>
                          </svg>
                        </button>

                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleRotateRight();
                          }}
                          disabled={isAnimating}
                          className="p-2 bg-[#252220]/90 hover:bg-[#3a2a2a]/95 rounded-full text-[#c0a480] hover:text-[#ffd475] transition-all duration-300 backdrop-blur-sm border border-[#3a2a2a]/50 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                          aria-label="向右旋转"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 6 15 12 9 18"></polyline>
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                </Link>
              </div>
            </motion.div>
          );
        })}
      </div>
      <style jsx>{`
        .transform-style-preserve-3d {
          transform-style: preserve-3d;
        }
      `}</style>
    </div>
  );
};

export default CharacterCardCarousel;
