/**
 * Download Character Modal Component
 * 
 * This component provides a character download interface with the following features:
 * - GitHub character repository integration
 * - Tag-based character categorization and filtering
 * - Character preview and selection with optimized image loading
 * - Download and import functionality
 * - Character information extraction
 * - Loading states and error handling
 * - Grid-based character display with tag filtering
 * - Image preloading and browser caching
 * 
 * The component handles:
 * - GitHub API integration for character fetching
 * - Tag-based filtering and categorization
 * - Character file download and processing
 * - Character information parsing and display
 * - Import functionality integration
 * - Loading states and error management
 * - Modal state management and animations
 * - Image preloading and caching optimization
 * 
 * Dependencies:
 * - useLanguage: For internationalization
 * - handleCharacterUpload: For character import functionality
 * - framer-motion: For animations
 */

"use client";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { handleCharacterUpload } from "@/function/character/import";
import { useLanguage } from "@/app/i18n";

const GITHUB_API_URL = "https://api.github.com/repos/Narratium/Character-Card/contents";
const RAW_BASE_URL = "https://raw.githubusercontent.com/Narratium/Character-Card/main/";

// Cache configuration
const CACHE_KEY = "narratium_character_files";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 1 day
const IMAGE_CACHE_KEY = "narratium_character_images";
const IMAGE_CACHE_DURATION = 24 * 60 * 60 * 1000; // 1 day

/**
 * Interface definitions for the component's props and data structures
 */
interface DownloadCharacterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: () => void;
}

interface GithubFile {
  name: string;
  download_url: string;
  sha?: string;
  size?: number;
}

interface CharacterInfo {
  displayName: string;
  tags: string[];
}

interface CacheData {
  data: GithubFile[];
  timestamp: number;
  fileHashes: Record<string, string>;
}

interface ImageCacheData {
  [key: string]: {
    loaded: boolean;
    timestamp: number;
  };
}

// Hardcoded tag definitions for character categorization
const TAGS = [
  "Cultivation", "Fantasy", "NSFW", "Fanfiction", "Anime", "Other",
];

// Tag detection keywords mapping
const TAG_KEYWORDS: Record<string, string[]> = {
  "Cultivation": ["x", "cultivation", "仙侠", "immortal", "修仙"],
  "Fantasy": ["玄幻", "fantasy", "魔法", "magic", "奇幻"],
  "NSFW": ["nsfw", "adult", "18+", "mature", "r18"],
  "Fanfiction": ["同人", "fanfiction", "fan", "二创", "doujin"],
  "Anime": ["二次元", "anime", "动漫", "萌", "waifu", "少女", "萝莉", "御姐"],
};

/**
 * Download character modal component with tag-based categorization and optimized loading
 * 
 * Provides a character download interface with:
 * - GitHub character repository integration
 * - Tag-based filtering and categorization
 * - Character preview and selection
 * - Download and import functionality
 * - Character information extraction
 * - Grid-based display and loading states
 * - Image preloading and browser caching
 * 
 * @param {DownloadCharacterModalProps} props - Component props
 * @returns {JSX.Element | null} The download character modal or null if closed
 */
