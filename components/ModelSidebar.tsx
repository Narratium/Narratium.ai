/**
 * Model Sidebar Component
 * 
 * This component provides a comprehensive interface for managing LLM model configurations:
 * - API configuration management (OpenAI and Ollama)
 * - Model selection and testing
 * - Configuration persistence
 * - Real-time model testing
 * - Model list fetching
 * - Configuration naming and editing
 * 
 * The sidebar handles all model-related settings and provides a rich
 * set of features for managing API configurations and model interactions.
 * 
 * Key Features:
 * - Multiple API configuration support
 * - Real-time model testing
 * - Configuration persistence in localStorage
 * - Dynamic model list fetching for OpenAI
 * - Custom configuration naming
 * - Configuration switching and management
 * 
 * Dependencies:
 * - useLanguage: For internationalization
 * - trackButtonClick: For analytics tracking
 */

"use client";

import { useState, useEffect } from "react";
import "@/app/styles/fantasy-ui.css";
import { useLanguage } from "@/app/i18n";
import { trackButtonClick } from "@/utils/google-analytics";
import { ChatOpenAI } from "@langchain/openai";
import { ChatOllama } from "@langchain/ollama";

/**
 * Props interface for the ModelSidebar component
 * @property {boolean} isOpen - Controls the visibility of the sidebar
 * @property {() => void} toggleSidebar - Function to toggle the sidebar state
 */
interface ModelSidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

/**
 * Supported LLM provider types
 */
type LLMType = "openai" | "ollama";

/**
 * Interface for API configuration
 * @property {string} id - Unique identifier for the configuration
 * @property {string} name - Display name for the configuration
 * @property {LLMType} type - Type of LLM provider (openai/ollama)
 * @property {string} baseUrl - Base URL for the API endpoint
 * @property {string} model - Model name/identifier
 * @property {string} [apiKey] - Optional API key (required for OpenAI)
 */
interface APIConfig {
  id: string;
  name: string;
  type: LLMType;
  baseUrl: string;
  model: string;
  apiKey?: string;
}

/**
 * Reads default API key and URL from environment variables if available
 */
const DEFAULT_API_KEY = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_API_KEY || "" : "";
const DEFAULT_API_URL = typeof process !== "undefined" ? process.env.NEXT_PUBLIC_API_URL || "" : "";

