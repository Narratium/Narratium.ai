/**
 * Plugin Registry - SillyTavern-style plugin management system
 * 
 * Provides comprehensive plugin management with:
 * - Auto-discovery and dynamic loading
 * - Lifecycle hooks (onLoad, onEnable, onDisable, etc.)
 * - UI injection capabilities
 * - WebSocket hooks
 * - Hot-reloading support
 * - Message modification chains
 */

import { 
  Plugin, 
  PluginAPI, 
  PluginManifest, 
  PluginRegistryEntry, 
  PluginLoadResult,
  PluginEvent,
  PluginEventData,
  PluginCategory,
  PluginContext,
  MessageContext,
  CustomButton,
  UIComponent,
  SettingsTab,
  WSHook,
  WSHookContext,
  PluginStats,
  PluginDiscoveryResult,
  PluginOperationResult,
} from "./plugin-types";
import { ToolRegistry } from "../tools/tool-registry";
import { pluginDiscovery } from "./plugin-discovery";

/**
 * Plugin Registry with SillyTavern-like features
 */
export class PluginRegistry {
  private static instance: PluginRegistry;
  private plugins: Map<string, PluginRegistryEntry> = new Map();
  private initialized = false;
  private eventEmitter = new PluginEventEmitter();
  
  // UI injection maps
  private registeredButtons: Map<string, CustomButton> = new Map();
  private registeredComponents: Map<string, UIComponent> = new Map();
  private registeredSettingsTabs: Map<string, SettingsTab> = new Map();
  
  // WebSocket hooks
  private wsHooksBeforeSend: WSHook[] = [];
  private wsHooksAfterReceive: WSHook[] = [];
  
  // Message modification chains
  private messageModifiers: Array<(message: MessageContext) => MessageContext> = [];
  
  private constructor() {
    // Plugin API will be created per plugin as needed
  }

  static getInstance(): PluginRegistry {
    if (!PluginRegistry.instance) {
      PluginRegistry.instance = new PluginRegistry();
    }
    return PluginRegistry.instance;
  }

  /**
   * Initialize the enhanced plugin system
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    console.log("🔌 Initializing Enhanced Plugin Registry...");

    try {
      // Initialize tool registry
      ToolRegistry.initialize();
      
      // Discover plugins
      const discovery = await pluginDiscovery.discoverPlugins();
      console.log(`🔍 Discovery complete: ${discovery.found.length} plugins found`);
      
      // Load enabled plugins
      for (const manifest of discovery.found) {
        if (manifest.enabled) {
          await this.loadPlugin(manifest.id);
        }
      }
      
      this.initialized = true;
      console.log("✅ Enhanced Plugin Registry initialized");
      
      // Expose to global scope for debugging
      (window as any).enhancedPluginRegistry = this;
      (window as any).pluginRegistry = this;
      (window as any).ToolRegistry = ToolRegistry;
      
    } catch (error) {
      console.error("❌ Failed to initialize Enhanced Plugin Registry:", error);
      throw error;
    }
  }

  /**
   * Load a plugin by ID
   */
  async loadPlugin(pluginId: string): Promise<PluginLoadResult> {
    console.log(`📦 Loading plugin: ${pluginId}`);
    
    const result = await pluginDiscovery.loadPlugin(pluginId, this.createAPI(pluginId));
    
    if (result.success && result.plugin) {
      const entry: PluginRegistryEntry = {
        plugin: result.plugin,
        manifest: result.manifest!,
        enabled: false,
        initialized: false,
        loaded: true,
        context: result.plugin.context,
        loadTime: new Date(),
      };
      
      this.plugins.set(pluginId, entry);
      
      // Enable plugin if it should be enabled
      if (result.manifest?.enabled) {
        await this.enablePlugin(pluginId);
      }
      
      this.eventEmitter.emit(PluginEvent.LOAD, {
        pluginId,
        event: PluginEvent.LOAD,
        timestamp: new Date(),
      });
    }
    
    return result;
  }

