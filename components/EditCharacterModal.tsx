/**
 * Edit Character Modal Component
 * 
 * This component provides a comprehensive character editing interface with the following features:
 * - Character information editing (name, personality, scenario, etc.)
 * - Avatar display and character preview
 * - Form validation and error handling
 * - Real-time character updates
 * - Modal-based editing workflow
 * - Responsive design with animations
 * 
 * The component handles:
 * - Character data editing and validation
 * - Character updates and persistence
 * - Modal state management and animations
 * - Error handling and user feedback
 * - Form state management and cleanup
 * - Avatar display and character preview
 * 
 * Dependencies:
 * - useLanguage: For internationalization
 * - updateCharacter: For character update functionality
 * - trackButtonClick: For analytics tracking
 * - framer-motion: For animations
 * - CharacterAvatarBackground: For avatar display
 */

import React, { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/app/i18n";
import { motion, AnimatePresence } from "framer-motion";
import { trackButtonClick } from "@/utils/google-analytics";
import { updateCharacter } from "@/function/dialogue/update";
import { CharacterAvatarBackground } from "@/components/CharacterAvatarBackground";
import { Toast } from "@/components/Toast";

/**
 * Interface definitions for the component's props
 */
interface EditCharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
  characterId: string;
  characterData: {
    name: string;
    personality?: string;
    scenario?: string;
    first_mes?: string;
    creatorcomment?: string;
    avatar_path?: string;
  };
  onSave: () => void;
}

/**
 * Edit character modal component
 * 
 * Provides a comprehensive character editing interface with:
 * - Character information editing
 * - Avatar display and preview
 * - Form validation and error handling
 * - Real-time updates and persistence
 * - Modal-based workflow management
 * 
 * @param {EditCharacterModalProps} props - Component props
 * @returns {JSX.Element | null} The edit character modal or null if closed
 */
