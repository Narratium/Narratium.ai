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
  author: string;
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
    let author = t("downloadModal.unknownAuthor");
    
    if (parts.length === 2) {
      displayName = parts[0].trim();
      author = parts[1].trim().length > 5 ? parts[1].trim().substring(0, 5) : parts[1].trim();
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
    
    return { displayName, author, tags };
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
        className="bg-[#1a1714] rounded-lg shadow-2xl p-6 w-full max-w-6xl max-h-[90vh] relative z-10 border border-[#534741]"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-2xl text-[#eae6db] font-bold ${serifFontClass}`}>
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
              className={`portal-button flex items-center justify-center px-4 py-2 rounded-lg border border-[#534741] bg-[#252220] hover:bg-[#3a2a2a] text-[#c0a480] hover:text-[#ffd475] shadow transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#ffd475] relative ${loading ? "opacity-60 cursor-wait" : ""} ${fontClass}`}
              title={t("downloadModal.refresh")}
              aria-label={t("downloadModal.refresh")}
              type="button"
            >
              <div className="flex items-center gap-1">
                <svg
                  className={`w-5 h-5 ${loading ? "animate-spin" : ""} transition-colors duration-150`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0V4m0 5a8.003 8.003 0 0015.356 2"
                  />
                </svg>
                <span className="ml-1">{loading ? t("downloadModal.refreshing") : t("downloadModal.refresh")}</span>
              </div>
              {loading && (
                <span className="absolute inset-0 bg-black/30 rounded-lg" />
              )}
            </button>
            <button 
              className="portal-button flex items-center justify-center px-4 py-2 rounded-lg border border-[#534741] bg-[#252220] hover:bg-[#3a2a2a] text-[#c0a480] hover:text-[#ffd475] shadow transition-all duration-150 text-xl focus:outline-none focus:ring-2 focus:ring-[#ffd475]"
              onClick={onClose}
              title={t("common.close")}
              aria-label={t("common.close")}
              type="button"
            >
              ×
            </button>
          </div>
        </div>

        {/* Tag Filter Section */}
        <div className="mb-6">
          <h3 className={`text-lg text-[#eae6db] mb-3 ${serifFontClass}`}>
            {t("downloadModal.tagFilter")}
          </h3>
          <div className="flex flex-wrap gap-2">
            {/* All Characters Tag */}
            <button
              onClick={() => setSelectedTag("all")}
              className={`px-3 py-1.5 rounded-full text-sm transition-all duration-200 ${fontClass} ${
                selectedTag === "all"
                  ? "bg-[#e0cfa0] text-[#534741] shadow-md"
                  : "bg-[#252220] text-[#c0a480] hover:bg-[#3a2a2a] border border-[#534741]"
              }`}
            >
              {t("downloadModal.allCharacters").replace("{count}", tagCounts.all.toString())}
            </button>
            
            {/* Individual Tag Buttons */}
            {TAGS.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag)}
                className={`px-3 py-1.5 rounded-full text-sm transition-all duration-200 ${fontClass} ${
                  selectedTag === tag
                    ? "bg-[#e0cfa0] text-[#534741] shadow-md"
                    : "bg-[#252220] text-[#c0a480] hover:bg-[#3a2a2a] border border-[#534741]"
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
                {loadingStage === "preloading" && "预加载图片中..."}
              </div>
              {loadingStage === "preloading" && (
                <div className="text-xs text-[#a18d6f]">
                  正在优化图片加载体验，请稍候...
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
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 max-h-[60vh] overflow-y-auto pr-2">
              <AnimatePresence mode="wait">
                {filteredCharacters.map((file, index) => {
                  const { displayName, author, tags } = extractCharacterInfo(file.name);
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
                      className="bg-[#252220] rounded-lg p-4 border border-[#534741] hover:border-[#c0a480] transition-all duration-200 hover:shadow-lg"
                    >
                      {/* Character Image */}
                      <div className="relative mb-3 rounded-lg overflow-hidden">
                        {!isImageLoaded && (
                          <div className="absolute inset-0 bg-[#1a1714] flex items-center justify-center">
                            <div className="animate-spin w-6 h-6 border-2 border-[#c0a480] border-t-transparent rounded-full"></div>
                          </div>
                        )}
                        <img 
                          src={RAW_BASE_URL + file.name} 
                          alt={file.name} 
                          className={`w-full h-56 object-cover transition-all duration-300 ${
                            isImageLoaded ? "opacity-100" : "opacity-0"
                          } ${isNsfw && !isNsfwVisible ? "blur-lg" : ""}`}
                          loading="lazy"
                          onLoad={() => handleImageLoad(file.name)}
                          onError={() => handleImageError(file.name)}
                        />
                        
                        {/* NSFW Overlay */}
                        {isNsfw && !isNsfwVisible && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <button
                              onClick={() => toggleNsfwView(file.name)}
                              className={`px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors ${fontClass}`}
                            >
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                View
                              </div>
                            </button>
                          </div>
                        )}
                        
                        {/* Hide button for NSFW content */}
                        {isNsfw && isNsfwVisible && (
                          <button
                            onClick={() => toggleNsfwView(file.name)}
                            className="absolute top-2 right-2 p-1 bg-black/60 hover:bg-black/80 text-white rounded-full transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.05 6.05M9.878 9.878a3 3 0 105.656 5.656l4.242 4.242L19.95 19.95M9.878 9.878l4.242 4.242" />
                            </svg>
                          </button>
                        )}

                        {/* Tag Overlay */}
                        {tags.length > 0 && (
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
                      <div className="mb-3">
                        <h3 className={`text-[#eae6db] text-sm font-medium mb-1 line-clamp-1 ${fontClass}`}>
                          {displayName}
                        </h3>
                        <p className={`text-[#c0a480] text-xs ${fontClass}`}>
                          {t("downloadModal.by")} {author}
                        </p>
                      </div>

                      {/* Download Button */}
                      <button
                        disabled={!!importing}
                        className={`w-full px-3 py-2 text-sm rounded-lg transition-all duration-200 ${fontClass} ${
                          importing === file.name
                            ? "bg-[#534741] text-[#c0a480] cursor-wait"
                            : "bg-[#e0cfa0] text-[#534741] hover:bg-[#ffd475] hover:shadow-md"
                        }`}
                        onClick={() => handleDownloadAndImport(file)}
                      >
                        {importing === file.name ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="animate-spin w-4 h-4 border-2 border-[#c0a480] border-t-transparent rounded-full"></div>
                            {t("downloadModal.importing")}
                          </div>
                        ) : (
                          t("downloadModal.downloadAndImport")
                        )}
                      </button>
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
