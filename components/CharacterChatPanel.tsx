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
import ThinkBubble from "@/components/ThinkBubble";
import { CharacterAvatarBackground } from "@/components/CharacterAvatarBackground";
import UserNameSettingModal from "@/components/UserNameSettingModal";
import { getDisplayUsername, setDisplayUsername } from "@/utils/username-helper";
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
  availableModels?: string[]; // Available models for this config
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
  thinkingContent?: string;
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
  
  // Username setting states
  const [showUserNameModal, setShowUserNameModal] = useState(false);
  const [currentDisplayName, setCurrentDisplayName] = useState("");
  
  // Toggle buttons expansion state
  const [isButtonsExpanded, setIsButtonsExpanded] = useState(false);
  // Control panel expansion state
  const [isControlPanelExpanded, setIsControlPanelExpanded] = useState(false);

  // API Configuration states
  const [configs, setConfigs] = useState<APIConfig[]>([]);
  const [activeConfigId, setActiveConfigId] = useState<string>("");
  const [showApiDropdown, setShowApiDropdown] = useState(false);
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [selectedConfigId, setSelectedConfigId] = useState<string>(""); // For the second level dropdown
  const [currentModel, setCurrentModel] = useState<string>(""); // Current active model

  useEffect(() => {
    const savedStreaming = localStorage.getItem("streamingEnabled");
    if (savedStreaming !== null) {
      const isStreamingEnabled = savedStreaming === "true";
      if (isStreamingEnabled && messages.length > 0) {
        setActiveModes((prev) => ({
          ...prev,
          streaming: true,
        }));
        setStreamingTarget(messages.length);
      } else {
        setActiveModes((prev) => ({
          ...prev,
          streaming: false,
        }));
        setStreamingTarget(-1);
      }
    } else {
      // 默认开启流式传输
      setActiveModes((prev) => ({
        ...prev,
        streaming: true,
      }));
      localStorage.setItem("streamingEnabled", "true");
    }

    // Load display username using helper function
    setCurrentDisplayName(getDisplayUsername());
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

  // Username setting helper functions
  const handleUserNameSave = (newDisplayName: string) => {
    setCurrentDisplayName(newDisplayName);
    // Use helper function to set username, which also triggers the event
    setDisplayUsername(newDisplayName);
  };

  // API configuration helper functions
  const getCurrentConfig = () => {
    return configs.find((c) => c.id === activeConfigId);
  };

  // Get icon based on configuration name (for first level)
  const getConfigIcon = (configName: string) => {
    const name = configName.toLowerCase();

    if (name.includes("deepseek") || name.includes("deep-seek")) {
      return (
        <div className="w-5 h-5 rounded-full overflow-hidden bg-transparent flex items-center justify-center">
          <img
            src="/api-icons/deepseek.svg"
            alt="DeepSeek"
            width={20}
            height={20}
            className="object-cover w-full h-full"
          />
        </div>
      );
    } else if (name.includes("claude") || name.includes("anthropic")) {
      return (
        <div className="w-5 h-5 rounded-full overflow-hidden bg-transparent flex items-center justify-center">
          <img
            src="/api-icons/claude.svg"
            alt="Claude"
            width={20}
            height={20}
            className="object-cover w-full h-full"
          />
        </div>
      );
    } else if (name.includes("gemini") || name.includes("google")) {
      return (
        <div className="w-5 h-5 rounded-full overflow-hidden bg-transparent flex items-center justify-center">
          <img
            src="/api-icons/gemini.svg"
            alt="Gemini"
            width={20}
            height={20}
            className="object-cover w-full h-full"
          />
        </div>
      );
    } else if (name.includes("gemma")) {
      return (
        <div className="w-5 h-5 rounded-full overflow-hidden bg-transparent flex items-center justify-center">
          <img
            src="/api-icons/gemma.svg"
            alt="Gemma"
            width={20}
            height={20}
            className="object-cover w-full h-full"
          />
        </div>
      );
    } else if (name.includes("ollama")) {
      return (
        <div className="w-5 h-5 rounded-full overflow-hidden bg-transparent flex items-center justify-center">
          <img
            src="/api-icons/ollama.svg"
            alt="Ollama"
            width={20}
            height={20}
            className="object-cover w-full h-full"
          />
        </div>
      );
    } else if (
      name.includes("qwen") ||
      name.includes("qwq") ||
      name.includes("tongyi")
    ) {
      return (
        <div className="w-5 h-5 rounded-full overflow-hidden bg-transparent flex items-center justify-center">
          <img
            src="/api-icons/qwen.svg"
            alt="Qwen"
            width={20}
            height={20}
            className="object-cover w-full h-full"
          />
        </div>
      );
    } else if (name.includes("grok") || name.includes("xai")) {
      return (
        <div className="w-5 h-5 rounded-full overflow-hidden bg-transparent flex items-center justify-center">
          <img
            src="/api-icons/grok.svg"
            alt="Grok"
            width={20}
            height={20}
            className="object-cover w-full h-full text-white"
          />
        </div>
      );
    } else if (name.includes("kimi") || name.includes("moonshot")) {
      return (
        <div className="w-5 h-5 rounded-full overflow-hidden bg-transparent flex items-center justify-center">
          <img
            src="/api-icons/kimi.svg"
            alt="Kimi"
            width={20}
            height={20}
            className="object-cover w-full h-full text-white"
          />
        </div>
      );
    } else {
      // Default OpenAI icon
      return (
        <div className="w-5 h-5 rounded-full overflow-hidden bg-transparent flex items-center justify-center">
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

  // Get icon based on model name (for second level)
  const getModelIcon = (modelName: string) => {
    const name = modelName.toLowerCase();

    if (name.includes("deepseek") || name.includes("deep-seek")) {
      return (
        <div className="w-5 h-5 rounded-full overflow-hidden bg-transparent flex items-center justify-center">
          <img
            src="/api-icons/deepseek.svg"
            alt="DeepSeek"
            width={20}
            height={20}
            className="object-cover w-full h-full"
          />
        </div>
      );
    } else if (name.includes("claude") || name.includes("anthropic")) {
      return (
        <div className="w-5 h-5 rounded-full overflow-hidden bg-transparent flex items-center justify-center">
          <img
            src="/api-icons/claude.svg"
            alt="Claude"
            width={20}
            height={20}
            className="object-cover w-full h-full"
          />
        </div>
      );
    } else if (name.includes("gemini") || name.includes("google")) {
      return (
        <div className="w-5 h-5 rounded-full overflow-hidden bg-transparent flex items-center justify-center">
          <img
            src="/api-icons/gemini.svg"
            alt="Gemini"
            width={20}
            height={20}
            className="object-cover w-full h-full"
          />
        </div>
      );
    } else if (name.includes("gemma")) {
      return (
        <div className="w-5 h-5 rounded-full overflow-hidden bg-transparent flex items-center justify-center">
          <img
            src="/api-icons/gemma.svg"
            alt="Gemma"
            width={20}
            height={20}
            className="object-cover w-full h-full"
          />
        </div>
      );
    } else if (
      name.includes("ollama") ||
      name.includes("llama") ||
      name.includes("mistral") ||
      name.includes("codellama") ||
      name.includes("dolphin") ||
      name.includes("vicuna") ||
      name.includes("alpaca")
    ) {
      return (
        <div className="w-5 h-5 rounded-full overflow-hidden bg-transparent flex items-center justify-center">
          <img
            src="/api-icons/ollama.svg"
            alt="Ollama"
            width={20}
            height={20}
            className="object-cover w-full h-full"
          />
        </div>
      );
    } else if (
      name.includes("qwen") ||
      name.includes("qwq") ||
      name.includes("tongyi")
    ) {
      return (
        <div className="w-5 h-5 rounded-full overflow-hidden bg-transparent flex items-center justify-center">
          <img
            src="/api-icons/qwen.svg"
            alt="Qwen"
            width={20}
            height={20}
            className="object-cover w-full h-full"
          />
        </div>
      );
    } else if (name.includes("grok") || name.includes("xai")) {
      return (
        <div className="w-5 h-5 rounded-full overflow-hidden bg-transparent flex items-center justify-center">
          <img
            src="/api-icons/grok.svg"
            alt="Grok"
            width={20}
            height={20}
            className="object-cover w-full h-full text-white"
          />
        </div>
      );
    } else if (name.includes("kimi") || name.includes("moonshot")) {
      return (
        <div className="w-5 h-5 rounded-full overflow-hidden bg-transparent flex items-center justify-center">
          <img
            src="/api-icons/kimi.svg"
            alt="Kimi"
            width={20}
            height={20}
            className="object-cover w-full h-full text-white"
          />
        </div>
      );
    } else {
      // Default OpenAI icon for GPT models and others
      return (
        <div className="w-5 h-5 rounded-full overflow-hidden bg-transparent flex items-center justify-center">
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

  // Fetch available models for a config
  const fetchAvailableModels = async (config: APIConfig): Promise<string[]> => {
    if (config.type === "ollama") {
      // For Ollama, return the configured model
      return [config.model || "default"];
    }

    if (!config.baseUrl || !config.apiKey) {
      return ["default"];
    }

    try {
      const response = await fetch(`${config.baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
        },
      });
      const data = await response.json();
      const modelList = data.data?.map((item: any) => item.id) || [];
      return modelList.length > 0 ? modelList : ["default"];
    } catch (error) {
      console.error("Failed to fetch models for config", config.id, error);
      return ["default"];
    }
  };

  const handleConfigSelect = async (configId: string) => {
    const selectedConfig = configs.find((c) => c.id === configId);
    if (!selectedConfig) return;

    // If config doesn't have availableModels, fetch them
    if (!selectedConfig.availableModels) {
      const models = await fetchAvailableModels(selectedConfig);
      selectedConfig.availableModels = models;

      // Update configs with available models
      const updatedConfigs = configs.map((c) =>
        c.id === configId ? { ...c, availableModels: models } : c,
      );
      setConfigs(updatedConfigs);
    }

    if (selectedConfig.availableModels.length === 1) {
      // If only one model available, switch directly
      handleModelSwitch(configId, selectedConfig.availableModels[0]);
      setShowApiDropdown(false);
      setShowModelDropdown(false);
    } else {
      // Show model dropdown for this config
      setSelectedConfigId(configId);
      setShowModelDropdown(true);
      setShowApiDropdown(false);
    }
  };

  const handleModelSwitch = (configId: string, modelName?: string) => {
    const selectedConfig = configs.find((c) => c.id === configId);
    if (!selectedConfig) {
      console.error("CharacterChatPanel: Config not found for id", configId);
      return;
    }

    // If modelName is provided, update the config's model
    // For "default", use the original configured model or "default" if none exists
    if (modelName && modelName !== selectedConfig.model) {
      const actualModelName =
        modelName === "default" ? selectedConfig.model || "default" : modelName;
      selectedConfig.model = actualModelName;
      const updatedConfigs = configs.map((c) =>
        c.id === configId ? { ...c, model: actualModelName } : c,
      );
      setConfigs(updatedConfigs);
      localStorage.setItem("apiConfigs", JSON.stringify(updatedConfigs));
    }

    setActiveConfigId(configId);
    setCurrentModel(selectedConfig.model);
    localStorage.setItem("activeConfigId", configId);

    // Load configuration values to localStorage
    localStorage.setItem("llmType", selectedConfig.type);
    localStorage.setItem(
      selectedConfig.type === "openai" ? "openaiBaseUrl" : "ollamaBaseUrl",
      selectedConfig.baseUrl,
    );
    localStorage.setItem(
      selectedConfig.type === "openai" ? "openaiModel" : "ollamaModel",
      selectedConfig.model,
    );
    localStorage.setItem("modelName", selectedConfig.model);
    localStorage.setItem("modelBaseUrl", selectedConfig.baseUrl);

    // Store API key properly
    if (selectedConfig.type === "openai" && selectedConfig.apiKey) {
      localStorage.setItem("openaiApiKey", selectedConfig.apiKey);
      localStorage.setItem("apiKey", selectedConfig.apiKey);
    }

    // Dispatch custom event to notify other components
    window.dispatchEvent(
      new CustomEvent("modelChanged", {
        detail: {
          configId,
          config: selectedConfig,
          modelName: selectedConfig.model,
          configName: selectedConfig.name,
        },
      }),
    );

    setShowApiDropdown(false);
    setShowModelDropdown(false);
    trackButtonClick("CharacterChat", "切换模型");
  };

  useEffect(() => {
    const id = setTimeout(() => scrollToBottom(), 300);
    return () => clearTimeout(id);
  }, [messages]);

  useEffect(() => {
    // On mount, restore fastModel state from localStorage
    const fastModelEnabled = localStorage.getItem("fastModelEnabled");
    if (fastModelEnabled !== null) {
      setActiveModes((prev) => ({
        ...prev,
        fastModel: fastModelEnabled === "true",
      }));
    } else {
      // 默认开启快速回复
      setActiveModes((prev) => ({
        ...prev,
        fastModel: true,
      }));
      localStorage.setItem("fastModelEnabled", "true");
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (
        (showApiDropdown || showModelDropdown) &&
        !target.closest(".api-dropdown-container")
      ) {
        setShowApiDropdown(false);
        setShowModelDropdown(false);
      }
    };

    if (showApiDropdown || showModelDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showApiDropdown, showModelDropdown]);

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
      const activeIdCandidate =
        storedActiveId && loadedConfigs.some((c) => c.id === storedActiveId)
          ? storedActiveId
          : loadedConfigs[0]?.id || "";

      setConfigs(loadedConfigs);
      setActiveConfigId(activeIdCandidate);

      // Set current model
      const activeConfig = loadedConfigs.find(
        (c) => c.id === activeIdCandidate,
      );
      if (activeConfig) {
        setCurrentModel(activeConfig.model);
      }
    };

    // Initial load
    loadConfigs();

    // Listen for changes from ModelSidebar
    const handleModelChanged = (event: CustomEvent) => {
      loadConfigs();
    };

    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === "apiConfigs" || event.key === "activeConfigId") {
        loadConfigs();
      }
    };

    window.addEventListener(
      "modelChanged",
      handleModelChanged as EventListener,
    );
    window.addEventListener("storage", handleStorageChange);

    return () => {
      window.removeEventListener(
        "modelChanged",
        handleModelChanged as EventListener,
      );
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  return (
    <div className="flex flex-col h-full max-h-screen">
      <div
        className="flex-grow overflow-y-auto p-6 fantasy-scrollbar"
        ref={scrollRef}
      >
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
                    <div className="max-w-md lg:max-w-2xl break-words whitespace-pre-line text-[#f4e8c1] story-text leading-relaxed magical-text">
                      <p
                        className={`${serifFontClass}`}
                        dangerouslySetInnerHTML={{
                          __html: (
                            message.content.match(
                              /<input_message>([\s\S]*?)<\/input_message>/,
                            )?.[1] || ""
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
                          <CharacterAvatarBackground
                            avatarPath={character.avatar_path}
                          />
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
                        <span
                          className={`text-sm font-medium text-[#f4e8c1] ${serifFontClass}`}
                        >
                          {character.name}
                        </span>
                        {message.role === "assistant" &&
                          shouldShowRegenerateButton(message, index) && (
                          <>
                            {/* Two-Level API/Model Configuration Selector */}
                            <div className="relative mx-2 api-dropdown-container">
                              <button
                                onClick={() => {
                                  setShowApiDropdown(!showApiDropdown);
                                  setShowModelDropdown(false);
                                }}
                                className="p-1 rounded-md transition-all duration-300 group relative text-[#8a8a8a] hover:text-[#d1a35c] flex items-center"
                              >
                                <div className="flex items-center">
                                  {getCurrentConfig()
                                    ? getConfigIcon(getCurrentConfig()!.name)
                                    : getConfigIcon("openai")}
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="h-2 w-2 ml-0.5"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                    strokeWidth={3}
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      d="M19 9l-7 7-7-7"
                                    />
                                  </svg>
                                </div>
                                <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-[#2a261f] text-[#f4e8c1] text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap border border-[#534741] z-50">
                                  {getCurrentConfig()?.name ||
                                      t("modelSettings.noConfigs")}
                                </div>
                              </button>

                              {/* First Level Dropdown - API Configurations */}
                              {showApiDropdown && !showModelDropdown && (
                                <div className="absolute top-full left-0 mt-1 bg-[#2a261f] border border-[#534741] rounded-md shadow-lg z-50 min-w-[160px]">
                                  {configs.length > 0 ? (
                                    configs.map((config) => (
                                      <button
                                        key={config.id}
                                        onClick={() =>
                                          handleConfigSelect(config.id)
                                        }
                                        className={`w-full text-left px-2 py-1.5 text-xs hover:bg-[#3a3632] transition-colors flex items-center justify-between ${
                                          activeConfigId === config.id
                                            ? "bg-[#3a3632] text-[#d1a35c]"
                                            : "text-[#f4e8c1]"
                                        }`}
                                      >
                                        <div className="flex items-center">
                                          <span className="mr-2.5">
                                            {getConfigIcon(config.name)}
                                          </span>
                                          <span
                                            className="truncate"
                                            title={config.name}
                                          >
                                            {config.name.length > 20
                                              ? `${config.name.substring(0, 20)}...`
                                              : config.name}
                                          </span>
                                        </div>
                                        <svg
                                          xmlns="http://www.w3.org/2000/svg"
                                          className="h-3 w-3 ml-2"
                                          fill="none"
                                          viewBox="0 0 24 24"
                                          stroke="currentColor"
                                          strokeWidth={2}
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M9 5l7 7-7 7"
                                          />
                                        </svg>
                                      </button>
                                    ))
                                  ) : (
                                    <div className="px-2 py-1.5 text-xs text-[#8a8a8a]">
                                      {t("common.noApisConfigured")}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Second Level Dropdown - Models within Config */}
                              {showModelDropdown && selectedConfigId && (
                                <div className="absolute top-full left-0 mt-1 bg-[#2a261f] border border-[#534741] rounded-md shadow-lg z-50 min-w-[180px]">
                                  <div className="px-2 py-1.5 text-xs text-[#8a8a8a] border-b border-[#534741] flex items-center justify-between">
                                    <button
                                      onClick={() => {
                                        setShowModelDropdown(false);
                                        setShowApiDropdown(true);
                                      }}
                                      className="flex items-center text-[#c0a480] hover:text-[#d1a35c] transition-colors"
                                    >
                                      <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        className="h-3 w-3 mr-1"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        strokeWidth={2}
                                      >
                                        <path
                                          strokeLinecap="round"
                                          strokeLinejoin="round"
                                          d="M15 19l-7-7 7-7"
                                        />
                                      </svg>
                                      {t("characterChat.back")}
                                    </button>
                                    <span>
                                      {t("characterChat.selectModel")}
                                    </span>
                                  </div>
                                  {(() => {
                                    const selectedConfig = configs.find(
                                      (c) => c.id === selectedConfigId,
                                    );
                                    if (
                                      !selectedConfig ||
                                        !selectedConfig.availableModels
                                    ) {
                                      return (
                                        <div className="px-2 py-1.5 text-xs text-[#8a8a8a] flex items-center">
                                          <svg
                                            className="animate-spin h-3 w-3 mr-2"
                                            xmlns="http://www.w3.org/2000/svg"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                          >
                                            <circle
                                              className="opacity-25"
                                              cx="12"
                                              cy="12"
                                              r="10"
                                              stroke="currentColor"
                                              strokeWidth="4"
                                            ></circle>
                                            <path
                                              className="opacity-75"
                                              fill="currentColor"
                                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                            ></path>
                                          </svg>
                                            Loading models...
                                        </div>
                                      );
                                    }

                                    return selectedConfig.availableModels.map(
                                      (modelName) => (
                                        <button
                                          key={modelName}
                                          onClick={() =>
                                            handleModelSwitch(
                                              selectedConfigId,
                                              modelName,
                                            )
                                          }
                                          className={`w-full text-left px-2 py-1.5 text-xs hover:bg-[#3a3632] transition-colors flex items-center ${
                                            selectedConfig.model ===
                                                modelName ||
                                              (modelName === "default" &&
                                                selectedConfig.model ===
                                                  "default")
                                              ? "bg-[#3a3632] text-[#d1a35c]"
                                              : "text-[#f4e8c1]"
                                          }`}
                                        >
                                          <span className="mr-2.5">
                                            {modelName === "default"
                                              ? getConfigIcon(
                                                selectedConfig.name,
                                              )
                                              : getModelIcon(modelName)}
                                          </span>
                                          <span
                                            className="truncate"
                                            title={
                                              modelName === "default"
                                                ? t(
                                                  "characterChat.defaultModel",
                                                )
                                                : modelName
                                            }
                                          >
                                            {modelName === "default"
                                              ? t(
                                                "characterChat.defaultModel",
                                              )
                                              : modelName.length > 25
                                                ? `${modelName.substring(0, 25)}...`
                                                : modelName}
                                          </span>
                                        </button>
                                      ),
                                    );
                                  })()}
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                setActiveModes((prev) => {
                                  const newStreaming = !prev.streaming;
                                  return { ...prev, streaming: newStreaming };
                                });
                                const newStreaming = !activeModes.streaming;
                                setStreamingTarget(
                                  newStreaming ? messages.length : -1,
                                );
                                localStorage.setItem(
                                  "streamingEnabled",
                                  String(newStreaming),
                                );
                                trackButtonClick(
                                  "toggle_streaming",
                                  "流式输出切换",
                                );
                              }}
                              className={`mx-1 w-6 h-6 flex items-center justify-center bg-[#1c1c1c] rounded-lg border shadow-inner transition-all duration-300 group relative ${
                                activeModes.streaming
                                  ? "text-amber-400 hover:text-amber-300 border-amber-400/60 hover:border-amber-300/70 hover:shadow-[0_0_8px_rgba(252,211,77,0.4)]"
                                  : "text-[#a18d6f] hover:text-[#c0a480] border-[#333333] hover:border-[#444444]"
                              }`}
                              data-tooltip={
                                activeModes.streaming
                                  ? t("characterChat.disableStreaming")
                                  : t("characterChat.enableStreaming")
                              }
                            >
                              <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-[#2a261f] text-[#f4e8c1] text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap border border-[#534741]">
                                {activeModes.streaming
                                  ? t("characterChat.disableStreaming")
                                  : t("characterChat.enableStreaming")}
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
                                  stroke={
                                    activeModes.streaming
                                      ? "#FFC107"
                                      : "currentColor"
                                  }
                                  strokeLinecap="round"
                                  strokeDasharray={
                                    activeModes.streaming ? "4,2" : "none"
                                  }
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
                                setActiveModes((prev) => {
                                  const newFastModel = !prev.fastModel;
                                  // Store fastModel state in localStorage
                                  localStorage.setItem(
                                    "fastModelEnabled",
                                    String(newFastModel),
                                  );
                                  return { ...prev, fastModel: newFastModel };
                                });
                                trackButtonClick(
                                  "toggle_fastmodel",
                                  "快速模式切换",
                                );
                              }}
                              className={`mx-1 w-6 h-6 flex items-center justify-center bg-[#1c1c1c] rounded-lg border shadow-inner transition-all duration-300 group relative ${
                                activeModes.fastModel
                                  ? "text-blue-500 hover:text-blue-400 border-blue-500/60 hover:border-blue-400/70 hover:shadow-[0_0_8px_rgba(59,130,246,0.4)]"
                                  : "text-[#a18d6f] hover:text-[#c0a480] border-[#333333] hover:border-[#444444]"
                              }`}
                              data-tooltip={
                                activeModes.fastModel
                                  ? t("characterChat.disableFastModel")
                                  : t("characterChat.enableFastModel")
                              }
                            >
                              <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-[#2a261f] text-[#f4e8c1] text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap border border-[#534741]">
                                {activeModes.fastModel
                                  ? t("characterChat.disableFastModel")
                                  : t("characterChat.enableFastModel")}
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
                                  fill={
                                    activeModes.fastModel ? "#3B82F6" : "none"
                                  }
                                  stroke={
                                    activeModes.fastModel
                                      ? "#3B82F6"
                                      : "currentColor"
                                  }
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
                            shouldShowRegenerateButton(message, index)
                              ? ""
                              : "hidden"
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

                    {/* Think Bubble - Show thinking content if available */}
                    <ThinkBubble
                      thinkingContent={message.thinkingContent || ""}
                      characterName={character.name}
                      fontClass={fontClass}
                      serifFontClass={serifFontClass}
                      t={t}
                    />

                    <ChatHtmlBubble
                      key={message.id}
                      html={message.content}
                      isLoading={
                        isSending &&
                        index === messages.length - 1 &&
                        message.content.trim() === ""
                      }
                      enableStreaming={
                        activeModes.streaming &&
                        message.role === "assistant" &&
                        index >= streamingTarget
                      }
                      onContentChange={
                        index === messages.length - 1
                          ? () => maybeScrollToBottom()
                          : undefined
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
                    {character.name}{" "}
                    {t("characterChat.isTyping") || "is typing..."}
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
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z"
                    clipRule="evenodd"
                  />
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
          <div className="flex gap-2 sm:gap-3">
            <div className="flex-grow magical-input relative group">
              <div className="absolute -inset-0.5 bg-gradient-to-r from-amber-400/20 via-amber-500/5 to-amber-400/10 rounded-lg blur opacity-0 group-hover:opacity-100 transition duration-300"></div>
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder={
                  t("characterChat.typeMessage") || "Type a message..."
                }
                data-tour="chat-input"
                className="w-full bg-[#2a261f] border border-[#534741] rounded-lg py-2 sm:py-2.5 px-3 sm:px-4 text-[#f4e8c1] text-sm leading-tight focus:outline-none focus:border-[#c0a480] shadow-inner relative z-1 transition-all duration-300 group-hover:border-[#a18d6f]"
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
                className={`portal-button relative overflow-hidden bg-[#2a261f] hover:bg-[#342f25] text-[#c0a480] hover:text-[#f4e8c1] py-2 px-3 sm:px-4 rounded-lg text-sm border border-[#534741] hover:border-[#a18d6f] shadow-md transition-all duration-300 ${
                  !userInput.trim() ? "opacity-50 cursor-not-allowed" : ""
                }`}
              >
                {t("characterChat.send") || "Send"}
              </button>
            )}
          </div>

          <div className="mt-3 sm:mt-5 flex justify-start gap-1.5 sm:gap-2 md:gap-3 max-w-4xl mx-auto relative">
            {/* Expandable Control Panel */}
            <div className="relative">
              {/* Expanded Control Buttons */}
              <div
                className={`absolute bottom-full left-0 mb-2 z-50 transition-all duration-300 ease-in-out ${
                  isControlPanelExpanded
                    ? "opacity-100 translate-y-0 pointer-events-auto"
                    : "opacity-0 translate-y-2 pointer-events-none"
                }`}
              >
                <div className="flex flex-col gap-2 bg-[#1a1a1a]/95 backdrop-blur-sm rounded-lg p-2 border border-[#534741]/50 shadow-lg">
                  {/* 剧情推进 */}
                  <button
                    type="button"
                    onClick={() => {
                      trackButtonClick("page", "切换故事进度");
                      setActiveModes((prev) => ({
                        ...prev,
                        "story-progress": !prev["story-progress"],
                      }));
                    }}
                    className={`px-1.5 sm:px-2 md:px-4 py-1.5 text-xs rounded-full border transition-all duration-300 whitespace-nowrap min-w-fit ${
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
                      <span className="text-[10px] sm:text-xs">
                        {t("characterChat.storyProgress") || "剧情推进"}
                      </span>
                    </span>
                  </button>

                  {/* 视角设计 */}
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
                    className={`px-1.5 sm:px-2 md:px-4 py-1.5 text-xs rounded-full border transition-all duration-300 whitespace-nowrap min-w-fit ${
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
                      <span className="text-[10px] sm:text-xs">
                        {!activeModes["perspective"].active
                          ? t("characterChat.perspective") || "视角设计"
                          : activeModes["perspective"].mode === "novel"
                            ? t("characterChat.novelPerspective") || "小说视角"
                            : t("characterChat.protagonistPerspective") || "主角视角"}
                      </span>
                    </span>
                  </button>

                  {/* 场景过渡 */}
                  <button
                    type="button"
                    onClick={() => {
                      trackButtonClick("page", "切换场景设置");
                      setActiveModes((prev) => ({
                        ...prev,
                        "scene-setting": !prev["scene-setting"],
                      }));
                    }}
                    className={`px-1.5 sm:px-2 md:px-4 py-1.5 text-xs rounded-full border transition-all duration-300 whitespace-nowrap min-w-fit ${
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
                      <span className="text-[10px] sm:text-xs">
                        {t("characterChat.sceneTransition")}
                      </span>
                    </span>
                  </button>

                  {/* 用户名称 */}
                  <button
                    type="button"
                    onClick={() => {
                      trackButtonClick("page", "设置用户名称");
                      setShowUserNameModal(true);
                    }}
                    className={"px-1.5 sm:px-2 md:px-4 py-1.5 text-xs rounded-full border transition-all duration-300 whitespace-nowrap min-w-fit bg-[#2a261f] text-[#f9c86d] border-[#534741] hover:border-[#f9c86d] shadow-sm hover:shadow-md"}
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
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                      <span className="text-[10px] sm:text-xs">
                        {t("characterChat.userNameSetting")}
                      </span>
                    </span>
                  </button>
                </div>
              </div>

              {/* Main Control Button */}
              <button
                type="button"
                onClick={() => {
                  setIsControlPanelExpanded(!isControlPanelExpanded);
                  trackButtonClick("page", "切换控制面板");
                }}
                className={`px-1.5 sm:px-2 md:px-4 py-1.5 text-xs rounded-full border transition-all duration-300 ${
                  isControlPanelExpanded
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
                    className={`mr-1 sm:mr-1 transition-transform duration-300 ${
                      isControlPanelExpanded ? "rotate-180" : ""
                    }`}
                  >
                    <path d="M18 15l-6-6-6 6"></path>
                  </svg>
                  <span className="text-[10px] sm:text-xs">
                    {isControlPanelExpanded ? "收起控制" : "展开控制"}
                  </span>
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Username Setting Modal */}
      <UserNameSettingModal
        isOpen={showUserNameModal}
        onClose={() => setShowUserNameModal(false)}
        currentDisplayName={currentDisplayName}
        onSave={handleUserNameSave}
      />
    </div>
  );
}
