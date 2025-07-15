/**
 * Plugin System Types - Enhanced with SillyTavern-like features
 * 
 * Comprehensive type definitions for the plugin system with:
 * - Lifecycle hooks (onLoad, onEnable, onDisable, onMessage)
 * - UI injection capabilities
 * - Dynamic plugin discovery
 * - Hot-reloading support
 */

import { SimpleTool } from "../tools/base-tool";
import { ToolType } from "../models/agent-model";

export enum PluginCategory {
  TOOL = "tool",
  UI = "ui", 
  WORKFLOW = "workflow",
  UTILITY = "utility",
  INTEGRATION = "integration",
  EXTENSION = "extension"
}

export enum PluginPermission {
  READ_MESSAGES = "read_messages",
  WRITE_MESSAGES = "write_messages",
  MODIFY_UI = "modify_ui",
  NETWORK_ACCESS = "network_access",
  LOCAL_STORAGE = "local_storage",
  SYSTEM_NOTIFICATIONS = "system_notifications",
  TOOL_REGISTRATION = "tool_registration",
  WEBSOCKET_HOOK = "websocket_hook"
}

export enum PluginEvent {
  LOAD = "load",
  ENABLE = "enable", 
  DISABLE = "disable",
  MESSAGE_SENT = "message_sent",
  MESSAGE_RECEIVED = "message_received",
  TOOL_EXECUTED = "tool_executed",
  UI_RENDERED = "ui_rendered",
  SETTINGS_CHANGED = "settings_changed"
}

/**
 * Plugin manifest structure (similar to SillyTavern)
 */
export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  main: string; // Entry point file (e.g., "main.js")
  icon?: string;
  category: PluginCategory;
  permissions: PluginPermission[];
  dependencies?: string[];
  minVersion?: string;
  maxVersion?: string;
  homepage?: string;
  repository?: string;
  keywords?: string[];
  license?: string;
  enabled?: boolean;
}

/**
 * Plugin context passed to lifecycle hooks
 */
export interface PluginContext {
  pluginId: string;
  pluginPath: string;
  manifest: PluginManifest;
  api: PluginAPI;
  config: Record<string, any>;
  enabled: boolean;
}

/**
 * Message object passed to onMessage hook
 */
export interface MessageContext {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  characterId?: string;
  metadata?: Record<string, any>;
}

/**
 * UI injection types
 */
export interface UIComponent {
  id: string;
  type: "button" | "panel" | "modal" | "toolbar" | "sidebar";
  position: "header" | "footer" | "sidebar" | "chat" | "settings";
  component: React.ComponentType<any>;
  props?: Record<string, any>;
  order?: number;
  visible?: boolean;
}

export interface CustomButton {
  id: string;
  text: string;
  icon?: string;
  onClick: (context: any) => void;
  position: "toolbar" | "message" | "input" | "settings";
  tooltip?: string;
  disabled?: boolean;
  order?: number;
}

export interface SettingsTab {
  id: string;
  title: string;
  icon?: string;
  component: React.ComponentType<any>;
  order?: number;
}

/**
 * WebSocket hook types
 */
export interface WSHookContext {
  type: "send" | "receive";
  data: any;
  timestamp: Date;
  characterId?: string;
}

export type WSHook = (context: WSHookContext) => WSHookContext | Promise<WSHookContext>;

/**
 * Plugin lifecycle hooks (similar to SillyTavern)
 */
export interface PluginLifecycleHooks {
  /**
   * Called when plugin is first loaded
   */
  onLoad?: (context: PluginContext) => void | Promise<void>;
  
  /**
   * Called when plugin is enabled
   */
  onEnable?: (context: PluginContext) => void | Promise<void>;
  
  /**
   * Called when plugin is disabled
   */
  onDisable?: (context: PluginContext) => void | Promise<void>;
  
  /**
   * Called when user sends a message
   */
  onMessage?: (message: MessageContext, context: PluginContext) => MessageContext | Promise<MessageContext>;
  
  /**
   * Called when AI assistant responds
   */
  onResponse?: (message: MessageContext, context: PluginContext) => MessageContext | Promise<MessageContext>;
  
