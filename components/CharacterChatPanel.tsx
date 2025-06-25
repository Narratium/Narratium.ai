/**
 * Character Chat Panel Component
 * 
 * This component implements the main chat interface for character interactions, featuring:
 * - Real-time message display with HTML formatting
 * - Character avatar and name display
 * - Message regeneration and truncation capabilities
 * - Suggested input system
 * - Auto-scrolling chat history
 * - Fantasy-themed UI elements
 * 
 * The component handles both user and character messages, with special formatting
 * and interactive features for each message type.
 * 
 * Dependencies:
 * - ChatHtmlBubble: For rendering formatted chat messages
 * - CharacterAvatarBackground: For character avatar display
 * - Google Analytics: For tracking user interactions
 */

"use client";

import { useEffect, useRef, useState } from "react";
import ChatHtmlBubble from "@/components/ChatHtmlBubble";
import { CharacterAvatarBackground } from "@/components/CharacterAvatarBackground";
import { trackButtonClick, trackFormSubmit } from "@/utils/google-analytics";

/**
 * API Configuration types
 */
type LLMType = "openai" | "ollama";

interface APIConfig {
  id: string;
  name: string;
  type: LLMType;
  baseUrl: string;
  model: string;
  apiKey?: string;
}

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
  content: string;
  timestamp?: string;
  isUser?: boolean;
}

interface Props {
  character: Character;
  messages: Message[];
  userInput: string;
  setUserInput: (val: string) => void;
  isSending: boolean;
  suggestedInputs: string[];
  onSubmit: (e: React.FormEvent) => void;
  onSuggestedInput: (input: string) => void;
  onTruncate: (id: string) => void;
  onRegenerate: (id: string) => void;
  fontClass: string;
  serifFontClass: string;
  t: (key: string) => string;
  activeModes: Record<string, any>;
  setActiveModes: React.Dispatch<React.SetStateAction<Record<string, any>>>;
}

/**
 * Main chat panel component that handles character interactions
 * 
 * @param {Props} props - Component properties including character data, messages, and callbacks
 * @returns {JSX.Element} The complete chat interface with message history and input controls
 */
