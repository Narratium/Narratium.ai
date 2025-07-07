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
 * Configuration Manager
 * Provides centralized access to configuration without file system dependencies
 * Configuration is now passed as parameters from external sources (e.g., localStorage)
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private config: LLMConfig = {
    model_name: "",
    api_key: "",
    llm_type: "openai",
    temperature: 0.7,
    max_tokens: 4000,
    tavily_api_key: "",
    jina_api_key: "",
    fal_api_key: "",
  };

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
  setConfig(config: LLMConfig): void {
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
    const llmType = overrides?.type || this.config.llm_type;
    const model = overrides?.model || this.config.model_name;
    const apiKey = overrides?.apiKey || this.config.api_key;
    const baseUrl = overrides?.baseUrl || this.config.base_url;

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
      temperature: this.config.temperature,
      max_tokens: this.config.max_tokens,
      tavily_api_key: this.config.tavily_api_key || "",
      jina_api_key: this.config.jina_api_key || "",
      fal_api_key: this.config.fal_api_key || "",
    };
  }

  /**
   * Check if configuration is complete
   */
  isConfigured(): boolean {
    const hasBasicConfig = !!(this.config.llm_type && this.config.model_name);
    const hasApiKey = this.config.llm_type === "ollama" || !!this.config.api_key;
    
    return hasBasicConfig && hasApiKey;
  }
}

/**
 * Utility functions for Web environment
 * These functions handle localStorage integration for LLM configuration
 */

/**
 * Load configuration from localStorage
 * This function should be called from the UI layer
 */
export function loadConfigFromLocalStorage(): LLMConfig {
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

    const config: LLMConfig = {
      llm_type: llmType || "openai",
      model_name: llmType === "openai" ? openaiModel || "" : ollamaModel || "",
      api_key: openaiApiKey || process.env.OPENAI_API_KEY || "",
      base_url: llmType === "openai" ? openaiBaseUrl || "" : ollamaBaseUrl || "",
      temperature: temperature ? parseFloat(temperature) : 0.7,
      max_tokens: maxTokens ? parseInt(maxTokens) : 4000,
      tavily_api_key: tavilyApiKey || process.env.NEXT_PUBLIC_TAVILY_API_KEY || "",
      jina_api_key: jinaApiKey || process.env.NEXT_PUBLIC_JINA_API_KEY || "",
      fal_api_key: falApiKey || process.env.NEXT_PUBLIC_FAL_API_KEY || "",
    };
    
    // Debug: Log configuration loading
    console.log("Config loaded from localStorage:", {
      tavilyFromStorage: tavilyApiKey ? "***has value***" : "empty",
      tavilyFromEnv: process.env.NEXT_PUBLIC_TAVILY_API_KEY ? "***has value***" : "empty",
      finalTavily: config.tavily_api_key ? "***configured***" : "missing",
    });
    
    return config;
  } catch (error) {
    console.warn("Failed to load configuration from localStorage:", error);
    return {
      llm_type: "openai",
      model_name: "",
      api_key: "",
      temperature: 0.7,
      max_tokens: 4000,
      tavily_api_key: "",
      jina_api_key: "",
      fal_api_key: "",
    };
  }
}

/**
 * Save configuration to localStorage
 * This function should be called from the UI layer when configuration changes
 */
export function saveConfigToLocalStorage(config: LLMConfig): void {
  if (typeof window === "undefined") {
    console.warn("Cannot save to localStorage in server-side environment");
    return;
  }

  try {
    localStorage.setItem("llmType", config.llm_type);
    
    const modelKey = config.llm_type === "openai" ? "openaiModel" : "ollamaModel";
    localStorage.setItem(modelKey, config.model_name);
    
    if (config.api_key) {
      localStorage.setItem("openaiApiKey", config.api_key);
    }
    
    if (config.base_url) {
      const baseUrlKey = config.llm_type === "openai" ? "openaiBaseUrl" : "ollamaBaseUrl";
      localStorage.setItem(baseUrlKey, config.base_url);
    }
    
    localStorage.setItem("temperature", config.temperature.toString());
    
    if (config.max_tokens) {
      localStorage.setItem("maxTokens", config.max_tokens.toString());
    }
    
    if (config.tavily_api_key !== undefined) {
      localStorage.setItem("tavilyApiKey", config.tavily_api_key);
    }
    
    if (config.jina_api_key !== undefined) {
      localStorage.setItem("jinaApiKey", config.jina_api_key);
    }
    
    if (config.fal_api_key !== undefined) {
      localStorage.setItem("falApiKey", config.fal_api_key);
    }
  } catch (error) {
    console.error("Failed to save configuration to localStorage:", error);
  }
}
