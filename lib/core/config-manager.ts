/**
 * LLM Configuration interface
 */
export interface LLMConfig {
  model_name: string;
  api_key: string;
  base_url?: string;
  llm_type: "openai" | "ollama";
  temperature: number;
  max_tokens?: number;
  tavily_api_key?: string;
  jina_api_key?: string;
  fal_api_key?: string;
}

/**
 * Application configuration interface
 */
export interface AppConfig {
  defaultModel?: string;
  defaultApiKey?: string;
  defaultBaseUrl?: string;
  defaultType?: "openai" | "ollama";
  temperature?: number;
  maxTokens?: number;
  tavilyApiKey?: string;
  jinaApiKey?: string;
  falApiKey?: string;
}

/**
 * Configuration Manager
 * Provides centralized access to configuration without file system dependencies
 * Configuration is now passed as parameters from external sources (e.g., localStorage)
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig = {};

  private constructor() {}

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Set configuration from external source (e.g., localStorage)
   * @param config Configuration object from external source
   */
  setConfig(config: AppConfig): void {
    this.config = { ...config };
  }

  /**
   * Get LLM configuration for tool execution
   * Combines defaults with command line overrides
   */
  getLLMConfig(overrides?: {
    model?: string;
    apiKey?: string;
    baseUrl?: string;
    type?: "openai" | "ollama";
  }): LLMConfig {
    const llmType = overrides?.type || this.config.defaultType || "openai";
    const model = overrides?.model || this.config.defaultModel;
    const apiKey = overrides?.apiKey || this.config.defaultApiKey;
    const baseUrl = overrides?.baseUrl || this.config.defaultBaseUrl;

    if (!model) {
      throw new Error("LLM model not configured. Please configure your AI model settings.");
    }

    if (llmType === "openai" && !apiKey) {
      throw new Error("OpenAI API key not configured. Please configure your API key.");
    }

    return {
      llm_type: llmType,
      model_name: model,
      api_key: apiKey || "",
      base_url: baseUrl || (llmType === "ollama" ? "http://localhost:11434" : undefined),
      temperature: this.config.temperature || 0.7,
      max_tokens: this.config.maxTokens || 4000,
      tavily_api_key: this.config.tavilyApiKey || "",
      jina_api_key: this.config.jinaApiKey || "",
      fal_api_key: this.config.falApiKey || "",
    };
  }

  /**
   * Check if configuration is complete
   */
  isConfigured(): boolean {
    const hasBasicConfig = !!(this.config.defaultType && this.config.defaultModel);
    const hasApiKey = this.config.defaultType === "ollama" || !!this.config.defaultApiKey;
    
    return hasBasicConfig && hasApiKey;
  }
}

/**
 * Utility functions for Web environment
 * These functions should be used to bridge localStorage and ConfigManager
 */

/**
 * Load configuration from localStorage
 * This function should be called from the UI layer
 */
export function loadConfigFromLocalStorage(): AppConfig {
  if (typeof window === "undefined") {
    // Server-side rendering or Node.js environment
    return {};
  }

  try {
    const llmType = localStorage.getItem("llmType") as "openai" | "ollama" | null;
    const openaiModel = localStorage.getItem("openaiModel");
    const ollamaModel = localStorage.getItem("ollamaModel");
    const openaiApiKey = localStorage.getItem("openaiApiKey");
    const openaiBaseUrl = localStorage.getItem("openaiBaseUrl");
    const ollamaBaseUrl = localStorage.getItem("ollamaBaseUrl");
    const temperature = localStorage.getItem("temperature");
    const maxTokens = localStorage.getItem("maxTokens");
    const tavilyApiKey = localStorage.getItem("tavilyApiKey");
    const jinaApiKey = localStorage.getItem("jinaApiKey");
    const falApiKey = localStorage.getItem("falApiKey");

    return {
      defaultType: llmType || "openai",
      defaultModel: llmType === "openai" ? openaiModel || "" : ollamaModel || "",
      defaultApiKey: openaiApiKey || "",
      defaultBaseUrl: llmType === "openai" ? openaiBaseUrl || "" : ollamaBaseUrl || "",
      temperature: temperature ? parseFloat(temperature) : 0.7,
      maxTokens: maxTokens ? parseInt(maxTokens) : 4000,
      tavilyApiKey: tavilyApiKey || "",
      jinaApiKey: jinaApiKey || "",
      falApiKey: falApiKey || "",
    };
  } catch (error) {
    console.warn("Failed to load configuration from localStorage:", error);
    return {};
  }
}

/**
 * Save configuration to localStorage
 * This function should be called from the UI layer when configuration changes
 */
export function saveConfigToLocalStorage(config: AppConfig): void {
  if (typeof window === "undefined") {
    console.warn("Cannot save to localStorage in server-side environment");
    return;
  }

  try {
    if (config.defaultType) {
      localStorage.setItem("llmType", config.defaultType);
    }
    
    if (config.defaultModel) {
      const modelKey = config.defaultType === "openai" ? "openaiModel" : "ollamaModel";
      localStorage.setItem(modelKey, config.defaultModel);
    }
    
    if (config.defaultApiKey) {
      localStorage.setItem("openaiApiKey", config.defaultApiKey);
    }
    
    if (config.defaultBaseUrl) {
      const baseUrlKey = config.defaultType === "openai" ? "openaiBaseUrl" : "ollamaBaseUrl";
      localStorage.setItem(baseUrlKey, config.defaultBaseUrl);
    }
    
    if (config.temperature !== undefined) {
      localStorage.setItem("temperature", config.temperature.toString());
    }
    
    if (config.maxTokens !== undefined) {
      localStorage.setItem("maxTokens", config.maxTokens.toString());
    }
    
    if (config.tavilyApiKey !== undefined) {
      localStorage.setItem("tavilyApiKey", config.tavilyApiKey);
    }
    
    if (config.jinaApiKey !== undefined) {
      localStorage.setItem("jinaApiKey", config.jinaApiKey);
    }
    
    if (config.falApiKey !== undefined) {
      localStorage.setItem("falApiKey", config.falApiKey);
    }
  } catch (error) {
    console.error("Failed to save configuration to localStorage:", error);
  }
}
