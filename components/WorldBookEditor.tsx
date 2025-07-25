"use client";

import { useState, useEffect } from "react";
import { toast } from "react-hot-toast";
import { getWorldBookEntries } from "@/function/worldbook/info";
import { deleteWorldBookEntry } from "@/function/worldbook/delete";
import { saveAdvancedWorldBookEntry } from "@/function/worldbook/edit";
import { bulkToggleWorldBookEntries } from "@/function/worldbook/bulk-operations";
import { getWorldBookSettings } from "@/function/worldbook/settings";
import { useLanguage } from "@/app/i18n";
import WorldBookEntryEditor from "@/components/WorldBookEntryEditor";
import ImportWorldBookModal from "@/components/ImportWorldBookModal";
import { Toast } from "@/components/Toast";
import "@/app/styles/fantasy-ui.css";
import React from "react";
import { v4 as uuidv4 } from "uuid";

// Custom scrollbar styles for the comment section
const commentScrollbarStyles = `
  .comment-scroll::-webkit-scrollbar {
    height: 4px;
  }
  .comment-scroll::-webkit-scrollbar-track {
    background: #1a1816;
    border-radius: 2px;
  }
  .comment-scroll::-webkit-scrollbar-thumb {
    background: #534741;
    border-radius: 2px;
  }
  .comment-scroll::-webkit-scrollbar-thumb:hover {
    background: #6a5a4a;
  }
`;

interface WorldBookEditorProps {
  onClose: () => void;
  characterName: string;
  characterId: string;
}

interface WorldBookEntryData {
  entry_id: string;
  id?: number;
  content: string;
  keys: string[];
  secondary_keys: string[];
  selective: boolean;
  constant: boolean;
  position: string | number;
  insertion_order: number;
  enabled: boolean;
  use_regex: boolean;
  depth: number;
  comment: string;
  tokens?: number;
  extensions?: any;
  primaryKey: string;
  keyCount: number;
  secondaryKeyCount: number;
  contentLength: number;
  isActive: boolean;
  lastUpdated: number;
  isImported: boolean;
  importedAt: number | null;
}

interface EditingEntry {
  entry_id: string;
  id?: number;
  comment: string;
  keys: string[];
  secondary_keys: string[];
  content: string;
  position: number;
  depth: number;
  enabled: boolean;
  use_regex: boolean;
  selective: boolean;
  constant: boolean;
  insertion_order: number;
}

