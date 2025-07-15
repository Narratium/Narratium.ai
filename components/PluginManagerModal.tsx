"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Settings, 
  Power, 
  PowerOff, 
  Info, 
  CheckCircle, 
  AlertCircle,
  Package,
  ExternalLink,
  User,
  RefreshCw,
  Wrench,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { useLanguage } from "@/app/i18n";

interface PluginEntry {
  plugin: any;
  manifest: any;
  enabled: boolean;
  initialized: boolean;
  loaded: boolean;
  error?: string;
  loadTime?: Date;
}

interface PluginManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PluginManagerModal({ isOpen, onClose }: PluginManagerModalProps) {
  const { t, fontClass } = useLanguage();
  const [plugins, setPlugins] = useState<PluginEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "enabled" | "disabled">("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadPlugins();
    }
  }, [isOpen]);

  const loadPlugins = async () => {
    setIsLoading(true);
    try {
      // 确保插件系统已初始化
      if (typeof window !== "undefined" && (window as any).pluginRegistry) {
        await (window as any).pluginRegistry.initialize();
        const allPlugins = (window as any).pluginRegistry.getPlugins();
        setPlugins(allPlugins);
      }
    } catch (error) {
      console.error("Failed to load plugins:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshPlugins = async () => {
    setIsRefreshing(true);
    try {
      // 重新发现插件
      if (typeof window !== "undefined" && (window as any).pluginDiscovery) {
        await (window as any).pluginDiscovery.discoverPlugins();
      }
      await loadPlugins();
    } catch (error) {
      console.error("Failed to refresh plugins:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleTogglePlugin = async (pluginId: string, enabled: boolean) => {
    try {
      if (typeof window !== "undefined" && (window as any).pluginRegistry) {
        if (enabled) {
          await (window as any).pluginRegistry.enablePlugin(pluginId);
        } else {
          await (window as any).pluginRegistry.disablePlugin(pluginId);
        }
        // 刷新插件列表
        await loadPlugins();
      }
    } catch (error) {
      console.error(`Failed to ${enabled ? "enable" : "disable"} plugin:`, error);
    }
  };

  const getFilteredPlugins = () => {
    switch (filter) {
    case "enabled":
      return plugins.filter(plugin => plugin.enabled);
    case "disabled":
      return plugins.filter(plugin => !plugin.enabled);
    default:
      return plugins;
    }
  };

  const getPluginStatusIcon = (plugin: PluginEntry) => {
    if (plugin.error) {
      return <AlertTriangle className="w-4 h-4 text-red-400" />;
    }
    if (plugin.enabled) {
      return <CheckCircle className="w-4 h-4 text-green-400" />;
    }
    return <AlertCircle className="w-4 h-4 text-gray-400" />;
  };

  const getPluginStatusText = (plugin: PluginEntry) => {
    if (plugin.error) {
      return { text: "错误", color: "text-red-400" };
    }
    if (plugin.enabled) {
      return { text: "已启用", color: "text-green-400" };
    }
    return { text: "已禁用", color: "text-gray-400" };
  };

  const filteredPlugins = getFilteredPlugins();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={onClose}
          >
            {/* 模态框 */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#1a1a1a] rounded-lg w-full max-w-4xl max-h-[80vh] overflow-hidden border border-[#333]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 头部 */}
              <div className="flex items-center justify-between p-6 border-b border-[#333]">
                <div className="flex items-center space-x-3">
                  <Package className="w-6 h-6 text-[#f4e8c1]" />
                  <h2 className={`text-xl font-bold text-[#f4e8c1] ${fontClass}`}>
                    插件管理器
                  </h2>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleRefreshPlugins}
                    disabled={isRefreshing}
                    className="flex items-center space-x-2 px-3 py-1 text-sm bg-[#333] hover:bg-[#404040] text-[#f4e8c1] rounded transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
                    <span>刷新</span>
                  </button>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              {/* 工具栏 */}
              <div className="p-4 border-b border-[#333] bg-[#222]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <select
                      value={filter}
                      onChange={(e) => setFilter(e.target.value as "all" | "enabled" | "disabled")}
                      className="bg-[#333] text-[#f4e8c1] px-3 py-1 rounded border border-[#444] focus:outline-none focus:border-[#555]"
                    >
                      <option value="all">全部插件</option>
                      <option value="enabled">已启用</option>
                      <option value="disabled">已禁用</option>
                    </select>
                    <span className="text-sm text-gray-400">
                      显示 {filteredPlugins.length} / {plugins.length} 个插件
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-400">
                    <span>版本: 1.0.0</span>
                    <span>•</span>
                    <span>增强插件系统</span>
                  </div>
                </div>
              </div>

              {/* 内容区域 */}
              <div className="p-6 overflow-y-auto max-h-[500px]">
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#f4e8c1]"></div>
                    <span className="ml-3 text-[#f4e8c1]">加载插件中...</span>
                  </div>
                ) : filteredPlugins.length === 0 ? (
                  <div className="text-center py-12">
                    <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-400 text-lg">
                      {filter === "all" ? "没有找到插件" : `没有找到${filter === "enabled" ? "已启用" : "已禁用"}的插件`}
                    </p>
                    <p className="text-gray-500 text-sm mt-2">
                      请将插件放置在 public/plugins/ 目录中
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {filteredPlugins.map((plugin) => (
                      <motion.div
                        key={plugin.manifest.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-[#2a2a2a] rounded-lg p-4 border border-[#333] hover:border-[#444] transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          {/* 插件信息 */}
                          <div className="flex items-start space-x-4 flex-1">
                            {/* 插件图标 */}
                            <div className="w-12 h-12 bg-[#333] rounded-lg flex items-center justify-center">
                              {plugin.manifest.icon ? (
                                <img
                                  src={plugin.manifest.icon}
                                  alt={plugin.manifest.name}
                                  className="w-8 h-8 rounded"
                                />
                              ) : (
                                <Package className="w-6 h-6 text-[#f4e8c1]" />
                              )}
                            </div>

                            {/* 插件详情 */}
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <h3 className="font-semibold text-[#f4e8c1]">
                                  {plugin.manifest.name}
                                </h3>
                                <span className="text-xs bg-[#333] px-2 py-1 rounded text-gray-300">
                                  v{plugin.manifest.version}
                                </span>
                                <div className="flex items-center space-x-1">
                                  {getPluginStatusIcon(plugin)}
                                  <span className={`text-xs ${getPluginStatusText(plugin).color}`}>
                                    {getPluginStatusText(plugin).text}
                                  </span>
                                </div>
                              </div>

                              <p className="text-sm text-gray-400 mb-2">
                                {plugin.manifest.description}
                              </p>

                              <div className="flex items-center space-x-4 text-xs text-gray-500">
                                <div className="flex items-center space-x-1">
                                  <User className="w-3 h-3" />
                                  <span>{plugin.manifest.author}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Wrench className="w-3 h-3" />
                                  <span>{plugin.manifest.category}</span>
                                </div>
                                {plugin.loadTime && (
                                  <div className="flex items-center space-x-1">
                                    <Clock className="w-3 h-3" />
                                    <span>加载于 {plugin.loadTime.toLocaleTimeString()}</span>
                                  </div>
                                )}
                              </div>

                              {plugin.error && (
                                <div className="mt-2 p-2 bg-red-900/20 border border-red-500/30 rounded text-red-400 text-xs">
                                  <strong>错误:</strong> {plugin.error}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 操作按钮 */}
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleTogglePlugin(plugin.manifest.id, !plugin.enabled)}
                              className={`flex items-center space-x-2 px-3 py-1 rounded text-sm transition-colors ${
                                plugin.enabled
                                  ? "bg-red-600 hover:bg-red-700 text-white"
                                  : "bg-green-600 hover:bg-green-700 text-white"
                              }`}
                            >
                              {plugin.enabled ? (
                                <>
                                  <PowerOff className="w-4 h-4" />
                                  <span>禁用</span>
                                </>
                              ) : (
                                <>
                                  <Power className="w-4 h-4" />
                                  <span>启用</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={() => {
                                if (plugin.manifest.homepage) {
                                  window.open(plugin.manifest.homepage, "_blank");
                                }
                              }}
                              disabled={!plugin.manifest.homepage}
                              className="flex items-center space-x-2 px-3 py-1 rounded text-sm bg-[#333] hover:bg-[#404040] text-[#f4e8c1] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <ExternalLink className="w-4 h-4" />
                              <span>主页</span>
                            </button>

                            <button
                              className="flex items-center space-x-2 px-3 py-1 rounded text-sm bg-[#333] hover:bg-[#404040] text-[#f4e8c1] transition-colors"
                              onClick={() => {
                                console.log("Plugin details:", plugin);
                              }}
                            >
                              <Info className="w-4 h-4" />
                              <span>详情</span>
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              {/* 底部状态栏 */}
              <div className="p-4 border-t border-[#333] bg-[#222]">
                <div className="flex items-center justify-between text-sm text-gray-400">
                  <div className="flex items-center space-x-4">
                    <span>系统状态: 正常</span>
                    <span>•</span>
                    <span>
                      插件: {plugins.filter(p => p.enabled).length} 已启用 / {plugins.length} 总计
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span>插件系统 v1.0.0</span>
                    <span>•</span>
                    <span>（测试中。。。。。。）</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
} 