export default function ModelSidebar({ isOpen, toggleSidebar }: ModelSidebarProps) {
  const { t, fontClass, serifFontClass } = useLanguage();
  
  const [configs, setConfigs] = useState<APIConfig[]>([]);
  const [activeConfigId, setActiveConfigId] = useState<string>("");
  const [showNewConfigForm, setShowNewConfigForm] = useState(false);
  const [editingConfigId, setEditingConfigId] = useState<string>("");
  const [editingName, setEditingName] = useState("");
  const [showEditHint, setShowEditHint] = useState(true);
  const [isConfigHovered, setIsConfigHovered] = useState(false);
  
  const [llmType, setLlmType] = useState<LLMType>("openai");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [openaiModelList, setOpenaiModelList] = useState<string[]>([]);
  
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [getModelListSuccess, setGetModelListSuccess] = useState(false);
  const [getModelListError, setGetModelListError] = useState(false);
  const [testModelSuccess, setTestModelSuccess] = useState(false);
  const [testModelError, setTestModelError] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const [modelListEmpty, setModelListEmpty] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  /**
   * Loads saved configurations from localStorage and initializes the component state
   * Handles error cases and sets up initial active configuration
   */
  useEffect(() => {
    if (typeof window === "undefined") return;

    const savedConfigsStr = localStorage.getItem("apiConfigs");
    let mergedConfigs: APIConfig[] = [];

    if (savedConfigsStr) {
      try {
        mergedConfigs = JSON.parse(savedConfigsStr) as APIConfig[];
      } catch (e) {
        console.error("Error parsing saved API configs", e);
      }
    }

    // If no configs exist and env variables are set, auto-create a default config
    if (mergedConfigs.length === 0 && (DEFAULT_API_URL || DEFAULT_API_KEY)) {
      // Generate a default config name
      const defaultConfigName = `【1】${DEFAULT_API_URL ? "API" : "OpenAI"}`;
      const defaultConfig: APIConfig = {
        id: generateId(),
        name: defaultConfigName,
        type: "openai",
        baseUrl: DEFAULT_API_URL,
        model: "",
        apiKey: DEFAULT_API_KEY,
      };
      mergedConfigs = [defaultConfig];
      localStorage.setItem("apiConfigs", JSON.stringify(mergedConfigs));
      localStorage.setItem("activeConfigId", defaultConfig.id);
    }

    const storedActiveId = localStorage.getItem("activeConfigId");
    const activeIdCandidate = storedActiveId && mergedConfigs.some((c) => c.id === storedActiveId)
      ? storedActiveId
      : (mergedConfigs[0]?.id || "");

    setConfigs(mergedConfigs);
    setActiveConfigId(activeIdCandidate);

    if (mergedConfigs.length > 0) {
      loadConfigToForm(mergedConfigs.find((c) => c.id === activeIdCandidate)!);
    }
  }, []);

  // Listen for model changes from other components
  useEffect(() => {
    const handleModelChanged = (event: CustomEvent) => {
      const { configId, modelName, configName } = event.detail;
      if (configId && configId !== activeConfigId) {
        const selectedConfig = configs.find(c => c.id === configId);
        if (selectedConfig) {
          setActiveConfigId(configId);
          loadConfigToForm(selectedConfig);
        } else {
          console.error("ModelSidebar: Config not found for id", configId);
        }
      } else if (configId === activeConfigId && modelName && modelName !== model) {
        // Update model if it changed within the same config
        setModel(modelName);
        localStorage.setItem(llmType === "openai" ? "openaiModel" : "ollamaModel", modelName);
        localStorage.setItem("modelName", modelName);
      }
    };

    window.addEventListener("modelChanged", handleModelChanged as EventListener);

    return () => {
      window.removeEventListener("modelChanged", handleModelChanged as EventListener);
    };
  }, [configs, activeConfigId, model, llmType]);

  /**
   * Loads a configuration into the form fields
   * @param {APIConfig} config - The configuration to load
   */
  const loadConfigToForm = (config: APIConfig) => {
    setLlmType(config.type);
    setBaseUrl(config.baseUrl);
    setModel(config.model);
    setApiKey(config.apiKey || "");
    
    // Update localStorage with the selected configuration
    localStorage.setItem("llmType", config.type);
    localStorage.setItem(config.type === "openai" ? "openaiBaseUrl" : "ollamaBaseUrl", config.baseUrl);
    localStorage.setItem(config.type === "openai" ? "openaiModel" : "ollamaModel", config.model);
    localStorage.setItem("modelName", config.model);
    localStorage.setItem("modelBaseUrl", config.baseUrl);
    
    if (config.type === "openai" && config.apiKey) {
      localStorage.setItem("openaiApiKey", config.apiKey);
      localStorage.setItem("apiKey", config.apiKey);
    }
    
    if (config.baseUrl && config.apiKey) {
      handleGetModelList(config.baseUrl, config.apiKey);
    }
  };

  /**
   * Generates a unique ID for new configurations
   * @returns {string} A unique identifier
   */
  const generateId = () => `api_${Date.now()}`;

  /**
   * Initiates the creation of a new configuration
   * Resets form fields and shows the new configuration form
   */
  const handleCreateConfig = () => {
    setLlmType("openai");
    setBaseUrl("");
    setModel("");
    setApiKey("");
    setShowNewConfigForm(true);
    setActiveConfigId("");
  };
  
  /**
   * Cancels the creation of a new configuration
   * Restores the previous state if available
   */
  const handleCancelCreate = () => {
    setShowNewConfigForm(false);
    if (configs.length > 0 && activeConfigId) {
      const selectedConfig = configs.find(c => c.id === activeConfigId);
      if (selectedConfig) {
        loadConfigToForm(selectedConfig);
      } else {
        setActiveConfigId(configs[0].id);
        loadConfigToForm(configs[0]);
      }
    } else if (configs.length > 0) {
      setActiveConfigId(configs[0].id);
      loadConfigToForm(configs[0]);
    }
  };

  /**
   * Saves the current configuration
   * Handles both new configurations and updates to existing ones
   * Persists changes to localStorage
   */
  const handleSave = () => {
    if (showNewConfigForm) {
      const configName = generateConfigName(llmType, model);
      
      const newConfig: APIConfig = {
        id: generateId(),
        name: configName,
        type: llmType,
        baseUrl,
        model,
        apiKey: llmType === "openai" ? apiKey : undefined,
      };

      const currentConfigs = Array.isArray(configs) ? configs : [];
      const updatedConfigs = [...currentConfigs, newConfig];
      setConfigs(updatedConfigs);
      setActiveConfigId(newConfig.id);
      setShowNewConfigForm(false);

      localStorage.setItem("apiConfigs", JSON.stringify(updatedConfigs));
      localStorage.setItem("activeConfigId", newConfig.id);
      
      // Dispatch model change event for new config
      window.dispatchEvent(new CustomEvent("modelChanged", { 
        detail: { 
          configId: newConfig.id, 
          config: newConfig,
          modelName: newConfig.model,
          configName: newConfig.name,
        }, 
      }));
      
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 2000);
      
      return;
    } else {
      if (!Array.isArray(configs)) {
        setConfigs([]);
        console.error("Configs is not an array", configs);
        return;
      }
      
      const updatedConfigs = configs.map(config => {
        if (config.id === activeConfigId) {
          return {
            ...config,
            type: llmType,
            baseUrl,
            model,
            apiKey: llmType === "openai" ? apiKey : undefined,
          };
        }
        return config;
      });

      setConfigs(updatedConfigs);
      localStorage.setItem("apiConfigs", JSON.stringify(updatedConfigs));
      
      // Dispatch model change event for updated config
      const updatedConfig = updatedConfigs.find(c => c.id === activeConfigId);
      if (updatedConfig) {
        window.dispatchEvent(new CustomEvent("modelChanged", { 
          detail: { 
            configId: activeConfigId, 
            config: updatedConfig,
            modelName: updatedConfig.model,
            configName: updatedConfig.name,
          }, 
        }));
      }
    }

    localStorage.setItem("llmType", llmType);
    localStorage.setItem(llmType === "openai" ? "openaiBaseUrl" : "ollamaBaseUrl", baseUrl);
    localStorage.setItem(llmType === "openai" ? "openaiModel" : "ollamaModel", model);
    if (llmType === "openai") {
      localStorage.setItem("openaiApiKey", apiKey);
      localStorage.setItem("apiKey", apiKey);
    }
    localStorage.setItem("modelBaseUrl", baseUrl);
    localStorage.setItem("modelName", model);

    if (!showNewConfigForm) {
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
      }, 2000);
    }
  };

  /**
   * Generates a unique name for a new configuration
   * @param {LLMType} type - The type of LLM provider
   * @param {string} model - The model name
   * @returns {string} A formatted configuration name
   */
  const generateConfigName = (type: LLMType, model: string): string => {
    const currentConfigs = Array.isArray(configs) ? configs : [];

    let modelName = model && model.trim() ? model : (type === "openai" ? "OpenAI" : "Ollama");
    
    if (modelName.length > 15) {
      modelName = modelName.substring(0, 15);
    }
    
    const sameModelConfigs = currentConfigs.filter(config => {
      if (config.model === model) return true;
      
      const namePattern = new RegExp(`【\\d+】${modelName}`);
      return namePattern.test(config.name);
    });
    
    if (sameModelConfigs.length === 0) {
      return `【1】${modelName}`;
    }
    
    let maxNumber = 0;
    sameModelConfigs.forEach(config => {
      const match = config.name.match(/【(\d+)】/);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNumber) {
          maxNumber = num;
        }
      }
    });
    
    return `【${maxNumber + 1}】${modelName}`;
  };

  /**
   * Deletes a configuration
   * @param {string} id - The ID of the configuration to delete
   */
  const handleDeleteConfig = (id: string) => {
    const updatedConfigs = configs.filter(config => config.id !== id);
    setConfigs(updatedConfigs);

    if (id === activeConfigId) {
      if (updatedConfigs.length > 0) {
        setActiveConfigId(updatedConfigs[0].id);
        loadConfigToForm(updatedConfigs[0]);
      } else {
        setActiveConfigId("");
        setLlmType("openai");
        setBaseUrl("");
        setModel("");
        setApiKey("");
      }
    }

    localStorage.setItem("apiConfigs", JSON.stringify(updatedConfigs));
    if (id === activeConfigId) {
      localStorage.setItem("activeConfigId", updatedConfigs.length > 0 ? updatedConfigs[0].id : "");
    }
  };

  /**
   * Switches to a different configuration
   * @param {string} id - The ID of the configuration to switch to
   */
  const handleSwitchConfig = (id: string) => {
    if (id === activeConfigId) return;
    
    setActiveConfigId(id);
    const selectedConfig = configs.find(config => config.id === id);
    if (selectedConfig) {
      loadConfigToForm(selectedConfig);
      localStorage.setItem("activeConfigId", id);
      setShowNewConfigForm(false);
      
      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent("modelChanged", { 
        detail: { 
          configId: id, 
          config: selectedConfig,
          modelName: selectedConfig.model,
          configName: selectedConfig.name,
        }, 
      }));
    } else {
      console.error("ModelSidebar: Config not found for id", id);
    }
  };

  /**
   * Fetches the list of available models from the OpenAI API
   * @param {string} baseUrl - The base URL for the API
   * @param {string} apiKey - The API key for authentication
   */
  const handleGetModelList = async (baseUrl: string, apiKey: string) => {
    if (llmType === "ollama") return; // Skip for Ollama
    
    try {
      const response = await fetch(`${baseUrl}/models`, {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
        },
      });
      const data = await response.json();
      const modelList = data.data?.map((item: any) => item.id) || [];
  
      setOpenaiModelList(modelList);
      setModelListEmpty(modelList.length === 0);
  
      setGetModelListSuccess(true);
      setTimeout(() => setGetModelListSuccess(false), 2000);
    } catch (error) {
      setGetModelListError(true);
      setModelListEmpty(true);
      setTimeout(() => setGetModelListError(false), 2000);
    }
  };

  /**
   * Initiates the editing of a configuration name
   * @param {APIConfig} config - The configuration being edited
   * @param {React.MouseEvent} e - The mouse event
   */
  const handleStartEditName = (config: APIConfig, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingConfigId(config.id);
    setEditingName(config.name);
  };

  /**
   * Saves the edited configuration name
   */
  const handleSaveName = () => {
    if (!editingName.trim()) return;

    const updatedConfigs = configs.map(config => {
      if (config.id === editingConfigId) {
        return { ...config, name: editingName.trim() };
      }
      return config;
    });

    setConfigs(updatedConfigs);
    localStorage.setItem("apiConfigs", JSON.stringify(updatedConfigs));
    setEditingConfigId("");
  };

  /**
   * Handles keyboard events during name editing
   * @param {React.KeyboardEvent} e - The keyboard event
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveName();
    } else if (e.key === "Escape") {
      setEditingConfigId("");
    }
  };

  /**
   * Tests the current model configuration using LangChain
   * Sends a test request to verify the configuration works
   * Uses a minimal test prompt to check model connectivity and response
   */
  const handleTestModel = async () => {
    if (!baseUrl || !model) return;
    
    setIsTesting(true);
    setTestModelSuccess(false);
    setTestModelError(false);
    
    try {
      // Initialize the appropriate LangChain client based on LLM type
      const chatModel = llmType === "openai" 
        ? new ChatOpenAI({
          modelName: model,
          openAIApiKey: apiKey,
          configuration: {
            baseURL: baseUrl,
          },
        })
        : new ChatOllama({
          baseUrl: baseUrl,
          model: model,
        });

      // Send test message using LangChain
      const response = await chatModel.invoke([
        {
          role: "system",
          content: "You are a helpful AI assistant.",
        },
        {
          role: "user",
          content: "Hello, this is a test message. Please respond with 'Test successful' if you can read this.",
        },
      ]);

      // Verify the response
      if (response.content.toString().toLowerCase().includes("test successful")) {
        setTestModelSuccess(true);
        setTimeout(() => setTestModelSuccess(false), 2000);
      } else {
        throw new Error("Invalid response content");
      }
    } catch (error) {
      console.error("Test failed:", error);
      setTestModelError(true);
      setTimeout(() => setTestModelError(false), 2000);
    } finally {
      setIsTesting(false);
    }
  };

  // Mobile full-screen modal
  if (isMobile && isOpen) {
    return (
      <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm">
        <div className="relative w-full h-full bg-[#181818] breathing-bg text-[#d0d0d0] flex flex-col">
          {/* Header with close button */}
          <div className="flex-shrink-0 flex justify-between items-center p-4 border-b border-[#534741] bg-gradient-to-r from-[#1a1a1a] to-[#2a2a2a]">
            <h1 className={`text-lg magical-text ${serifFontClass}`}>{t("modelSettings.title")}</h1>
            <button
              onClick={() => {trackButtonClick("ModelSidebar", "关闭模型设置"); toggleSidebar();}}
              className="w-8 h-8 flex items-center justify-center text-[#f4e8c1] bg-[#1c1c1c] rounded-full border border-[#333333] shadow-inner transition-all duration-300 hover:bg-[#252525] hover:border-[#444444] hover:text-amber-400 hover:shadow-[0_0_8px_rgba(251,146,60,0.4)]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          {/* Content with proper scrolling and padding */}
          <div className="flex-1 overflow-y-auto fantasy-scrollbar">
            <div className="p-4 pb-20">
              <div className="mb-4">
                <div className="flex justify-between items-center mb-3">
                  <label className={`text-[#f4e8c1] text-sm font-medium ${fontClass}`}>
                    {t("modelSettings.configurations") || "API Configurations"}
                  </label>
                  <button 
                    onClick={(e) => {trackButtonClick("ModelSidebar", "创建新配置"); handleCreateConfig();}}
                    className="text-sm text-[#d1a35c] hover:text-[#f4e8c1] transition-all duration-200 px-3 py-2 rounded border border-[#534741] hover:border-[#d1a35c] hover:shadow-[0_0_6px_rgba(209,163,92,0.2)] flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    {t("modelSettings.newConfig") || "New Config"}
                  </button>
                </div>
                
                {!showNewConfigForm && configs.length > 0 && (
                  <div className="mb-2">
                    <p className={`text-sm italic transition-colors duration-200 ${isConfigHovered ? "text-[#d1a35c]" : "text-[#8a8a8a]"}`}>
                      {t("modelSettings.doubleClickToEditName") || "Double-click configuration name to edit"}
                    </p>
                  </div>
                )}
                
                {configs.length > 0 && (
                  <div className="mb-4 space-y-2 max-h-48 overflow-y-auto fantasy-scrollbar">
                    {configs.map((config, idx) => (
                      <div 
                        key={config.id} 
                        className={`flex items-center justify-between p-3 rounded-md cursor-pointer text-sm transition-all duration-200 group ${
                          activeConfigId === config.id 
                            ? "bg-[#3a3632] border border-[#d1a35c] shadow-[0_0_8px_rgba(209,163,92,0.2)]" 
                            : "bg-[#292929] hover:bg-[#333333] border border-transparent hover:border-[#534741]"
                        }`}
                        onClick={() => handleSwitchConfig(config.id)}
                        onMouseEnter={() => setIsConfigHovered(true)}
                        onMouseLeave={() => setIsConfigHovered(false)}
                      >
                        <div className="relative flex items-center flex-1 min-w-0 group/name">
                          {editingConfigId === config.id ? (
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onBlur={handleSaveName}
                              onKeyDown={handleKeyDown}
                              className="bg-[#1c1c1c] border border-[#534741] rounded py-1 px-2 text-sm text-[#f4e8c1] w-full focus:border-[#d1a35c] focus:outline-none"
                              onClick={e => e.stopPropagation()}
                              autoFocus
                            />
                          ) : (
                            <>
                              <span 
                                className="text-sm truncate cursor-text hover:text-[#f4e8c1] transition-colors" 
                                onDoubleClick={(e) => handleStartEditName(config, e)}
                              >
                                {config.name}
                              </span>
                              {showEditHint && configs.length > 1 && (
                                <span
                                  className={`absolute ${idx === 0 ? "top-full mt-1" : "-top-8"} left-0 z-[9999] bg-[#2a2522] text-[#d1a35c] text-xs px-2 py-1 rounded border border-[#d1a35c] whitespace-nowrap opacity-0 group-hover/name:opacity-100 transition-all duration-200 pointer-events-none shadow-[0_0_8px_rgba(209,163,92,0.2)]`}
                                >
                                  {t("modelSettings.doubleClickToEditName")}
                                </span>
                              )}
                              <span className="ml-3 text-xs text-[#8a8a8a] px-2 py-1 rounded bg-[#1c1c1c] border border-[#333333] flex-shrink-0">{config.type}</span>
                            </>
                          )}
                        </div>
                        <button 
                          onClick={(e) => { trackButtonClick("ModelSidebar", "删除配置"); e.stopPropagation(); handleDeleteConfig(config.id); }}
                          className="text-red-400 hover:text-red-300 text-lg p-2 transition-colors ml-2 flex-shrink-0"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {!showNewConfigForm && activeConfigId && (
                <div className="border border-[#534741] rounded-md p-4 mb-4 bg-[#1c1c1c] bg-opacity-50 backdrop-blur-sm">
                  <div className="mb-3">
                    <span className="text-sm text-[#8a8a8a]">{t("modelSettings.llmType") || "API Type"}:</span>
                    <span className="ml-2 text-sm text-[#f4e8c1]">{llmType === "openai" ? "OpenAI API" : "Ollama API"}</span>
                  </div>
                  <div className="mb-3">
                    <span className="text-sm text-[#8a8a8a]">{t("modelSettings.baseUrl") || "Base URL"}:</span>
                    <span className="ml-2 text-sm text-[#f4e8c1] break-all">
                      {baseUrl.includes("://") ? "http://api-server/v1" : baseUrl}
                    </span>
                  </div>
                  {llmType === "openai" && (
                    <div className="mb-3">
                      <span className="text-sm text-[#8a8a8a]">{t("modelSettings.apiKey") || "API Key"}:</span>
                      <span className="ml-2 text-sm text-[#f4e8c1]">{"•".repeat(Math.min(10, apiKey.length))}</span>
                    </div>
                  )}
                  <div className="mb-3">
                    <label className="text-sm text-[#8a8a8a] mr-2">{t("modelSettings.model") || "Model"}:</label>
                    {llmType === "openai" && !modelListEmpty ? (
                      <select
                        value={model}
                        onChange={(e) => {
                          const newModel = e.target.value;
                          setModel(newModel);
                          const updatedConfigs = configs.map(config => {
                            if (config.id === activeConfigId) {
                              return { ...config, model: newModel };
                            }
                            return config;
                          });
                          setConfigs(updatedConfigs);
                          localStorage.setItem("apiConfigs", JSON.stringify(updatedConfigs));
                          localStorage.setItem(llmType === "openai" ? "openaiModel" : "ollamaModel", newModel);
                          localStorage.setItem("modelName", newModel);
                          setSaveSuccess(true);
                          setTimeout(() => setSaveSuccess(false), 2000);
                        }}
                        className="bg-[#292929] border border-[#534741] rounded py-2 px-3 text-[#f4e8c1] text-sm w-full truncate focus:border-[#d1a35c] focus:outline-none transition-colors"
                        style={{ textOverflow: "ellipsis" }}
                      >
                        <option value="" disabled className="truncate">{t("modelSettings.selectModel") || "Select a model..."}</option>
                        {openaiModelList.map((option) => (
                          <option key={option} value={option} className="truncate">{option}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type="text"
                        value={model}
                        onChange={(e) => {
                          const newModel = e.target.value;
                          setModel(newModel);
                          const updatedConfigs = configs.map(config => {
                            if (config.id === activeConfigId) {
                              return { ...config, model: newModel };
                            }
                            return config;
                          });
                          setConfigs(updatedConfigs);
                          localStorage.setItem("apiConfigs", JSON.stringify(updatedConfigs));
                          localStorage.setItem(llmType === "openai" ? "openaiModel" : "ollamaModel", newModel);
                          localStorage.setItem("modelName", newModel);
                          setSaveSuccess(true);
                          setTimeout(() => setSaveSuccess(false), 2000);
                        }}
                        className="bg-[#292929] border border-[#534741] rounded py-2 px-3 text-[#f4e8c1] text-sm w-full focus:border-[#d1a35c] focus:outline-none transition-colors"
                        placeholder={llmType === "openai" ? "gpt-4-turbo, claude-3-opus-20240229..." : "llama3, mistral, mixtral..."}
                      />
                    )}
                  </div>
                </div>
              )}

              {showNewConfigForm && (
                <div className="mb-6">
                  <div className="mb-4">
                    <label className={`block text-[#f4e8c1] text-sm font-medium mb-2 ${fontClass}`}>
                      {t("modelSettings.llmType") || "API Type"}
                    </label>
                    <select
                      value={llmType}
                      onChange={(e) => {
                        setLlmType(e.target.value as LLMType);
                      }}
                      className="w-full bg-[#292929] border border-[#534741] rounded py-3 px-3 text-sm text-[#d0d0d0] leading-tight focus:outline-none focus:border-[#d1a35c] transition-colors"
                    >
                      <option value="openai">OpenAI API</option>
                      <option value="ollama">Ollama API</option>
                    </select>
                  </div>

                  <div className="mb-4">
                    <label htmlFor="baseUrl" className={`block text-[#f4e8c1] text-sm font-medium mb-2 ${fontClass}`}>
                      {t("modelSettings.baseUrl")}
                    </label>
                    <input
                      type="text"
                      id="baseUrl"
                      className="bg-[#292929] border border-[#534741] rounded w-full py-3 px-3 text-sm text-[#d0d0d0] leading-tight focus:outline-none focus:border-[#d1a35c] transition-colors"
                      placeholder={llmType === "openai" ? "https://api.openai.com/v1" : "http://localhost:11434"}
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                    />
                  </div>

                  {llmType === "openai" && (
                    <div className="mb-4">
                      <label htmlFor="apiKey" className={`block text-[#f4e8c1] text-sm font-medium mb-2 ${fontClass}`}>
                        {t("modelSettings.apiKey") || "API Key"}
                      </label>
                      <input
                        type="text"
                        id="apiKey"
                        className="bg-[#292929] border border-[#534741] rounded w-full py-3 px-3 text-sm text-[#d0d0d0] leading-tight focus:outline-none focus:border-[#d1a35c] transition-colors"
                        placeholder="sk-..."
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                      />
                    </div>
                  )}

                  <div className="mb-4">
                    <div className="relative">
                      {llmType === "openai" && (
                        <button 
                          className={`bg-[#3e3a3a] hover:bg-[#534741] text-[#f4e8c1] font-normal py-3 px-4 text-sm rounded-md border border-[#d1a35c] w-full transition-colors magical-text ${fontClass}`} 
                          onClick={() => handleGetModelList(baseUrl, apiKey)}
                        >{t("modelSettings.getModelList") || "Get Model List"}</button>
                      )}
                      
                      {getModelListSuccess && (
                        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-[#333333] bg-opacity-80 rounded transition-opacity">
                          <div className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2 animate-pulse" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <span className={`text-white text-sm ${fontClass}`}>
                              {t("modelSettings.getModelListSuccess") || "Get Model List Success"}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {getModelListError && (
                        <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-[#333333] bg-opacity-80 rounded transition-opacity">
                          <div className="flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mr-2 animate-pulse" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                            <span className={`text-white text-sm ${fontClass}`}>
                              {t("modelSettings.getModelListError") || "Get Model List Error"}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mb-6">
                    <label htmlFor="model" className={`block text-[#f4e8c1] text-sm font-medium mb-2 ${fontClass}`}>
                      {t("modelSettings.model")}
                    </label>
                    <input
                      type="text"
                      id="model"
                      className="bg-[#292929] border border-[#534741] rounded w-full py-3 px-3 text-sm text-[#d0d0d0] leading-tight focus:outline-none focus:border-[#d1a35c] transition-colors"
                      placeholder={llmType === "openai" ? "gpt-4-turbo, claude-3-opus-20240229..." : "llama3, mistral, mixtral..."}
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                    />
                    {llmType === "openai" && (
                      <div className="mt-3 text-sm text-[#8a8a8a]">
                        <p className={`mb-2 ${fontClass}`}>{t("modelSettings.modelList") || "Model List"}</p>
                        <select
                          value={model}
                          onChange={(e) => {
                            trackButtonClick("ModelSidebar", t("modelSettings.selectModel") || "Select a model...");
                            setModel(e.target.value);
                          }}
                          className="w-full bg-[#292929] border border-[#534741] rounded py-3 px-3 text-[#d0d0d0] text-sm leading-tight focus:outline-none focus:border-[#d1a35c] transition-colors"
                        >
                          <option value="" disabled className="text-[#8a8a8a]">
                            {t("modelSettings.selectModel") || "Select a model..."}
                          </option>
                          {openaiModelList.map((option) => (
                            <option
                              key={option}
                              value={option}
                              className="bg-[#292929] text-[#d0d0d0]"
                            >
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={(e) => {trackButtonClick("ModelSidebar", "创建配置"); e.stopPropagation(); handleSave();}}
                      className={`flex-1 bg-[#3e3a3a] hover:bg-[#534741] text-[#f4e8c1] font-medium py-3 px-4 text-sm rounded border border-[#d1a35c] transition-colors magical-text ${fontClass}`}
                    >
                      {t("modelSettings.createConfig") || "Create Configuration"}
                    </button>
                    <button
                      onClick={() => {trackButtonClick("cancel_create_config_btn", "取消创建配置"); handleCancelCreate();}}
                      className={`px-4 py-3 bg-[#292929] text-sm text-[#d0d0d0] rounded border border-[#534741] hover:bg-[#333333] transition-colors ${fontClass}`}
                    >
                      {t("common.cancel") || "Cancel"}
                    </button>
                  </div>
                </div>
              )}

              {!showNewConfigForm && activeConfigId && (
                <div className="space-y-4">
                  <div className="relative">
                    <button
                      onClick={(e) => {trackButtonClick("ModelSidebar", "保存配置"); e.stopPropagation(); handleSave();}}
                      className={`bg-[#3e3a3a] hover:bg-[#534741] text-[#f4e8c1] font-normal py-3 px-4 text-sm rounded-md border border-[#d1a35c] w-full transition-all duration-200 hover:shadow-[0_0_8px_rgba(209,163,92,0.2)] ${fontClass}`}
                    >
                      {t("modelSettings.saveSettings") || "Save Settings"}
                    </button>

                    {saveSuccess && (
                      <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-[#333333] bg-opacity-80 rounded transition-opacity backdrop-blur-sm">
                        <div className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span className={`text-white text-sm ${fontClass}`}>
                            {t("modelSettings.settingsSaved") || "Settings Saved"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <button
                      onClick={(e) => {trackButtonClick("ModelSidebar", "测试模型"); e.stopPropagation(); handleTestModel();}}
                      disabled={isTesting || !baseUrl || !model}
                      className={`bg-[#3e3a3a] hover:bg-[#534741] text-[#f4e8c1] font-normal py-3 px-4 text-sm rounded-md border border-[#d1a35c] w-full transition-all duration-200 hover:shadow-[0_0_8px_rgba(209,163,92,0.2)] ${fontClass} disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isTesting ? (
                        <span className="flex items-center justify-center">
                          <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-[#f4e8c1]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          {t("modelSettings.testing") || "Testing..."}
                        </span>
                      ) : (
                        t("modelSettings.testModel") || "Test Model"
                      )}
                    </button>

                    {testModelSuccess && (
                      <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-[#333333] bg-opacity-80 rounded transition-opacity backdrop-blur-sm">
                        <div className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                          <span className={`text-white text-sm ${fontClass}`}>
                            {t("modelSettings.testSuccess") || "Model test successful"}
                          </span>
                        </div>
                      </div>
                    )}

                    {testModelError && (
                      <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-[#333333] bg-opacity-80 rounded transition-opacity backdrop-blur-sm">
                        <div className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                          <span className={`text-white text-sm ${fontClass}`}>
                            {t("modelSettings.testError") || "Model test failed"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {configs.length === 0 && !showNewConfigForm && (
                <div className="flex flex-col items-center justify-center py-8">
                  <p className="text-sm text-[#8a8a8a] mb-4 text-center">
                    {t("modelSettings.noConfigs")}
                  </p>
                  <button
                    onClick={(e) => { trackButtonClick("ModelSidebar", "创建第一个配置"); e.stopPropagation(); handleCreateConfig(); }}
                    className={`bg-[#3e3a3a] hover:bg-[#534741] text-[#f4e8c1] font-normal py-3 px-4 text-sm rounded border border-[#d1a35c] transition-all duration-200 hover:shadow-[0_0_8px_rgba(209,163,92,0.2)] ${fontClass} flex items-center justify-center gap-2`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    {t("modelSettings.createFirstConfig") || "Create Your First Configuration"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Desktop sidebar
  return (
    <div
      className={`h-full magic-border border-l border-[#534741] breathing-bg text-[#d0d0d0] transition-all duration-300 overflow-hidden ${isOpen ? "w-64" : "w-0"
      }`}
    >
      <div className={`w-64 h-full ${isOpen ? "opacity-100" : "opacity-0"} transition-opacity duration-300 overflow-y-auto fantasy-scrollbar`}>
        <div className="flex justify-between items-center p-3 border-b border-[#534741] bg-gradient-to-r from-[#1a1a1a] to-[#2a2a2a]">
          <h1 className={`text-base magical-text ${serifFontClass}`}>{t("modelSettings.title")}</h1>
          <button
            onClick={() => {trackButtonClick("ModelSidebar", "关闭模型设置"); toggleSidebar();}}
            className="w-6 h-6 flex items-center justify-center text-[#f4e8c1] bg-[#1c1c1c] rounded-md border border-[#333333] shadow-inner transition-all duration-300 hover:bg-[#252525] hover:border-[#444444] hover:text-amber-400 hover:shadow-[0_0_8px_rgba(251,146,60,0.4)]"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
        <div className="p-3 sm:p-3 p-2">
          <div className="mb-3 sm:mb-3 mb-2">
            <div className="flex justify-between items-center mb-2 sm:mb-2 mb-1">
              <label className={`text-[#f4e8c1] text-xs sm:text-xs text-[10px] font-medium ${fontClass}`}>
                {t("modelSettings.configurations") || "API Configurations"}
              </label>
              <button 
                onClick={(e) => {trackButtonClick("ModelSidebar", "创建新配置"); handleCreateConfig();}}
                className="text-xs sm:text-xs text-[10px] text-[#d1a35c] hover:text-[#f4e8c1] transition-all duration-200 px-2 py-1 sm:px-2 sm:py-1 px-1.5 py-0.5 rounded border border-[#534741] hover:border-[#d1a35c] hover:shadow-[0_0_6px_rgba(209,163,92,0.2)] flex items-center gap-1"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:w-2.5 sm:h-2.5 w-2 h-2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span className="sm:block hidden">{t("modelSettings.newConfig") || "New Config"}</span>
                <span className="sm:hidden block">+</span>
              </button>
            </div>
            
            {!showNewConfigForm && configs.length > 0 && (
              <div className="mb-1.5 sm:mb-1.5 mb-1">
                <p className={`text-xs sm:text-xs text-[10px] italic transition-colors duration-200 ${isConfigHovered ? "text-[#d1a35c]" : "text-[#8a8a8a]"}`}>
                  {t("modelSettings.doubleClickToEditName") || "Double-click configuration name to edit"}
                </p>
              </div>
            )}
            
            {configs.length > 0 && (
              <div className="mb-3 sm:mb-3 mb-2 flex flex-col gap-1.5 sm:gap-1.5 gap-1 max-h-50 overflow-y-auto fantasy-scrollbar pr-1">
                {configs.map((config, idx) => (
                  <div 
                    key={config.id} 
                    className={`flex items-center justify-between p-1.5 sm:p-1.5 p-1 rounded-md cursor-pointer text-sm sm:text-sm text-xs transition-all duration-200 group ${
                      activeConfigId === config.id 
                        ? "bg-[#3a3632] border border-[#d1a35c] shadow-[0_0_8px_rgba(209,163,92,0.2)]" 
                        : "bg-[#292929] hover:bg-[#333333] border border-transparent hover:border-[#534741]"
                    }`}
                    onClick={() => handleSwitchConfig(config.id)}
                    onMouseEnter={() => setIsConfigHovered(true)}
                    onMouseLeave={() => setIsConfigHovered(false)}
                  >
                    <div className="relative flex items-center flex-1 min-w-0 group/name">
                      {editingConfigId === config.id ? (
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onBlur={handleSaveName}
                          onKeyDown={handleKeyDown}
                          className="bg-[#1c1c1c] border border-[#534741] rounded py-0.5 px-1 sm:py-0.5 sm:px-1 py-0 px-0.5 text-xs sm:text-xs text-[10px] text-[#f4e8c1] w-full focus:border-[#d1a35c] focus:outline-none"
                          onClick={e => e.stopPropagation()}
                          autoFocus
                        />
                      ) : (
                        <>
                          <span 
                            className="text-xs sm:text-xs text-[10px] truncate cursor-text hover:text-[#f4e8c1] transition-colors" 
                            onDoubleClick={(e) => handleStartEditName(config, e)}
                          >
                            {config.name}
                          </span>
                          {showEditHint && configs.length > 1 && (
                            <span
                              className={`absolute ${idx === 0 ? "top-full mt-1" : "-top-6"} left-0 z-[9999] bg-[#2a2522] text-[#d1a35c] text-[10px] sm:text-[10px] text-[8px] px-2 py-1 sm:px-2 sm:py-1 px-1 py-0.5 rounded border border-[#d1a35c] whitespace-nowrap opacity-0 group-hover/name:opacity-100 transition-all duration-200 pointer-events-none shadow-[0_0_8px_rgba(209,163,92,0.2)]`}
                            >
                              {t("modelSettings.doubleClickToEditName")}
                            </span>
                          )}
                          <span className="ml-2 text-xs sm:text-xs text-[8px] text-[#8a8a8a] px-1.5 py-0.5 sm:px-1.5 sm:py-0.5 px-1 py-0 rounded bg-[#1c1c1c] border border-[#333333] flex-shrink-0">{config.type}</span>
                        </>
                      )}
                    </div>
                    <button 
                      onClick={(e) => { trackButtonClick("ModelSidebar", "删除配置"); e.stopPropagation(); handleDeleteConfig(config.id); }}
                      className="text-red-400 hover:text-red-300 text-xs sm:text-xs text-[10px] p-1 sm:p-1 p-0.5 transition-colors ml-1 flex-shrink-0"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!showNewConfigForm && activeConfigId && (
            <div className="border border-[#534741] rounded-md p-2.5 sm:p-2.5 p-2 mb-3 sm:mb-3 mb-2 bg-[#1c1c1c] bg-opacity-50 backdrop-blur-sm">
              <div className="mb-1.5 sm:mb-1.5 mb-1">
                <span className="text-xs sm:text-xs text-[10px] text-[#8a8a8a]">{t("modelSettings.llmType") || "API Type"}:</span>
                <span className="ml-2 text-xs sm:text-xs text-[10px] text-[#f4e8c1]">{llmType === "openai" ? "OpenAI API" : "Ollama API"}</span>
              </div>
              <div className="mb-1.5 sm:mb-1.5 mb-1">
                <span className="text-xs sm:text-xs text-[10px] text-[#8a8a8a]">{t("modelSettings.baseUrl") || "Base URL"}:</span>
                <span className="ml-2 text-xs sm:text-xs text-[10px] text-[#f4e8c1] break-all">
                  {baseUrl.includes("://") ? "http://api-server/v1" : baseUrl}
                </span>
              </div>
              {llmType === "openai" && (
                <div className="mb-1.5 sm:mb-1.5 mb-1">
                  <span className="text-xs sm:text-xs text-[10px] text-[#8a8a8a]">{t("modelSettings.apiKey") || "API Key"}:</span>
                  <span className="ml-2 text-xs sm:text-xs text-[10px] text-[#f4e8c1]">{"•".repeat(Math.min(10, apiKey.length))}</span>
                </div>
              )}
              <div className="mb-1.5 sm:mb-1.5 mb-1">
                <label className="text-xs sm:text-xs text-[10px] text-[#8a8a8a] mr-2">{t("modelSettings.model") || "Model"}:</label>
                {llmType === "openai" && !modelListEmpty ? (
                  <select
                    value={model}
                    onChange={(e) => {
                      const newModel = e.target.value;
                      setModel(newModel);
                      const updatedConfigs = configs.map(config => {
                        if (config.id === activeConfigId) {
                          return { ...config, model: newModel };
                        }
                        return config;
                      });
                      setConfigs(updatedConfigs);
                      localStorage.setItem("apiConfigs", JSON.stringify(updatedConfigs));
                      localStorage.setItem(llmType === "openai" ? "openaiModel" : "ollamaModel", newModel);
                      localStorage.setItem("modelName", newModel);
                      setSaveSuccess(true);
                      setTimeout(() => setSaveSuccess(false), 2000);
                    }}
                    className="bg-[#292929] border border-[#534741] rounded py-0.5 px-1.5 sm:py-0.5 sm:px-1.5 py-0 px-1 text-[#f4e8c1] text-xs sm:text-xs text-[10px] max-w-[200px] sm:max-w-[200px] max-w-[150px] truncate focus:border-[#d1a35c] focus:outline-none transition-colors"
                    style={{ textOverflow: "ellipsis" }}
                  >
                    <option value="" disabled className="truncate">{t("modelSettings.selectModel") || "Select a model..."}</option>
                    {openaiModelList.map((option) => (
                      <option key={option} value={option} className="truncate">{option}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={model}
                    onChange={(e) => {
                      const newModel = e.target.value;
                      setModel(newModel);
                      const updatedConfigs = configs.map(config => {
                        if (config.id === activeConfigId) {
                          return { ...config, model: newModel };
                        }
                        return config;
                      });
                      setConfigs(updatedConfigs);
                      localStorage.setItem("apiConfigs", JSON.stringify(updatedConfigs));
                      localStorage.setItem(llmType === "openai" ? "openaiModel" : "ollamaModel", newModel);
                      localStorage.setItem("modelName", newModel);
                      setSaveSuccess(true);
                      setTimeout(() => setSaveSuccess(false), 2000);
                    }}
                    className="bg-[#292929] border border-[#534741] rounded py-0.5 px-1.5 sm:py-0.5 sm:px-1.5 py-0 px-1 text-[#f4e8c1] text-xs sm:text-xs text-[10px] max-w-[200px] sm:max-w-[200px] max-w-[150px] focus:border-[#d1a35c] focus:outline-none transition-colors"
                    placeholder={llmType === "openai" ? "gpt-4-turbo, claude-3-opus-20240229..." : "llama3, mistral, mixtral..."}
                  />
                )}
              </div>
            </div>
          )}

          {showNewConfigForm && (
            <div className="mb-4 sm:mb-4 mb-3">
              <div className="mb-4 sm:mb-4 mb-3">
                <label className={`block text-[#f4e8c1] text-xs sm:text-xs text-[10px] font-medium mb-2 sm:mb-2 mb-1 ${fontClass}`}>
                  {t("modelSettings.llmType") || "API Type"}
                </label>
                <select
                  value={llmType}
                  onChange={(e) => {
                    setLlmType(e.target.value as LLMType);
                  }}
                  className="w-full bg-[#292929] border border-[#534741] rounded py-1.5 px-2 sm:py-1.5 sm:px-2 py-1 px-1.5 text-xs sm:text-xs text-[10px] text-[#d0d0d0] leading-tight focus:outline-none focus:border-[#d1a35c] transition-colors"
                >
                  <option value="openai">OpenAI API</option>
                  <option value="ollama">Ollama API</option>
                </select>
              </div>

              <div className="mb-4 sm:mb-4 mb-3">
                <label htmlFor="baseUrl" className={`block text-[#f4e8c1] text-xs sm:text-xs text-[10px] font-medium mb-2 sm:mb-2 mb-1 ${fontClass}`}>
                  {t("modelSettings.baseUrl")}
                </label>
                <input
                  type="text"
                  id="baseUrl"
                  className="bg-[#292929] border border-[#534741] rounded w-full py-1.5 px-2 sm:py-1.5 sm:px-2 py-1 px-1.5 text-xs sm:text-xs text-[10px] text-[#d0d0d0] leading-tight focus:outline-none focus:border-[#d1a35c] transition-colors"
                  placeholder={llmType === "openai" ? "https://api.openai.com/v1" : "http://localhost:11434"}
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                />
              </div>

              {llmType === "openai" && (
                <div className="mb-4 sm:mb-4 mb-3">
                  <label htmlFor="apiKey" className={`block text-[#f4e8c1] text-xs sm:text-xs text-[10px] font-medium mb-2 sm:mb-2 mb-1 ${fontClass}`}>
                    {t("modelSettings.apiKey") || "API Key"}
                  </label>
                  <input
                    type="text"
                    id="apiKey"
                    className="bg-[#292929] border border-[#534741] rounded w-full py-1.5 px-2 sm:py-1.5 sm:px-2 py-1 px-1.5 text-xs sm:text-xs text-[10px] text-[#d0d0d0] leading-tight focus:outline-none focus:border-[#d1a35c] transition-colors"
                    placeholder="sk-..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                </div>
              )}

              <div className="mb-4 sm:mb-4 mb-3">
                <div className="relative">
                  {llmType === "openai" && (
                    <button 
                      className={`bg-[#3e3a3a] hover:bg-[#534741] text-[#f4e8c1] font-normal py-1.5 px-2 sm:py-1.5 sm:px-2 py-1 px-1.5 text-xs sm:text-xs text-[10px] rounded-md border border-[#d1a35c] w-full transition-colors magical-text ${fontClass}`} 
                      onClick={() => handleGetModelList(baseUrl, apiKey)}
                    >{t("modelSettings.getModelList") || "Get Model List"}</button>
                  )}
                  
                  {getModelListSuccess && (
                    <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-[#333333] bg-opacity-80 rounded transition-opacity">
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-4 sm:w-4 h-3 w-3 text-green-500 mr-2 sm:mr-2 mr-1 animate-pulse" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className={`text-white text-xs sm:text-xs text-[10px] ${fontClass}`}>
                          {t("modelSettings.getModelListSuccess") || "Get Model List Success"}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {getModelListError && (
                    <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-[#333333] bg-opacity-80 rounded transition-opacity">
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-4 sm:w-4 h-3 w-3 text-red-500 mr-2 sm:mr-2 mr-1 animate-pulse" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        <span className={`text-white text-xs sm:text-xs text-[10px] ${fontClass}`}>
                          {t("modelSettings.getModelListError") || "Get Model List Error"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-4 sm:mb-4 mb-3">
                <label htmlFor="model" className={`block text-[#f4e8c1] text-xs sm:text-xs text-[10px] font-medium mb-2 sm:mb-2 mb-1 ${fontClass}`}>
                  {t("modelSettings.model")}
                </label>
                <input
                  type="text"
                  id="model"
                  className="bg-[#292929] border border-[#534741] rounded w-full py-1.5 px-2 sm:py-1.5 sm:px-2 py-1 px-1.5 text-xs sm:text-xs text-[10px] text-[#d0d0d0] leading-tight focus:outline-none focus:border-[#d1a35c] transition-colors"
                  placeholder={llmType === "openai" ? "gpt-4-turbo, claude-3-opus-20240229..." : "llama3, mistral, mixtral..."}
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                />
                {llmType === "openai" && (
                  <div className="mt-2 text-xs sm:text-xs text-[10px] text-[#8a8a8a]">
                    <p className={`mb-1 sm:mb-1 mb-0.5 ${fontClass}`}>{t("modelSettings.modelList") || "Model List"}</p>
                    <select
                      value={model}
                      onChange={(e) => {
                        trackButtonClick("ModelSidebar", t("modelSettings.selectModel") || "Select a model...");
                        setModel(e.target.value);
                      }}
                      className="w-full bg-[#292929] border border-[#534741] rounded py-2 px-3 sm:py-2 sm:px-3 py-1.5 px-2 text-[#d0d0d0] text-sm sm:text-sm text-xs leading-tight focus:outline-none focus:border-[#d1a35c] transition-colors"
                    >
                      <option value="" disabled className="text-[#8a8a8a]">
                        {t("modelSettings.selectModel") || "Select a model..."}
                      </option>
                      {openaiModelList.map((option) => (
                        <option
                          key={option}
                          value={option}
                          className="bg-[#292929] text-[#d0d0d0]"
                        >
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex gap-2 sm:gap-2 gap-1">
                <button
                  onClick={(e) => {trackButtonClick("ModelSidebar", "创建配置"); e.stopPropagation(); handleSave();}}
                  className={`flex-1 bg-[#3e3a3a] hover:bg-[#534741] text-[#f4e8c1] font-medium py-1.5 px-2 sm:py-1.5 sm:px-2 py-1 px-1.5 text-xs sm:text-xs text-[10px] rounded border border-[#d1a35c] transition-colors magical-text ${fontClass}`}
                >
                  <span className="sm:block hidden">{t("modelSettings.createConfig") || "Create Configuration"}</span>
                  <span className="sm:hidden block">Create</span>
                </button>
                <button
                  onClick={() => {trackButtonClick("cancel_create_config_btn", "取消创建配置"); handleCancelCreate();}}
                  className={`px-2 py-1.5 sm:px-2 sm:py-1.5 px-1.5 py-1 bg-[#292929] text-xs sm:text-xs text-[10px] text-[#d0d0d0] rounded border border-[#534741] hover:bg-[#333333] transition-colors ${fontClass}`}
                >
                  {t("common.cancel") || "Cancel"}
                </button>
              </div>
            </div>
          )}

          {!showNewConfigForm && activeConfigId && (
            <div className="space-y-3 sm:space-y-3 space-y-2">
              <div className="relative">
                <button
                  onClick={(e) => {trackButtonClick("ModelSidebar", "保存配置"); e.stopPropagation(); handleSave();}}
                  className={`bg-[#3e3a3a] hover:bg-[#534741] text-[#f4e8c1] font-normal py-1.5 px-2 sm:py-1.5 sm:px-2 py-1 px-1.5 text-xs sm:text-xs text-[10px] rounded-md border border-[#d1a35c] w-full transition-all duration-200 hover:shadow-[0_0_8px_rgba(209,163,92,0.2)] ${fontClass}`}
                >
                  {t("modelSettings.saveSettings") || "Save Settings"}
                </button>

                {saveSuccess && (
                  <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-[#333333] bg-opacity-80 rounded transition-opacity backdrop-blur-sm">
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-4 sm:w-4 h-3 w-3 text-green-500 mr-1.5 sm:mr-1.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className={`text-white text-xs sm:text-xs text-[10px] ${fontClass}`}>
                        {t("modelSettings.settingsSaved") || "Settings Saved"}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  onClick={(e) => {trackButtonClick("ModelSidebar", "测试模型"); e.stopPropagation(); handleTestModel();}}
                  disabled={isTesting || !baseUrl || !model}
                  className={`bg-[#3e3a3a] hover:bg-[#534741] text-[#f4e8c1] font-normal py-1.5 px-2 sm:py-1.5 sm:px-2 py-1 px-1.5 text-xs sm:text-xs text-[10px] rounded-md border border-[#d1a35c] w-full transition-all duration-200 hover:shadow-[0_0_8px_rgba(209,163,92,0.2)] ${fontClass} disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isTesting ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-3 w-3 sm:h-3 sm:w-3 h-2.5 w-2.5 text-[#f4e8c1]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="sm:block hidden">{t("modelSettings.testing") || "Testing..."}</span>
                      <span className="sm:hidden block">Test...</span>
                    </span>
                  ) : (
                    <><span className="sm:block hidden">{t("modelSettings.testModel") || "Test Model"}</span><span className="sm:hidden block">Test</span></>
                  )}
                </button>

                {testModelSuccess && (
                  <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-[#333333] bg-opacity-80 rounded transition-opacity backdrop-blur-sm">
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-4 sm:w-4 h-3 w-3 text-green-500 mr-1.5 sm:mr-1.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className={`text-white text-xs sm:text-xs text-[10px] ${fontClass}`}>
                        {t("modelSettings.testSuccess") || "Model test successful"}
                      </span>
                    </div>
                  </div>
                )}

                {testModelError && (
                  <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-[#333333] bg-opacity-80 rounded transition-opacity backdrop-blur-sm">
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-4 sm:w-4 h-3 w-3 text-red-500 mr-1.5 sm:mr-1.5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      <span className={`text-white text-xs sm:text-xs text-[10px] ${fontClass}`}>
                        {t("modelSettings.testError") || "Model test failed"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {configs.length === 0 && !showNewConfigForm && (
            <div className="flex flex-col items-center justify-center py-3 sm:py-3 py-2">
              <p className="text-xs sm:text-xs text-[10px] text-[#8a8a8a] mb-2 sm:mb-2 mb-1">
                {t("modelSettings.noConfigs")}
              </p>
              <button
                onClick={(e) => { trackButtonClick("ModelSidebar", "创建第一个配置"); e.stopPropagation(); handleCreateConfig(); }}
                className={`bg-[#3e3a3a] hover:bg-[#534741] text-[#f4e8c1] font-normal py-1.5 px-2 sm:py-1.5 sm:px-2 py-1 px-1.5 text-xs sm:text-xs text-[10px] rounded border border-[#d1a35c] transition-all duration-200 hover:shadow-[0_0_8px_rgba(209,163,92,0.2)] ${fontClass} flex items-center justify-center gap-1 w-full max-w-[200px] sm:max-w-[200px] max-w-[150px]`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="sm:w-2.5 sm:h-2.5 w-2 h-2">
                  <path d="M12 5v14M5 12h14" />
                </svg>
                <span className="sm:block hidden">{t("modelSettings.createFirstConfig") || "Create Your First Configuration"}</span>
                <span className="sm:hidden block">Create Config</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
