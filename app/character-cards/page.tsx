/**
 * Character Cards Page Component
 * 
 * This page serves as the main interface for managing character cards in the application.
 * Features include:
 * - Grid and carousel view modes for character cards
 * - Character import functionality
 * - Character editing capabilities
 * - Character download options
 * - Character deletion
 * - Responsive design with fantasy-themed UI
 * 
 * The page integrates with various modals for character management and
 * provides a rich user experience with animations and interactive elements.
 * 
 * Dependencies:
 * - ImportCharacterModal: For importing new characters
 * - EditCharacterModal: For editing existing character
 * - DownloadCharacterModal: For downloading character data
 * - CharacterCardGrid: For displaying characters in grid view
 * - Framer Motion: For animations
 */

"use client";

import React, { useState, useEffect } from "react";
import { useLanguage } from "@/app/i18n";
import { motion } from "framer-motion";
import ImportCharacterModal from "@/components/ImportCharacterModal";
import EditCharacterModal from "@/components/EditCharacterModal";
import DownloadCharacterModal from "@/components/DownloadCharacterModal";
import CharacterCardGrid from "@/components/CharacterCardGrid";
import CharacterCardCarousel from "@/components/CharacterCardCarousel";
import { getAllCharacters } from "@/function/character/list";
import { deleteCharacter } from "@/function/character/delete";
import { handleCharacterUpload } from "@/function/character/import";
import { trackButtonClick } from "@/utils/google-analytics";
import { moveToTop } from "@/function/character/move-to-top";
import { Toast } from "@/components/Toast";

/**
 * Interface defining the structure of a character object
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

/**
 * Main character cards page component
 * 
 * Manages the display and interaction with character cards, including:
 * - Fetching and displaying character data
 * - Handling character operations (import, edit, delete)
 * - Managing view modes (grid/carousel)
 * - Providing loading states and empty states
 * 
 * @returns {JSX.Element} The complete character cards page interface
 */
