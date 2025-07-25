/**
 * Character Page Component
 *
 * This is the main character interaction page that provides:
 * - Real-time chat interface with character
 * - World book editing capabilities
 * - Regex script management
 * - Preset management
 * - Message history and regeneration
 * - Branch switching in conversations
 * - User tour functionality
 *
 * The page handles all character interactions and provides a rich
 * set of features for managing character dialogues and settings.
 *
 * Dependencies:
 * - CharacterSidebar: For character navigation
 * - CharacterChatPanel: For chat interface
 * - WorldBookEditor: For world book management
 * - RegexScriptEditor: For regex script editing
 * - PresetEditor: For preset management
 * - UserTour: For user onboarding
 */

"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useParams } from "next/navigation";
import { useLanguage } from "@/app/i18n";
import CharacterSidebar from "@/components/CharacterSidebar";
import { v4 as uuidv4 } from "uuid";
import { initCharacterDialogue } from "@/function/dialogue/init";
import { getCharacterDialogue } from "@/function/dialogue/info";
import { handleCharacterChatRequest } from "@/function/dialogue/chat";
import { switchDialogueBranch } from "@/function/dialogue/truncate";
import { deleteDialogueNode } from "@/function/dialogue/delete";
import CharacterChatPanel from "@/components/CharacterChatPanel";
import WorldBookEditor from "@/components/WorldBookEditor";
import RegexScriptEditor from "@/components/RegexScriptEditor";
import PresetEditor from "@/components/PresetEditor";
import CharacterChatHeader from "@/components/CharacterChatHeader";
import UserTour from "@/components/UserTour";
import { useTour } from "@/hooks/useTour";
import { Toast } from "@/components/Toast";
import LoginModal from "@/components/LoginModal";
import { useAuth } from "@/hooks/useAuth";
import { getDisplayUsername } from "@/utils/username-helper";

/**
 * Interface definitions for the component's data structures
 */
interface Character {
  id: string;
  name: string;
  personality?: string;
  avatar_path?: string;
}

interface Message {
  id: string;
  role: string;
  thinkingContent?: string;
  content: string;
}

/**
 * Main character interaction page component
 *
 * Manages all character interactions and provides a comprehensive interface for:
 * - Chat functionality with message history
 * - World book editing
 * - Regex script management
 * - Preset configuration
 * - Message regeneration and branch switching
 * - User tour and onboarding
 *
 * @returns {JSX.Element} The complete character interaction interface
 */