const EditCharacterModal: React.FC<EditCharacterModalProps> = ({
  isOpen,
  onClose,
  characterId,
  characterData,
  onSave,
}) => {
  const { t, fontClass, serifFontClass } = useLanguage();
  const [name, setName] = useState("");
  const [personality, setPersonality] = useState("");
  const [scenario, setScenario] = useState("");
  const [firstMessage, setFirstMessage] = useState(""); 
  const [creatorComment, setCreatorComment] = useState("");
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
    if (isOpen && characterData) {
      setName(characterData.name || "");
      setPersonality(characterData.personality || "");
      setScenario(characterData.scenario || "");
      setFirstMessage(characterData.first_mes || "");
      setCreatorComment(characterData.creatorcomment || "");
    }
  }, [isOpen, characterData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await updateCharacter(characterId, {
        name,
        personality,
        scenario,
        first_mes: firstMessage,
        creatorcomment: creatorComment,
      });

      if (!response.success) {
        throw new Error("Failed to update character");
      }

      onSave();
      onClose();
    } catch (err: any) {
      showErrorToast(err.message || "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="relative w-full max-w-4xl bg-[#1a1816] border border-[#534741] rounded-lg shadow-xl z-10 overflow-hidden"
          >
            <div className="absolute top-2 right-2 z-20">
              <button
                onClick={(e) => {trackButtonClick("EditCharacterModal", "关闭编辑角色");onClose();}}
                className="text-[#a18d6f] hover:text-[#eae6db] transition-colors bg-[#1a1816] rounded-full p-1"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="flex flex-col md:flex-row">
              <div className="md:w-2/5 lg:w-1/3 relative">
                <div className="h-full">
                  {characterData.avatar_path ? (
                    <CharacterAvatarBackground avatarPath={characterData.avatar_path} />
                  ) : (
                    <div className="w-full h-full min-h-[500px] flex items-center justify-center bg-[#252220]">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-32 w-32 text-[#534741]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                  <div className={`absolute bottom-4 w-full text-center text-[#eae6db] ${serifFontClass} text-xl magical-text`}>
                    {name || characterData.name}
                  </div>
                </div>
              </div>
              
              <div className="md:w-3/5 lg:w-2/3 bg-[#1a1816] p-6">
                <h2 className={`text-xl font-semibold text-[#eae6db] magical-text mb-6 ${serifFontClass}`}>
                  {t("editCharacterModal.title")}
                </h2>
                
                <form onSubmit={handleSubmit} className="max-h-[70vh] overflow-y-auto pr-2 space-y-5">
                  <div>
                    <label
                      htmlFor="character-name"
                      className={`block text-sm font-medium text-[#c0a480] mb-2 ${fontClass}`}
                    >
                      {t("editCharacterModal.name")}
                    </label>
                    <input
                      type="text"
                      id="character-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={`w-full bg-[#252220] border border-[#534741] rounded p-3 text-[#eae6db] focus:outline-none focus:ring-1 focus:ring-[#c0a480] ${fontClass}`}
                      required
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="character-personality"
                      className={`block text-sm font-medium text-[#c0a480] mb-2 ${fontClass}`}
                    >
                      {t("editCharacterModal.personality")}
                    </label>
                    <textarea
                      id="character-personality"
                      value={personality}
                      onChange={(e) => setPersonality(e.target.value)}
                      rows={3}
                      className={`w-full bg-[#252220] border border-[#534741] rounded p-3 text-[#eae6db] focus:outline-none focus:ring-1 focus:ring-[#c0a480] ${fontClass}`}
                    />
                  </div>
              
                  <div>
                    <label
                      htmlFor="character-scenario"
                      className={`block text-sm font-medium text-[#c0a480] mb-2 ${fontClass}`}
                    >
                      {t("editCharacterModal.scenario")}
                    </label>
                    <textarea
                      id="character-scenario"
                      value={scenario}
                      onChange={(e) => setScenario(e.target.value)}
                      rows={3}
                      className={`w-full bg-[#252220] border border-[#534741] rounded p-3 text-[#eae6db] focus:outline-none focus:ring-1 focus:ring-[#c0a480] ${fontClass}`}
                    />
                  </div>
              
                  <div>
                    <label
                      htmlFor="character-first-message"
                      className={`block text-sm font-medium text-[#c0a480] mb-2 ${fontClass}`}
                    >
                      {t("editCharacterModal.firstMessage")}
                    </label>
                    <textarea
                      id="character-first-message"
                      value={firstMessage}
                      onChange={(e) => setFirstMessage(e.target.value)}
                      rows={3}
                      className={`w-full bg-[#252220] border border-[#534741] rounded p-3 text-[#eae6db] focus:outline-none focus:ring-1 focus:ring-[#c0a480] ${fontClass}`}
                    />
                  </div>
              
                  <div>
                    <label
                      htmlFor="character-creator-comment"
                      className={`block text-sm font-medium text-[#c0a480] mb-2 ${fontClass}`}
                    >
                      {t("editCharacterModal.creatorComment")}
                    </label>
                    <textarea
                      id="character-creator-comment"
                      value={creatorComment}
                      onChange={(e) => setCreatorComment(e.target.value)}
                      rows={3}
                      className={`w-full bg-[#252220] border border-[#534741] rounded p-3 text-[#eae6db] focus:outline-none focus:ring-1 focus:ring-[#c0a480] ${fontClass}`}
                    />
                  </div>

                  <div className="flex justify-end space-x-4 pt-4">
                    <button
                      type="button"
                      onClick={(e) => {trackButtonClick("EditCharacterModal", "关闭编辑角色");onClose();}}
                      className={`text-[#8a8a8a] hover:text-[#f4e8c1] transition-colors duration-300 ${serifFontClass}`}
                    >
                      {t("editCharacterModal.cancel")}
                    </button>
                    <button
                      type="submit"
                      disabled={isLoading}
                      onClick={(e) => {trackButtonClick("EditCharacterModal", "保存编辑角色");onClose();}}
                      className={`text-amber-400 hover:text-amber-300 transition-colors duration-300 ${serifFontClass}`}
                    >
                      {isLoading ? (
                        <div className="h-5 w-5 border-2 border-[#1a1816] border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        t("editCharacterModal.save")
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        </div>
      )}
      
      <Toast
        isVisible={errorToast.isVisible}
        message={errorToast.message}
        onClose={hideErrorToast}
        type="error"
      />
    </AnimatePresence>
  );
};

export default EditCharacterModal;
