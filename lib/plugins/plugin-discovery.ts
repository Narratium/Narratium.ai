/**
 * Plugin Discovery System - Simple Registry-Based
 * 
 * 只从 plugin-registry.json 文件读取插件信息，完全手动管理
 */

import { 
  PluginManifest, 
  PluginDiscoveryResult, 
  Plugin, 
  PluginLoadResult,
  PluginContext,
  PluginAPI,
} from "./plugin-types";

export class PluginDiscovery {
  private static instance: PluginDiscovery;
  private readonly pluginPath = "/plugins"; // Public directory path
  private discoveredPlugins: Map<string, PluginManifest> = new Map();
  private loadedPlugins: Map<string, Plugin> = new Map();

  private constructor() {}

  static getInstance(): PluginDiscovery {
    if (!PluginDiscovery.instance) {
      PluginDiscovery.instance = new PluginDiscovery();
    }
    return PluginDiscovery.instance;
  }

  /**
   * Discover all plugins from plugin-registry.json
   */
  async discoverPlugins(): Promise<PluginDiscoveryResult> {
    console.log("🔍 Discovering plugins from registry...");
    
    const result: PluginDiscoveryResult = {
      found: [],
      errors: [],
    };

    try {
      // 只从 plugin-registry.json 读取插件列表
      const pluginDirs = await this.getPluginDirectoriesFromRegistry();
      
      for (const dir of pluginDirs) {
        try {
          const manifest = await this.loadManifest(dir);
          if (manifest) {
            result.found.push(manifest);
            this.discoveredPlugins.set(manifest.id, manifest);
            console.log(`✅ Discovered plugin: ${manifest.name} (${manifest.id})`);
          }
        } catch (error) {
          console.error(`❌ Failed to load plugin from ${dir}:`, error);
          result.errors.push({
            path: dir,
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      console.log(`🎯 Plugin discovery complete: ${result.found.length} found, ${result.errors.length} errors`);
      return result;
    } catch (error) {
      console.error("❌ Plugin discovery failed:", error);
      result.errors.push({
        path: this.pluginPath,
        error: error instanceof Error ? error.message : "Discovery failed",
      });
      return result;
    }
  }

  /**
   * Load a specific plugin by ID
   */
  async loadPlugin(pluginId: string, api: PluginAPI): Promise<PluginLoadResult> {
    console.log(`📦 Loading plugin: ${pluginId}`);
    
    const manifest = this.discoveredPlugins.get(pluginId);
    if (!manifest) {
      return {
        success: false,
        error: `Plugin ${pluginId} not found`,
      };
    }

    try {
      // Check if already loaded
      if (this.loadedPlugins.has(pluginId)) {
        console.log(`⚠️ Plugin ${pluginId} already loaded`);
        return {
          success: true,
          plugin: this.loadedPlugins.get(pluginId)!,
          manifest,
        };
      }

      // Load the plugin module
      const pluginModule = await this.loadPluginModule(manifest);
      
      // Create plugin context
      const context: PluginContext = {
        pluginId: manifest.id,
        pluginPath: `${this.pluginPath}/${manifest.id}`,
        manifest,
        api,
        config: {},
        enabled: manifest.enabled ?? true,
      };

      // Create plugin instance
      const plugin: Plugin = {
        manifest,
        context,
        ...pluginModule,
      };

      // Call onLoad hook
      if (plugin.onLoad) {
        await plugin.onLoad(context);
      }

      this.loadedPlugins.set(pluginId, plugin);
      console.log(`✅ Plugin loaded: ${manifest.name}`);

      return {
        success: true,
        plugin,
        manifest,
      };
    } catch (error) {
      console.error(`❌ Failed to load plugin ${pluginId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Load failed",
        manifest,
      };
    }
  }

  /**
   * Unload a plugin
   */
  async unloadPlugin(pluginId: string): Promise<boolean> {
    console.log(`🗑️ Unloading plugin: ${pluginId}`);
    
    const plugin = this.loadedPlugins.get(pluginId);
    if (!plugin) {
      console.warn(`⚠️ Plugin ${pluginId} not loaded`);
      return false;
    }

    try {
      // Call onUnload hook
      if (plugin.onUnload && plugin.context) {
        await plugin.onUnload(plugin.context);
      }

      this.loadedPlugins.delete(pluginId);
      console.log(`✅ Plugin unloaded: ${pluginId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to unload plugin ${pluginId}:`, error);
      return false;
    }
  }

  /**
   * Get all discovered plugins
   */
  getDiscoveredPlugins(): PluginManifest[] {
    return Array.from(this.discoveredPlugins.values());
  }

  /**
   * Get all loaded plugins
   */
  getLoadedPlugins(): Plugin[] {
    return Array.from(this.loadedPlugins.values());
  }

  /**
   * Get a specific loaded plugin
   */
  getLoadedPlugin(pluginId: string): Plugin | undefined {
    return this.loadedPlugins.get(pluginId);
  }

  /**
   * Hot reload a plugin
   */
  async reloadPlugin(pluginId: string, api: PluginAPI): Promise<PluginLoadResult> {
    console.log(`🔄 Reloading plugin: ${pluginId}`);
    
    // Unload first
    await this.unloadPlugin(pluginId);
    
    // Clear from discovery cache
    this.discoveredPlugins.delete(pluginId);
    
    // Rediscover and load
    const manifest = await this.loadManifest(pluginId);
    if (manifest) {
      this.discoveredPlugins.set(pluginId, manifest);
      return await this.loadPlugin(pluginId, api);
    }
    
    return {
      success: false,
      error: `Failed to reload plugin ${pluginId}`,
    };
  }

  /**
   * Get plugin directories from registry file only
   */
  private async getPluginDirectoriesFromRegistry(): Promise<string[]> {
    try {
      const registryPath = `${this.pluginPath}/plugin-registry.json`;
      const response = await fetch(registryPath);
      
      if (!response.ok) {
        throw new Error(`Failed to load plugin registry: ${response.status}`);
      }
      
      const registry = await response.json();
      if (Array.isArray(registry.plugins)) {
        console.log(`📋 Loaded ${registry.plugins.length} plugins from registry`);
        return registry.plugins;
      }
      
      console.warn("⚠️ Plugin registry exists but contains no plugins array");
      return [];
    } catch (error) {
      console.error("❌ Failed to load plugin registry:", error);
      throw error;
    }
  }

  /**
   * Load plugin manifest from directory
   */
  private async loadManifest(pluginDir: string): Promise<PluginManifest | null> {
    try {
      const manifestPath = `${this.pluginPath}/${pluginDir}/manifest.json`;
      const response = await fetch(manifestPath);
      
      if (!response.ok) {
        throw new Error(`Failed to load manifest: ${response.status}`);
      }
      
      const manifest: PluginManifest = await response.json();
      
      // Validate manifest
      this.validateManifest(manifest);
      
      return manifest;
    } catch (error) {
      console.error(`❌ Failed to load manifest for ${pluginDir}:`, error);
      return null;
    }
  }

  /**
   * Load plugin module using fetch and dynamic execution
   */
  private async loadPluginModule(manifest: PluginManifest): Promise<any> {
    const modulePath = `${this.pluginPath}/${manifest.id}/${manifest.main}`;
    
    try {
      // Fetch the plugin code
      const response = await fetch(modulePath);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch plugin module: ${response.status} ${response.statusText}`);
      }
      
      const pluginCode = await response.text();
      
      // Create a module context for the plugin
      const moduleContext = {
        exports: {},
        module: { exports: {} },
      };
      
      // Create a function to execute the plugin code
      const executePlugin = new Function(
        "exports", 
        "module", 
        "console", 
        "window",
        "document",
        "fetch",
        "setTimeout",
        "setInterval",
        "clearTimeout",
        "clearInterval",
        "localStorage",
        "sessionStorage",
        `
        ${pluginCode}
        
        // Return the exports
        return typeof module.exports === 'object' && module.exports !== null 
          ? module.exports 
          : exports;
        `,
      );
      
      // Execute the plugin code with controlled globals
      const pluginExports = executePlugin(
        moduleContext.exports,
        moduleContext.module,
        console,
        window,
        document,
        fetch,
        setTimeout,
        setInterval,
        clearTimeout,
        clearInterval,
        localStorage,
        sessionStorage,
      );
      
      // Support both default export and named exports
      if (pluginExports.default) {
        return pluginExports.default;
      } else if (typeof pluginExports === "object" && pluginExports !== null) {
        // Extract lifecycle hooks and other exports
        const { onLoad, onEnable, onDisable, onMessage, onResponse, onSettingsChange, onUnload, ...rest } = pluginExports;
        return {
          onLoad,
          onEnable,
          onDisable,
          onMessage,
          onResponse,
          onSettingsChange,
          onUnload,
          ...rest,
        };
      } else {
        throw new Error("Plugin module did not export any functions");
      }
    } catch (error) {
      console.error(`❌ Failed to load module ${modulePath}:`, error);
      throw error;
    }
  }

  /**
   * Validate plugin manifest
   */
  private validateManifest(manifest: PluginManifest): void {
    const required = ["id", "name", "version", "description", "author", "main"];
    
    for (const field of required) {
      if (!manifest[field as keyof PluginManifest]) {
        throw new Error(`Missing required field: ${field}`);
      }
    }
    
    // Validate ID format
    if (!/^[a-z0-9-]+$/.test(manifest.id)) {
      throw new Error("Plugin ID must contain only lowercase letters, numbers, and hyphens");
    }
    
    // Validate version format
    if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) {
      throw new Error("Plugin version must be in semantic versioning format (x.y.z)");
    }
  }
}

// Export singleton instance
export const pluginDiscovery = PluginDiscovery.getInstance(); 
 