export default function CharacterPage() {
  const searchParams = useSearchParams();
  const characterId = searchParams.get("id");
  const { t, fontClass, serifFontClass } = useLanguage();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const {
    isTourVisible,
    currentTourSteps,
    startCharacterTour,
    completeTour,
    skipTour,
  } = useTour();

  const [character, setCharacter] = useState<Character | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");
  const [userInput, setUserInput] = useState("");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [suggestedInputs, setSuggestedInputs] = useState<string[]>([]);
  const initializationRef = useRef(false);
  const [activeView, setActiveView] = useState<
    "chat" | "worldbook" | "regex" | "preset"
  >("chat");
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [activeModes, setActiveModes] = useState<Record<string, any>>({
    "story-progress": false,
    perspective: {
      active: false,
      mode: "novel",
    },
    "scene-setting": false,
  });

  // Add loading phase tracking for better user feedback
  const [loadingPhase, setLoadingPhase] = useState<string>("");

  // Add error toast state
  const [errorToast, setErrorToast] = useState({
    isVisible: false,
    message: "",
  });
  const [isMobile, setIsMobile] = useState(false);

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

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const switchToView = (
    targetView: "chat" | "worldbook" | "regex" | "preset",
  ) => {
    setActiveView(targetView);
  };

  const toggleView = () => {
    setActiveView((prev) => (prev === "chat" ? "worldbook" : "chat"));
  };

  const toggleRegexEditor = () => {
    setActiveView((prev) => (prev === "regex" ? "chat" : "regex"));
  };

  const truncateMessagesAfter = async (nodeId: string) => {
    if (!characterId) return;

    try {
      const messageIndex = messages.findIndex((msg) => msg.id == nodeId);
      if (messageIndex === -1) {
        console.warn(`Dialogue branch not found: ${nodeId}`);
        return;
      }

      const response = await switchDialogueBranch({
        characterId,
        nodeId,
      });

      if (!response.success) {
        console.error("Failed to truncate messages", response);
        return;
      }

      const dialogue = response.dialogue;

      if (dialogue) {
        setTimeout(() => {
          const formattedMessages = dialogue.messages.map((msg: any) => ({
            id: msg.id,
            role: msg.role == "system" ? "assistant" : msg.role,
            thinkingContent: msg.thinkingContent ?? "",
            content: msg.content,
          }));

          setMessages(formattedMessages);

          const lastMessage = dialogue.messages[dialogue.messages.length - 1];
          if (lastMessage && lastMessage.parsedContent?.nextPrompts) {
            setSuggestedInputs(lastMessage.parsedContent.nextPrompts);
          } else {
            setSuggestedInputs([]);
          }
        }, 100);
      } else {
      }
    } catch (error) {
      console.error("Error truncating messages:", error);
    }
  };

  const handleRegenerate = async (nodeId: string) => {
    if (!characterId) return;

    try {
      const messageIndex = messages.findIndex(
        (msg) => msg.id === nodeId && msg.role === "assistant",
      );
      if (messageIndex === -1) {
        console.warn(`Message not found: ${nodeId}`);
        return;
      }
      const messageToRegenerate = messages[messageIndex];
      if (messageToRegenerate.role != "assistant") {
        console.warn("Can only regenerate assistant messages");
        return;
      }

      let userMessage = null;
      for (let i = messageIndex - 1; i >= 0; i--) {
        if (messages[i].role === "user") {
          userMessage = messages[i];
          break;
        }
      }

      if (!userMessage) {
        console.warn("No previous user message found for regeneration");
        return;
      }

      const response = await deleteDialogueNode({
        characterId,
        nodeId,
      });
      if (!response.success) {
        console.error("Failed to delete message", response);
        return;
      }

      const dialogue = response.dialogue;

      if (dialogue) {
        setTimeout(() => {
          const formattedMessages = dialogue.messages.map((msg: any) => ({
            id: msg.id,
            role: msg.role == "system" ? "assistant" : msg.role,
            thinkingContent: msg.thinkingContent ?? "",
            content: msg.content,
          }));

          setMessages(formattedMessages);

          const lastMessage = dialogue.messages[dialogue.messages.length - 1];
          if (lastMessage && lastMessage.parsedContent?.nextPrompts) {
            setSuggestedInputs(lastMessage.parsedContent.nextPrompts);
          } else {
            setSuggestedInputs([]);
          }
        }, 100);
      }

      setTimeout(async () => {
        await handleSendMessage(userMessage.content);
      }, 300);
    } catch (error) {
      console.error("Error regenerating message:", error);
    }
  };

  const fetchLatestDialogue = async () => {
    if (!characterId) return;

    try {
      const username = getDisplayUsername() || undefined;
      const currentLanguage = localStorage.getItem("language") as "en" | "zh";
      const response = await getCharacterDialogue(
        characterId,
        currentLanguage,
        username,
      );
      if (!response.success) {
        throw new Error(`Failed to load dialogue: ${response}`);
      }

      const dialogue = response.dialogue;

      if (dialogue && dialogue.messages) {
        const formattedMessages = dialogue.messages.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          thinkingContent: msg.thinkingContent ?? "",
          content: msg.content,
        }));
        setMessages(formattedMessages);
        setSuggestedInputs(
          dialogue.messages[dialogue.messages.length - 1].parsedContent
            ?.nextPrompts || [],
        );
      } else {
      }
    } catch (err) {
      console.error("Error refreshing dialogue:", err);
    }
  };

  useEffect(() => {
    const loadCharacterAndDialogue = async () => {
      if (!characterId) {
        setError("Character ID is missing from URL");
        setIsLoading(false);
        return;
      }

      // Start loading immediately when characterId changes
      setIsLoading(true);
      setIsInitializing(false);
      setError("");
      setLoadingPhase(t("characterChat.loading"));

      // Reset initialization ref for new character
      initializationRef.current = false;

      // Add minimum loading time to ensure user sees the loading animation
      const startTime = Date.now();
      const minLoadingTime = 500; // 500ms minimum loading time

      try {
        const username = getDisplayUsername() || undefined;
        const currentLanguage = localStorage.getItem("language") as "en" | "zh";

        setLoadingPhase(t("characterChat.loading"));
        const response = await getCharacterDialogue(
          characterId,
          currentLanguage,
          username,
        );
        if (!response.success) {
          throw new Error(`Failed to load character: ${response}`);
        }

        const dialogue = response.dialogue;
        const character = response.character;

        const characterInfo = {
          id: character.id,
          name: character.data.name,
          personality: character.data.personality,
          avatar_path: character.imagePath,
        };

        // Set character data but keep loading if we need to initialize dialogue
        setCharacter(characterInfo);

        if (dialogue && dialogue.messages) {
          setLoadingPhase(t("characterChat.loadingDialogue"));
          const formattedMessages = dialogue.messages.map((msg: any) => ({
            id: msg.id,
            role: msg.role,
            thinkingContent: msg.thinkingContent ?? "",
            content: msg.content,
          }));
          setMessages(formattedMessages);
          setSuggestedInputs(
            dialogue.messages[dialogue.messages.length - 1].parsedContent
              ?.nextPrompts || [],
          );

          // Ensure minimum loading time has passed
          const elapsedTime = Date.now() - startTime;
          const remainingTime = Math.max(0, minLoadingTime - elapsedTime);

          if (remainingTime > 0) {
            await new Promise((resolve) => setTimeout(resolve, remainingTime));
          }

          // All data loaded successfully
          setIsLoading(false);
        } else if (!initializationRef.current) {
          // Need to initialize new dialogue - keep loading state
          setLoadingPhase(t("characterChat.initializing"));
          setIsInitializing(true);
          initializationRef.current = true;
          await initializeNewDialogue(characterId);

          // Initialization complete
          setIsInitializing(false);
          setIsLoading(false);
        } else {
          // Fallback case
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Error loading character or dialogue:", err);
        const errorMessage =
          typeof err === "object" && err !== null && "message" in err
            ? (err as Error).message
            : "Failed to load character";

        // 检查是否是角色不存在的错误
        if (
          errorMessage.includes("Character not found") ||
          errorMessage.includes("Character record is required")
        ) {
          setError("角色不存在或已被删除");
          // 延迟重定向到角色卡片页面
          setTimeout(() => {
            window.location.href = "/character-cards";
          }, 2000);
        } else {
          setError(errorMessage);
        }

        setIsLoading(false);
        setIsInitializing(false);
      }
    };

    loadCharacterAndDialogue();
  }, [characterId, t]);

  const initializeNewDialogue = async (charId: string) => {
    try {
      setLoadingPhase(t("characterChat.extractingTemplate"));
      const username = getDisplayUsername();
      const language = localStorage.getItem("language") || "zh";
      const llmType = localStorage.getItem("llmType") || "openai";
      const modelName =
        localStorage.getItem(
          llmType === "openai" ? "openaiModel" : "ollamaModel",
        ) || "";
      const baseUrl =
        localStorage.getItem(
          llmType === "openai" ? "openaiBaseUrl" : "ollamaBaseUrl",
        ) || "";
      const apiKey =
        llmType === "openai" ? localStorage.getItem("openaiApiKey") || "" : "";

      const initData = await initCharacterDialogue({
        username,
        characterId: charId,
        modelName,
        baseUrl,
        apiKey,
        llmType: llmType as "openai" | "ollama",
        language: language as "zh" | "en",
      });

      if (!initData.success) {
        throw new Error(`Failed to initialize dialogue: ${initData}`);
      }
      if (initData.firstMessage) {
        setMessages([
          {
            id: initData.nodeId,
            role: "assistant",
            content: initData.firstMessage,
          },
        ]);
      }
    } catch (error) {
      console.error("Error initializing dialogue:", error);
      throw error;
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!character || isSending) return;

    try {
      setIsSending(true);
      setError("");

      setSuggestedInputs([]);
      const userMessage = {
        id: new Date().toISOString() + "-user",
        role: "user",
        thinkingContent: "",
        content: message,
      };
      setMessages((prev) => [...prev, userMessage]);

      const language = localStorage.getItem("language") || "zh";
      const llmType = localStorage.getItem("llmType") || "openai";
      const modelName =
        localStorage.getItem(
          llmType === "openai" ? "openaiModel" : "ollamaModel",
        ) || "";
      const baseUrl =
        localStorage.getItem(
          llmType === "openai" ? "openaiBaseUrl" : "ollamaBaseUrl",
        ) || "";
      const apiKey =
        llmType === "openai" ? localStorage.getItem("openaiApiKey") || "" : "";
      const storedNumber = localStorage.getItem("responseLength");
      const username = getDisplayUsername();
      const responseLength = storedNumber ? parseInt(storedNumber) : 200;
      const nodeId = uuidv4();
      const fastModel = localStorage.getItem("fastModelEnabled") === "true";
      const response = await handleCharacterChatRequest({
        username,
        characterId: character.id,
        message,
        modelName,
        baseUrl,
        apiKey,
        llmType,
        language: language as "zh" | "en",
        streaming: true,
        number: responseLength,
        nodeId,
        fastModel: fastModel,
      });

      if (!response.ok) {
        showErrorToast(t("characterChat.checkNetworkOrAPI"));
        return;
      }

      const result = await response.json();

      if (result.success) {
        const assistantMessage = {
          id: nodeId,
          role: "assistant",
          thinkingContent: result.thinkingContent ?? "",
          content: result.content || "",
        };
        setMessages((prev) => [...prev, assistantMessage]);

        if (result.parsedContent?.nextPrompts) {
          setSuggestedInputs(result.parsedContent.nextPrompts);
        }
      } else {
        showErrorToast(result.message || t("characterChat.checkNetworkOrAPI"));
      }
    } catch (err) {
      console.error("Error sending message:", err);
      showErrorToast(t("characterChat.checkNetworkOrAPI"));
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    if (character && !isLoading && !isInitializing && !error) {
      const hasSeenCharacterTour = localStorage.getItem(
        "narratium_character_tour_completed",
      );
      if (!hasSeenCharacterTour) {
        setTimeout(() => {
          startCharacterTour();
        }, 2000);
      }
    }
  }, [character, isLoading, isInitializing, error, startCharacterTour]);

  useEffect(() => {
    const handleSwitchToPresetView = (event: any) => {
      setActiveView("preset");

      const detail = event.detail;
      if (detail) {
        if (detail.presetId) {
          sessionStorage.setItem("activate_preset_id", detail.presetId);
        } else if (detail.presetName) {
          sessionStorage.setItem("activate_preset_name", detail.presetName);
        }
      }
    };

    // Handle closing character sidebar when model sidebar opens on mobile
    const handleCloseCharacterSidebar = () => {
      setSidebarCollapsed(true);
    };

    // Handle display username changes
    const handleDisplayUsernameChanged = (event: any) => {
      // Refresh dialogue to apply new username in character prompts
      if (characterId) {
        fetchLatestDialogue();
      }
    };

    window.addEventListener("switchToPresetView", handleSwitchToPresetView);
    window.addEventListener("closeCharacterSidebar", handleCloseCharacterSidebar);
    window.addEventListener("displayUsernameChanged", handleDisplayUsernameChanged);

    return () => {
      window.removeEventListener(
        "switchToPresetView",
        handleSwitchToPresetView,
      );
      window.removeEventListener("closeCharacterSidebar", handleCloseCharacterSidebar);
      window.removeEventListener("displayUsernameChanged", handleDisplayUsernameChanged);
    };
  }, [characterId]);

  // Show loading animation during any loading phase
  if (isLoading || isInitializing) {
    return (
      <div className="flex flex-col justify-center items-center h-full fantasy-bg">
        <div className="relative w-12 h-12 flex items-center justify-center mb-4">
          <div className="absolute inset-0 rounded-full border-2 border-t-[#f9c86d] border-r-[#c0a480] border-b-[#a18d6f] border-l-transparent animate-spin"></div>
          <div className="absolute inset-2 rounded-full border-2 border-t-[#a18d6f] border-r-[#f9c86d] border-b-[#c0a480] border-l-transparent animate-spin-slow"></div>
        </div>
        <p className={`text-[#f4e8c1] ${serifFontClass} text-center mb-2`}>
          {loadingPhase}
        </p>
        {isInitializing && (
          <p
            className={`text-[#a18d6f] text-xs mt-4 max-w-xs text-center ${fontClass}`}
          >
            {t("characterChat.loadingTimeHint")}
          </p>
        )}
      </div>
    );
  }

  if (error || !character) {
    return (
      <div className="flex flex-col items-center justify-center h-full fantasy-bg">
        <h1 className="text-2xl text-[#f4e8c1] mb-4">
          {t("characterChat.error")}
        </h1>
        <p className="text-[#c0a480] mb-6">
          {error || t("characterChat.characterNotFound")}
        </p>
        <a
          href="/character-cards"
          className="bg-[#252220] hover:bg-[#342f25] text-[#f4e8c1] font-medium py-2 px-4 rounded border border-[#534741]"
        >
          {t("characterChat.backToCharacters")}
        </a>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isSending) return;

    let message = userInput;
    let hints: string[] = [];

    if (activeModes["story-progress"]) {
      const progressHint = t("characterChat.storyProgressHint");
      hints.push(progressHint);
    }

    if (activeModes["perspective"].active) {
      if (activeModes["perspective"].mode === "novel") {
        const novelHint = t("characterChat.novelPerspectiveHint");
        hints.push(novelHint);
      } else if (activeModes["perspective"].mode === "protagonist") {
        const protagonistHint = t("characterChat.protagonistPerspectiveHint");
        hints.push(protagonistHint);
      }
    }

    if (activeModes["scene-setting"]) {
      const sceneSettingHint = t("characterChat.sceneTransitionHint");
      hints.push(sceneSettingHint);
    }

    if (hints.length > 0) {
      message = `
      <input_message>
      ${t("characterChat.playerInput")}：${userInput}
      </input_message>
      <response_instructions>
      ${t("characterChat.responseInstructions")}：${hints.join(" ")}
      </response_instructions>
          `.trim();
    } else {
      message = `
      <input_message>
      ${t("characterChat.playerInput")}：${userInput}
      </input_message>
          `.trim();
    }

    setUserInput("");
    await handleSendMessage(message);
  };

  const toggleSidebar = () => {
    const newSidebarState = !sidebarCollapsed;
    setSidebarCollapsed(newSidebarState);
    
    // On mobile, when opening CharacterSidebar, close ModelSidebar to prevent conflicts
    if (isMobile && !newSidebarState) {
      // Dispatch custom event to notify MainLayout to close ModelSidebar
      const closeModelSidebarEvent = new CustomEvent("closeModelSidebar");
      window.dispatchEvent(closeModelSidebarEvent);
    }
  };

  const handleSuggestedInput = (input: string) => {
    setUserInput(input);
  };

  return (
    <div
      className="flex h-full relative fantasy-bg overflow-hidden "
      style={{
        left: "var(--app-sidebar-width, 0)",
      }}
    >
      <CharacterSidebar
        character={character}
        isCollapsed={sidebarCollapsed}
        toggleSidebar={toggleSidebar}
        onDialogueEdit={() => fetchLatestDialogue()}
        onViewSwitch={() => {
          switchToView("worldbook");
          setTimeout(() => {
            switchToView("chat");
          }, 1000);
        }}
      />

      <div
        className={`${sidebarCollapsed ? "w-full" : "hidden md:block md:w-3/4"} fantasy-bg h-full transition-all duration-300 ease-in-out flex flex-col`}
      >
        <CharacterChatHeader
          character={character}
          serifFontClass={serifFontClass}
          sidebarCollapsed={sidebarCollapsed}
          activeView={activeView}
          toggleSidebar={toggleSidebar}
          onSwitchToView={switchToView}
          onToggleView={toggleView}
          onToggleRegexEditor={toggleRegexEditor}
        />

        {activeView === "chat" ? (
          <CharacterChatPanel
            character={character}
            messages={messages}
            userInput={userInput}
            setUserInput={setUserInput}
            isSending={isSending}
            suggestedInputs={suggestedInputs}
            onSubmit={handleSubmit}
            onSuggestedInput={handleSuggestedInput}
            onTruncate={truncateMessagesAfter}
            onRegenerate={handleRegenerate}
            fontClass={fontClass}
            serifFontClass={serifFontClass}
            t={t}
            activeModes={activeModes}
            setActiveModes={setActiveModes}
          />
        ) : activeView === "worldbook" ? (
          <WorldBookEditor
            onClose={() => setActiveView("chat")}
            characterName={character?.name || ""}
            characterId={characterId || ""}
          />
        ) : activeView === "preset" ? (
          <PresetEditor
            onClose={() => setActiveView("chat")}
            characterName={character?.name || ""}
            characterId={characterId || ""}
          />
        ) : (
          <RegexScriptEditor
            onClose={() => setActiveView("chat")}
            characterName={character?.name || ""}
            characterId={characterId || ""}
          />
        )}
      </div>
      <UserTour
        steps={currentTourSteps}
        isVisible={isTourVisible}
        onComplete={() => {
          completeTour();
          localStorage.setItem("narratium_character_tour_completed", "true");
        }}
        onSkip={() => {
          skipTour();
          localStorage.setItem("narratium_character_tour_completed", "true");
        }}
      />
      <Toast
        type="error"
        message={errorToast.message}
        isVisible={errorToast.isVisible}
        onClose={hideErrorToast}
      />
      <LoginModal 
        isOpen={isLoginModalOpen} 
        onClose={() => setIsLoginModalOpen(false)} 
      />
    </div>
  );
}