  /**
   * Enable a plugin
   */
  async enablePlugin(pluginId: string): Promise<PluginOperationResult> {
    console.log(`🔌 Enabling plugin: ${pluginId}`);
    
    const entry = this.plugins.get(pluginId);
    if (!entry) {
      return { success: false, error: `Plugin ${pluginId} not found` };
    }
    
    if (entry.enabled) {
      return { success: true, message: `Plugin ${pluginId} already enabled` };
    }
    
    try {
      // Call onEnable hook
      if (entry.plugin.onEnable && entry.context) {
        await entry.plugin.onEnable(entry.context);
      }
      
      entry.enabled = true;
      entry.initialized = true;
      
      // Save configuration
      this.saveConfiguration();
      
      this.eventEmitter.emit(PluginEvent.ENABLE, {
        pluginId,
        event: PluginEvent.ENABLE,
        timestamp: new Date(),
      });
      
      console.log(`✅ Plugin enabled: ${pluginId}`);
      return { success: true, message: `Plugin ${pluginId} enabled successfully` };
      
    } catch (error) {
      console.error(`❌ Failed to enable plugin ${pluginId}:`, error);
      entry.error = error instanceof Error ? error.message : "Enable failed";
      return { success: false, error: entry.error };
    }
  }

  /**
   * Disable a plugin
   */
  async disablePlugin(pluginId: string): Promise<PluginOperationResult> {
    console.log(`🔌 Disabling plugin: ${pluginId}`);
    
    const entry = this.plugins.get(pluginId);
    if (!entry) {
      return { success: false, error: `Plugin ${pluginId} not found` };
    }
    
    if (!entry.enabled) {
      return { success: true, message: `Plugin ${pluginId} already disabled` };
    }
    
    try {
      // Call onDisable hook
      if (entry.plugin.onDisable && entry.context) {
        await entry.plugin.onDisable(entry.context);
      }
      
      entry.enabled = false;
      
      // Save configuration
      this.saveConfiguration();
      
      this.eventEmitter.emit(PluginEvent.DISABLE, {
        pluginId,
        event: PluginEvent.DISABLE,
        timestamp: new Date(),
      });
      
      console.log(`✅ Plugin disabled: ${pluginId}`);
      return { success: true, message: `Plugin ${pluginId} disabled successfully` };
      
    } catch (error) {
      console.error(`❌ Failed to disable plugin ${pluginId}:`, error);
      entry.error = error instanceof Error ? error.message : "Disable failed";
      return { success: false, error: entry.error };
    }
  }

  /**
   * Process message through all enabled plugins
   */
  async processMessage(message: MessageContext): Promise<MessageContext> {
    let processedMessage = message;
    
    // Apply message modifiers
    for (const modifier of this.messageModifiers) {
      try {
        processedMessage = modifier(processedMessage);
      } catch (error) {
        console.error("❌ Error in message modifier:", error);
      }
    }
    
    // Call onMessage hooks for enabled plugins
    for (const entry of this.plugins.values()) {
      if (entry.enabled && entry.plugin.onMessage && entry.context) {
        try {
          processedMessage = await entry.plugin.onMessage(processedMessage, entry.context);
        } catch (error) {
          console.error(`❌ Error in onMessage hook for ${entry.manifest.id}:`, error);
        }
      }
    }
    
    return processedMessage;
  }

  /**
   * Process response through all enabled plugins
   */
  async processResponse(message: MessageContext): Promise<MessageContext> {
    let processedMessage = message;
    
    // Call onResponse hooks for enabled plugins
    for (const entry of this.plugins.values()) {
      if (entry.enabled && entry.plugin.onResponse && entry.context) {
        try {
          processedMessage = await entry.plugin.onResponse(processedMessage, entry.context);
        } catch (error) {
          console.error(`❌ Error in onResponse hook for ${entry.manifest.id}:`, error);
        }
      }
    }
    
    return processedMessage;
  }

  /**
   * Process WebSocket data before sending
   */
  async processWSBeforeSend(context: WSHookContext): Promise<WSHookContext> {
    let processedContext = context;
    
    for (const hook of this.wsHooksBeforeSend) {
      try {
        processedContext = await hook(processedContext);
      } catch (error) {
        console.error("❌ Error in WebSocket before-send hook:", error);
      }
    }
    
    return processedContext;
  }

  /**
   * Process WebSocket data after receiving
   */
  async processWSAfterReceive(context: WSHookContext): Promise<WSHookContext> {
    let processedContext = context;
    
    for (const hook of this.wsHooksAfterReceive) {
      try {
        processedContext = await hook(processedContext);
      } catch (error) {
        console.error("❌ Error in WebSocket after-receive hook:", error);
      }
    }
    
    return processedContext;
  }