export default function CharacterCards() {
  const { t, fontClass, serifFontClass } = useLanguage();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [currentCharacter, setCurrentCharacter] = useState<Character | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "carousel">("grid");
  const [mounted, setMounted] = useState(false);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isDownloadingPresets, setIsDownloadingPresets] = useState(false);
  
  // ErrorToast state
  const [errorToast, setErrorToast] = useState({
    isVisible: false,
    message: "",
  });

  const showErrorToast = (message: string) => {
    setErrorToast({
      isVisible: true,
      message,
    });
  };

  const hideErrorToast = () => {
    setErrorToast({
      isVisible: false,
      message: "",
    });
  };

  useEffect(() => {
    const savedViewMode = localStorage.getItem("characterCardsViewMode");
    if (savedViewMode === "grid" || savedViewMode === "carousel") {
      setViewMode(savedViewMode);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener("resize", checkMobile);
    
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
    
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const fetchCharacters = async () => {
    setIsLoading(true);
    const username = localStorage.getItem("username") || "";
    const language = localStorage.getItem("language") || "zh";
    try {
      const response = await getAllCharacters(language as "zh" | "en", username);

      if (!response) {
        setCharacters([]);
        return;
      }

      setCharacters(response);
    } catch (err) {
      console.error("Error fetching characters:", err);
      showErrorToast(t("characterCardsPage.fetchError") || "Failed to fetch characters");
      setCharacters([]);
    } finally {
      setIsLoading(false);
    }
  };
    
  /**
   * Migrates data structure by deleting all character cards
   * This is a one-time operation triggered by localStorage flag
   * Used when data structure changes from parsed_content to parsedContent
   */
  const migrateDataStructure = async () => {
    const migrationFlag = localStorage.getItem("characterCardsDataMigration");
    
    // Check if migration is needed and hasn't been performed yet
    if (migrationFlag !== "completed") {
      console.log("Starting data structure migration - deleting all character cards");
      
      try {
        // Fetch all characters first
        const username = localStorage.getItem("username") || "";
        const language = localStorage.getItem("language") || "zh";
        const characters = await getAllCharacters(language as "zh" | "en", username);
        
        if (characters && characters.length > 0) {
          // Delete all character cards
          for (const character of characters) {
            try {
              await deleteCharacter(character.id);
              console.log(`Deleted character: ${character.name}`);
            } catch (error) {
              console.error(`Failed to delete character ${character.name}:`, error);
              showErrorToast(`Failed to delete character ${character.name}`);
            }
          }
        }
        
        // Mark migration as completed
        localStorage.setItem("characterCardsDataMigration", "completed");
        console.log("Data structure migration completed");
        
      } catch (error) {
        console.error("Error during data structure migration:", error);
        showErrorToast(t("characterCardsPage.migrationError") || "Error during data migration");
      }
    }
  };
    
  const handleDeleteCharacter = async (characterId: string) => {
    setIsLoading(true);
    try {
      const response = await deleteCharacter(characterId);

      if (!response.success) {
        throw new Error(t("characterCardsPage.deleteFailed"));
      }

      fetchCharacters();
    } catch (err) {
      console.error("Error deleting character:", err);
      showErrorToast(t("characterCardsPage.deleteFailed") || "Failed to delete character");
      setIsLoading(false);
    }
  };

  const handleMoveCharToTop = async (characterId: string) => {
    setIsLoading(true);
    try {
      const response = await moveToTop(characterId);

      if (!response.success) {
        throw new Error(t("characterCardsPage.topFailed"));
      }

      fetchCharacters();
    } catch (err) {
      console.error("Error moving character to top:", err);
      showErrorToast(t("characterCardsPage.topFailed") || "Failed to move character to top");
      setIsLoading(false);
    }
  };

  const handleEditClick = (character: Character, e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentCharacter(character);
    setIsEditModalOpen(true);
  };

  const handleEditSuccess = () => {
    fetchCharacters();
    setIsEditModalOpen(false);
    setCurrentCharacter(null);
  };

  /**
   * Downloads preset character cards for first-time users or when character list is empty
   * Fetches available characters from GitHub and downloads specific preset characters
   */
  const downloadPresetCharacters = async () => {
    setIsDownloadingPresets(true);
    try {
      // Fetch available character files from GitHub
      const response = await fetch("https://api.github.com/repos/Narratium/Character-Card/contents");
      const data = await response.json();
      
      if (!Array.isArray(data)) {
        console.error("Failed to fetch character files from GitHub");
        showErrorToast(t("characterCardsPage.downloadError") || "Failed to fetch preset characters");
        return;
      }

      // Define specific preset character files to download
      const presetCharacterNames = [
        "《致炽焰以战歌》(二次元)(同人、二创).png",
        "为美好的世界献上祝福恋爱角色扮演--纯爱，同人二创(同人、二创).png",
        "在地下城寻求邂逅是否搞错了什么（拓展神明扮演）--纯爱，系统工具(玄幻、同人、二创).png",
      ];

      // Filter and find the specific preset characters
      const pngFiles = data.filter((item: any) => 
        item.name.endsWith(".png") && presetCharacterNames.includes(item.name),
      );

      // Download and import each preset character
      for (const file of pngFiles) {
        try {
          const fileResponse = await fetch(file.download_url || `https://raw.githubusercontent.com/Narratium/Character-Card/main/${file.name}`);
          if (!fileResponse.ok) {
            console.error(`Failed to download ${file.name}`);
            showErrorToast(`Failed to download ${file.name}`);
            continue;
          }
          
          const blob = await fileResponse.blob();
          const fileObj = new File([blob], file.name, { type: blob.type });
          
          await handleCharacterUpload(fileObj);
        } catch (error) {
          console.error(`Failed to import ${file.name}:`, error);
        }
      }

      // Refresh character list after importing
      await fetchCharacters();
      
      // Only mark as not first time if it was actually the first visit
      const isFirstVisit = localStorage.getItem("characterCardsFirstVisit") !== "false";
      if (isFirstVisit) {
        localStorage.setItem("characterCardsFirstVisit", "false");
      }
      
    } catch (error) {
      console.error("Error downloading preset characters:", error);
    } finally {
      setIsDownloadingPresets(false);
    }
  };

  useEffect(() => {
    const initializeData = async () => {
      // First run data structure migration if needed
      await migrateDataStructure();
      // Then fetch characters
      await fetchCharacters();
    };
    
    initializeData();
  }, []);

  // Check if this is the first visit and auto-download preset characters
  useEffect(() => {
    const isFirstVisit = localStorage.getItem("characterCardsFirstVisit") !== "false";
    
    // Auto-download preset characters if:
    // 1. It's the first visit, OR
    // 2. Character list is empty (regardless of first visit status)
    if ((isFirstVisit || characters.length === 0) && characters.length === 0 && !isLoading && !isDownloadingPresets) {
      downloadPresetCharacters();
    }
  }, [characters.length, isLoading, isDownloadingPresets]);

  if (!mounted) return null;

  return (
    <div className="h-full w-full overflow-hidden login-fantasy-bg relative">
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
      
      <div className="h-full w-full overflow-y-auto">
        <div className="flex flex-col items-center justify-start w-full py-8">
          <div className="w-full max-w-4xl relative z-10 px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="flex justify-between items-center mb-8"
            >
              <div className="flex items-center gap-3">
                <h1 className={`text-xl sm:text-2xl magical-login-text ${serifFontClass}`}>{t("sidebar.characterCards")}</h1>
                <motion.button
                  className={`hidden md:block portal-button text-[#c0a480] hover:text-[#ffd475] p-1.5 sm:p-2 border border-[#534741] rounded-lg cursor-pointer ${fontClass} translate-y-[1px]`}
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  onClick={() => {
                    trackButtonClick("view_mode_btn", "切换视图模式");
                    const newViewMode = viewMode === "grid" ? "carousel" : "grid";
                    setViewMode(newViewMode);
                    localStorage.setItem("characterCardsViewMode", newViewMode);
                  }}
                >
                  {viewMode === "grid" ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:w-5 sm:h-5">
                      <rect x="3" y="3" width="7" height="7"></rect>
                      <rect x="14" y="3" width="7" height="7"></rect>
                      <rect x="14" y="14" width="7" height="7"></rect>
                      <rect x="3" y="14" width="7" height="7"></rect>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:w-5 sm:h-5">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon>
                    </svg>
                  )}
                </motion.button>
              </div>
              <div className="flex gap-2 sm:gap-3">
                <motion.div
                  className={`portal-button relative overflow-hidden px-2 py-1.5 sm:px-4 sm:py-2 rounded-lg cursor-pointer ${fontClass}
                    bg-gradient-to-b from-[#2a231c] to-[#1a1510]
                    border border-[#534741]
                    shadow-[0_0_15px_rgba(192,164,128,0.1)]
                    hover:shadow-[0_0_20px_rgba(192,164,128,0.2)]
                    before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-[rgba(192,164,128,0.1)] before:to-transparent
                    before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700
                    group`}
                  whileHover={{ 
                    scale: 1.01,
                    boxShadow: "0 0 25px rgba(192,164,128,0.3)",
                  }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 400, 
                    damping: 10, 
                  }}
                  onClick={() => setIsImportModalOpen(true)}
                >
                  <span className="relative z-10 text-[#c0a480] group-hover:text-[#ffd475] transition-colors duration-300 text-xs sm:text-base">
                    {t("characterCardsPage.importCharacter")}
                  </span>
                </motion.div>
                <motion.div
                  className={`portal-button relative overflow-hidden px-2 py-1.5 sm:px-4 sm:py-2 rounded-lg cursor-pointer ${fontClass}
                    bg-gradient-to-b from-[#2a231c] to-[#1a1510]
                    border border-[#534741]
                    shadow-[0_0_15px_rgba(192,164,128,0.1)]
                    hover:shadow-[0_0_20px_rgba(192,164,128,0.2)]
                    before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-[rgba(192,164,128,0.1)] before:to-transparent
                    before:translate-x-[-100%] hover:before:translate-x-[100%] before:transition-transform before:duration-700
                    group`}
                  whileHover={{ 
                    scale: 1.01,
                    boxShadow: "0 0 25px rgba(192,164,128,0.3)",
                  }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 400, 
                    damping: 10, 
                  }}
                  onClick={() => setIsDownloadModalOpen(true)}
                >
                  <span className="relative z-10 text-[#c0a480] group-hover:text-[#ffd475] transition-colors duration-300 text-xs sm:text-base">
                    {t("characterCardsPage.downloadCharacter")}
                  </span>
                </motion.div>
              </div>
            </motion.div>

            {isLoading ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-center items-center h-64"
              >
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 rounded-full border-2 border-t-[#f9c86d] border-r-[#c0a480] border-b-[#a18d6f] border-l-transparent animate-spin"></div>
                  <div className="absolute inset-2 rounded-full border-2 border-t-[#a18d6f] border-r-[#f9c86d] border-b-[#c0a480] border-l-transparent animate-spin-slow"></div>
                  <div className={`absolute w-full text-center top-20 text-[#c0a480] ${fontClass}`}>
                    {isDownloadingPresets ? t("characterCardsPage.downloadingPresets") : t("characterCardsPage.loading")}
                  </div>
                </div>
              </motion.div>
            ) : characters.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="session-card p-8 text-center"
              >
                <div className="mb-6 opacity-60">
                  <svg className="mx-auto" width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M32 0L38 20H60L42 32L48 52L32 40L16 52L22 32L4 20H26L32 0Z" fill="#f9c86d" fillOpacity="0.3" />
                  </svg>
                </div>
                <p className={`text-[#eae6db] mb-6 ${serifFontClass}`}>{t("characterCardsPage.noCharacters")}</p>
                <motion.div
                  className={`portal-button inline-block text-[#c0a480] hover:text-[#ffd475] px-5 py-2 border border-[#534741] rounded-lg cursor-pointer ${fontClass}`}
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 400, damping: 10 }}
                  onClick={() => setIsImportModalOpen(true)}
                >
                  {t("characterCardsPage.importFirstCharacter")}
                </motion.div>
              </motion.div>
            ) : viewMode === "grid" || isMobile ? (
              <CharacterCardGrid
                characters={characters}
                onEditClick={handleEditClick}
                onDeleteClick={handleDeleteCharacter}
                onMoveToTopClick={handleMoveCharToTop}
              />
            ) : (
              <CharacterCardCarousel
                characters={characters}
                onEditClick={handleEditClick}
                onDeleteClick={handleDeleteCharacter}
              />
            )}
          </div>

          <ImportCharacterModal
            isOpen={isImportModalOpen}
            onClose={() => setIsImportModalOpen(false)}
            onImport={fetchCharacters}
          />
          <DownloadCharacterModal
            isOpen={isDownloadModalOpen}
            onClose={() => setIsDownloadModalOpen(false)}
            onImport={fetchCharacters}
          />
          {currentCharacter && (
            <EditCharacterModal
              isOpen={isEditModalOpen}
              onClose={() => setIsEditModalOpen(false)}
              characterId={currentCharacter.id}
              characterData={{
                name: currentCharacter.name,
                personality: currentCharacter.personality,
                scenario: currentCharacter.scenario,
                first_mes: currentCharacter.first_mes,
                creatorcomment: currentCharacter.creatorcomment,
                avatar_path: currentCharacter.avatar_path,
              }}
              onSave={handleEditSuccess}
            />
          )}
          
          <Toast
            isVisible={errorToast.isVisible}
            message={errorToast.message}
            onClose={hideErrorToast}
            type="error"
          />
        </div>
      </div>
    </div>
  );
}
