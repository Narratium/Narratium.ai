"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { getAllPresets, getPreset, deletePreset, togglePresetEnabled, getPromptsForDisplay } from "@/function/preset/global";
import { deletePromptFromPreset, togglePromptEnabled } from "@/function/preset/edit";
import { useLanguage } from "@/app/i18n";
import ImportPresetModal from "@/components/ImportPresetModal";
import CreatePresetModal from "@/components/CreatePresetModal";
import EditPresetNameModal from "@/components/EditPresetNameModal";
import CopyPresetModal from "@/components/CopyPresetModal";
import "@/app/styles/fantasy-ui.css";
import React from "react";
import EditPromptModal from "@/components/EditPromptModal";
import { Toast } from "@/components/Toast";

interface PresetEditorProps {
  onClose: () => void;
  characterName?: string;
  characterId?: string;
}

interface PresetData {
  id: string;
  name: string;
  enabled?: boolean;
  prompts: PresetPromptData[];
  created_at?: string;
  updated_at?: string;
  totalPrompts: number;
  enabledPrompts: number;
  lastUpdated: number;
}

interface PresetPromptData {
  identifier: string;
  name: string;
  system_prompt?: boolean;
  enabled?: boolean;
  marker?: boolean;
  role?: string;
  content?: string;
  injection_position?: number;
  injection_depth?: number;
  forbid_overrides?: boolean;
  contentLength: number;
}