export default function CharacterChatPanel({
  character,
  messages,
  userInput,
  setUserInput,
  isSending,
  suggestedInputs,
  onSubmit,
  onSuggestedInput,
  onTruncate,
  onRegenerate,
  fontClass,
  serifFontClass,
  t,
  activeModes,
  setActiveModes,
}: Props) {
  const [streamingTarget, setStreamingTarget] = useState<number>(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // API Configuration states
  const [configs, setConfigs] = useState<APIConfig[]>([]);
  const [activeConfigId, setActiveConfigId] = useState<string>("");
  const [showApiDropdown, setShowApiDropdown] = useState(false);

  useEffect(() => {
    const savedStreaming = localStorage.getItem("streamingEnabled");
    if (savedStreaming !== null) {
      const isStreamingEnabled = savedStreaming === "true";
      if (isStreamingEnabled && messages.length > 0) {
        setActiveModes(prev => ({
          ...prev,
          streaming: true,
        }));
        setStreamingTarget(messages.length);
      } else {
        setActiveModes(prev => ({
          ...prev,
          streaming: false,
        }));
        setStreamingTarget(-1);
      }
    }
  }, []);

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };  

  const maybeScrollToBottom = (threshold = 120) => {
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distance < threshold) {
      scrollToBottom();
    }
  };

  const [suggestionsCollapsed, setSuggestionsCollapsed] = useState(false);

  const shouldShowRegenerateButton = (message: Message, index: number) => {
    if (isSending) return false;
    if (message.role !== "assistant") return false;
    if (index !== messages.length - 1) return false;
    
    return true;
  };

  // API configuration helper functions
  const getCurrentConfig = () => {
    return configs.find(c => c.id === activeConfigId);
  };

  const getApiIcon = (configName: string) => {
    const name = configName.toLowerCase();
    
    // Return image elements for local SVG files with circular background
    if (name.includes("deepseek")) {
      return (
        <div className="w-5 h-5 rounded-full overflow-hidden bg-[#4D6BFE] flex items-center justify-center">
          <img 
            src="/api-icons/deepseek.svg" 
            alt="DeepSeek" 
            width={20} 
            height={20} 
            className="object-cover w-full h-full"
          />
        </div>
      );
    } else if (name.includes("claude")) {
      return (
        <div className="w-5 h-5 rounded-full overflow-hidden bg-[#DA7756] flex items-center justify-center">
          <img 
            src="/api-icons/anthropic.svg" 
            alt="Anthropic" 
            width={20} 
            height={20} 
            className="object-cover w-full h-full"
          />
        </div>
      );
    } else if (name.includes("gemini")) {
      return (
        <div className="w-5 h-5 rounded-full overflow-hidden bg-[#242932] flex items-center justify-center">
          <img 
            src="/api-icons/gemini.svg" 
            alt="Gemini" 
            width={20} 
            height={20} 
            className="object-cover w-full h-full"
          />
        </div>
      );
    } else {
      // Default OpenAI icon
      return (
        <div className="w-5 h-5 rounded-full overflow-hidden bg-[#242932] flex items-center justify-center">
          <img 
            src="/api-icons/openai.svg" 
            alt="OpenAI" 
            width={20} 
            height={20} 
            className="object-cover w-full h-full"
          />
        </div>
      );
    }
  };

  const handleApiSwitch = (configId: string) => {
    console.log("CharacterChatPanel: Switching to config", configId);
    setActiveConfigId(configId);
    localStorage.setItem("activeConfigId", configId);
    
    const selectedConfig = configs.find(c => c.id === configId);
    if (selectedConfig) {
      console.log("CharacterChatPanel: Found config", selectedConfig);
      
      // Load configuration values to localStorage (same as ModelSidebar logic)
      localStorage.setItem("llmType", selectedConfig.type);
      localStorage.setItem(selectedConfig.type === "openai" ? "openaiBaseUrl" : "ollamaBaseUrl", selectedConfig.baseUrl);
      localStorage.setItem(selectedConfig.type === "openai" ? "openaiModel" : "ollamaModel", selectedConfig.model);
      localStorage.setItem("modelName", selectedConfig.model);
      localStorage.setItem("modelBaseUrl", selectedConfig.baseUrl);
      
      // Store API key properly
      if (selectedConfig.type === "openai" && selectedConfig.apiKey) {
        localStorage.setItem("openaiApiKey", selectedConfig.apiKey);
        localStorage.setItem("apiKey", selectedConfig.apiKey);
      }
      
      console.log("CharacterChatPanel: Updated localStorage, dispatching event");
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent("apiConfigChanged", { 
        detail: { configId, config: selectedConfig }, 
      }));
    } else {
      console.error("CharacterChatPanel: Config not found for id", configId);
    }
    
    setShowApiDropdown(false);
    trackButtonClick("CharacterChat", "切换API配置");
  };

  useEffect(() => {
    const id = setTimeout(() => scrollToBottom(), 300);
    return () => clearTimeout(id);
  }, [messages]);

  useEffect(() => {
    // On mount, restore fastModel state from localStorage
    const fastModelEnabled = localStorage.getItem("fastModelEnabled");
    if (fastModelEnabled !== null) {
      setActiveModes(prev => ({ ...prev, fastModel: fastModelEnabled === "true" }));
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showApiDropdown && !target.closest(".api-dropdown-container")) {
        setShowApiDropdown(false);
      }
    };

    if (showApiDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showApiDropdown]);

  // Load API configurations
  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadConfigs = () => {
      const savedConfigsStr = localStorage.getItem("apiConfigs");
      let loadedConfigs: APIConfig[] = [];

      if (savedConfigsStr) {
        try {
          loadedConfigs = JSON.parse(savedConfigsStr) as APIConfig[];
        } catch (e) {
          console.error("Error parsing saved API configs", e);
        }
      }

      const storedActiveId = localStorage.getItem("activeConfigId");
      const activeIdCandidate = storedActiveId && loadedConfigs.some((c) => c.id === storedActiveId)
        ? storedActiveId
        : (loadedConfigs[0]?.id || "");

      setConfigs(loadedConfigs);
      setActiveConfigId(activeIdCandidate);
    };

    // Initial load
    loadConfigs();

    // Listen for changes from ModelSidebar
    const handleApiConfigChanged = (event: CustomEvent) => {
      loadConfigs();
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "apiConfigs" || event.key === "activeConfigId") {
        loadConfigs();
      }
    };

    window.addEventListener("apiConfigChanged", handleApiConfigChanged as EventListener);
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener("apiConfigChanged", handleApiConfigChanged as EventListener);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);
  
  return (
    <div className="flex flex-col h-full max-h-screen">
      <div className="flex-grow overflow-y-auto p-6 fantasy-scrollbar" ref={scrollRef}>
        <div className="max-w-4xl mx-auto">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 opacity-60">
                <svg className="w-full h-full" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
                    stroke="#f9c86d"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <p className={`text-[#c0a480] ${serifFontClass}`}>
                {t("characterChat.startConversation")}
              </p>
            </div>
          ) : (
            <div className="space-y-8">
              {messages.map((message, index) => {
                if (message.role === "sample") return null;

                return message.role === "user" ? (
                  <div key={index} className="flex justify-end mb-4">
                    <div className="whitespace-pre-line text-[#f4e8c1] story-text leading-relaxed magical-text">
                      <p
                        className={`${serifFontClass}`}
                        dangerouslySetInnerHTML={{
                          __html: (
                            message.content.match(/<input_message>([\s\S]*?)<\/input_message>/)?.[1] || ""
                          ).replace(
                            /^[\s\n\r]*((<[^>]+>\s*)*)?(玩家输入指令|Player Input)[:：]\s*/i,
                            "",
                          ),
                        }}
                      ></p>
                    </div>
                  </div>
                ) : (
                  <div key={index} className="mb-6">
                    <div className="flex items-center mb-2">
                      <div className="w-8 h-8 rounded-full overflow-hidden mr-2">
                        {character.avatar_path ? (
                          <CharacterAvatarBackground avatarPath={character.avatar_path} />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-[#1a1816]">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4 text-[#534741]"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={1.5}
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center">
                        <span className={`text-sm font-medium text-[#f4e8c1] ${serifFontClass}`}>
                          {character.name}
                        </span>
                        {message.role === "assistant" && shouldShowRegenerateButton(message, index) && (
                          <>
                            {/* API Configuration Selector */}
                            <div className="relative mx-2 api-dropdown-container">
                              <button
                                onClick={() => setShowApiDropdown(!showApiDropdown)}
                                className="p-1 rounded-md transition-all duration-300 group relative text-[#8a8a8a] hover:text-[#d1a35c] flex items-center"
                              >
                                <div className="flex items-center">
                                  {getCurrentConfig() ? getApiIcon(getCurrentConfig()!.name) : getApiIcon("openai")}
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-2 w-2 ml-0.5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={3}
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                  </svg>
                                </div>
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-[#2a261f] text-[#f4e8c1] text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap border border-[#534741] z-50">
                                  {getCurrentConfig()?.name || t("modelSettings.noConfigs")}
                                </div>
                              </button>
                              {showApiDropdown && (
                                <div className="absolute top-full left-0 mt-1 bg-[#2a261f] border border-[#534741] rounded-md shadow-lg z-50 min-w-[120px]">
                                  {configs.length > 0 ? (
                                    configs.map((config) => (
                                      <button
                                        key={config.id}
                                        onClick={() => handleApiSwitch(config.id)}
                                        className={`w-full text-left px-2 py-1.5 text-xs hover:bg-[#3a3632] transition-colors flex items-center ${
                                          activeConfigId === config.id ? "bg-[#3a3632] text-[#d1a35c]" : "text-[#f4e8c1]"
                                        }`}
                                      >
                                        <span className="mr-2.5">{getApiIcon(config.name)}</span>
                                        <span className="truncate">{config.name}</span>
                                      </button>
                                    ))
                                  ) : (
                                    <div className="px-2 py-1.5 text-xs text-[#8a8a8a]">{t("common.noApisConfigured")}</div>
                                  )}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                setActiveModes(prev => {
                                  const newStreaming = !prev.streaming;
                                  return { ...prev, streaming: newStreaming };
                                });
                                const newStreaming = !activeModes.streaming;
                                setStreamingTarget(newStreaming ? messages.length : -1);
                                localStorage.setItem("streamingEnabled", String(newStreaming));
                                trackButtonClick("toggle_streaming", "流式输出切换");
                              }}
                              className={`mx-1 w-6 h-6 flex items-center justify-center bg-[#1c1c1c] rounded-lg border shadow-inner transition-all duration-300 group relative ${
                                activeModes.streaming
                                  ? "text-amber-400 hover:text-amber-300 border-amber-400/60 hover:border-amber-300/70 hover:shadow-[0_0_8px_rgba(252,211,77,0.4)]"
                                  : "text-[#a18d6f] hover:text-[#c0a480] border-[#333333] hover:border-[#444444]"
                              }`}
                              data-tooltip={activeModes.streaming ? t("characterChat.disableStreaming") : t("characterChat.enableStreaming")}
                            >
                              <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-[#2a261f] text-[#f4e8c1] text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap border border-[#534741]">
                                {activeModes.streaming ? t("characterChat.disableStreaming") : t("characterChat.enableStreaming")}
                              </div>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="12"
                                height="12"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              >
                                {/* Stream/Flow icon - horizontal flowing lines */}
                                <path
                                  d="M3 6h18M3 12h18M3 18h18"
                                  stroke={activeModes.streaming ? "#FFC107" : "currentColor"}
                                  strokeLinecap="round"
                                  strokeDasharray={activeModes.streaming ? "4,2" : "none"}
                                >
                                  {activeModes.streaming && (
                                    <animate
                                      attributeName="stroke-dashoffset"
                                      values="0;6"
                                      dur="1s"
                                      repeatCount="indefinite"
                                    />
                                  )}
                                </path>
                              </svg>
                            </button>
                            <button
                              onClick={() => {
                                setActiveModes(prev => {
                                  const newFastModel = !prev.fastModel;
                                  // Store fastModel state in localStorage
                                  localStorage.setItem("fastModelEnabled", String(newFastModel));
                                  return { ...prev, fastModel: newFastModel };
                                });
                                trackButtonClick("toggle_fastmodel", "快速模式切换");
                              }}
                              className={`mx-1 w-6 h-6 flex items-center justify-center bg-[#1c1c1c] rounded-lg border shadow-inner transition-all duration-300 group relative ${
                                activeModes.fastModel
                                  ? "text-blue-500 hover:text-blue-400 border-blue-500/60 hover:border-blue-400/70 hover:shadow-[0_0_8px_rgba(59,130,246,0.4)]"
                                  : "text-[#a18d6f] hover:text-[#c0a480] border-[#333333] hover:border-[#444444]"
                              }`}
                              data-tooltip={activeModes.fastModel ? t("characterChat.disableFastModel") : t("characterChat.enableFastModel")}
                            >
                              <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-[#2a261f] text-[#f4e8c1] text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap border border-[#534741]">
                                {activeModes.fastModel ? t("characterChat.disableFastModel") : t("characterChat.enableFastModel")}
                              </div>
                              {/* Lightning bolt SVG for fastmodel, blue when active - mirrored */}
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="12"
                                height="12"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                style={{ transform: "scaleX(-1)" }}
                              >
                                <path
                                  d="M7 2L17 14h-7v8l-8-12h7z"
                                  fill={activeModes.fastModel ? "#3B82F6" : "none"}
                                  stroke={activeModes.fastModel ? "#3B82F6" : "currentColor"}
                                />
                              </svg>
                            </button>
                          </>
                        )}
                      </div>
                      <div className="flex items-center">
                        <button
                          onClick={() => {
                            trackButtonClick("page", "跳转到此消息");
                            onTruncate(message.id);
                          }}
                          className="ml-1 w-6 h-6 flex items-center justify-center text-[#a18d6f] hover:text-green-400 bg-[#1c1c1c] rounded-lg border border-[#333333] shadow-inner transition-all duration-300 hover:border-[#444444] hover:shadow-[0_0_8px_rgba(34,197,94,0.4)] group relative"
                          data-tooltip={t("characterChat.jumpToMessage")}
                        >
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-[#2a261f] text-[#f4e8c1] text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap border border-[#534741]">
                            {t("characterChat.jumpToMessage")}
                          </div>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="12"
                            height="12"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M12 19V5"></path>
                            <polyline points="5 12 12 5 19 12"></polyline>
                          </svg>
                        </button>
                        <button
                          onClick={() => {
                            trackButtonClick("page", "重新生成消息");
                            onRegenerate(message.id);
                          }}
                          className={`ml-1 w-6 h-6 flex items-center justify-center text-[#a18d6f] hover:text-orange-400 bg-[#1c1c1c] rounded-lg border border-[#333333] shadow-inner transition-all duration-300 hover:border-[#444444] hover:shadow-[0_0_8px_rgba(249,115,22,0.4)] group relative ${
                            shouldShowRegenerateButton(message, index) ? "" : "hidden"
                          }`}
                          data-tooltip={t("characterChat.regenerateMessage")}
                        >
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-[#2a261f] text-[#f4e8c1] text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap border border-[#534741]">
                            {t("characterChat.regenerateMessage")}
                          </div>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="12"
                            height="12"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <polyline points="17 1 21 5 17 9"></polyline>
                            <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
                            <polyline points="7 23 3 19 7 15"></polyline>
                            <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
                          </svg>
                        </button>
                      </div>
                    </div>
                    <ChatHtmlBubble
                      key={message.id}
                      html={message.content}
                      isLoading={
                        isSending && index === messages.length - 1 && message.content.trim() === ""
                      }
                      enableStreaming={
                        activeModes.streaming &&
                        message.role === "assistant" &&
                        index >= streamingTarget
                      }
                      onContentChange={
                        index === messages.length - 1 ? () => maybeScrollToBottom() : undefined
                      }
                    />
                  </div>
                );
              })}

              {isSending && (
                <div className="flex items-center space-x-2 text-[#c0a480] mb-8 pb-4 pt-2 min-h-[40px]">
                  <div className="relative w-6 h-6 flex items-center justify-center">
                    <div className="absolute inset-0 rounded-full border-2 border-t-[#f9c86d] border-r-[#c0a480] border-b-[#a18d6f] border-l-transparent animate-spin"></div>
                    <div className="absolute inset-1 rounded-full border-2 border-t-[#a18d6f] border-r-[#f9c86d] border-b-[#c0a480] border-l-transparent animate-spin-slow"></div>
                  </div>
                  <span className={`text-sm ${serifFontClass}`}>
                    {character.name} {t("characterChat.isTyping") || "is typing..."}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 bg-[#1a1816] border-t border-[#534741] pt-6 pb-6 px-5 z-5 mt-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.2)]">
        {suggestedInputs.length > 0 && !isSending && (
          <div className="relative max-w-4xl mx-auto">
            <button
              onClick={() => setSuggestionsCollapsed(!suggestionsCollapsed)}
              className="absolute -top-10 right-0 bg-[#2a261f] hover:bg-[#342f25] text-[#c0a480] hover:text-[#f4e8c1] p-1.5 rounded-md border border-[#534741] hover:border-[#a18d6f] transition-all duration-300 shadow-sm hover:shadow z-10"
              aria-label={suggestionsCollapsed ? "展开建议" : "收起建议"}
            >
              {suggestionsCollapsed ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            
            <div  
              className={`transition-all duration-300 ease-in-out overflow-hidden ${
                suggestionsCollapsed 
                  ? "max-h-0 opacity-0 mb-0" 
                  : "max-h-40 opacity-100 mb-6"
              }`}
            >
              <div className="flex flex-wrap gap-2.5">
                {suggestedInputs.map((input, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      trackButtonClick("page", "建议输入");
                      onSuggestedInput(input);
                    }}
                    disabled={isSending}
                    className={`bg-[#2a261f] hover:bg-[#342f25] text-[#c0a480] hover:text-[#f4e8c1] py-1.5 px-4 rounded-md text-xs border border-[#534741] hover:border-[#a18d6f] transition-all duration-300 shadow-sm hover:shadow menu-item ${
                      isSending ? "opacity-50 cursor-not-allowed" : ""
                    } ${fontClass}`}
                  >
                    {input}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        <form
          onSubmit={(event) => {
            trackFormSubmit("page", "提交表单");
            onSubmit(event);
          }}
          className="max-w-4xl mx-auto"
        >
          <div className="flex gap-3">
            <div className="flex-grow magical-input relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-400/20 via-amber-500/5 to-amber-400/10 rounded-lg blur opacity-0 group-hover:opacity-100 transition duration-300"></div>
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder={t("characterChat.typeMessage") || "Type a message..."}
                data-tour="chat-input"
                className="w-full bg-[#2a261f] border border-[#534741] rounded-lg py-2.5 px-4 text-[#f4e8c1] text-sm leading-tight focus:outline-none focus:border-[#c0a480] shadow-inner relative z-1 transition-all duration-300 group-hover:border-[#a18d6f]"
                disabled={isSending}
              />
            </div>
            {isSending ? (
              <div className="relative w-8 h-8 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-2 border-t-[#f9c86d] border-r-[#c0a480] border-b-[#a18d6f] border-l-transparent animate-spin"></div>
                <div className="absolute inset-1 rounded-full border-2 border-t-[#a18d6f] border-r-[#f9c86d] border-b-[#c0a480] border-l-transparent animate-spin-slow"></div>
              </div>
            ) : (
              <button
                type="submit"
                disabled={!userInput.trim()}
                className={`portal-button relative overflow-hidden bg-[#2a261f] hover:bg-[#342f25] text-[#c0a480] hover:text-[#f4e8c1] py-2 px-4 rounded-lg text-sm border border-[#534741] hover:border-[#a18d6f] shadow-md transition-all duration-300 ${
                  !userInput.trim() ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {t("characterChat.send") || "Send"}
              </button>
            )}
          </div>

          <div className="mt-5 flex justify-start gap-2 sm:gap-3 max-w-4xl mx-auto">
            <button
              type="button"
              onClick={() => {
                trackButtonClick("page", "切换故事进度");
                setActiveModes((prev) => ({
                  ...prev,
                  "story-progress": !prev["story-progress"],
                }));
              }}
              className={`px-2 py-1.5 sm:px-4 text-xs rounded-full border transition-all duration-300 ${
                activeModes["story-progress"]
                  ? "bg-[#d1a35c] text-[#2a261f] border-[#d1a35c] shadow-[0_0_8px_rgba(209,163,92,0.5)]"
                  : "bg-[#2a261f] text-[#d1a35c] border-[#534741] hover:border-[#d1a35c] shadow-sm hover:shadow-md"
              }`}
            >
              <span className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-1 sm:mr-1"
                >
                  <path d="M5 12h14"></path>
                  <path d="m12 5 7 7-7 7"></path>
                </svg>
                <span className="hidden sm:inline">{t("characterChat.storyProgress") || "剧情推进"}</span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                trackButtonClick("page", "切换视角");
                setActiveModes((prev) => {
                  const perspective = prev["perspective"];

                  if (!perspective.active) {
                    return {
                      ...prev,
                      perspective: {
                        active: true,
                        mode: "novel",
                      },
                    };
                  }

                  if (perspective.mode === "novel") {
                    return {
                      ...prev,
                      perspective: {
                        active: true,
                        mode: "protagonist",
                      },
                    };
                  }

                  return {
                    ...prev,
                    perspective: {
                      active: false,
                      mode: "novel",
                    },
                  };
                });
              }}
              className={`px-2 py-1.5 sm:px-4 text-xs rounded-full border transition-all duration-300 ${
                !activeModes["perspective"].active
                  ? "bg-[#2a261f] text-[#56b3b4] border-[#534741] hover:border-[#56b3b4] shadow-sm hover:shadow-md"
                  : activeModes["perspective"].mode === "novel"
                    ? "bg-[#56b3b4] text-[#2a261f] border-[#56b3b4] shadow-[0_0_8px_rgba(86,179,180,0.5)]"
                    : "bg-[#378384] text-[#2a261f] border-[#378384] shadow-[0_0_8px_rgba(55,131,132,0.5)]"
              }`}
            >
              <span className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-1 sm:mr-1"
                >
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="2" y1="12" x2="22" y2="12"></line>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                </svg>
                <span className="hidden sm:inline">
                  {!activeModes["perspective"].active
                    ? t("characterChat.perspective") || "视角设计"
                    : activeModes["perspective"].mode === "novel"
                      ? t("characterChat.novelPerspective") || "小说视角"
                      : t("characterChat.protagonistPerspective") || "主角视角"}
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                trackButtonClick("page", "切换场景设置");
                setActiveModes((prev) => ({
                  ...prev,
                  "scene-setting": !prev["scene-setting"],
                }));
              }}
              className={`px-2 py-1.5 sm:px-4 text-xs rounded-full border transition-all duration-300 ${
                activeModes["scene-setting"]
                  ? "bg-[#c093ff] text-[#2a261f] border-[#c093ff] shadow-[0_0_8px_rgba(192,147,255,0.5)]"
                  : "bg-[#2a261f] text-[#c093ff] border-[#534741] hover:border-[#c093ff] shadow-sm hover:shadow-md"
              }`}
            >
              <span className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-1 sm:mr-1"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="3" y1="9" x2="21" y2="9"></line>
                  <line x1="3" y1="15" x2="21" y2="15"></line>
                  <line x1="9" y1="3" x2="9" y2="21"></line>
                  <line x1="15" y1="3" x2="15" y2="21"></line>
                </svg>
                <span className="hidden sm:inline">{t("characterChat.sceneTransition")}</span>
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
