"use client";

import { useState, useEffect } from "react";
import "@/app/styles/fantasy-ui.css";
import { useLanguage } from "@/app/i18n";
import { trackButtonClick } from "@/lib/utils/google-analytics";

interface ModelSidebarProps {
  isOpen: boolean;
  toggleSidebar: () => void;
}

type LLMType = "openai" | "ollama";

interface APIConfig {
  id: string;
  name: string;
  type: LLMType;
  baseUrl: string;
  model: string;
  apiKey?: string;
}

const DEFAULT_DEEPSEEK_CONFIG: APIConfig = {
  id: "deepseek_default",
  name: "【1】deepseek-v3.1",
  type: "openai",
  baseUrl: "https://narratiumshop.com/v1/",
  model: "deepseek-v3",
  apiKey: "sk-InlD6F9uJ9TpVzDZ7b14D7985e0b4d8a886b440a7eBf99B9",
};

const DEFAULT_GEMINI_CONFIG: APIConfig = {
  id: "gemini_default",
  name: "【1】gemini-pro",
  type: "openai",
  baseUrl: "https://narratiumshop.com/v1/",
  model: "gemini-pro",
  apiKey: "sk-MOtotVWt8bZoESmZD48c8fCc6b3447CfA60cAbBd3bA9573c",
};