  /**
   * Get plugin statistics
   */
  getStats(): PluginStats {
    const plugins = Array.from(this.plugins.values());
    const categories: Record<PluginCategory, number> = {
      [PluginCategory.TOOL]: 0,
      [PluginCategory.UI]: 0,
      [PluginCategory.WORKFLOW]: 0,
      [PluginCategory.UTILITY]: 0,
      [PluginCategory.INTEGRATION]: 0,
      [PluginCategory.EXTENSION]: 0,
    };
    
    plugins.forEach(entry => {
      categories[entry.manifest.category as PluginCategory]++;
    });
    
    return {
      totalPlugins: plugins.length,
      enabledPlugins: plugins.filter(p => p.enabled).length,
      disabledPlugins: plugins.filter(p => !p.enabled).length,
      loadedPlugins: plugins.filter(p => p.loaded).length,
      failedPlugins: plugins.filter(p => p.error).length,
      categories,
      lastUpdateTime: new Date(),
    };
  }

  /**
   * Get all plugins
   */
  getPlugins(): PluginRegistryEntry[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get plugin info (alias for backward compatibility)
   */
  getPluginInfo(): PluginRegistryEntry[] {
    return this.getPlugins();
  }

  /**
   * Execute a tool by name (for backward compatibility with test scripts)
   */
  async executeTool(toolName: string, params: Record<string, any>): Promise<any> {
    try {
      // Get the tool from ToolRegistry
      const tool = ToolRegistry.getTool(toolName);
      
      if (!tool) {
        return {
          success: false,
          error: `Tool ${toolName} not found`,
        };
      }
      
      // Create a mock execution context
      const mockContext = {
        session_id: "plugin-test",
        generation_output: {
          character_data: {
            name: "",
            description: "",
            personality: "",
            scenario: "",
            first_mes: "",
            mes_example: "",
            creator_notes: "",
          },
          status_data: undefined,
          user_setting_data: undefined,
          world_view_data: undefined,
          supplement_data: [],
        },
        research_state: {
          id: "test-research",
          session_id: "plugin-test",
          main_objective: "Plugin tool testing",
          task_queue: [],
          completed_tasks: [],
          knowledge_base: [],
        },
        message_history: [],
      };
      
      // Execute the tool
      const result = await tool.execute(mockContext, params);
      
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Get enabled plugins
   */
  getEnabledPlugins(): PluginRegistryEntry[] {
    return Array.from(this.plugins.values()).filter(entry => entry.enabled);
  }

  /**
   * Get registered UI components
   */
  getRegisteredButtons(): CustomButton[] {
    return Array.from(this.registeredButtons.values());
  }

  getRegisteredComponents(): UIComponent[] {
    return Array.from(this.registeredComponents.values());
  }

  getRegisteredSettingsTabs(): SettingsTab[] {
    return Array.from(this.registeredSettingsTabs.values());
  }

  /**
   * Event system
   */
  on(event: PluginEvent | string, callback: (data?: PluginEventData) => void): void {
    this.eventEmitter.on(event, callback);
  }

  emit(event: PluginEvent | string, data?: PluginEventData): void {
    this.eventEmitter.emit(event, data);
  }

  /**
   * Create Plugin API instance for a specific plugin
   */
  createAPI(pluginId: string): PluginAPI {
    return {
      // Tool registration
      registerTool: (toolId: string, tool: any) => {
        // Create a SimpleTool wrapper for the plugin tool
        const simpleTool = {
          name: tool.name || toolId,
          description: tool.description || "Plugin tool",
          toolType: tool.toolType || "SUPPLEMENT" as any,
          parameters: tool.parameters || [],
          execute: tool.execute || (async () => ({ success: false, error: "Tool not implemented" })),
        };
        
        // Override the constructor name to match the toolId
        Object.defineProperty(simpleTool, "constructor", {
          value: { name: toolId },
        });
        
        ToolRegistry.registerDynamicTool(simpleTool as any);
      },
      unregisterTool: (toolId: string) => {
        ToolRegistry.unregisterDynamicTool(toolId);
      },
      
      // UI injection
      registerButton: (button: CustomButton) => {
        this.registeredButtons.set(button.id, button);
      },
      unregisterButton: (buttonId: string) => {
        this.registeredButtons.delete(buttonId);
      },
      registerUIComponent: (component: UIComponent) => {
        this.registeredComponents.set(component.id, component);
      },
      unregisterUIComponent: (componentId: string) => {
        this.registeredComponents.delete(componentId);
      },
      registerSettingsTab: (tab: SettingsTab) => {
        this.registeredSettingsTabs.set(tab.id, tab);
      },
      unregisterSettingsTab: (tabId: string) => {
        this.registeredSettingsTabs.delete(tabId);
      },
      
      // WebSocket hooks
      addWSHookBeforeSend: (hook: WSHook) => {
        this.wsHooksBeforeSend.push(hook);
      },
      addWSHookAfterReceive: (hook: WSHook) => {
        this.wsHooksAfterReceive.push(hook);
      },
      removeWSHook: (hookId: string) => {
        // Implementation depends on hook identification system
      },
      
      // Message modification
      addChatMessageModifier: (modifier: (message: MessageContext) => MessageContext) => {
        this.messageModifiers.push(modifier);
      },
      removeChatMessageModifier: (modifierId: string) => {
        // Implementation depends on modifier identification system
      },
      
      // Configuration
      getConfig: () => this.getConfiguration(),
      setConfig: (config: Record<string, any>) => this.setConfiguration(config),
      updateConfig: (updates: Record<string, any>) => this.updateConfiguration(updates),
      
      // Notifications
      showNotification: (message: string, type?: "info" | "success" | "warning" | "error") => {
        console.log(`📢 Plugin Notification [${type || "info"}]: ${message}`);
        // TODO: Integrate with actual notification system
      },
      
      // Logging
      log: (message: string, level?: "debug" | "info" | "warn" | "error") => {
        console.log(`🔌 Plugin Log [${level || "info"}]: ${message}`);
      },
      
      // Storage
      getStorage: (key: string) => localStorage.getItem(`plugin_${key}`),
      setStorage: (key: string, value: any) => localStorage.setItem(`plugin_${key}`, JSON.stringify(value)),
      removeStorage: (key: string) => localStorage.removeItem(`plugin_${key}`),
      
      // System integration
      getSystemInfo: () => ({
        version: "1.0.0",
        platform: navigator.platform,
        userAgent: navigator.userAgent,
      }),
      getCurrentCharacter: () => ({}), // TODO: Implement
      getCurrentConversation: () => ({}), // TODO: Implement
      
      // Event system
      emit: (event: string, data?: any) => this.eventEmitter.emit(event, data),
      on: (event: string, callback: (data: any) => void) => this.eventEmitter.on(event, callback),
      off: (event: string, callback: (data: any) => void) => this.eventEmitter.off(event, callback),
    };
  }

  /**
   * Configuration management
   */
  private getConfiguration(): Record<string, any> {
    try {
      const config = localStorage.getItem("enhanced-plugin-config");
      return config ? JSON.parse(config) : {};
    } catch (error) {
      console.error("❌ Failed to load plugin configuration:", error);
      return {};
    }
  }

  private setConfiguration(config: Record<string, any>): void {
    try {
      localStorage.setItem("enhanced-plugin-config", JSON.stringify(config));
    } catch (error) {
      console.error("❌ Failed to save plugin configuration:", error);
    }
  }

  private updateConfiguration(updates: Record<string, any>): void {
    const config = this.getConfiguration();
    Object.assign(config, updates);
    this.setConfiguration(config);
  }

  private saveConfiguration(): void {
    const config: Record<string, any> = {};
    
    for (const [pluginId, entry] of this.plugins) {
      config[pluginId] = {
        enabled: entry.enabled,
        settings: entry.context?.config || {},
      };
    }
    
    this.setConfiguration(config);
  }
}

/**
 * Simple event emitter for plugin system
 */
class PluginEventEmitter {
  private listeners: Map<string, ((data?: any) => void)[]> = new Map();

  on(event: string, callback: (data?: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  emit(event: string, data?: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  off(event: string, callback: (data?: any) => void): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }
}

// Export singleton instance
export const pluginRegistry = PluginRegistry.getInstance(); 
 