  /**
   * Called when plugin settings are changed
   */
  onSettingsChange?: (settings: Record<string, any>, context: PluginContext) => void | Promise<void>;
  
  /**
   * Called when plugin is unloaded
   */
  onUnload?: (context: PluginContext) => void | Promise<void>;
}

/**
 * Plugin API for interaction with the system
 */
export interface PluginAPI {
  // Tool registration
  registerTool: (toolId: string, tool: any) => void;
  unregisterTool: (toolId: string) => void;
  
  // UI injection
  registerButton: (button: CustomButton) => void;
  unregisterButton: (buttonId: string) => void;
  registerUIComponent: (component: UIComponent) => void;
  unregisterUIComponent: (componentId: string) => void;
  registerSettingsTab: (tab: SettingsTab) => void;
  unregisterSettingsTab: (tabId: string) => void;
  
  // WebSocket hooks
  addWSHookBeforeSend: (hook: WSHook) => void;
  addWSHookAfterReceive: (hook: WSHook) => void;
  removeWSHook: (hookId: string) => void;
  
  // Message modification
  addChatMessageModifier: (modifier: (message: MessageContext) => MessageContext) => void;
  removeChatMessageModifier: (modifierId: string) => void;
  
  // Configuration
  getConfig: () => Record<string, any>;
  setConfig: (config: Record<string, any>) => void;
  updateConfig: (updates: Record<string, any>) => void;
  
  // Notifications
  showNotification: (message: string, type?: "info" | "success" | "warning" | "error") => void;
  
  // Logging
  log: (message: string, level?: "debug" | "info" | "warn" | "error") => void;
  
  // Storage
  getStorage: (key: string) => any;
  setStorage: (key: string, value: any) => void;
  removeStorage: (key: string) => void;
  
  // System integration
  getSystemInfo: () => Record<string, any>;
  getCurrentCharacter: () => any;
  getCurrentConversation: () => any;
  
  // Event system
  emit: (event: string, data?: any) => void;
  on: (event: string, callback: (data: any) => void) => void;
  off: (event: string, callback: (data: any) => void) => void;
}

/**
 * Plugin interface combining hooks and metadata
 */
export interface Plugin extends PluginLifecycleHooks {
  manifest: PluginManifest;
  context?: PluginContext;
  tools?: any[];
  components?: UIComponent[];
  buttons?: CustomButton[];
  settingsTabs?: SettingsTab[];
  wsHooks?: WSHook[];
}

/**
 * Plugin event data
 */
export interface PluginEventData {
  pluginId?: string;
  event?: PluginEvent;
  data?: any;
  timestamp?: Date;
  [key: string]: any;
}

/**
 * Plugin registry entry
 */
export interface PluginRegistryEntry {
  plugin: Plugin;
  manifest: PluginManifest;
  enabled: boolean;
  initialized: boolean;
  loaded: boolean;
  context?: PluginContext;
  error?: string;
  loadTime?: Date;
}

/**
 * Plugin loading result
 */
export interface PluginLoadResult {
  success: boolean;
  plugin?: Plugin;
  error?: string;
  manifest?: PluginManifest;
}

/**
 * Plugin discovery result
 */
export interface PluginDiscoveryResult {
  found: PluginManifest[];
  errors: Array<{
    path: string;
    error: string;
  }>;
}

/**
 * Plugin operation result
 */
export interface PluginOperationResult {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}

/**
 * Plugin configuration schema
 */
export interface PluginConfigSchema {
  [key: string]: {
    type: "string" | "number" | "boolean" | "array" | "object";
    default?: any;
    description?: string;
    required?: boolean;
    enum?: any[];
    min?: number;
    max?: number;
    pattern?: string;
  };
}

/**
 * Plugin statistics
 */
export interface PluginStats {
  totalPlugins: number;
  enabledPlugins: number;
  disabledPlugins: number;
  loadedPlugins: number;
  failedPlugins: number;
  categories: Record<PluginCategory, number>;
  lastUpdateTime: Date;
} 
 