export default function DownloadCharacterModal({ isOpen, onClose, onImport }: DownloadCharacterModalProps) {
  const { t, fontClass, serifFontClass } = useLanguage();
  const [characterFiles, setCharacterFiles] = useState<GithubFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string>("all");
  const [imageLoadingStates, setImageLoadingStates] = useState<Record<string, boolean>>({});
  const [preloadingImages, setPreloadingImages] = useState(false);
  const [loadingStage, setLoadingStage] = useState<"fetching" | "preloading" | "complete">("fetching");
  const [nsfwViewStates, setNsfwViewStates] = useState<Record<string, boolean>>({});
  const [isMobile, setIsMobile] = useState(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Cache management functions
  const getCachedData = useCallback((): { data: GithubFile[], hashes: Record<string, string> } | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp, fileHashes }: CacheData = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          return { data, hashes: fileHashes || {} };
        }
      }
    } catch (error) {
      console.warn("Failed to read cache:", error);
    }
    return null;
  }, []);

  const setCachedData = useCallback((data: GithubFile[]) => {
    try {
      const fileHashes: Record<string, string> = {};
      data.forEach(file => {
        if (file.sha) {
          fileHashes[file.name] = file.sha;
        }
      });
      
      const cacheData: CacheData = {
        data,
        timestamp: Date.now(),
        fileHashes,
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.warn("Failed to cache data:", error);
    }
  }, []);

  const getImageCache = useCallback((currentFileNames?: string[]): ImageCacheData => {
    try {
      const cached = localStorage.getItem(IMAGE_CACHE_KEY);
      if (cached) {
        const cache: ImageCacheData = JSON.parse(cached);
        const now = Date.now();
        
        // Clean expired entries and entries that no longer exist in current files
        Object.keys(cache).forEach(key => {
          const isExpired = now - cache[key].timestamp > IMAGE_CACHE_DURATION;
          const isStillExists = !currentFileNames || currentFileNames.includes(key);
          
          if (isExpired || !isStillExists) {
            delete cache[key];
          }
        });
        
        // Update cache if we cleaned any entries
        if (currentFileNames) {
          localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(cache));
        }
        
        return cache;
      }
    } catch (error) {
      console.warn("Failed to read image cache:", error);
    }
    return {};
  }, []);

  const setImageCache = useCallback((imageName: string, loaded: boolean) => {
    try {
      const cache = getImageCache();
      cache[imageName] = {
        loaded,
        timestamp: Date.now(),
      };
      localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.warn("Failed to cache image state:", error);
    }
  }, [getImageCache]);

  // Preload images function
  const preloadImages = useCallback(async (files: GithubFile[]) => {
    if (files.length === 0) return;

    setPreloadingImages(true);
    setLoadingStage("preloading");
    
    // Get current file names for cache cleanup
    const currentFileNames = files.map(file => file.name);
    const imageCache = getImageCache(currentFileNames);
    const imagesToPreload = files.filter(file => !imageCache[file.name]?.loaded);
    
    if (imagesToPreload.length === 0) {
      setPreloadingImages(false);
      setLoadingStage("complete");
      return;
    }

    // Preload images in batches to avoid overwhelming the browser
    const batchSize = 8;
    const batches = [];
    for (let i = 0; i < imagesToPreload.length; i += batchSize) {
      batches.push(imagesToPreload.slice(i, i + batchSize));
    }

    for (const batch of batches) {
      const promises = batch.map(file => {
        return new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            setImageCache(file.name, true);
            setImageLoadingStates(prev => ({ ...prev, [file.name]: true }));
            resolve();
          };
          img.onerror = () => {
            console.warn(`Failed to preload image: ${file.name}`);
            resolve();
          };
          img.src = RAW_BASE_URL + file.name;
        });
      });

      await Promise.all(promises);
      // Small delay between batches to prevent overwhelming
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setPreloadingImages(false);
    setLoadingStage("complete");
  }, [getImageCache, setImageCache]);

  useEffect(() => {
    if (!isOpen) return;

    const loadCharacters = async () => {
      setLoading(true);
      setError(null);
      setLoadingStage("fetching");

      try {
        // Fetch fresh data to check for updates
        const res = await fetch(GITHUB_API_URL);
        const data = await res.json();
        
        if (Array.isArray(data)) {
          const pngFiles = data.filter((item: any) => item.name.endsWith(".png"));
          
          // Try to get cached data for comparison
          const cachedData = getCachedData();
          let shouldUseCache = false;
          
          if (cachedData) {
            // Check if any files have been updated by comparing hashes
            const hasUpdates = pngFiles.some(file => {
              const cachedHash = cachedData.hashes[file.name];
              return !cachedHash || cachedHash !== file.sha;
            });
            
            // Check if any files have been removed
            const hasRemovals = Object.keys(cachedData.hashes).some(fileName => {
              return !pngFiles.find(file => file.name === fileName);
            });
            
            shouldUseCache = !hasUpdates && !hasRemovals;
          }
          
          if (shouldUseCache && cachedData) {
            // Use cached data
            setCharacterFiles(cachedData.data);
            setLoading(false);
            // Start preloading images
            preloadImages(cachedData.data);
          } else {
            // Use fresh data and update cache
            setCharacterFiles(pngFiles);
            setCachedData(pngFiles);
            setLoading(false);
            
            // Clean up image cache for removed/updated files
            const currentFileNames = pngFiles.map(file => file.name);
            if (cachedData) {
              // Clear cache for updated files
              pngFiles.forEach(file => {
                const cachedHash = cachedData.hashes[file.name];
                if (cachedHash && cachedHash !== file.sha) {
                  // File was updated, clear its image cache
                  const imageCache = getImageCache();
                  if (imageCache[file.name]) {
                    delete imageCache[file.name];
                    localStorage.setItem(IMAGE_CACHE_KEY, JSON.stringify(imageCache));
                  }
                }
              });
            }
            getImageCache(currentFileNames);
            
            // Start preloading images
            preloadImages(pngFiles);
          }
        } else {
          throw new Error("Invalid response format");
        }
      } catch (err) {
        console.error("Failed to fetch characters:", err);
        setError(t("downloadModal.fetchError"));
        setLoading(false);
        setLoadingStage("complete");
      }
    };

    loadCharacters();
  }, [isOpen, getCachedData, setCachedData, preloadImages, t]);

  const handleDownloadAndImport = async (file: GithubFile) => {
    setImporting(file.name);
    setError(null);
    try {
      const res = await fetch(file.download_url || RAW_BASE_URL + file.name);
      if (!res.ok) throw new Error(t("downloadModal.downloadFailed"));
      const blob = await res.blob();
      const fileObj = new File([blob], file.name, { type: blob.type });
      await handleCharacterUpload(fileObj);
      onImport();
      onClose();
    } catch (e: any) {
      setError(e.message || t("downloadModal.importFailed"));
    } finally {
      setImporting(null);
    }
  };

  const extractCharacterInfo = (fileName: string): CharacterInfo => {
    const nameWithoutExt = fileName.replace(/\.png$/, "");
    const parts = nameWithoutExt.split(/--/);
    
    let displayName = nameWithoutExt;
    
    if (parts.length === 2) {
      displayName = parts[0].trim();
    }
    
    // Extract tags from the display name
    const tags: string[] = [];
    for (const category in TAG_KEYWORDS) {
      if (TAG_KEYWORDS[category].some(keyword => 
        displayName.toLowerCase().includes(keyword.toLowerCase()) ||
        nameWithoutExt.toLowerCase().includes(keyword.toLowerCase()),
      )) {
        tags.push(category);
      }
    }
    
    // If no tags matched, assign to "Other" category
    if (tags.length === 0) {
      tags.push("Other");
    }
    
    return { displayName, tags };
  };

  // Filter characters based on selected tag
  const filteredCharacters = useMemo(() => {
    if (selectedTag === "all") return characterFiles;
    
    return characterFiles.filter(file => {
      const { tags } = extractCharacterInfo(file.name);
      return tags.some(tag => tag.toLowerCase() === selectedTag.toLowerCase());
    });
  }, [characterFiles, selectedTag]);

  // Get tag counts
  const tagCounts = useMemo(() => {
    const counts: { [key: string]: number } = { all: characterFiles.length };
    
    TAGS.forEach(tag => {
      counts[tag] = characterFiles.filter(file => {
        const { tags } = extractCharacterInfo(file.name);
        return tags.some(t => t.toLowerCase() === tag.toLowerCase());
      }).length;
    });
    
    return counts;
  }, [characterFiles]);

  const handleImageLoad = useCallback((fileName: string) => {
    setImageLoadingStates(prev => ({ ...prev, [fileName]: true }));
    setImageCache(fileName, true);
  }, [setImageCache]);

  const handleImageError = useCallback((fileName: string) => {
    setImageLoadingStates(prev => ({ ...prev, [fileName]: false }));
  }, []);

  const toggleNsfwView = useCallback((fileName: string) => {
    setNsfwViewStates(prev => ({ ...prev, [fileName]: !prev[fileName] }));
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 backdrop-blur-sm bg-black/50"
        onClick={onClose}
      />
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }} 
        className={`bg-[#1a1714] rounded-lg shadow-2xl w-full border border-[#534741] relative z-10 ${
          isMobile 
            ? "h-full max-h-[calc(100vh-12rem)] p-3 rounded-none pb-28" 
            : "p-6 max-w-6xl max-h-[90vh] rounded-lg"
        }`}
      >
        {/* Header */}
        <div className={`flex justify-between items-center ${isMobile ? "mb-4" : "mb-6"}`}>
          <h2 className={`text-[#eae6db] font-bold ${serifFontClass} ${
            isMobile ? "text-lg" : "text-2xl"
          }`}>
            {t("downloadModal.title")}
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                localStorage.removeItem(CACHE_KEY);
                localStorage.removeItem(IMAGE_CACHE_KEY);
                setCharacterFiles([]);
                setImageLoadingStates({});
                setNsfwViewStates({});
                setError(null);
                setLoading(true);
                setLoadingStage("fetching");
                try {
                  const res = await fetch(GITHUB_API_URL);
                  const data = await res.json();
                  if (Array.isArray(data)) {
                    const pngFiles = data.filter((item: any) => item.name.endsWith(".png"));
                    setCharacterFiles(pngFiles);
                    setCachedData(pngFiles);
                    setLoading(false);
                    preloadImages(pngFiles);
                  } else {
                    throw new Error("Invalid response format");
                  }
                } catch (err) {
                  console.error("Failed to fetch characters:", err);
                  setError(t("downloadModal.fetchError"));
                  setLoading(false);
                  setLoadingStage("complete");
                }
              }}
              disabled={loading}
              className={`group p-2 rounded-full text-[#a18d6f] hover:text-[#f9c86d] hover:bg-[#252220] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#ffd475]/40 relative ${loading ? "opacity-60 cursor-wait" : ""}`}
              title={t("downloadModal.refresh")}
              aria-label={t("downloadModal.refresh")}
              type="button"
            >
              <svg
                className={`${isMobile ? "w-4 h-4" : "w-5 h-5"} ${loading ? "animate-spin" : ""} transition-transform duration-300 group-hover:rotate-180`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M20 11A8.1 8.1 0 004.5 9M4 5v6h6M20 19v-6h-6"
                />
              </svg>
              {loading && (
                <span className="absolute inset-0 bg-black/30 rounded-full" />
              )}
            </button>
            <button
              className={"p-2 rounded-full text-[#a18d6f] hover:text-[#f9c86d] hover:bg-[#252220] transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-[#ffd475]/40"}
              onClick={onClose}
              title={t("common.close")}
              aria-label={t("common.close")}
              type="button"
            >
              <svg className={`${isMobile ? "w-5 h-5" : "w-6 h-6"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tag Filter Section */}
        <div className={`${isMobile ? "mb-4" : "mb-6"}`}>
          <h3 className={`text-[#eae6db] ${serifFontClass} ${
            isMobile ? "text-base mb-2" : "text-lg mb-3"
          }`}>
            {t("downloadModal.tagFilter")}
          </h3>
          <div className={`flex flex-wrap ${isMobile ? "gap-1.5" : "gap-2"}`}>
            {/* All Characters Tag */}
            <button
              onClick={() => setSelectedTag("all")}
              className={`${isMobile ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm"} rounded-full transition-all duration-200 ${fontClass} ${
                selectedTag === "all"
                  ? "bg-gradient-to-br from-[#e0cfa0] to-[#f0e2b8] text-[#534741] font-semibold shadow-lg shadow-[#e0cfa0]/20 border border-transparent"
                  : "bg-transparent text-[#c0a480] hover:bg-[#252220] hover:text-[#e0cfa0] border border-[#534741]/50 hover:border-[#534741]"
              }`}
            >
              {isMobile 
                ? `${t("downloadModal.all")} (${tagCounts.all})`
                : t("downloadModal.allCharacters").replace("{count}", tagCounts.all.toString())
              }
            </button>
            
            {/* Individual Tag Buttons */}
            {TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`${isMobile ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm"} rounded-full transition-all duration-200 ${fontClass} ${
                  selectedTag === tag
                    ? "bg-gradient-to-br from-[#e0cfa0] to-[#f0e2b8] text-[#534741] font-semibold shadow-lg shadow-[#e0cfa0]/20 border border-transparent"
                    : "bg-transparent text-[#c0a480] hover:bg-[#252220] hover:text-[#e0cfa0] border border-[#534741]/50 hover:border-[#534741]"
                } ${tagCounts[tag] === 0 ? "opacity-50 cursor-not-allowed" : ""}`}
                disabled={tagCounts[tag] === 0}
              >
                {t(`downloadModal.tags.${tag}`)} ({tagCounts[tag] || 0})
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {loading ? (
            <div className={`text-[#c0a480] py-12 text-center ${fontClass}`}>
              <div className="animate-spin w-8 h-8 border-2 border-[#c0a480] border-t-transparent rounded-full mx-auto mb-4"></div>
              <div className="mb-2">
                {loadingStage === "fetching" && t("downloadModal.loading")}
                {loadingStage === "preloading" && t("downloadModal.preloading")}
              </div>
              {loadingStage === "preloading" && (
                <div className="text-xs text-[#a18d6f]">
                  {t("downloadModal.preloadingDescription")}
                </div>
              )}
            </div>
          ) : error ? (
            <div className={`text-red-400 py-12 text-center ${fontClass}`}>
              <div className="text-red-400 mb-2">⚠️</div>
              {error}
            </div>
          ) : filteredCharacters.length === 0 ? (
            <div className={`text-[#c0a480] py-12 text-center ${fontClass}`}>
              <div className="opacity-60 mb-2">📭</div>
              {t("downloadModal.noCharactersInTag")}
            </div>
          ) : (
            <div className={`${
              isMobile 
                ? "grid grid-cols-1 gap-3 max-h-[calc(100vh-380px)] overflow-y-auto pr-1"
                : "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 max-h-[60vh] overflow-y-auto pr-2"
            }`}>
              <AnimatePresence mode="wait">
                {filteredCharacters.map((file, index) => {
                  const { displayName, tags } = extractCharacterInfo(file.name);
                  const isImageLoaded = imageLoadingStates[file.name];
                  const isNsfw = tags.some(tag => tag.toLowerCase() === "nsfw");
                  const isNsfwVisible = nsfwViewStates[file.name] || false;
                  
                  return (
                    <motion.div
                      key={`${selectedTag}-${file.name}`}
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ 
                        duration: 0.15,
                        delay: index * 0.02,
                        ease: "easeOut",
                      }}
                      className={`bg-[#252220] rounded-lg border border-[#534741] hover:border-[#c0a480] transition-all duration-200 hover:shadow-lg ${
                        isMobile ? "p-3 flex gap-3" : "p-4"
                      }`}
                    >
                      {/* Character Image */}
                      <div className={`relative rounded-lg overflow-hidden ${
                        isMobile ? "w-20 h-20 flex-shrink-0" : "mb-3"
                      }`}>
                        {!isImageLoaded && (
                          <div className="absolute inset-0 bg-[#1a1714] flex items-center justify-center">
                            <div className={`animate-spin border-2 border-[#c0a480] border-t-transparent rounded-full ${
                              isMobile ? "w-4 h-4" : "w-6 h-6"
                            }`}></div>
                          </div>
                        )}
                        <img 
                          src={RAW_BASE_URL + file.name} 
                          alt={file.name} 
                          className={`object-cover transition-all duration-300 ${
                            isImageLoaded ? "opacity-100" : "opacity-0"
                          } ${isNsfw && !isNsfwVisible ? "blur-lg" : ""} ${
                            isMobile ? "w-full h-full" : "w-full h-56"
                          }`}
                          loading="lazy"
                          onLoad={() => handleImageLoad(file.name)}
                          onError={() => handleImageError(file.name)}
                        />
                        
                        {/* NSFW Overlay */}
                        {isNsfw && !isNsfwVisible && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <button
                              onClick={() => toggleNsfwView(file.name)}
                              className={`bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition-all backdrop-blur-sm border border-white/20 ${fontClass} ${
                                isMobile ? "px-2 py-1 text-xs" : "px-3 py-1.5 text-sm"
                              }`}
                            >
                              <div className="flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className={`${isMobile ? "h-3 w-3" : "h-4 w-4"}`} viewBox="0 0 20 20" fill="currentColor">
                                  <path d="M12.5 10a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0"/>
                                  <path d="M0 10s3-5.5 10-5.5S20 10 20 10s-3 5.5-10 5.5S0 10 0 10m10 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7"/>
                                </svg>
                                <span className="font-semibold">{isMobile ? t("downloadModal.viewNsfw") : t("downloadModal.viewNsfw")}</span>
                              </div>
                            </button>
                          </div>
                        )}
                        
                        {/* Hide button for NSFW content */}
                        {isNsfw && isNsfwVisible && (
                          <button
                            onClick={() => toggleNsfwView(file.name)}
                            className={`absolute bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors ${
                              isMobile ? "top-1 right-1 p-1" : "top-2 right-2 p-1.5"
                            }`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className={`${isMobile ? "h-3 w-3" : "h-4 w-4"}`} viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                              <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.742L2.458 6.697C3.732 10.754 7.522 14 12 14a9.95 9.95 0 00.454-.029z" />
                            </svg>
                          </button>
                        )}

                        {/* Tag Overlay */}
                        {tags.length > 0 && !isMobile && (
                          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                            {tags.slice(0, 2).map(tag => (
                              <span
                                key={tag}
                                className={`px-2 py-0.5 text-xs rounded-full bg-black/60 text-[#ffd475] ${fontClass} ${
                                  tag.toLowerCase() === "nsfw" ? "bg-red-600/80 text-white" : ""
                                }`}
                              >
                                {t(`downloadModal.tags.${tag}`)}
                              </span>
                            ))}
                            {tags.length > 2 && (
                              <span className={`px-2 py-0.5 text-xs rounded-full bg-black/60 text-[#ffd475] ${fontClass}`}>
                                +{tags.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Character Info */}
                      <div className={`${isMobile ? "flex-1 flex flex-col justify-between" : "mb-3"}`}>
                        <div>
                          <h3 className={`text-[#eae6db] font-medium line-clamp-1 ${fontClass} ${
                            isMobile ? "text-sm mb-1" : "text-sm mb-1"
                          }`}>
                            {displayName}
                          </h3>
                          
                          {/* Tags for mobile - display below title */}
                          {isMobile && tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {tags.slice(0, 3).map(tag => (
                                <span
                                  key={tag}
                                  className={`px-1.5 py-0.5 text-xs rounded-full bg-[#534741] text-[#ffd475] ${fontClass} ${
                                    tag.toLowerCase() === "nsfw" ? "bg-red-600/80 text-white" : ""
                                  }`}
                                >
                                  {t(`downloadModal.tags.${tag}`)}
                                </span>
                              ))}
                              {tags.length > 3 && (
                                <span className={`px-1.5 py-0.5 text-xs rounded-full bg-[#534741] text-[#ffd475] ${fontClass}`}>
                                  +{tags.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Download Button */}
                        <button
                          disabled={!!importing}
                          className={`group w-full rounded-lg transition-all duration-200 ${fontClass} ${
                            importing === file.name
                              ? "bg-[#534741] text-[#c0a480] cursor-wait"
                              : "bg-gradient-to-br from-[#e0cfa0] to-[#f9d77e] text-[#534741] hover:shadow-lg hover:shadow-[#e0cfa0]/20 hover:from-[#f0e2b8] hover:to-[#f9d77e]"
                          } ${isMobile ? "px-2 py-1.5 text-xs" : "px-3 py-2 text-sm"}`}
                          onClick={() => handleDownloadAndImport(file)}
                        >
                          {importing === file.name ? (
                            <div className="flex items-center justify-center gap-2">
                              <div className={`animate-spin border-2 border-[#c0a480] border-t-transparent rounded-full ${
                                isMobile ? "w-3 h-3" : "w-4 h-4"
                              }`}></div>
                              {isMobile ? t("downloadModal.importingShort") : t("downloadModal.importing")}
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2 font-semibold">
                              <svg xmlns="http://www.w3.org/2000/svg" className={`opacity-80 group-hover:opacity-100 transition-opacity ${
                                isMobile ? "h-3 w-3" : "h-4 w-4"
                              }`} viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10.75 2.75a.75.75 0 00-1.5 0v8.614L6.295 8.235a.75.75 0 10-1.09 1.03l4.25 4.5a.75.75 0 001.09 0l4.25-4.5a.75.75 0 00-1.09-1.03l-2.955 3.129V2.75z" />
                                <path d="M3.5 12.75a.75.75 0 00-1.5 0v2.5A2.75 2.75 0 004.75 18h10.5A2.75 2.75 0 0018 15.25v-2.5a.75.75 0 00-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5z" />
                              </svg>
                              {isMobile ? t("downloadModal.downloadShort") : t("downloadModal.downloadAndImport")}
                            </div>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