export default function PresetEditor({ 
  onClose, 
  characterName, 
  characterId,
}: PresetEditorProps) {
  const { t, fontClass, serifFontClass } = useLanguage();
  const [presets, setPresets] = useState<PresetData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPreset, setSelectedPreset] = useState<PresetData | null>(null);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [filterBy, setFilterBy] = useState<string>("all");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentEditingPrompt, setCurrentEditingPrompt] = useState<PresetPromptData | null>(null);
  const [isEditNameModalOpen, setIsEditNameModalOpen] = useState(false);
  const [currentEditingPreset, setCurrentEditingPreset] = useState<PresetData | null>(null);
  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [currentCopyingPreset, setCurrentCopyingPreset] = useState<PresetData | null>(null);
  
  // ErrorToast state
  const [errorToast, setErrorToast] = useState({
    isVisible: false,
    message: "",
  });

  const showErrorToast = (message: string) => {
    setErrorToast({
      isVisible: true,
      message,
    });
  };

  const hideErrorToast = () => {
    setErrorToast({
      isVisible: false,
      message: "",
    });
  };

  const SORT_STORAGE_KEY = `preset_sort_${characterId || "global"}`;
  const FILTER_STORAGE_KEY = `preset_filter_${characterId || "global"}`;

  const loadSortPreferences = () => {
    try {
      const stored = localStorage.getItem(SORT_STORAGE_KEY);
      if (stored) {
        const { sortBy: storedSortBy, sortOrder: storedSortOrder } = JSON.parse(stored);
        if (storedSortBy) setSortBy(storedSortBy);
        if (storedSortOrder) setSortOrder(storedSortOrder);
      } else {
        setSortBy("name");
        setSortOrder("asc");
      }
    } catch (error) {
      console.error("Failed to load sort preferences:", error);
      setSortBy("name");
      setSortOrder("asc");
    }
  };

  const loadFilterPreferences = () => {
    try {
      const stored = localStorage.getItem(FILTER_STORAGE_KEY);
      if (stored) {
        const { filterBy: storedFilterBy } = JSON.parse(stored);
        if (storedFilterBy) setFilterBy(storedFilterBy);
      } else {
        setFilterBy("all");
      }
    } catch (error) {
      console.error("Failed to load filter preferences:", error);
      setFilterBy("all");
    }
  };

  const saveSortPreferences = (newSortBy: string, newSortOrder: "asc" | "desc") => {
    try {
      const preferences = {
        sortBy: newSortBy,
        sortOrder: newSortOrder,
        timestamp: Date.now(),
      };
      localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error("Failed to save sort preferences:", error);
    }
  };

  const handleSortByChange = (newSortBy: string) => {
    setSortBy(newSortBy);
    saveSortPreferences(newSortBy, sortOrder);
  };

  const handleSortOrderChange = () => {
    const newSortOrder = sortOrder === "asc" ? "desc" : "asc";
    setSortOrder(newSortOrder);
    saveSortPreferences(sortBy, newSortOrder);
  };

  const handleFilterByChange = (newFilterBy: string) => {
    setFilterBy(newFilterBy);
    saveFilterPreferences(newFilterBy);
  };

  const saveFilterPreferences = (newFilterBy: string) => {
    try {
      const preferences = {
        filterBy: newFilterBy,
        timestamp: Date.now(),
      };
      localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error("Failed to save filter preferences:", error);
    }
  };

  useEffect(() => {
    loadSortPreferences();
    loadFilterPreferences();
    
    loadPresetData().then(async () => {
      const activatePresetId = sessionStorage.getItem("activate_preset_id");
      const activatePresetName = sessionStorage.getItem("activate_preset_name");
    
      if (activatePresetId) {
        try {
          const preset = await getPreset(activatePresetId);
          if (preset.success && preset.data) {
            await handleTogglePreset(activatePresetId, true);
            toast.success(t("preset.presetEnabledExclusiveSuccess"));
          }
        } catch (error) {
          console.error("Error activating preset by ID:", error);
        }
        sessionStorage.removeItem("activate_preset_id");
      } else if (activatePresetName) {
        try {
          const allPresets = await getAllPresets();
          if (allPresets.success && allPresets.data) {
            const matchingPresets = allPresets.data.filter(p => 
              p.name && p.name.toLowerCase().includes(activatePresetName.toLowerCase()),
            );
          
            if (matchingPresets.length > 0 && matchingPresets[0].id) {
              await handleTogglePreset(matchingPresets[0].id, true);
              toast.success(t("preset.presetEnabledExclusiveSuccess"));

              setPresets(prevPresets =>
                prevPresets.map(preset => ({
                  ...preset,
                  enabled: preset.id === matchingPresets[0].id,
                })),
              );
            } else {
              showErrorToast(`No preset found matching "${activatePresetName}"`);
            }
          }
        } catch (error) {
          console.error("Error activating preset by name:", error);
          showErrorToast("Failed to activate preset");
        }
        sessionStorage.removeItem("activate_preset_name");
      }
    });
    
    const timer = setTimeout(() => setAnimationComplete(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const loadPresetData = async () => {
    setIsLoading(true);
    try {
      const result = await getAllPresets();
      
      if (result.success && result.data) {
        const formattedPresets = result.data.map((preset) => ({
          ...preset,
          id: preset.id || `preset-${Date.now()}`,
          enabled: preset.enabled !== false,
          totalPrompts: preset.prompts?.length || 0,
          enabledPrompts: preset.prompts?.filter((p:any) => p.enabled !== false).length || 0,
          lastUpdated: new Date(preset.updated_at || preset.created_at || Date.now()).getTime(),
        })) as PresetData[];
        setPresets(formattedPresets);
      } else {
        showErrorToast(t("preset.loadFailed") || "Failed to load presets");
      }
      setIsLoading(false);
      setAnimationComplete(true);
    } catch (error) {
      console.error("Error loading presets:", error);
      showErrorToast(t("preset.loadFailed") || "Failed to load presets");
      setIsLoading(false);
    }
  };

  const filterPresets = (presets: PresetData[], filterBy: string) => {
    switch (filterBy) {
    case "all":
      return presets;
    case "active":
      return presets.filter(p => p.totalPrompts > 0);
    case "empty":
      return presets.filter(p => p.totalPrompts === 0);
    default:
      return presets;
    }
  };

  const sortPresets = (presets: PresetData[], sortBy: string, sortOrder: "asc" | "desc") => {
    const sorted = [...presets].sort((a, b) => {
      let valueA: any, valueB: any;
      
      switch (sortBy) {
      case "name":
        valueA = a.name.toLowerCase();
        valueB = b.name.toLowerCase();
        break;
      case "promptCount":
        valueA = a.totalPrompts;
        valueB = b.totalPrompts;
        break;
      case "lastUpdated":
        valueA = a.lastUpdated;
        valueB = b.lastUpdated;
        break;
      default:
        valueA = a.name.toLowerCase();
        valueB = b.name.toLowerCase();
      }
      
      if (valueA < valueB) return sortOrder === "asc" ? -1 : 1;
      if (valueA > valueB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });
    
    return sorted;
  };

  const filteredPresets = filterPresets(presets, filterBy);
  const sortedPresets = sortPresets(filteredPresets, sortBy, sortOrder);

  const handleCreatePreset = async () => {
    setIsCreateModalOpen(true);
  };

  const handleDeletePreset = async (presetId: string) => {
    try {
      const result = await deletePreset(presetId);
      if (result.success) {
        setSelectedPreset(null);
        await loadPresetData();
        toast.success(t("preset.deleteSuccess"));
      } else {
        showErrorToast(t("preset.deleteFailed") || "Failed to delete preset");
      }
    } catch (error) {
      console.error("Delete preset failed:", error);
      showErrorToast(t("preset.deleteFailed") || "Failed to delete preset");
    }
  };

  const handleSelectPreset = async (presetId: string) => {
    try {
      const result = await getPreset(presetId);
      if (result.success && result.data) {
        const orderedPromptsResult = await getPromptsForDisplay(presetId);
        if (!orderedPromptsResult.success || !orderedPromptsResult.data) {
          showErrorToast(t("preset.loadDetailsFailed") || "Failed to load preset details");
          return;
        }
        const formattedPreset = {
          ...result.data,
          totalPrompts: result.data.prompts?.length || 0,
          enabledPrompts: result.data.prompts?.filter((p: any) => p.enabled !== false).length || 0,
          lastUpdated: new Date(result.data.updated_at || result.data.created_at || Date.now()).getTime(),
          enabled: result.data.enabled !== false,
          id: result.data.id,
          prompts: orderedPromptsResult.data,
        };
        setSelectedPreset(formattedPreset as PresetData);
      } else {
        showErrorToast(t("preset.loadDetailsFailed") || "Failed to load preset details");
      }
    } catch (error) {
      console.error("Load preset failed:", error);
      showErrorToast(t("preset.loadDetailsFailed") || "Failed to load preset details");
    }
  };

  const toggleRowExpansion = (presetId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(presetId)) {
        newSet.delete(presetId);
      } else {
        newSet.add(presetId);
        if (!selectedPreset || selectedPreset.id !== presetId) {
          handleSelectPreset(presetId);
        }
      }
      return newSet;
    });
  };

  const handleDeletePrompt = async (presetId: string, promptIdentifier: string) => {
    try {
      const result = await deletePromptFromPreset(presetId, promptIdentifier);
      if (result.success) {
        await loadPresetData();
        await handleSelectPreset(presetId);
        toast.success(t("preset.deletePromptSuccess"));
      } else {
        showErrorToast(t("preset.deletePromptFailed") || "Failed to delete prompt");
      }
    } catch (error) {
      console.error("Delete prompt failed:", error);
      showErrorToast(t("preset.deletePromptFailed") || "Failed to delete prompt");
    }
  };

  const handleEditPrompt = (prompt: PresetPromptData) => {
    setCurrentEditingPrompt(prompt);
    setIsEditModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setCurrentEditingPrompt(null);
  };

  const handleSaveEditPrompt = async () => {
    if (selectedPreset) {
      await handleSelectPreset(selectedPreset.id);
    }
  };

  const handleEditPresetName = (preset: PresetData) => {
    setCurrentEditingPreset(preset);
    setIsEditNameModalOpen(true);
  };

  const handleCloseEditNameModal = () => {
    setIsEditNameModalOpen(false);
    setCurrentEditingPreset(null);
  };

  const handleSaveEditPresetName = async () => {
    await loadPresetData();
    if (selectedPreset && currentEditingPreset && selectedPreset.id === currentEditingPreset.id) {
      await handleSelectPreset(selectedPreset.id);
    }
  };

  const handleCopyPreset = (preset: PresetData) => {
    setCurrentCopyingPreset(preset);
    setIsCopyModalOpen(true);
  };

  const handleCloseCopyModal = () => {
    setIsCopyModalOpen(false);
    setCurrentCopyingPreset(null);
  };

  const handleSaveCopyPreset = async () => {
    await loadPresetData();
  };

  const handleTogglePrompt = async (presetId: string, promptIdentifier: string, enableState: boolean) => {
    if (selectedPreset && selectedPreset.id === presetId) {
      const updatedPrompts = selectedPreset.prompts.map(p => {
        if (p.identifier === promptIdentifier) {
          return { ...p, enabled: enableState };
        }
        return p;
      });
      setSelectedPreset({
        ...selectedPreset,
        prompts: updatedPrompts,
        enabledPrompts: enableState 
          ? selectedPreset.enabledPrompts + 1 
          : selectedPreset.enabledPrompts - 1,
      });
    }
    
    setPresets(prevPresets => 
      prevPresets.map(preset => {
        if (preset.id === presetId) {
          return {
            ...preset,
            enabledPrompts: enableState 
              ? preset.enabledPrompts + 1 
              : preset.enabledPrompts - 1,
          };
        }
        return preset;
      }),
    );

    try {
      const result = await togglePromptEnabled(presetId, promptIdentifier, enableState);
      if (result.success) {
        toast.success(enableState 
          ? t("preset.promptEnabledSuccess") 
          : t("preset.promptDisabledSuccess"));
      } else {
        if (selectedPreset && selectedPreset.id === presetId) {
          const revertedPrompts = selectedPreset.prompts.map(p => {
            if (p.identifier === promptIdentifier) {
              return { ...p, enabled: !enableState };
            }
            return p;
          });
          setSelectedPreset({
            ...selectedPreset,
            prompts: revertedPrompts,
            enabledPrompts: enableState 
              ? selectedPreset.enabledPrompts - 1 
              : selectedPreset.enabledPrompts + 1,
          });
        }
        
        setPresets(prevPresets => 
          prevPresets.map(preset => {
            if (preset.id === presetId) {
              return {
                ...preset,
                enabledPrompts: enableState 
                  ? preset.enabledPrompts - 1 
                  : preset.enabledPrompts + 1,
              };
            }
            return preset;
          }),
        );
        
        showErrorToast(t("preset.togglePromptFailed") || "Failed to toggle prompt");
      }
    } catch (error) {
      if (selectedPreset && selectedPreset.id === presetId) {
        const revertedPrompts = selectedPreset.prompts.map(p => {
          if (p.identifier === promptIdentifier) {
            return { ...p, enabled: !enableState };
          }
          return p;
        });
        setSelectedPreset({
          ...selectedPreset,
          prompts: revertedPrompts,
          enabledPrompts: enableState 
            ? selectedPreset.enabledPrompts - 1 
            : selectedPreset.enabledPrompts + 1,
        });
      }
      
      setPresets(prevPresets => 
        prevPresets.map(preset => {
          if (preset.id === presetId) {
            return {
              ...preset,
              enabledPrompts: enableState 
                ? preset.enabledPrompts - 1 
                : preset.enabledPrompts + 1,
            };
          }
          return preset;
        }),
      );
      
      console.error("Toggle prompt failed:", error);
      showErrorToast(t("preset.togglePromptFailed") || "Failed to toggle prompt");
    }
  };

  const handleTogglePreset = async (presetId: string, enableState: boolean) => {
    setPresets(prevPresets => 
      prevPresets.map(preset => {
        if (preset.id === presetId) {
          return {
            ...preset,
            enabled: enableState,
          };
        } else if (enableState) {
          return {
            ...preset,
            enabled: false,
          };
        }
        return preset;
      }),
    );

    if (selectedPreset) {
      if (selectedPreset.id === presetId) {
        setSelectedPreset({
          ...selectedPreset,
          enabled: enableState,
        });
      } else if (enableState) {
        setSelectedPreset({
          ...selectedPreset,
          enabled: false,
        });
      }
    }

    try {
      const result = await togglePresetEnabled(presetId, enableState);
      if (result.success) {
        if (enableState) {
          const enabledCount = presets.filter(p => p.enabled !== false && p.id !== presetId).length;
          if (enabledCount > 0) {
            toast.success(t("preset.presetEnabledExclusiveSuccess"));
          } else {
            toast.success(t("preset.presetEnabledSuccess"));
          }
        } else {
          toast.success(t("preset.presetDisabledSuccess"));
        }
      } else {
        setPresets(prevPresets => 
          prevPresets.map(preset => {
            if (preset.id === presetId) {
              return {
                ...preset,
                enabled: !enableState,
              };
            } else if (enableState) {
              const originalPreset = presets.find(p => p.id === preset.id);
              return {
                ...preset,
                enabled: originalPreset?.enabled !== false,
              };
            }
            return preset;
          }),
        );
        
        if (selectedPreset) {
          if (selectedPreset.id === presetId) {
            setSelectedPreset({
              ...selectedPreset,
              enabled: !enableState,
            });
          } else if (enableState) {
            const originalSelectedPreset = presets.find(p => p.id === selectedPreset.id);
            setSelectedPreset({
              ...selectedPreset,
              enabled: originalSelectedPreset?.enabled !== false,
            });
          }
        }
        
        showErrorToast(t("preset.togglePresetFailed") || "Failed to toggle preset");
      }
    } catch (error) {
      setPresets(prevPresets => 
        prevPresets.map(preset => {
          if (preset.id === presetId) {
            return {
              ...preset,
              enabled: !enableState,
            };
          } else if (enableState) {
            const originalPreset = presets.find(p => p.id === preset.id);
            return {
              ...preset,
              enabled: originalPreset?.enabled !== false,
            };
          }
          return preset;
        }),
      );
      
      if (selectedPreset) {
        if (selectedPreset.id === presetId) {
          setSelectedPreset({
            ...selectedPreset,
            enabled: !enableState,
          });
        } else if (enableState) {
          const originalSelectedPreset = presets.find(p => p.id === selectedPreset.id);
          setSelectedPreset({
            ...selectedPreset,
            enabled: originalSelectedPreset?.enabled !== false,
          });
        }
      }
      
      console.error("Toggle preset failed:", error);
      showErrorToast(t("preset.togglePresetFailed") || "Failed to toggle preset");
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center breathing-bg">
        <div className="flex flex-col items-center">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-2 border-t-[#f9c86d] border-r-[#c0a480] border-b-[#a18d6f] border-l-transparent animate-spin"></div>
            <div className="absolute inset-2 rounded-full border-2 border-t-[#a18d6f] border-r-[#f9c86d] border-b-[#c0a480] border-l-transparent animate-spin-slow"></div>
          </div>
          <p className="mt-4 text-[#c0a480] magical-text">{t("preset.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col breathing-bg text-[#eae6db]">
      <div className="p-2 sm:p-3 border-b border-[#534741] bg-[#252220] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent opacity-50"></div>
        <div className="relative z-10 flex justify-between items-center min-h-[2rem]">
          <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
            <h2 className="text-base sm:text-lg font-medium text-[#eae6db] flex-shrink-0">
              <span className={`bg-clip-text text-transparent bg-gradient-to-r from-amber-500 via-orange-400 to-yellow-300 ${serifFontClass}`}>
                {t("preset.title")}
              </span>
              {characterName && (
                <span className={`ml-1 sm:ml-2 text-xs sm:text-sm text-[#a18d6f] ${serifFontClass} inline-block truncate max-w-[100px] sm:max-w-[150px] align-bottom`} title={characterName}>- {characterName}</span>
              )}
            </h2>
            <div className={`hidden md:flex items-center space-x-2 text-xs text-[#a18d6f] ${serifFontClass} flex-shrink-0`}>
              <span className="whitespace-nowrap">{t("preset.total")}: {presets.length}</span>
              <span>•</span>
              <span className="text-amber-400 whitespace-nowrap">{t("preset.active_status")}: {presets.filter(p => p.totalPrompts > 0).length}</span>
              <span>•</span>
              <span className="text-rose-400 whitespace-nowrap">{t("preset.empty_status")}: {presets.filter(p => p.totalPrompts === 0).length}</span>
              {filterBy !== "all" && (
                <>
                  <span>•</span>
                  <span className="text-blue-400 whitespace-nowrap">{t("preset.filtered")}: {filteredPresets.length}</span>
                </>
              )}
            </div>
            <div className={`md:hidden flex items-center space-x-1 text-[10px] sm:text-xs text-[#a18d6f] ${serifFontClass} flex-shrink-0`}>
              <span className="bg-[#1a1816] px-1.5 sm:px-2 py-1 rounded border border-[#534741] whitespace-nowrap">
                {presets.length} / {presets.filter(p => p.totalPrompts > 0).length} / {presets.filter(p => p.totalPrompts === 0).length}
                {filterBy !== "all" && ` (${filteredPresets.length})`}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
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
              onClick={handleCreatePreset}
              className="px-2 sm:px-3 py-1 sm:py-1.5 bg-gradient-to-r from-[#1f1c1a] to-[#13100e] hover:from-[#282521] hover:to-[#1a1613] text-[#e9c08d] hover:text-[#f6daae] rounded-md transition-all duration-300 text-xs sm:text-sm font-medium shadow-lg hover:shadow-[#f8b758]/20 group flex-shrink-0 border border-[#403a33]"
            >
              <span className={`flex items-center ${serifFontClass}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1 sm:mr-1.5 transition-transform duration-300 group-hover:scale-110">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span className="hidden sm:inline">{t("preset.createPreset")}</span>
                <span className="sm:hidden">{t("preset.create")}</span>
              </span>
            </button>
            
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="px-2 sm:px-3 py-1 sm:py-1.5 bg-gradient-to-r from-[#1a1f1c] to-[#0e1310] hover:from-[#212821] hover:to-[#131a16] text-[#8de9c0] hover:text-[#aef6da] rounded-md transition-all duration-300 text-xs sm:text-sm font-medium shadow-lg hover:shadow-[#58f8b7]/20 group flex-shrink-0 border border-[#33403a]"
            >
              <span className={`flex items-center ${serifFontClass}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1 sm:mr-1.5 transition-transform duration-300 group-hover:scale-110">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                <span className="hidden sm:inline">{t("preset.importPreset")}</span>
                <span className="sm:hidden">{t("preset.importPreset")}</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <div className="sticky top-0 z-20 bg-[#1a1816] border-b border-[#534741]/40 p-2 sm:p-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="flex items-center gap-1 sm:gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400/80">
                  <path d="M3 6h18M7 12h10m-7 6h4"></path>
                </svg>
                <label className={`text-[10px] sm:text-xs text-[#a18d6f] font-medium ${serifFontClass}`}>
                  {t("preset.sortBy")}
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
                  <option value="name" className="bg-[#1a1816] text-[#eae6db]">{t("preset.name")}</option>
                  <option value="promptCount" className="bg-[#1a1816] text-[#eae6db]">{t("preset.promptCount")}</option>
                  <option value="lastUpdated" className="bg-[#1a1816] text-[#eae6db]">{t("preset.lastUpdated")}</option>
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
                {t("preset.sortOrder")}:
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
                title={sortOrder === "asc" ? t("preset.ascending") : t("preset.descending")}
              >
                <div className={`flex items-center justify-center w-3 h-3 sm:w-4 sm:h-4 rounded-full 
                  bg-gradient-to-br ${sortOrder === "asc" 
      ? "from-amber-500/20 to-amber-600/30 text-amber-400" 
      : "from-blue-500/20 to-blue-600/30 text-blue-400"} 
                  transition-all duration-300 group-hover:scale-110`}>
                  <span className="text-[8px] sm:text-xs font-bold">
                    {sortOrder === "asc" ? "↑" : "↓"}
                  </span>
                </div>
                <span className="text-[10px] sm:text-xs font-medium">
                  {sortOrder === "asc" ? t("preset.asc") : t("preset.desc")}
                </span>
              </button>
            </div>
            
            <div className="flex items-center gap-1 sm:gap-2">
              <div className="flex items-center gap-1 sm:gap-1.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400/80">
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                </svg>
                <label className={`text-[10px] sm:text-xs text-[#a18d6f] font-medium ${serifFontClass}`}>
                  {t("preset.filterBy")}
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
                  <option value="all" className="bg-[#1a1816] text-[#eae6db]">{t("preset.all")}</option>
                  <option value="active" className="bg-[#1a1816] text-[#eae6db]">{t("preset.active")}</option>
                  <option value="empty" className="bg-[#1a1816] text-[#eae6db]">{t("preset.empty")}</option>
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
        <div className="h-full overflow-y-auto fantasy-scrollbar pb-15">

          <table className="w-full table-fixed">
            <thead className="sticky top-0 bg-[#252220] border-b border-[#534741] z-10">
              <tr>
                <th className={`w-12 sm:w-16 p-1.5 sm:p-3 text-left text-[10px] sm:text-xs font-medium text-[#a18d6f] uppercase tracking-wider whitespace-nowrap ${fontClass}`}>{t("preset.toggle")}</th>
                <th className={`w-24 sm:w-24 p-1.5 sm:p-3 text-left text-[10px] sm:text-xs font-medium text-[#a18d6f] uppercase tracking-wider whitespace-nowrap ${fontClass}`}>{t("preset.status")}</th>
                <th className={`w-20 sm:w-24 p-1.5 sm:p-3 text-left text-[10px] sm:text-xs font-medium text-[#a18d6f] uppercase tracking-wider whitespace-nowrap ${fontClass}`}>{t("preset.name")}</th>
                <th className={`w-20 sm:w-24 p-1.5 sm:p-3 text-left text-[10px] sm:text-xs font-medium text-[#a18d6f] uppercase tracking-wider whitespace-nowrap ${fontClass}`}>{t("preset.prompts")}</th>
                <th className={`w-20 sm:w-20 p-1.5 sm:p-3 text-left text-[10px] sm:text-xs font-medium text-[#a18d6f] uppercase tracking-wider whitespace-nowrap ${fontClass}`}>{t("preset.updated")}</th>
                <th className={`w-16 sm:w-20 p-1.5 sm:p-3 text-left text-[10px] sm:text-xs font-medium text-[#a18d6f] uppercase tracking-wider whitespace-nowrap ${fontClass}`}>{t("preset.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {sortedPresets.map((preset, index) => (
                <React.Fragment key={preset.id}>
                  <tr 
                    className="border-b border-[#534741] hover:bg-[#252220] transition-all duration-300 group"
                    style={{
                      opacity: animationComplete ? 1 : 0,
                      transform: animationComplete ? "translateY(0)" : "translateY(20px)",
                      transitionDelay: `${index * 50}ms`,
                    }}
                  >
                    <td className="p-1.5 sm:p-3">
                      <button
                        onClick={() => handleTogglePreset(preset.id, preset.enabled === false)}
                        className={`relative inline-flex h-5 w-9 sm:h-6 sm:w-11 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1a1816] backdrop-blur-sm ${
                          preset.enabled !== false 
                            ? "bg-gradient-to-r from-slate-700/80 via-amber-800/60 to-slate-700/80 border border-amber-600/40 focus:ring-amber-500/50" 
                            : "bg-gradient-to-r from-slate-700/60 via-stone-600/40 to-slate-700/60 border border-stone-500/30 focus:ring-stone-400/50"
                        }`}
                        title={preset.enabled !== false ? t("preset.disablePreset") : t("preset.enablePreset")}
                      >
                        <span
                          className={`inline-block h-3 w-3 sm:h-4 sm:w-4 transform rounded-full shadow-lg transition-all duration-300 ${
                            preset.enabled !== false 
                              ? "translate-x-5 sm:translate-x-6 bg-gradient-to-br from-amber-300 via-amber-200 to-amber-300 shadow-amber-400/30" 
                              : "translate-x-1 bg-gradient-to-br from-stone-300 via-stone-200 to-stone-300 shadow-stone-400/30"
                          }`}
                        />
                      </button>
                    </td>
                    
                    <td className="p-1.5 sm:p-3">
                      <div className="flex items-center space-x-1 sm:space-x-2">
                        <span className={`inline-flex items-center px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium whitespace-nowrap transition-all duration-300 backdrop-blur-sm border ${
                          preset.enabled !== false 
                            ? preset.totalPrompts > 0
                              ? "bg-gradient-to-br from-slate-800/60 via-amber-900/40 to-slate-800/60 text-amber-200/90 border-amber-600/30"
                              : "bg-gradient-to-br from-slate-800/60 via-blue-900/40 to-slate-800/60 text-blue-200/90 border-blue-600/30"
                            : "bg-gradient-to-br from-slate-800/60 via-stone-700/40 to-slate-800/60 text-stone-300/90 border-stone-500/30"
                        }`}>
                          <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full mr-1 sm:mr-2 ${
                            preset.enabled !== false 
                              ? preset.totalPrompts > 0 
                                ? "bg-amber-400/80 shadow-sm shadow-amber-400/50"
                                : "bg-blue-400/80 shadow-sm shadow-blue-400/50"
                              : "bg-stone-400/80 shadow-sm shadow-stone-400/50"
                          }`}></span>
                          <span className="hidden sm:inline">
                            {preset.enabled !== false 
                              ? (preset.totalPrompts > 0 ? t("preset.active_status") : t("preset.empty_status"))
                              : t("preset.disabled")}
                          </span>
                          <span className="sm:hidden">
                            {preset.enabled !== false 
                              ? (preset.totalPrompts > 0 ? "Active" : "Empty")
                              : "Disabled"}
                          </span>
                        </span>
                        
                        <button
                          onClick={() => toggleRowExpansion(preset.id)}
                          className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-[#a18d6f] hover:text-[#eae6db] transition-colors duration-300 rounded hover:bg-[#333] ml-1 sm:ml-2"
                          title={expandedRows.has(preset.id) ? t("preset.collapseDetails") : t("preset.expandDetails")}
                        >
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            width="10" 
                            height="10" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round"
                            className={`transition-transform duration-300 ${expandedRows.has(preset.id) ? "rotate-90" : ""}`}
                          >
                            <path d="M9 18l6-6-6-6"></path>
                          </svg>
                        </button>
                      </div>
                    </td>
                    <td className="p-1.5 sm:p-3 text-xs sm:text-sm text-[#eae6db] max-w-xs">
                      <span className="block truncate" title={preset.name}>
                        {preset.name.length > 8 ? `${preset.name.substring(0, 8)}...` : preset.name}
                      </span>
                    </td>
                    <td className="p-1.5 sm:p-3 text-xs sm:text-sm text-[#c0a480]">
                      <span className="text-amber-400">{preset.enabledPrompts}</span>
                      <span className="text-[#a18d6f]"> / {preset.totalPrompts}</span>
                    </td>
                    <td className="p-1.5 sm:p-3 text-xs sm:text-sm text-[#c0a480]">
                      <span className="hidden sm:inline">
                        {new Date(preset.lastUpdated).toLocaleDateString()}
                      </span>
                      <span className="sm:hidden">
                        {new Date(preset.lastUpdated).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </td>
                    <td className="p-1.5 sm:p-3">
                      <div className="flex items-center space-x-0.5 sm:space-x-1">
                        <button
                          onClick={() => handleEditPresetName(preset)}
                          className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-[#a18d6f] hover:text-[#eae6db] transition-colors duration-300 rounded hover:bg-[#333] group"
                          title={t("preset.editPresetName")}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:scale-110">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
                        
                        <button
                          onClick={() => handleCopyPreset(preset)}
                          className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-[#8db4e9] hover:text-[#aec7f6] transition-colors duration-300 rounded hover:bg-[#333] group"
                          title={t("preset.copyPreset")}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:scale-110">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                          </svg>
                        </button>
                       
                        <button
                          onClick={() => handleDeletePreset(preset.id)}
                          className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-red-400 hover:text-red-300 transition-colors duration-300 rounded hover:bg-[#333] group"
                          title={t("preset.deletePreset")}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:scale-110">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2 2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>

                  {expandedRows.has(preset.id) && selectedPreset && selectedPreset.id === preset.id && (
                    <tr className="border-b border-[#534741] bg-gradient-to-b from-[#1a1816] to-[#15120f] transition-all duration-300 animate-fadeIn">
                      <td colSpan={6} className="p-2 sm:p-4">
                        <div className="space-y-2 sm:space-y-3">
                          <div className="flex justify-between items-center">
                            <h4 className="text-xs sm:text-sm font-medium text-[#a18d6f] flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5 sm:mr-2">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                <polyline points="10 9 9 9 8 9"></polyline>
                              </svg>
                              {t("preset.promptsTitle")} ({selectedPreset.prompts.length})
                              {selectedPreset.enabled === false && (
                                <span className="ml-1 sm:ml-2 inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-medium bg-red-900/40 text-red-200/90 border border-red-600/30">
                                  {t("preset.disabled")}
                                </span>
                              )}
                            </h4>
                          </div>
                          
                          {selectedPreset.prompts.length === 0 ? (
                            <div className="text-center text-[#a18d6f] py-4 sm:py-8">
                              <p className="text-xs sm:text-sm">{t("preset.noPromptsInPreset")}</p>
                            </div>
                          ) : (
                            <div className="space-y-1.5 sm:space-y-2">
                              {selectedPreset.prompts.map((prompt: any) => (
                                <div key={prompt.identifier} className="border border-[#534741] rounded p-2 sm:p-3 bg-[#252220]">
                                  <div className="flex justify-between items-start mb-1.5 sm:mb-2">
                                    <div className="flex items-center space-x-1 sm:space-x-2">
                                      <button
                                        onClick={() => handleTogglePrompt(selectedPreset.id, prompt.identifier, prompt.enabled === false)}
                                        className={`inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-medium cursor-pointer transition-all duration-300 ${
                                          prompt.enabled !== false
                                            ? "bg-amber-900/40 text-amber-200/90 border border-amber-600/30 hover:bg-amber-800/50"
                                            : "bg-stone-700/40 text-stone-300/90 border border-stone-500/30 hover:bg-stone-600/50"
                                        }`}
                                      >
                                        <div className="relative mr-1 sm:mr-2 w-6 sm:w-8 h-3 sm:h-4 rounded-full transition-all duration-300" 
                                          style={{ backgroundColor: prompt.enabled !== false ? "rgba(217, 119, 6, 0.4)" : "rgba(87, 83, 78, 0.4)" }}
                                        >
                                          <div className={`absolute top-0.5 w-2 h-2 sm:w-3 sm:h-3 rounded-full transition-all duration-300 ${
                                            prompt.enabled !== false ? "left-3 sm:left-4 bg-amber-400" : "left-0.5 bg-gray-400"
                                          }`}></div>
                                        </div>
                                        <span className="hidden sm:inline">
                                          {prompt.enabled !== false ? t("preset.enabled_prompt") : t("preset.disabled_prompt")}
                                        </span>
                                        <span className="sm:hidden">
                                          {prompt.enabled !== false ? "ON" : "OFF"}
                                        </span>
                                      </button>
                                      {prompt.system_prompt && (
                                        <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded text-[10px] sm:text-xs font-medium bg-blue-900/40 text-blue-200/90 border border-blue-600/30">
                                          <span className="hidden sm:inline">{t("preset.system")}</span>
                                          <span className="sm:hidden">SYS</span>
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex items-center space-x-1 sm:space-x-4">
                                      <button
                                        onClick={() => handleEditPrompt(prompt)}
                                        className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-[#a18d6f] hover:text-[#eae6db] transition-colors duration-300 rounded hover:bg-[#333] group"
                                        title={t("preset.edit")}
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:scale-110">
                                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                        </svg>
                                      </button>
                                      <button
                                        onClick={() => handleDeletePrompt(selectedPreset.id, prompt.identifier)}
                                        className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-red-400 hover:text-red-300 transition-colors duration-300 rounded hover:bg-[#333] group"
                                        title={t("preset.deletePrompt")}
                                      >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:scale-110">
                                          <polyline points="3 6 5 6 21 6"></polyline>
                                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2 2h4a2 2 0 0 1 2 2v2"></path>
                                        </svg>
                                      </button>
                                    </div>
                                  </div>
                                  <h5 className="text-xs sm:text-sm font-medium text-[#eae6db] mb-1.5 sm:mb-2 truncate">{prompt.name}</h5>
                                  {prompt.content && (
                                    <div
                                      className="bg-[#1a1816] border border-[#534741] rounded p-1.5 sm:p-2 text-[10px] sm:text-xs text-[#c0a480] max-h-16 sm:max-h-20 overflow-y-auto cursor-pointer hover:bg-[#1f1d1b] transition-colors duration-200"
                                      onClick={() => handleEditPrompt(prompt)}
                                    >
                                      {prompt.content.substring(0, 150)}
                                      {prompt.content.length > 150 && "..."}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          
          {presets.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-[#a18d6f]">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-50">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              <p className={`text-lg mb-2 ${fontClass}`}>{t("preset.noPresetsFound")}</p>
              <p className={`text-sm opacity-70 ${fontClass}`}>{t("preset.createFirstPreset")}</p>
            </div>
          )}
        </div>
      </div>
      
      <ImportPresetModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={() => {
          setIsImportModalOpen(false);
          loadPresetData();
        }}
      />
      <CreatePresetModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          setIsCreateModalOpen(false);
          loadPresetData();
        }}
      />
      <EditPresetNameModal
        isOpen={isEditNameModalOpen}
        onClose={handleCloseEditNameModal}
        onSuccess={handleSaveEditPresetName}
        presetId={currentEditingPreset?.id || ""}
        currentName={currentEditingPreset?.name || ""}
      />
      <CopyPresetModal
        isOpen={isCopyModalOpen}
        onClose={handleCloseCopyModal}
        onSuccess={handleSaveCopyPreset}
        sourcePresetId={currentCopyingPreset?.id || ""}
        sourcePresetName={currentCopyingPreset?.name || ""}
      />
      <EditPromptModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        presetId={selectedPreset?.id || ""}
        prompt={currentEditingPrompt}
        onSave={handleSaveEditPrompt}
      />
      
      <Toast
        isVisible={errorToast.isVisible}
        message={errorToast.message}
        onClose={hideErrorToast}
        type="error"
      />
    </div>
  );
} 
