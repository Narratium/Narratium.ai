"use client";

import { useState, useEffect, useRef } from "react";
import { useLanguage } from "@/app/i18n";
import { RegexScript, RegexScriptSettings } from "@/lib/models/regex-script-model";
import { trackButtonClick } from "@/utils/google-analytics";
import RegexScriptEntryEditor from "@/components/RegexScriptEntryEditor";
import ImportRegexScriptModal from "@/components/ImportRegexScriptModal";
import { updateRegexScriptSettings } from "@/function/regex/update-setting";
import { getRegexScripts } from "@/function/regex/get";
import { getRegexScriptSettings } from "@/function/regex/get-setting";
import { addRegexScript } from "@/function/regex/add";
import { updateRegexScript } from "@/function/regex/update";
import { deleteRegexScript } from "@/function/regex/delete";

interface Props {
  onClose: () => void;
  characterName: string;
  characterId: string;
}

export default function RegexScriptEditor({ onClose, characterName, characterId }: Props) {
  const { t, fontClass, serifFontClass } = useLanguage();
  const [scripts, setScripts] = useState<Record<string, RegexScript>>({});
  const [settings, setSettings] = useState<RegexScriptSettings>({
    enabled: true,
    applyToPrompt: false,
    applyToResponse: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [editingScript, setEditingScript] = useState<Partial<RegexScript> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedScripts, setExpandedScripts] = useState<Set<string>>(new Set());
  const [animationComplete, setAnimationComplete] = useState(false);
  const [sortBy, setSortBy] = useState<string>("priority");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [filterBy, setFilterBy] = useState<string>("all");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  
  // Add scroll container ref
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scriptRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadScriptsAndSettings();
    
    const timer = setTimeout(() => setAnimationComplete(true), 100);
    return () => {
      clearTimeout(timer);
      // Clean up refs and timeouts on unmount
      scriptRefs.current.clear();
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
    };
  }, [characterId]);

  const loadScriptsAndSettings = async () => {
    setIsLoading(true);
    try {
      const [scriptsData, settingsData] = await Promise.all([
        getRegexScripts(characterId),
        getRegexScriptSettings(characterId),
      ]);
      
      setScripts(scriptsData || {});
      setSettings(settingsData);
    } catch (error) {
      console.error("Error loading regex scripts:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveScript = async (script: Partial<RegexScript & { scriptKey?: string }>) => {
    setIsSaving(true);
    try {
      const scriptKey = script.scriptKey;
      if (scriptKey) {
        await updateRegexScript(characterId, scriptKey, script);

        setScripts(prev => ({
          ...prev,
          [scriptKey]: {
            ...prev[scriptKey],
            ...script,
          },
        }));
      } else {
        const newScriptKey = await addRegexScript(characterId, script as RegexScript);
        
        if (newScriptKey) {
          setScripts(prev => ({
            ...prev,
            [newScriptKey]: {
              ...script as RegexScript,
              scriptKey: newScriptKey,
            },
          }));
        } else {
          await loadScriptsAndSettings();
        }
      }
    } catch (error) {
      console.error("Error saving script:", error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteScript = async (scriptId: string) => {
    try {
      await deleteRegexScript(characterId, scriptId);
      
      setScripts(prev => {
        const newScripts = { ...prev };
        delete newScripts[scriptId];
        return newScripts;
      });
      
      setExpandedScripts(prev => {
        const newSet = new Set(prev);
        newSet.delete(scriptId);
        return newSet;
      });
    } catch (error) {
      console.error("Error deleting script:", error);
    }
  };

  const handleToggleScript = async (scriptId: string) => {
    const script = scripts[scriptId];
    if (!script) return;

    const newDisabledState = !script.disabled;
    
    setScripts(prev => ({
      ...prev,
      [scriptId]: {
        ...prev[scriptId],
        disabled: newDisabledState,
      },
    }));

    try {
      await updateRegexScript(characterId, scriptId, {
        disabled: newDisabledState,
      });
    } catch (error) {
      setScripts(prev => ({
        ...prev,
        [scriptId]: {
          ...prev[scriptId],
          disabled: !newDisabledState,
        },
      }));
      console.error("Error toggling script:", error);
    }
  };

  const handleUpdateSettings = async (updates: Partial<RegexScriptSettings>) => {
    try {
      const newSettings = await updateRegexScriptSettings(characterId, updates);
      setSettings(newSettings);
    } catch (error) {
      console.error("Error updating settings:", error);
    }
  };

  const toggleScriptExpansion = (scriptId: string) => {
    const wasExpanded = expandedScripts.has(scriptId);
    
    setExpandedScripts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(scriptId)) {
        newSet.delete(scriptId);
      } else {
        newSet.add(scriptId);
      }
      return newSet;
    });

    if (!wasExpanded) {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      setTimeout(() => {
        scrollToExpandedScript(scriptId);
      }, 150);
      
      scrollTimeoutRef.current = setTimeout(() => {
        scrollToExpandedScript(scriptId);
        scrollTimeoutRef.current = null;
      }, 350);
    }
  };

  const scrollToExpandedScript = (scriptId: string) => {
    const scrollContainer = scrollContainerRef.current;
    const scriptElement = scriptRefs.current.get(scriptId);
    
    if (!scrollContainer || !scriptElement) return;
    requestAnimationFrame(() => {
      const containerRect = scrollContainer.getBoundingClientRect();
      const scriptRect = scriptElement.getBoundingClientRect();
      
      const buffer = 30;
      const isFullyVisible = 
        scriptRect.top >= containerRect.top + buffer &&
        scriptRect.bottom <= containerRect.bottom - buffer;

      if (!isFullyVisible) {
        const containerHeight = containerRect.height;
        const scriptHeight = scriptRect.height;
        
        const scriptOffsetTop = scriptElement.offsetTop;
        
        const filteredScripts = filterScripts(scripts, filterBy);
        const sortedScriptEntries = sortScripts(filteredScripts, sortBy, sortOrder);
        const sortedScriptIds = sortedScriptEntries.map(([id]) => id);
        const isLastScript = sortedScriptIds.indexOf(scriptId) === sortedScriptIds.length - 1;
        
        let targetScrollTop;
        
        if (isLastScript) {
          const extraPadding = 120;
          if (scriptHeight > containerHeight - 120) {
            targetScrollTop = scriptOffsetTop - 40;
          } else {
            targetScrollTop = scriptOffsetTop + scriptHeight - containerHeight + extraPadding;
          }
        } else if (scriptHeight > containerHeight - 80) {
          targetScrollTop = scriptOffsetTop - 40;
        } else if (scriptRect.bottom > containerRect.bottom) {
          targetScrollTop = scriptOffsetTop + scriptHeight - containerHeight + 80; // 80px padding
        } else if (scriptRect.top < containerRect.top) {
          targetScrollTop = scriptOffsetTop - 40;
        } else {
          return;
        }
        
        const maxScrollTop = scrollContainer.scrollHeight - containerHeight;
        targetScrollTop = Math.min(Math.max(0, targetScrollTop), maxScrollTop);
        
        scrollContainer.scrollTo({
          top: targetScrollTop,
          behavior: "smooth",
        });
      }
    });
  };

  const filterScripts = (scripts: Record<string, RegexScript>, filterBy: string) => {
    const scriptEntries = Object.entries(scripts);
    if (filterBy === "all") return scriptEntries;
    
    return scriptEntries.filter(([, script]) => {
      switch (filterBy) {
      case "enabled":
        return !script.disabled;
      case "disabled":
        return script.disabled;
      case "imported":
        return script.extensions?.imported === true;
      default:
        return true;
      }
    });
  };

  const sortScripts = (scriptEntries: [string, RegexScript][], sortBy: string, sortOrder: "asc" | "desc") => {
    const sorted = [...scriptEntries].sort(([, a], [, b]) => {
      let comparison = 0;
      
      switch (sortBy) {
      case "priority":
        comparison = (a.placement?.[0] || 999) - (b.placement?.[0] || 999);
        break;
      case "name":
        comparison = (a.scriptName || "").localeCompare(b.scriptName || "");
        break;
      default:
        comparison = (a.placement?.[0] || 999) - (b.placement?.[0] || 999);
      }
      
      return sortOrder === "desc" ? -comparison : comparison;
    });
    
    return sorted;
  };

  const filteredScripts = filterScripts(scripts, filterBy);
  const sortedScripts = sortScripts(filteredScripts, sortBy, sortOrder);

  const handleSortByChange = (newSortBy: string) => {
    setSortBy(newSortBy);
  };

  const handleSortOrderChange = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
  };

  const handleFilterByChange = (newFilterBy: string) => {
    setFilterBy(newFilterBy);
  };

  const truncateText = (text: string, maxLength: number = 50) => {
    return text.length > maxLength ? text.substring(0, maxLength) + "..." : text;
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-[#1a1816]">
        <div className="flex flex-col items-center">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-2 border-t-[#f9c86d] border-r-[#c0a480] border-b-[#a18d6f] border-l-transparent animate-spin"></div>
            <div className="absolute inset-2 rounded-full border-2 border-t-[#a18d6f] border-r-[#f9c86d] border-b-[#c0a480] border-l-transparent animate-spin-slow"></div>
          </div>
          <p className="mt-4 text-[#c0a480]">{t("regexScriptEditor.loading") || "Loading..."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-[#1a1816] text-[#eae6db]">
      <div className="p-2 sm:p-3 border-b border-[#534741] bg-[#252220] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent opacity-50"></div>
        <div className="relative z-10 flex justify-between items-center min-h-[2rem]">
          <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
            <h2 className="text-base sm:text-lg font-medium text-[#eae6db] flex-shrink-0">
              <span className={`bg-clip-text text-transparent bg-gradient-to-r from-amber-500 via-orange-400 to-yellow-300 ${serifFontClass}`}>
                {t("regexScriptEditor.title")}
              </span>
              <span className={`ml-1 sm:ml-2 text-xs sm:text-sm text-[#a18d6f] ${serifFontClass} inline-block truncate max-w-[100px] sm:max-w-[150px] align-bottom`} title={characterName}>
                - {characterName}
              </span>
            </h2>
            <div className={`hidden md:flex items-center space-x-2 text-xs text-[#a18d6f] ${serifFontClass} flex-shrink-0`}>
              <span className="whitespace-nowrap">{t("regexScriptEditor.totalCount")} {Object.keys(scripts).length}</span>
              <span>•</span>
              <span className="text-amber-400 whitespace-nowrap">
                {t("regexScriptEditor.enabledCount")} {Object.values(scripts).filter(s => !s.disabled).length}
              </span>
              <span>•</span>
              <span className="text-rose-400 whitespace-nowrap">
                {t("regexScriptEditor.disabledCount")} {Object.values(scripts).filter(s => s.disabled).length}
              </span>
              {filterBy !== "all" && (
                <>
                  <span>•</span>
                  <span className="text-blue-400 whitespace-nowrap">
                    {t("regexScriptEditor.filteredCount")} {filteredScripts.length}
                  </span>
                </>
              )}
            </div>
            <div className={`md:hidden flex items-center space-x-1 text-[10px] sm:text-xs text-[#a18d6f] ${serifFontClass} flex-shrink-0`}>
              <span className="bg-[#1a1816] px-1.5 sm:px-2 py-1 rounded border border-[#534741] whitespace-nowrap">
                {Object.keys(scripts).length} / {Object.values(scripts).filter(s => !s.disabled).length} / {Object.values(scripts).filter(s => s.disabled).length}
                {filterBy !== "all" && ` (${filteredScripts.length})`}
              </span>
            </div>
          </div>
          <button
            onClick={() => {
              trackButtonClick("page", "关闭正则编辑器");
              onClose();
            }}
            className="w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center text-[#a18d6f] hover:text-[#eae6db] transition-colors duration-300 rounded-md hover:bg-[#333] group flex-shrink-0 ml-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:scale-110">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>

      <div className="p-2 sm:p-3 border-b border-[#534741] bg-[#1a1816]">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-3">
          <div className="flex items-center space-x-1.5 sm:space-x-2 flex-wrap">
            <button
              onClick={() => setEditingScript({})}
              className="px-2 sm:px-3 py-1 sm:py-1.5 bg-gradient-to-r from-[#1f1c1a] to-[#13100e] hover:from-[#282521] hover:to-[#1a1613] text-[#e9c08d] hover:text-[#f6daae] rounded-md transition-all duration-300 text-xs sm:text-sm font-medium shadow-lg hover:shadow-[#f8b758]/20 group flex-shrink-0 border border-[#403a33]"
            >
              <span className={`flex items-center ${serifFontClass}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1 sm:mr-1.5 transition-transform duration-300 group-hover:scale-110">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span className="hidden sm:inline">{t("regexScriptEditor.addNewScript")}</span>
                <span className="sm:hidden">{t("regexScriptEditor.addNewScript")}</span>
              </span>
            </button>
            
            <button
              onClick={() => {
                trackButtonClick("page", "打开正则导入");
                setIsImportModalOpen(true);
              }}
              className="px-2 sm:px-3 py-1 sm:py-1.5 bg-gradient-to-r from-[#1a1c1f] to-[#0e1013] hover:from-[#252528] hover:to-[#13161a] text-[#8dc0e9] hover:text-[#aed6f6] rounded-md transition-all duration-300 text-xs sm:text-sm font-medium shadow-lg hover:shadow-[#58b7f8]/20 group flex-shrink-0 border border-[#333a40]"
            >
              <span className={`flex items-center ${serifFontClass}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1 sm:mr-1.5 transition-transform duration-300 group-hover:scale-110">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                  <polyline points="7 10 12 15 17 10"></polyline>
                  <line x1="12" y1="15" x2="12" y2="3"></line>
                </svg>
                <span className="hidden sm:inline">{t("regexScriptEditor.importScript")}</span>
                <span className="sm:hidden">{t("regexScriptEditor.importScript")}</span>
              </span>
            </button>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4 text-[10px] sm:text-xs text-[#a18d6f] bg-[#252220] px-2 sm:px-3 py-1.5 sm:py-2 rounded border border-[#534741] flex-shrink-0 overflow-hidden">
            <div className="flex items-center space-x-1 sm:space-x-2">
              <span className={`whitespace-nowrap ${fontClass} truncate`}>{t("regexScriptEditor.globalEnabled")}:</span>
              <span className={`${settings.enabled ? "text-amber-400" : "text-rose-400"} font-medium flex-shrink-0`}>
                {settings.enabled ? t("regexScriptEditor.yes") : t("regexScriptEditor.no")}
              </span>
            </div>
            <span className="hidden sm:inline">•</span>
            <div className="flex items-center space-x-1 sm:space-x-2">
              <span className={`whitespace-nowrap ${fontClass} truncate`}>{t("regexScriptEditor.applyToResponse")}:</span>
              <span className={`${settings.applyToResponse ? "text-amber-400" : "text-rose-400"} font-medium flex-shrink-0`}>
                {settings.applyToResponse ? t("regexScriptEditor.yes") : t("regexScriptEditor.no")}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="sticky top-0 z-20 bg-[#1a1816] border-b border-[#534741]/40 p-2 sm:p-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="flex items-center gap-1 sm:gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400/80">
                  <path d="M3 6h18M7 12h10m-7 6h4"></path>
                </svg>
                <label className={`text-[10px] sm:text-xs text-[#a18d6f] font-medium ${serifFontClass}`}>
                  {t("regexScriptEditor.sortBy")}
                </label>
              </div>
              
              <div className="relative">
                <select
                  value={sortBy}
                  onChange={(e) => handleSortByChange(e.target.value)}
                  className={`appearance-none bg-gradient-to-br from-[#1a1816] via-[#252220] to-[#1a1816] 
                    text-[#eae6db] px-2 sm:px-3 py-1 sm:py-1.5 pr-5 sm:pr-7 rounded-md border border-[#534741]/60 
                    focus:border-amber-500/60 focus:outline-none focus:ring-2 focus:ring-amber-500/20 
                    transition-all duration-300 hover:border-[#534741] backdrop-blur-sm
                    shadow-inner text-[10px] sm:text-xs font-medium ${serifFontClass}
                    hover:shadow-lg hover:shadow-amber-500/5`}
                >
                  <option value="priority" className="bg-[#1a1816] text-[#eae6db]">{t("regexScriptEditor.priority")}</option>
                  <option value="name" className="bg-[#1a1816] text-[#eae6db]">{t("regexScriptEditor.name")}</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-1.5 sm:pr-2 pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#a18d6f]">
                    <path d="M6 9l6 6 6-6"></path>
                  </svg>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 sm:gap-1.5">
              <span className={`text-[10px] sm:text-xs text-[#a18d6f] font-medium ${serifFontClass}`}>
                {t("regexScriptEditor.sortOrder")}:
              </span>
              <button
                onClick={handleSortOrderChange}
                className={`group relative flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md 
                  bg-gradient-to-br from-[#1a1816] via-[#252220] to-[#1a1816] 
                  border border-[#534741]/60 hover:border-amber-500/40 
                  text-[#eae6db] hover:text-amber-200 
                  transition-all duration-300 backdrop-blur-sm
                  hover:shadow-lg hover:shadow-amber-500/10 
                  focus:outline-none focus:ring-2 focus:ring-amber-500/20 ${serifFontClass}`}
                title={sortOrder === "asc" ? t("regexScriptEditor.ascending") : t("regexScriptEditor.descending")}
              >
                <div className={`flex items-center justify-center w-3 h-3 sm:w-4 sm:h-4 rounded-full 
                  bg-gradient-to-br ${sortOrder === "asc" 
      ? "from-amber-500/20 to-amber-600/30 text-amber-400" 
      : "from-blue-500/20 to-blue-600/30 text-blue-400"} 
                  transition-all duration-300 group-hover:scale-110`}>
                  <span className="text-[10px] sm:text-xs font-bold">
                    {sortOrder === "asc" ? "↑" : "↓"}
                  </span>
                </div>
                <span className="text-[10px] sm:text-xs font-medium">
                  {sortOrder === "asc" ? t("regexScriptEditor.asc") : t("regexScriptEditor.desc")}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              <div className="flex items-center gap-1 sm:gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400/80">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                </svg>
                <label className={`text-[10px] sm:text-xs text-[#a18d6f] font-medium ${serifFontClass}`}>
                  {t("regexScriptEditor.filterBy")}
                </label>
              </div>
              
              <div className="relative">
                <select
                  value={filterBy}
                  onChange={(e) => handleFilterByChange(e.target.value)}
                  className={`appearance-none bg-gradient-to-br from-[#1a1816] via-[#252220] to-[#1a1816] 
                    text-[#eae6db] px-2 sm:px-3 py-1 sm:py-1.5 pr-5 sm:pr-7 rounded-md border border-[#534741]/60 
                    focus:border-blue-500/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20 
                    transition-all duration-300 hover:border-[#534741] backdrop-blur-sm
                    shadow-inner text-[10px] sm:text-xs font-medium ${serifFontClass}
                    hover:shadow-lg hover:shadow-blue-500/5`}
                >
                  <option value="all" className="bg-[#1a1816] text-[#eae6db]">{t("regexScriptEditor.filterAll")}</option>
                  <option value="enabled" className="bg-[#1a1816] text-[#eae6db]">{t("regexScriptEditor.filterEnabled")}</option>
                  <option value="disabled" className="bg-[#1a1816] text-[#eae6db]">{t("regexScriptEditor.filterDisabled")}</option>
                  <option value="imported" className="bg-[#1a1816] text-[#eae6db]">{t("regexScriptEditor.filterImported")}</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-1.5 sm:pr-2 pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#a18d6f]">
                    <path d="M6 9l6 6 6-6"></path>
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div 
          ref={scrollContainerRef}
          className="h-full overflow-y-auto p-2 sm:p-4 pb-16 space-y-2 sm:space-y-4"
        >
          {Object.keys(scripts).length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-[#a18d6f]">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-50">
                <polyline points="16 18 22 12 16 6"></polyline>
                <polyline points="8 6 2 12 8 18"></polyline>
              </svg>
              <p className={`text-lg mb-2 ${fontClass}`}>{t("regexScriptEditor.noScripts")}</p>
              <p className={`text-sm opacity-70 ${fontClass}`}>{t("regexScriptEditor.noScriptsDescription")}</p>
            </div>
          ) : (
            <div className="space-y-2 sm:space-y-3 pb-32">
              {sortedScripts.map(([scriptId, script], index) => {
                const isExpanded = expandedScripts.has(scriptId);
                return (
                  <div
                    key={scriptId}
                    ref={(el) => {
                      if (el) {
                        scriptRefs.current.set(scriptId, el);
                      } else {
                        scriptRefs.current.delete(scriptId);
                      }
                    }}
                    className={`rounded-lg border transition-all duration-300 ${
                      script.disabled
                        ? "bg-[#1a1816] border-[#534741] opacity-60"
                        : "bg-[#1e1c1b] border-[#666]/30"
                    }`}
                    style={{
                      opacity: animationComplete ? 1 : 0,
                      transform: animationComplete ? "translateY(0)" : "translateY(20px)",
                      transitionDelay: `${index * 50}ms`,
                    }}
                  >
                    <div className="p-2 sm:p-4 border-b border-[#534741]/50">
                      <div className="flex items-center justify-between mb-2 sm:mb-3">
                        <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
                          <button
                            onClick={() => toggleScriptExpansion(scriptId)}
                            className="text-[#a18d6f] hover:text-[#f4e8c1] transition-colors flex-shrink-0"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className={`h-3 w-3 sm:h-4 sm:w-4 transition-transform duration-200 ${
                                isExpanded ? "rotate-90" : ""
                              }`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                          <h4 className={`font-medium ${serifFontClass} ${script.disabled ? "text-[#a18d6f]" : "text-[#f6daae]"} text-sm sm:text-base truncate flex-1 min-w-0`}>
                            {script.scriptName}
                          </h4>
                        </div>
                        <div className="flex items-center space-x-1 sm:space-x-2 flex-shrink-0">
                          <span className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded bg-[#252220] text-[#a18d6f] ${fontClass}`}>
                            {t("regexScriptEditor.priority")}: {script.placement?.[0] || 999}
                          </span>
                          <button
                            onClick={() => setEditingScript({ ...script, scriptKey: scriptId })}
                            className={`text-[10px] sm:text-xs px-1.5 sm:px-3 py-1 sm:py-1.5 bg-gradient-to-r from-[#1a1f1c] to-[#0e1310] hover:from-[#212821] hover:to-[#131a16]
                              text-[#8de9c0] hover:text-[#aef6da] rounded-md transition-all duration-300 font-medium 
                              shadow-lg hover:shadow-[#58f8b7]/20 group flex-shrink-0 border border-[#33403a]`}
                          >
                            <span className={`flex items-center ${serifFontClass}`}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-0.5 sm:mr-1 transition-transform duration-300 group-hover:scale-110">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                              <span className="hidden sm:inline">{t("regexScriptEditor.edit")}</span>
                              <span className="sm:hidden">{t("regexScriptEditor.edit")}</span>
                            </span>
                          </button>
                          <button
                            onClick={() => handleToggleScript(scriptId)}
                            className={`text-[10px] sm:text-xs px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-md transition-all duration-300 font-medium shadow-lg group flex-shrink-0 ${
                              script.disabled
                                ? "bg-gradient-to-r from-[#1a1f1c] to-[#0e1310] hover:from-[#212821] hover:to-[#131a16] text-[#8de9c0] hover:text-[#aef6da] border border-[#33403a] hover:shadow-[#58f8b7]/20"
                                : "bg-gradient-to-r from-[#1f1c1a] to-[#13100e] hover:from-[#282521] hover:to-[#1a1613] text-[#e9c08d] hover:text-[#f6daae] border border-[#403a33] hover:shadow-[#f8b758]/20"
                            }`}
                          >
                            <span className={`flex items-center ${serifFontClass}`}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-0.5 sm:mr-1 transition-transform duration-300 group-hover:scale-110">
                                {script.disabled ? (
                                  <>
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <polygon points="10,8 16,12 10,16 10,8"></polygon>
                                  </>
                                ) : (
                                  <>
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <line x1="10" y1="15" x2="10" y2="9"></line>
                                    <line x1="14" y1="15" x2="14" y2="9"></line>
                                  </>
                                )}
                              </svg>
                              <span className="hidden sm:inline">{script.disabled ? t("regexScriptEditor.enable") : t("regexScriptEditor.disable")}</span>
                              <span className="sm:hidden">{script.disabled ? t("regexScriptEditor.enable") : t("regexScriptEditor.disable")}</span>
                            </span>
                          </button>
                          <button
                            onClick={() => handleDeleteScript(scriptId)}
                            className={`text-[10px] sm:text-xs px-1.5 sm:px-3 py-1 sm:py-1.5 bg-gradient-to-r from-[#1f1a1a] to-[#130e0e] hover:from-[#282121] hover:to-[#1a1313]
                              text-[#e98d8d] hover:text-[#f6aeae] rounded-md transition-all duration-300 font-medium 
                              shadow-lg hover:shadow-[#f85858]/20 group flex-shrink-0 border border-[#403333]`}
                          >
                            <span className={`flex items-center ${serifFontClass}`}>
                              <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-0.5 sm:mr-1 transition-transform duration-300 group-hover:scale-110">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2-2v2"></path>
                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                <line x1="14" y1="11" x2="14" y2="17"></line>
                              </svg>
                              <span className="hidden sm:inline">{t("regexScriptEditor.delete")}</span>
                              <span className="sm:hidden">{t("regexScriptEditor.delete")}</span>
                            </span>
                          </button>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-1.5 sm:space-x-2 mb-1.5 sm:mb-2 flex-wrap">
                        <span className={`inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-all duration-300 backdrop-blur-sm border ${
                          !script.disabled 
                            ? "bg-gradient-to-br from-slate-800/60 via-amber-900/40 to-slate-800/60 text-amber-200/90 border-amber-600/30" 
                            : "bg-gradient-to-br from-slate-800/60 via-stone-700/40 to-slate-800/60 text-stone-300/90 border-stone-500/30"
                        }`}>
                          <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full mr-1 sm:mr-2 ${
                            !script.disabled ? "bg-amber-400/80" : "bg-stone-400/80"
                          }`}></span>
                          {script.disabled ? t("regexScriptEditor.disabled") : t("regexScriptEditor.enabled")}
                        </span>
                        {script.extensions?.imported && (
                          <span className="inline-flex items-center px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-all duration-300 backdrop-blur-sm border bg-gradient-to-br from-slate-800/60 via-blue-700/40 to-slate-800/60 text-blue-300/90 border-blue-500/30 hover:from-slate-700/70 hover:via-blue-600/50 hover:to-slate-700/70 hover:border-blue-400/40 hover:text-blue-200 hover:shadow-lg hover:shadow-blue-500/10">
                            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-400/80 rounded-full mr-1 sm:mr-2 shadow-sm shadow-blue-400/50"></span>
                            {t("worldBook.imported")}
                          </span>
                        )}
                      </div>
                      
                      {!isExpanded && (
                        <div className={`text-xs sm:text-sm ${fontClass}`}>
                          <span className="text-[#a18d6f]">{t("regexScriptEditor.findRegex")}:</span>
                          <code className="ml-1 sm:ml-2 px-1.5 sm:px-2 py-0.5 sm:py-1 bg-[#1a1816] rounded text-[#f9c86d] font-mono text-[10px] sm:text-xs cursor-pointer hover:bg-[#252220] transition-colors break-all"
                            onClick={() => toggleScriptExpansion(scriptId)}>
                            {truncateText(script.findRegex, window.innerWidth < 640 ? 30 : 50)}
                          </code>
                        </div>
                      )}
                    </div>

                    {isExpanded && (
                      <div className="p-2 sm:p-4 space-y-2 sm:space-y-3 bg-[#1a1816]/50">
                        <div className={`text-xs sm:text-sm ${fontClass}`}>
                          <span className="text-[#a18d6f] block mb-1">{t("regexScriptEditor.findRegex")}:</span>
                          <code className="block px-2 sm:px-3 py-1.5 sm:py-2 bg-[#1a1816] rounded text-[#f9c86d] font-mono text-[10px] sm:text-xs border border-[#534741]/30 break-all">
                            {script.findRegex}
                          </code>
                        </div>
                        <div className={`text-xs sm:text-sm ${fontClass}`}>
                          <span className="text-[#a18d6f] block mb-1">{t("regexScriptEditor.replaceString")}:</span>
                          <code className="block px-2 sm:px-3 py-1.5 sm:py-2 bg-[#1a1816] rounded text-[#93c5fd] font-mono text-[10px] sm:text-xs border border-[#534741]/30 break-all whitespace-pre-wrap">
                            {script.replaceString}
                          </code>
                        </div>
                        {script.trimStrings && script.trimStrings.length > 0 && (
                          <div className={`text-xs sm:text-sm ${fontClass}`}>
                            <span className="text-[#a18d6f] block mb-1">{t("regexScriptEditor.trimStrings")}:</span>
                            <div className="flex flex-wrap gap-1">
                              {script.trimStrings.map((trimStr, index) => (
                                <code key={index} className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-[#1a1816] rounded text-[#c4b5fd] font-mono text-[10px] sm:text-xs border border-[#534741]/30 break-all">
                                  {trimStr}
                                </code>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <RegexScriptEntryEditor
        isOpen={editingScript !== null}
        editingScript={editingScript}
        isSaving={isSaving}
        onClose={() => setEditingScript(null)}
        onSave={handleSaveScript}
        onScriptChange={(script) => setEditingScript(script)}
      />

      <ImportRegexScriptModal
        isOpen={isImportModalOpen}
        characterId={characterId}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={() => {
          setIsImportModalOpen(false);
          loadScriptsAndSettings();
        }}
      />
    </div>
  );
} 