export default function WorldBookEditor({ 
  onClose, 
  characterName, 
  characterId,
}: WorldBookEditorProps) {
  const { t, fontClass,serifFontClass } = useLanguage();
  const [entries, setEntries] = useState<WorldBookEntryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<EditingEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState<string>("position");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [filterBy, setFilterBy] = useState<string>("all");
  const [settings, setSettings] = useState({
    enabled: true,
    contextWindow: 5,
  });
  
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

  const SORT_STORAGE_KEY = `worldbook_sort_${characterId}`;
  const FILTER_STORAGE_KEY = `worldbook_filter_${characterId}`;

  const loadSortPreferences = () => {
    try {
      const stored = localStorage.getItem(SORT_STORAGE_KEY);
      if (stored) {
        const { sortBy: storedSortBy, sortOrder: storedSortOrder } = JSON.parse(stored);
        if (storedSortBy) setSortBy(storedSortBy);
        if (storedSortOrder) setSortOrder(storedSortOrder);
      } else {
        setSortBy("position");
        setSortOrder("asc");
      }
    } catch (error) {
      console.error("Failed to load sort preferences:", error);
      showErrorToast("Failed to load sort preferences");
      setSortBy("position");
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
      showErrorToast("Failed to load filter preferences");
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
      try {
        cleanupOldSortPreferences();
        localStorage.setItem(SORT_STORAGE_KEY, JSON.stringify({
          sortBy: newSortBy,
          sortOrder: newSortOrder,
          timestamp: Date.now(),
        }));
      } catch (retryError) {
        console.error("Failed to save sort preferences after cleanup:", retryError);
      }
    }
  };

  const cleanupOldSortPreferences = () => {
    try {
      const keysToRemove: string[] = [];
      const currentTime = Date.now();
      const maxAge = 30 * 24 * 60 * 60 * 1000;

      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("worldbook_sort_")) {
          try {
            const stored = localStorage.getItem(key);
            if (stored) {
              const data = JSON.parse(stored);
              if (data.timestamp && (currentTime - data.timestamp > maxAge)) {
                keysToRemove.push(key);
              }
            }
          } catch (parseError) {
            keysToRemove.push(key);
          }
        }
      }

      keysToRemove.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error("Failed to cleanup old sort preferences:", error);
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
    loadWorldBookData();
    loadSettings();
    loadSortPreferences();
    loadFilterPreferences();
    cleanupOldSortPreferences();
    
    const timer = setTimeout(() => setAnimationComplete(true), 100);
    return () => clearTimeout(timer);
  }, [characterId]);

  useEffect(() => {
    loadSortPreferences();
    loadFilterPreferences();
  }, [characterId]);

  const loadWorldBookData = async () => {
    try {
      setIsLoading(true);
      const result = await getWorldBookEntries(characterId);
      if (result.success) {
        setEntries(result.entries || []);
      }
    } catch (error) {
      console.error("Failed to load world book entries:", error);
      showErrorToast(t("worldBook.loadingFailed") || "Failed to load world book entries");
    } finally {
      setIsLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const result = await getWorldBookSettings(characterId);
      if (result.success) {
        setSettings(result.settings);
      }
    } catch (error) {
      console.error("Failed to load settings:", error);
      showErrorToast("Failed to load settings");
    }
  };

  const filterEntries = (entries: WorldBookEntryData[], filterBy: string) => {
    if (filterBy === "all") return entries;
    
    return entries.filter(entry => {
      switch (filterBy) {
      case "enabled":
        return entry.isActive;
      case "disabled":
        return !entry.isActive;
      case "constant":
        return entry.constant;
      case "imported":
        return entry.isImported;
      default:
        return true;
      }
    });
  };

  const sortEntries = (entries: WorldBookEntryData[], sortBy: string, sortOrder: "asc" | "desc") => {
    const sorted = [...entries].sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
      case "position":
        const positionA = typeof a.position === "number" ? a.position : 4;
        const positionB = typeof b.position === "number" ? b.position : 4;
        comparison = positionA - positionB;
        break;
      case "priority":
        comparison = a.insertion_order - b.insertion_order;
        break;
      case "characterCount":
        comparison = a.contentLength - b.contentLength;
        break;
      case "keywords":
        comparison = a.keyCount - b.keyCount;
        break;
      case "comment":
        const commentA = a.comment || a.primaryKey || "";
        const commentB = b.comment || b.primaryKey || "";
        comparison = commentA.localeCompare(commentB);
        break;
      case "depth":
        comparison = a.depth - b.depth;
        break;
      case "lastUpdated":
        comparison = a.lastUpdated - b.lastUpdated;
        break;
      default:
        const defaultPosA = typeof a.position === "number" ? a.position : 4;
        const defaultPosB = typeof b.position === "number" ? b.position : 4;
        comparison = defaultPosA - defaultPosB;
      }

      if (sortOrder === "desc") {
        comparison = -comparison;
      }
      
      if (comparison === 0) {
        const orderComparison = a.insertion_order - b.insertion_order;
        if (orderComparison !== 0) {
          return orderComparison;
        }
        
        return a.entry_id.localeCompare(b.entry_id);
      }
      
      return comparison;
    });
    
    return sorted;
  };

  const filteredEntries = filterEntries(entries, filterBy);
  const sortedEntries = sortEntries(filteredEntries, sortBy, sortOrder);

  const handleEditEntry = (entry?: WorldBookEntryData) => {
    if (entry) {
      setEditingEntry({
        entry_id: entry.entry_id,
        id: entry.id,
        comment: entry.comment || "",
        keys: entry.keys || [],
        secondary_keys: entry.secondary_keys || [],
        content: entry.content || "",
        position: typeof entry.position === "number" ? entry.position : 4,
        depth: entry.depth || 1,
        enabled: entry.enabled !== false,
        use_regex: entry.use_regex || false,
        selective: entry.selective || false,
        constant: entry.constant || false,
        insertion_order: entry.insertion_order || 0,
      });
    } else {
      setEditingEntry({
        entry_id: `entry_${uuidv4()}`,
        id: entries.length + 1,
        comment: "",
        keys: [""],
        secondary_keys: [],
        content: "",
        position: 4,
        depth: 1,
        enabled: true,
        use_regex: false,
        selective: false,
        constant: false,
        insertion_order: 0,
      });
    }
    setIsEditModalOpen(true);
  };

  const handleSaveEntry = async () => {
    if (!editingEntry) return;

    if (!editingEntry.content.trim()) {
      showErrorToast(t("worldBook.contentRequired") || "Content is required");
      return;
    }

    setIsSaving(true);
    try {
      const result = await saveAdvancedWorldBookEntry(characterId, {
        entry_id: editingEntry.entry_id,
        content: editingEntry.content,
        keys: editingEntry.keys.filter(k => k.trim()),
        secondary_keys: editingEntry.secondary_keys.filter(k => k.trim()),
        comment: editingEntry.comment,
        position: editingEntry.position,
        depth: editingEntry.depth,
        enabled: editingEntry.enabled,
        use_regex: editingEntry.use_regex,
        selective: editingEntry.selective,
        constant: editingEntry.constant,
        insertion_order: editingEntry.insertion_order,
      });

      if (result.success) {
        toast.success(t("worldBook.saveSuccess"));
        
        const updatedEntry = {
          entry_id: editingEntry.entry_id,
          id: editingEntry.id,
          content: editingEntry.content,
          keys: editingEntry.keys.filter(k => k.trim()),
          secondary_keys: editingEntry.secondary_keys.filter(k => k.trim()),
          selective: editingEntry.selective,
          constant: editingEntry.constant,
          position: editingEntry.position,
          insertion_order: editingEntry.insertion_order,
          enabled: editingEntry.enabled,
          use_regex: editingEntry.use_regex,
          depth: editingEntry.depth,
          comment: editingEntry.comment,
          tokens: editingEntry.content.length,
          extensions: {},
          primaryKey: editingEntry.keys.filter(k => k.trim())[0] || "",
          keyCount: editingEntry.keys.filter(k => k.trim()).length,
          secondaryKeyCount: editingEntry.secondary_keys.filter(k => k.trim()).length,
          contentLength: editingEntry.content.length,
          isActive: editingEntry.enabled,
          lastUpdated: Date.now(),
          isImported: false,
          importedAt: null,
        };

        setEntries(prev => {
          const existingIndex = prev.findIndex(e => e.entry_id === editingEntry.entry_id);
          if (existingIndex >= 0) {
            const newEntries = [...prev];
            newEntries[existingIndex] = updatedEntry;
            return newEntries;
          } else {
            return [...prev, updatedEntry];
          }
        });
        
        setIsEditModalOpen(false);
        setEditingEntry(null);
      }
    } catch (error) {
      console.error("Save failed:", error);
      showErrorToast(t("worldBook.saveFailed") || "Failed to save entry");
    } finally {
      setIsSaving(false);
    }
  };

  const toggleRowExpansion = (entryId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(entryId)) {
      newExpanded.delete(entryId);
    } else {
      newExpanded.add(entryId);
    }
    setExpandedRows(newExpanded);
  };

  const getPositionText = (position: string | number) => {
    const positionMap: Record<string | number, string> = {
      0: t("worldBook.positionOptions.systemPromptStart"),
      1: t("worldBook.positionOptions.afterSystemPrompt"), 
      2: t("worldBook.positionOptions.userMessageStart"),
      3: t("worldBook.positionOptions.afterResponseMode"),
      4: t("worldBook.positionOptions.basedOnDepth"),
    };
    return positionMap[position] || "Unknown";
  };

  const handleBulkToggleAll = async (enabled: boolean) => {
    if (filteredEntries.length === 0) {
      showErrorToast(t("worldBook.noEntries") || "No entries selected");
      return;
    }

    const entryIds = filteredEntries.map(entry => entry.entry_id);
    
    setEntries(prev =>
      prev.map(entry =>
        entryIds.includes(entry.entry_id)
          ? { ...entry, isActive: enabled, enabled: enabled }
          : entry,
      ),
    );

    try {
      const result = await bulkToggleWorldBookEntries(
        characterId,
        entryIds,
        enabled,
      );
      
      if (result.success) {
        const action = enabled ? t("worldBook.enabledAll") : t("worldBook.disabledAll");
        const filterText = filterBy !== "all" ? ` (${t("worldBook.filtered")})` : "";
        toast.success(`${action} ${filteredEntries.length} ${t("worldBook.items")}${filterText}`);
      } else {
        setEntries(prev =>
          prev.map(entry =>
            entryIds.includes(entry.entry_id)
              ? { ...entry, isActive: !enabled, enabled: !enabled }
              : entry,
          ),
        );
        showErrorToast(t("worldBook.bulkOperationFailed") || "Bulk operation failed");
      }
    } catch (error) {
      setEntries(prev =>
        prev.map(entry =>
          entryIds.includes(entry.entry_id)
            ? { ...entry, isActive: !enabled, enabled: !enabled }
            : entry,
        ),
      );
      console.error("Bulk toggle failed:", error);
      showErrorToast(t("worldBook.bulkOperationFailed") || "Bulk operation failed");
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    try {
      const result = await deleteWorldBookEntry(characterId, entryId);
      if (result.success) {
        toast.success(t("worldBook.deleteSuccess"));
        
        setEntries(prev => prev.filter(entry => entry.entry_id !== entryId));
        
        setExpandedRows(prev => {
          const newExpanded = new Set(prev);
          newExpanded.delete(entryId);
          return newExpanded;
        });
      }
    } catch (error) {
      console.error("Delete failed:", error);
      showErrorToast(t("worldBook.deleteFailed") || "Failed to delete entry");
    }
  };

  const handleToggleEntry = async (entryId: string, newEnabled: boolean) => {
    setEntries(prev =>
      prev.map(entry =>
        entry.entry_id === entryId 
          ? { ...entry, isActive: newEnabled, enabled: newEnabled }
          : entry,
      ),
    );

    try {
      const result = await bulkToggleWorldBookEntries(
        characterId,
        [entryId],
        newEnabled,
      );
      
      if (result.success) {
        const action = newEnabled ? t("worldBook.enabled") : t("worldBook.disabled");
        toast.success(`${action} 1 ${t("worldBook.item")}`);
      } else {
        setEntries(prev =>
          prev.map(entry =>
            entry.entry_id === entryId 
              ? { ...entry, isActive: !newEnabled, enabled: !newEnabled }
              : entry,
          ),
        );
        showErrorToast(t("worldBook.toggleFailed") || "Failed to toggle entry");
      }
    } catch (error) {
      setEntries(prev =>
        prev.map(entry =>
          entry.entry_id === entryId 
            ? { ...entry, isActive: !newEnabled, enabled: !newEnabled }
            : entry,
        ),
      );
      console.error("Toggle failed:", error);
      showErrorToast(t("worldBook.toggleFailed") || "Failed to toggle entry");
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
          <p className="mt-4 text-[#c0a480] magical-text">{t("worldBook.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col breathing-bg text-[#eae6db]">
      <style dangerouslySetInnerHTML={{ __html: commentScrollbarStyles }} />
      <div className="p-2 sm:p-3 border-b border-[#534741] bg-[#252220] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent opacity-50"></div>
        <div className="relative z-10 flex justify-between items-center min-h-[2rem]">
          <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
            <h2 className="text-base sm:text-lg font-medium text-[#eae6db] flex-shrink-0">
              <span className={`bg-clip-text text-transparent bg-gradient-to-r from-amber-500 via-orange-400 to-yellow-300 ${serifFontClass}`}>
                {t("worldBook.title")}
              </span>
              <span className={`ml-1 sm:ml-2 text-xs sm:text-sm text-[#a18d6f] ${serifFontClass} inline-block truncate max-w-[100px] sm:max-w-[150px] align-bottom`} title={characterName}>- {characterName}</span>
            </h2>
            <div className={`hidden md:flex items-center space-x-2 text-xs text-[#a18d6f] ${serifFontClass} flex-shrink-0`}>
              <span className="whitespace-nowrap">{t("worldBook.totalCount")} {entries.length}</span>
              <span>•</span>
              <span className="text-amber-400 whitespace-nowrap">{t("worldBook.enabledCount")} {entries.filter(e => e.isActive).length}</span>
              <span>•</span>
              <span className="text-rose-400 whitespace-nowrap">{t("worldBook.disabledCount")} {entries.filter(e => !e.isActive).length}</span>
              {filterBy !== "all" && (
                <>
                  <span>•</span>
                  <span className="text-blue-400 whitespace-nowrap">{t("worldBook.filteredCount")} {filteredEntries.length}</span>
                </>
              )}
            </div>
            <div className={`md:hidden flex items-center space-x-1 text-[10px] sm:text-xs text-[#a18d6f] ${serifFontClass} flex-shrink-0`}>
              <span className="bg-[#1a1816] px-1.5 sm:px-2 py-1 rounded border border-[#534741] whitespace-nowrap">
                {entries.length} / {entries.filter(e => e.isActive).length} / {entries.filter(e => !e.isActive).length}
                {filterBy !== "all" && ` (${filteredEntries.length})`}
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
              onClick={() => handleEditEntry()}
              className="px-2 sm:px-3 py-1 sm:py-1.5 bg-gradient-to-r from-[#1f1c1a] to-[#13100e] hover:from-[#282521] hover:to-[#1a1613] text-[#e9c08d] hover:text-[#f6daae] rounded-md transition-all duration-300 text-xs sm:text-sm font-medium shadow-lg hover:shadow-[#f8b758]/20 group flex-shrink-0 border border-[#403a33]"
            >
              <span className={`flex items-center ${serifFontClass}`}>
                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1 sm:mr-1.5 transition-transform duration-300 group-hover:scale-110">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                <span className="hidden sm:inline">{t("worldBook.createEntry")}</span>
                <span className="sm:hidden">{t("worldBook.createEntry")}</span>
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
                <span className="hidden sm:inline">{t("worldBook.importWorldBook")}</span>
                <span className="sm:hidden">{t("worldBook.importWorldBook")}</span>
              </span>
            </button>
          </div>
          
          <div className="flex items-center space-x-2 text-[10px] sm:text-xs text-[#a18d6f] bg-[#252220] px-1.5 sm:px-2 py-1 rounded border border-[#534741] flex-shrink-0">
            <span className="whitespace-nowrap">{t("worldBook.contextWindow")} {settings.contextWindow}</span>
          </div>
        </div>
      </div>
      {/* Sort and Filter Controls - Sticky Position */}
      <div className="sticky top-0 z-20 bg-[#1a1816] border-b border-[#534741]/40 p-2 sm:p-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="flex items-center gap-1 sm:gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400/80">
                <path d="M3 6h18M7 12h10m-7 6h4"></path>
              </svg>
              <label className={`text-[10px] sm:text-xs text-[#a18d6f] font-medium ${serifFontClass}`}>
                {t("worldBook.sortBy")}
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
                <option value="position" className="bg-[#1a1816] text-[#eae6db]">{t("worldBook.position")}</option>
                <option value="priority" className="bg-[#1a1816] text-[#eae6db]">{t("worldBook.priority")}</option>
                <option value="characterCount" className="bg-[#1a1816] text-[#eae6db]">{t("worldBook.characterCount")}</option>
                <option value="keywords" className="bg-[#1a1816] text-[#eae6db]">{t("worldBook.keywords")}</option>
                <option value="comment" className="bg-[#1a1816] text-[#eae6db]">{t("worldBook.comment")}</option>
                <option value="depth" className="bg-[#1a1816] text-[#eae6db]">{t("worldBook.depth")}</option>
                <option value="lastUpdated" className="bg-[#1a1816] text-[#eae6db]">{t("worldBook.lastUpdated")}</option>
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
              {t("worldBook.sortOrder")}:
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
              title={sortOrder === "asc" ? t("worldBook.ascending") : t("worldBook.descending")}
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
                {sortOrder === "asc" ? t("worldBook.asc") : t("worldBook.desc")}
              </span>
              <div className="absolute inset-0 rounded-md bg-gradient-to-r from-transparent via-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            </button>
          </div>
              
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="flex items-center gap-1 sm:gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400/80">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
              </svg>
              <label className={`text-[10px] sm:text-xs text-[#a18d6f] font-medium ${serifFontClass}`}>
                {t("worldBook.filterBy")}
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
                <option value="all" className="bg-[#1a1816] text-[#eae6db]">{t("worldBook.filterAll")}</option>
                <option value="enabled" className="bg-[#1a1816] text-[#eae6db]">{t("worldBook.filterEnabled")}</option>
                <option value="disabled" className="bg-[#1a1816] text-[#eae6db]">{t("worldBook.filterDisabled")}</option>
                <option value="constant" className="bg-[#1a1816] text-[#eae6db]">{t("worldBook.filterConstant")}</option>
                <option value="imported" className="bg-[#1a1816] text-[#eae6db]">{t("worldBook.filterImported")}</option>
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
      
      <div className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto fantasy-scrollbar pb-15">
          <table className="w-full table-fixed">
            <thead className="sticky top-0 bg-[#252220] border-b border-[#534741] z-10">
              <tr>
                <th className={`w-12 sm:w-16 p-1.5 sm:p-3 text-left text-[10px] sm:text-xs font-medium text-[#a18d6f] uppercase tracking-wider whitespace-nowrap ${fontClass}`}>{t("worldBook.toggle")}</th>
                <th className={`w-24 sm:w-32 p-1.5 sm:p-3 text-left text-[10px] sm:text-xs font-medium text-[#a18d6f] uppercase tracking-wider whitespace-nowrap ${fontClass}`}>{t("worldBook.status")}</th>
                <th className={`w-24 sm:w-32 p-1.5 sm:p-3 text-left text-[10px] sm:text-xs font-medium text-[#a18d6f] uppercase tracking-wider whitespace-nowrap ${fontClass}`}>{t("worldBook.comment")}</th>
                <th className={`w-24 sm:w-32 p-1.5 sm:p-3 text-left text-[10px] sm:text-xs font-medium text-[#a18d6f] uppercase tracking-wider whitespace-nowrap ${fontClass}`}>{t("worldBook.keywords")}</th>
                <th className={`w-20 sm:w-28 p-1.5 sm:p-3 text-left text-[10px] sm:text-xs font-medium text-[#a18d6f] uppercase tracking-wider whitespace-nowrap ${fontClass}`}>{t("worldBook.position")}</th>
                <th className={`w-12 sm:w-16 p-1.5 sm:p-3 text-left text-[10px] sm:text-xs font-medium text-[#a18d6f] uppercase tracking-wider whitespace-nowrap ${fontClass}`}>{t("worldBook.depth")}</th>
                <th className={`w-16 sm:w-20 p-1.5 sm:p-3 text-left text-[10px] sm:text-xs font-medium text-[#a18d6f] uppercase tracking-wider whitespace-nowrap ${fontClass}`}>{t("worldBook.characterCount")}</th>
                <th className={`w-16 sm:w-20 p-1.5 sm:p-3 text-left text-[10px] sm:text-xs font-medium text-[#a18d6f] uppercase tracking-wider whitespace-nowrap ${fontClass}`}>{t("worldBook.priority")}</th>
                <th className={`w-16 sm:w-20 p-1.5 sm:p-3 text-left text-[10px] sm:text-xs font-medium text-[#a18d6f] uppercase tracking-wider whitespace-nowrap ${fontClass}`}>{t("worldBook.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {sortedEntries.map((entry, index) => (
                <React.Fragment key={entry.entry_id}>
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
                        onClick={() => handleToggleEntry(entry.entry_id, !entry.isActive)}
                        className={`relative inline-flex h-5 w-9 sm:h-6 sm:w-11 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1a1816] backdrop-blur-sm ${
                          entry.isActive 
                            ? "bg-gradient-to-r from-slate-700/80 via-amber-800/60 to-slate-700/80 border border-amber-600/40 focus:ring-amber-500/50" 
                            : "bg-gradient-to-r from-slate-700/60 via-stone-600/40 to-slate-700/60 border border-stone-500/30 focus:ring-stone-400/50"
                        }`}
                        title={entry.isActive ? t("worldBook.disableEntry") : t("worldBook.enableEntry")}
                      >
                        <span
                          className={`inline-block h-3 w-3 sm:h-4 sm:w-4 transform rounded-full shadow-lg transition-all duration-300 ${
                            entry.isActive 
                              ? "translate-x-5 sm:translate-x-6 bg-gradient-to-br from-amber-300 via-amber-200 to-amber-300 shadow-amber-400/30" 
                              : "translate-x-1 bg-gradient-to-br from-stone-300 via-stone-200 to-stone-300 shadow-stone-400/30"
                          }`}
                        />
                      </button>
                    </td>
                    <td className="p-1.5 sm:p-3">
                      <div className="flex items-center space-x-1 sm:space-x-2">
                        <div className="flex items-center flex-wrap gap-1 sm:gap-1.5">
                          <div className="flex items-center space-x-1 sm:space-x-1.5">
                            <span className={`inline-flex items-center px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium whitespace-nowrap transition-all duration-300 backdrop-blur-sm border ${
                              entry.isActive 
                                ? "bg-gradient-to-br from-slate-800/60 via-amber-900/40 to-slate-800/60 text-amber-200/90 border-amber-600/30 hover:from-slate-700/70 hover:via-amber-800/50 hover:to-slate-700/70 hover:border-amber-500/40 hover:text-amber-100 hover:shadow-lg hover:shadow-amber-500/10" 
                                : "bg-gradient-to-br from-slate-800/60 via-stone-700/40 to-slate-800/60 text-stone-300/90 border-stone-500/30 hover:from-slate-700/70 hover:via-stone-600/50 hover:to-slate-700/70 hover:border-stone-400/40 hover:text-stone-200 hover:shadow-lg hover:shadow-stone-500/10"
                            }`}>
                              <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full mr-1 sm:mr-2 ${
                                entry.isActive ? "bg-amber-400/80 shadow-sm shadow-amber-400/50" : "bg-stone-400/80 shadow-sm shadow-stone-400/50"
                              }`}></span>
                              <span className="hidden sm:inline">{entry.isActive ? t("worldBook.enabled") : t("worldBook.disabled")}</span>
                              <span className="sm:hidden">{entry.isActive ? "ON" : "OFF"}</span>
                            </span>
                          </div>
                          {entry.constant && (
                            <span className="inline-flex items-center px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-all duration-300 backdrop-blur-sm border bg-gradient-to-br from-slate-800/60 via-slate-700/40 to-slate-800/60 text-slate-300/90 border-slate-500/30 hover:from-slate-700/70 hover:via-slate-600/50 hover:to-slate-700/70 hover:border-slate-400/40 hover:text-slate-200 hover:shadow-lg hover:shadow-slate-500/10">
                              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-slate-400/80 rounded-full mr-1 sm:mr-2 shadow-sm shadow-slate-400/50"></span>
                              <span className="hidden sm:inline">{t("worldBook.constant")}</span>
                              <span className="sm:hidden">C</span>
                            </span>
                          )}
                          {entry.isImported && (
                            <span className="inline-flex items-center px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-medium transition-all duration-300 backdrop-blur-sm border bg-gradient-to-br from-slate-800/60 via-blue-700/40 to-slate-800/60 text-blue-300/90 border-blue-500/30 hover:from-slate-700/70 hover:via-blue-600/50 hover:to-slate-700/70 hover:border-blue-400/40 hover:text-blue-200 hover:shadow-lg hover:shadow-blue-500/10">
                              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-400/80 rounded-full mr-1 sm:mr-2 shadow-sm shadow-blue-400/50"></span>
                              <span className="hidden sm:inline">{t("worldBook.imported")}</span>
                              <span className="sm:hidden">I</span>
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => toggleRowExpansion(entry.entry_id)}
                          className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-[#a18d6f] hover:text-[#eae6db] transition-colors duration-300 rounded hover:bg-[#333] ml-1 sm:ml-2"
                          title={expandedRows.has(entry.entry_id) ? "收起详情" : "展开详情"}
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
                            className={`transition-transform duration-300 ${expandedRows.has(entry.entry_id) ? "rotate-90" : ""}`}
                          >
                            <path d="M9 18l6-6-6-6"></path>
                          </svg>
                        </button>
                      </div>
                    </td>
                    <td className="p-1.5 sm:p-3 text-xs sm:text-sm text-[#eae6db] max-w-xs">
                      <div 
                        className="comment-scroll relative overflow-x-auto max-w-[120px] sm:max-w-[150px]"
                        style={{ 
                          scrollbarWidth: "thin",
                          scrollbarColor: "#534741 #1a1816",
                        }}
                      >
                        <span 
                          className="block whitespace-nowrap py-1 px-2 rounded bg-[#1a1816]/50 border border-[#534741]/30 hover:border-[#534741]/60 transition-all duration-200 cursor-text select-text"
                          title={entry.comment || entry.primaryKey || t("worldBook.noComment")}
                        >
                          {entry.comment || entry.primaryKey || t("worldBook.noComment")}
                        </span>
                      </div>
                    </td>
                    <td className="p-1.5 sm:p-3">
                      <div className="flex flex-wrap gap-1 sm:gap-1.5">
                        {entry.keys.slice(0, 1).map((key, i) => (
                          <span 
                            key={i} 
                            className="inline-flex items-center text-[10px] sm:text-xs bg-gradient-to-br from-slate-800/60 via-amber-900/30 to-slate-800/60 backdrop-blur-sm border border-amber-600/20 text-amber-200/90 px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-lg font-medium hover:from-slate-700/70 hover:via-amber-800/40 hover:to-slate-700/70 hover:border-amber-500/30 hover:text-amber-100 hover:shadow-lg hover:shadow-amber-500/10 transition-all duration-200 cursor-default"
                            title={key}
                          >
                            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-amber-400/70 rounded-full mr-1 sm:mr-2 shadow-sm shadow-amber-400/50"></span>
                            <span className="truncate max-w-[40px] sm:max-w-[80px]">{key}</span>
                          </span>
                        ))}
                        {entry.keys.length > 1 && (
                          <span 
                            className="inline-flex items-center text-[10px] sm:text-xs bg-gradient-to-br from-slate-800/60 via-slate-700/40 to-slate-800/60 backdrop-blur-sm border border-slate-500/20 text-slate-300/90 px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-lg font-medium cursor-default hover:from-slate-700/70 hover:via-slate-600/50 hover:to-slate-700/70 hover:border-slate-400/30 hover:text-slate-200 hover:shadow-lg hover:shadow-slate-500/10 transition-all duration-200"
                            title={`还有 ${entry.keys.length - 1} 个关键词: ${entry.keys.slice(1).join(", ")}`}
                          >
                            <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-slate-400/70 rounded-full mr-1 sm:mr-2 shadow-sm shadow-slate-400/50"></span>
                            +{entry.keys.length - 1}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-1.5 sm:p-3 text-xs sm:text-sm text-[#c0a480] whitespace-nowrap overflow-hidden">
                      <span className="block truncate text-[10px] sm:text-sm" title={getPositionText(entry.position)}>
                        {getPositionText(entry.position)}
                      </span>
                    </td>
                    <td className="p-1.5 sm:p-3 text-xs sm:text-sm text-[#c0a480]">
                      {entry.depth}
                    </td>
                    <td className="p-1.5 sm:p-3 text-xs sm:text-sm text-[#c0a480]">
                      {entry.contentLength}
                    </td>
                    <td className="p-1.5 sm:p-3 text-xs sm:text-sm text-[#c0a480]">
                      {entry.insertion_order}
                    </td>
                    <td className="p-1.5 sm:p-3">
                      <div className="flex items-center space-x-0.5 sm:space-x-1">
                        <button
                          onClick={() => handleEditEntry(entry)}
                          className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-[#a18d6f] hover:text-[#eae6db] transition-colors duration-300 rounded hover:bg-[#333] group"
                          title={t("worldBook.edit")}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:scale-110">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteEntry(entry.entry_id)}
                          className="w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-red-400 hover:text-red-300 transition-colors duration-300 rounded hover:bg-[#333] group"
                          title={t("worldBook.delete")}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform duration-300 group-hover:scale-110">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2 2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>

                  {expandedRows.has(entry.entry_id) && (
                    <tr className="border-b border-[#534741] bg-gradient-to-b from-[#1a1816] to-[#15120f] transition-all duration-300 animate-fadeIn">
                      <td colSpan={9} className="p-2 sm:p-4">
                        <div 
                          className="space-y-2 sm:space-y-3 relative overflow-hidden rounded-md group/expanded cursor-pointer transition-all duration-300 hover:shadow-md hover:shadow-amber-500/10"
                          onClick={() => handleEditEntry(entry)}
                        >
                          <div className="absolute bottom-0 left-0 h-[1px] bg-gradient-to-r from-transparent via-[#f8d36a] to-transparent w-0 group-hover/expanded:w-full transition-all duration-500"></div>
                          <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent opacity-0 group-hover/expanded:opacity-100 transition-opacity duration-300"></div>
                          <div className="relative z-10">
                            <div>
                              <h4 className="text-xs sm:text-sm font-medium text-[#a18d6f] mb-1 sm:mb-2 group-hover/expanded:text-amber-400 transition-colors duration-300 flex items-center justify-between">
                                <div className="flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1 sm:mr-2 group-hover/expanded:text-amber-400 transition-colors duration-300">
                                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                    <polyline points="14 2 14 8 20 8"></polyline>
                                    <line x1="16" y1="13" x2="8" y2="13"></line>
                                    <line x1="16" y1="17" x2="8" y2="17"></line>
                                    <polyline points="10 9 9 9 8 9"></polyline>
                                  </svg>
                                  {t("worldBook.contentPreview")}
                                </div>
                                <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-gradient-to-r from-[#1f1c1a] to-[#13100e] hover:from-[#282521] hover:to-[#1a1613] text-[#e9c08d] hover:text-[#f6daae] rounded-md transition-all duration-300 text-[10px] sm:text-xs font-medium shadow-lg hover:shadow-[#f8b758]/20 border border-[#403a33] inline-flex items-center opacity-0 group-hover/expanded:opacity-100">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-0.5 sm:mr-1">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                  </svg>
                                  {t("worldBook.edit")}
                                </span>
                              </h4>
                              <div className="bg-[#252220] border border-[#534741] rounded-md p-2 sm:p-3 text-xs sm:text-sm text-[#eae6db] max-h-24 sm:max-h-32 overflow-y-auto fantasy-scrollbar group-hover/expanded:border-[#606060] transition-all duration-300 group-hover/expanded:shadow-inner whitespace-pre-wrap">
                                {entry.content ? entry.content.split("\n").map((line, i) => (
                                  <React.Fragment key={i}>
                                    {line}
                                    {i < entry.content.split("\n").length - 1 && <br />}
                                  </React.Fragment>
                                )) : t("worldBook.noContent")}
                              </div>
                            </div>
                            
                            {entry.secondary_keys.length > 0 && (
                              <div>
                                <h4 className="text-xs sm:text-sm font-medium text-[#a18d6f] mb-1 sm:mb-2 mt-2 sm:mt-3 group-hover/expanded:text-amber-400 transition-colors duration-300 flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1 sm:mr-2 group-hover/expanded:text-amber-400 transition-colors duration-300">
                                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                                    <line x1="7" y1="7" x2="7.01" y2="7"></line>
                                  </svg>
                                  {t("worldBook.secondaryKeywords")}
                                </h4>
                                <div className="flex flex-wrap gap-1 sm:gap-1.5">
                                  {entry.secondary_keys.map((key, i) => (
                                    <span 
                                      key={i} 
                                      className="inline-flex items-center text-[10px] sm:text-xs bg-gradient-to-br from-slate-800/60 via-blue-900/30 to-slate-800/60 backdrop-blur-sm border border-blue-600/20 text-blue-200/90 px-1.5 sm:px-3 py-1 sm:py-1.5 rounded-lg font-medium hover:from-slate-700/70 hover:via-blue-800/40 hover:to-slate-700/70 hover:border-blue-500/30 hover:text-blue-100 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-200"
                                      title={key}
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-blue-400/70 rounded-full mr-1 sm:mr-2 shadow-sm shadow-blue-400/50"></span>
                                      <span className="truncate max-w-[60px] sm:max-w-[100px]">{key}</span>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            <div className="grid grid-cols-2 gap-2 sm:gap-4 text-[10px] sm:text-xs mt-2 sm:mt-3 bg-[#1a1816]/60 p-2 sm:p-3 rounded-md border border-[#534741]/30 group-hover/expanded:border-[#534741]/60 transition-all duration-300">
                              <div>
                                <span className="text-[#a18d6f] group-hover/expanded:text-amber-400/70 transition-colors duration-300">{t("worldBook.selectiveMatching")}</span>
                                <span className="ml-1 sm:ml-2 text-[#eae6db]">{entry.selective ? t("worldBook.yes") : t("worldBook.no")}</span>
                              </div>
                              <div>
                                <span className="text-[#a18d6f] group-hover/expanded:text-amber-400/70 transition-colors duration-300">{t("worldBook.tokenCount")}</span>
                                <span className="ml-1 sm:ml-2 text-[#eae6db]">{entry.tokens || t("worldBook.notCalculated")}</span>
                              </div>
                              <div>
                                <span className="text-[#a18d6f] group-hover/expanded:text-amber-400/70 transition-colors duration-300">{t("worldBook.lastUpdated")}</span>
                                <span className="ml-1 sm:ml-2 text-[#eae6db]">
                                  {new Date(entry.lastUpdated).toLocaleDateString()}
                                </span>
                              </div>
                              <div>
                                <span className="text-[#a18d6f] group-hover/expanded:text-amber-400/70 transition-colors duration-300">{t("worldBook.totalKeywords")}</span>
                                <span className="ml-1 sm:ml-2 text-[#eae6db]">{entry.keyCount + entry.secondaryKeyCount}</span>
                              </div>
                              {entry.isImported && entry.importedAt && (
                                <div className="col-span-2">
                                  <span className="text-[#a18d6f] group-hover/expanded:text-amber-400/70 transition-colors duration-300">{t("worldBook.importedAt")}</span>
                                  <span className="ml-1 sm:ml-2 text-[#eae6db]">
                                    {new Date(entry.importedAt).toLocaleDateString()}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
          
          {entries.length === 0 && (
            <div className="flex flex-col items-center justify-center h-64 text-[#a18d6f]">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4 opacity-50">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              <p className={`text-lg mb-2 ${fontClass}`}>{t("worldBook.noEntries")}</p>
              <p className={`text-sm opacity-70 ${fontClass}`}>{t("worldBook.noEntriesDescription")}</p>
            </div>
          )}
        </div>
      </div>
      
      <WorldBookEntryEditor
        isOpen={isEditModalOpen}
        editingEntry={editingEntry}
        isSaving={isSaving}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingEntry(null);
        }}
        onSave={handleSaveEntry}
        onEntryChange={setEditingEntry}
      />
      
      <ImportWorldBookModal
        isOpen={isImportModalOpen}
        characterId={characterId}
        onClose={() => setIsImportModalOpen(false)}
        onImportSuccess={() => {
          setIsImportModalOpen(false);
          loadWorldBookData();
        }}
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