export default function ModelSidebar({ isOpen, toggleSidebar }: ModelSidebarProps) {
  const { t, fontClass, serifFontClass } = useLanguage();
  
  const [configs, setConfigs] = useState<APIConfig[]>([]);
  const [activeConfigId, setActiveConfigId] = useState<string>("");
  const [showNewConfigForm, setShowNewConfigForm] = useState(false);
  
  const [llmType, setLlmType] = useState<LLMType>("openai");
  const [baseUrl, setBaseUrl] = useState("");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [openaiModelList, setOpenaiModelList] = useState<string[]>([]);
  
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [getModelListSuccess, setGetModelListSuccess] = useState(false);
  const [getModelListError, setGetModelListError] = useState(false);

  const [modelListEmpty, setModelListEmpty] = useState(false);
  
  const ollamaModelOptions = [
    "llama3.3:8b",
    "llama3.3:70b",
    "qwen2.5:7b",
    "mistral-nemo",
  ];

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
  
    let hasDeepSeek = mergedConfigs.some((c) => c.id === DEFAULT_DEEPSEEK_CONFIG.id);
    let firstInit = false;
    
    if (!hasDeepSeek) {
      mergedConfigs = [...mergedConfigs, DEFAULT_DEEPSEEK_CONFIG];
      firstInit = true;
    }
    
    let hasGemini = mergedConfigs.some((c) => c.id === DEFAULT_GEMINI_CONFIG.id);
    if (!hasGemini) {
      mergedConfigs = [...mergedConfigs, DEFAULT_GEMINI_CONFIG];
      firstInit = true;
    }
    
    if (firstInit) {
      localStorage.setItem("apiConfigs", JSON.stringify(mergedConfigs));
    }
  
    const storedActiveId = localStorage.getItem("activeConfigId");
    const activeIdCandidate = storedActiveId && mergedConfigs.some((c) => c.id === storedActiveId)
      ? storedActiveId
      : DEFAULT_DEEPSEEK_CONFIG.id;
  
    setConfigs(mergedConfigs);
    setActiveConfigId(activeIdCandidate);

    if (firstInit || !storedActiveId) {
      localStorage.setItem("activeConfigId", DEFAULT_DEEPSEEK_CONFIG.id);
      localStorage.setItem("llmType", DEFAULT_DEEPSEEK_CONFIG.type);
      localStorage.setItem(
        DEFAULT_DEEPSEEK_CONFIG.type === "openai" ? "openaiBaseUrl" : "ollamaBaseUrl",
        DEFAULT_DEEPSEEK_CONFIG.baseUrl,
      );
      localStorage.setItem(
        DEFAULT_DEEPSEEK_CONFIG.type === "openai" ? "openaiModel" : "ollamaModel",
        DEFAULT_DEEPSEEK_CONFIG.model,
      );
      if (DEFAULT_DEEPSEEK_CONFIG.type === "openai") {
        localStorage.setItem("openaiApiKey", DEFAULT_DEEPSEEK_CONFIG.apiKey || "");
        localStorage.setItem("apiKey", DEFAULT_DEEPSEEK_CONFIG.apiKey || "");
      }
      localStorage.setItem("modelBaseUrl", DEFAULT_DEEPSEEK_CONFIG.baseUrl);
      localStorage.setItem("modelName", DEFAULT_DEEPSEEK_CONFIG.model);
      loadConfigToForm(DEFAULT_DEEPSEEK_CONFIG);
    } else {
      loadConfigToForm(mergedConfigs.find((c) => c.id === activeIdCandidate)!);
    }
  }, []);
  
  const loadConfigToForm = (config: APIConfig) => {
    setLlmType(config.type);
    setBaseUrl(config.baseUrl);
    setModel(config.model);
    setApiKey(config.apiKey || "");
    if (config.baseUrl && config.apiKey) {
      handleGetModelList(config.baseUrl, config.apiKey);
    }
  };

  const generateId = () => `api_${Date.now()}`;

  const handleCreateConfig = () => {
    setLlmType("openai");
    setBaseUrl("");
    setModel("");
    setApiKey("");
    setShowNewConfigForm(true);
    setActiveConfigId("");
  };
  
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

  const handleSwitchConfig = (id: string) => {
    if (id === activeConfigId) return;
    
    setActiveConfigId(id);
    const selectedConfig = configs.find(config => config.id === id);
    if (selectedConfig) {
      loadConfigToForm(selectedConfig);
      localStorage.setItem("activeConfigId", id);
      setShowNewConfigForm(false);
    }
  };

  const handleGetModelList = async (baseUrl: string, apiKey: string) => {
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
  
  return (
    <div
      className={`h-full magic-border border-l border-[#534741] breathing-bg text-[#d0d0d0] transition-all duration-300 overflow-hidden ${isOpen ? "w-64" : "w-0"
      }`}
    >
      <div className={`w-64 h-full ${isOpen ? "opacity-100" : "opacity-0"} transition-opacity duration-300 overflow-y-auto fantasy-scrollbar`}>
        <div className="flex justify-between items-center p-4 border-b border-[#534741]">
          <h1 className={`text-xl magical-text ${serifFontClass}`}>{t("modelSettings.title")}</h1>
          <button
            onClick={() => {trackButtonClick("ModelSidebar", "关闭模型设置"); toggleSidebar();}}
            className="w-8 h-8 flex items-center justify-center text-[#f4e8c1] bg-[#1c1c1c] rounded-lg border border-[#333333] shadow-inner transition-all duration-300 hover:bg-[#252525] hover:border-[#444444] hover:text-amber-400 hover:shadow-[0_0_8px_rgba(251,146,60,0.4)]"
            aria-label="收起模型设置"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>
        <div className="p-4">
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <label className={`text-[#f4e8c1] text-sm font-medium ${fontClass}`}>
                {t("modelSettings.configurations") || "API Configurations"}
              </label>
              <button 
                onClick={(e) => {trackButtonClick("ModelSidebar", "创建新配置"); handleCreateConfig();}}
                className="text-xs text-[#d1a35c] hover:text-[#f4e8c1] transition-colors"
              >
                + {t("modelSettings.newConfig") || "New Config"}
              </button>
            </div>
            
            {configs.length > 0 && (
              <div className="mb-3 flex flex-col gap-2 max-h-50 overflow-y-auto fantasy-scrollbar pr-1">
                {configs.map(config => (
                  <div 
                    key={config.id} 
                    className={`flex items-center justify-between p-2 rounded cursor-pointer ${activeConfigId === config.id ? "bg-[#3a3632] border border-[#d1a35c]" : "bg-[#292929] hover:bg-[#333333]"}`}
                    onClick={() => handleSwitchConfig(config.id)}
                  >
                    <div className="flex items-center">
                      <span className="text-sm">{config.name}</span>
                      <span className="ml-2 text-xs text-[#8a8a8a]">{config.type}</span>
                    </div>
                    <button 
                      onClick={(e) => { trackButtonClick("ModelSidebar", "删除配置"); e.stopPropagation(); handleDeleteConfig(config.id); }}
                      className="text-red-400 hover:text-red-300 text-sm p-1"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!showNewConfigForm && activeConfigId && (
            <div className="border border-[#534741] rounded p-3 mb-4">
              <div className="mb-2">
                <span className="text-[#8a8a8a] text-xs">{t("modelSettings.llmType") || "API Type"}:</span>
                <span className="ml-2 text-[#f4e8c1]">{llmType === "openai" ? "OpenAI API" : "Ollama API"}</span>
              </div>
              <div className="mb-2">
                <span className="text-[#8a8a8a] text-xs">{t("modelSettings.baseUrl") || "Base URL"}:</span>
                <span className="ml-2 text-[#f4e8c1] text-xs break-all">
                  {baseUrl.includes("://") ? "http://api-server/v1" : baseUrl}
                </span>
              </div>
              {llmType === "openai" && (
                <div className="mb-2">
                  <span className="text-[#8a8a8a] text-xs">{t("modelSettings.apiKey") || "API Key"}:</span>
                  <span className="ml-2 text-[#f4e8c1]">{"•".repeat(Math.min(10, apiKey.length))}</span>
                </div>
              )}
              <div className="mb-2">
                <label className="text-[#8a8a8a] text-xs mr-2">{t("modelSettings.model") || "Model"}:</label>
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
                  className="bg-[#292929] border border-[#534741] rounded py-1 px-2 text-[#f4e8c1] text-xs max-w-[200px] truncate"
                  style={{ textOverflow: "ellipsis" }}
                >
                  <option value="" disabled className="truncate">{t("modelSettings.selectModel") || "Select a model..."}</option>
                  {(llmType === "openai" ? openaiModelList : ollamaModelOptions).map((option) => (
                    <option key={option} value={option} className="truncate">{option}</option>
                  ))}
                </select>
                {modelListEmpty && (
                  <p className="mt-2 text-xs text-red-400">
                    {t("modelSettings.modelListUnavailable")}
                  </p>
                )}
              </div>
            </div>
          )}

          {showNewConfigForm && (
            <div className="mb-4">
              <div className="mb-4">
                <label className={`block text-[#f4e8c1] text-sm font-medium mb-2 ${fontClass}`}>
                  {t("modelSettings.llmType") || "API Type"}
                </label>
                <select
                  value={llmType}
                  onChange={(e) => {
                    setLlmType(e.target.value as LLMType);
                  }}
                  className="w-full bg-[#292929] border border-[#534741] rounded py-2 px-3 text-[#d0d0d0] text-sm leading-tight focus:outline-none focus:border-[#d1a35c] transition-colors"
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
                  className="bg-[#292929] border border-[#534741] rounded w-full py-2 px-3 text-[#d0d0d0] leading-tight focus:outline-none focus:border-[#d1a35c] transition-colors"
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
                    className="bg-[#292929] border border-[#534741] rounded w-full py-2 px-3 text-[#d0d0d0] leading-tight focus:outline-none focus:border-[#d1a35c] transition-colors"
                    placeholder="sk-..."
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                </div>
              )}

              <div className="mb-4">
                <div className="relative">
                  <button 
                    className={`bg-[#3e3a3a] hover:bg-[#534741] text-[#f4e8c1] font-normal py-1.5 px-3 text-sm rounded-md border border-[#d1a35c] w-full transition-colors magical-text ${fontClass}`} 
                    onClick={() => handleGetModelList(baseUrl, apiKey)}
                  >{t("modelSettings.getModelList") || "Get Model List"}</button>
                  
                  {getModelListSuccess && (
                    <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-[#333333] bg-opacity-80 rounded transition-opacity">
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-500 mr-2 animate-pulse" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                        <span className={`text-white text-xs ${fontClass}`}>
                          {t("modelSettings.getModelListSuccess") || "Get Model List Success"}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {getModelListError && (
                    <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-[#333333] bg-opacity-80 rounded transition-opacity">
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500 mr-2 animate-pulse" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                        <span className={`text-white text-xs ${fontClass}`}>
                          {t("modelSettings.getModelListError") || "Get Model List Error"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="model" className={`block text-[#f4e8c1] text-sm font-medium mb-2 ${fontClass}`}>
                  {t("modelSettings.model")}
                </label>
                <input
                  type="text"
                  id="model"
                  className="bg-[#292929] border border-[#534741] rounded w-full py-2 px-3 text-[#d0d0d0] leading-tight focus:outline-none focus:border-[#d1a35c] transition-colors"
                  placeholder={llmType === "openai" ? "gpt-4-turbo, claude-3-opus-20240229..." : "llama3, mistral, mixtral..."}
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                />
                <div className="mt-2 text-xs text-[#8a8a8a]">
                  <p className={`mb-1 ${fontClass}`}>{t("modelSettings.modelList") || "Model List"}</p>
                  <select
                    value={model}
                    onChange={(e) => {
                      trackButtonClick("ModelSidebar", t("modelSettings.selectModel") || "Select a model...");
                      setModel(e.target.value);
                    }}
                    className="w-full bg-[#292929] border border-[#534741] rounded py-2 px-3 text-[#d0d0d0] text-sm leading-tight focus:outline-none focus:border-[#d1a35c] transition-colors"
                  >
                    <option value="" disabled className="text-[#8a8a8a]">
                      {t("modelSettings.selectModel") || "Select a model..."}
                    </option>
                    {(llmType === "openai" ? openaiModelList : ollamaModelOptions).map((option) => (
                      <option
                        key={option}
                        value={option}
                        className="bg-[#292929] text-[#d0d0d0]"
                      >
                        {option}
                      </option>
                    ))}
                  </select>
                  {modelListEmpty && (
                    <p className="mt-2 text-xs text-red-400">
                      {t("modelSettings.modelListUnavailable")}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={(e) => {trackButtonClick("ModelSidebar", "创建配置"); e.stopPropagation(); handleSave();}}
                  className={`flex-1 bg-[#3e3a3a] hover:bg-[#534741] text-[#f4e8c1] font-medium py-2 px-4 rounded border border-[#d1a35c] transition-colors magical-text ${fontClass}`}
                >
                  {t("modelSettings.createConfig") || "Create Configuration"}
                </button>
                <button
                  onClick={() => {trackButtonClick("cancel_create_config_btn", "取消创建配置"); handleCancelCreate();}}
                  className={`px-3 py-2 bg-[#292929] text-[#d0d0d0] rounded border border-[#534741] hover:bg-[#333333] transition-colors ${fontClass}`}
                >
                  {t("common.cancel") || "Cancel"}
                </button>
              </div>
            </div>
          )}

          {!showNewConfigForm && activeConfigId && (
            <div className="relative">
              <button
                onClick={(e) => {trackButtonClick("ModelSidebar", "保存配置"); e.stopPropagation(); handleSave();}}
                className={`bg-[#3e3a3a] hover:bg-[#534741] text-[#f4e8c1] font-normal py-1.5 px-3 text-sm rounded-md border border-[#d1a35c] w-full transition-colors magical-text ${fontClass}`}
              >
                {t("modelSettings.saveSettings") || "Save Settings"}
              </button>

              {saveSuccess && (
                <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center bg-[#333333] bg-opacity-80 rounded transition-opacity">
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className={`text-white ${fontClass}`}>
                      {t("modelSettings.settingsSaved") || "Settings Saved"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {configs.length === 0 && !showNewConfigForm && (
            <div className="text-center py-4">
              <p className="text-[#8a8a8a] mb-3 text-sm">
                {t("modelSettings.noConfigs") || "No API configurations yet"}
              </p>
              <button
                onClick={(e) => { trackButtonClick("ModelSidebar", "创建第一个配置"); e.stopPropagation(); handleCreateConfig(); }}
                className={`bg-[#3e3a3a] hover:bg-[#534741] text-[#f4e8c1] font-normal py-1.5 px-3 text-sm rounded border border-[#d1a35c] transition-colors ${fontClass}`}
              >
                {t("modelSettings.createFirstConfig") || "Create Your First Configuration"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
