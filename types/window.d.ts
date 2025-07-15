declare global {
  interface Window {
    pluginRegistry: any;
    pluginDiscovery: any;
    toolRegistry: any;
    testPluginSystem: () => Promise<any>;
    quickHealthCheck: () => void;
    testDialogueIntegration: () => void;
    createTestPlugin: () => void;
    createTestPluginFiles: () => void;
  }
}

export {}; 
