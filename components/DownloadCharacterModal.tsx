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
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
const IMAGE_CACHE_KEY = "narratium_character_images";
const IMAGE_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

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
}

interface CharacterInfo {
  displayName: string;
  author: string;
  tags: string[];
}

interface CacheData {
  data: GithubFile[];
  timestamp: number;
}

interface ImageCacheData {
  [key: string]: {
    loaded: boolean;
    timestamp: number;
  };
}

// Hardcoded tag definitions for character categorization
const TAGS = [
  "Cultivation", "Fantasy", "NSFW", "Fanfiction", "Other",
];

// Tag detection keywords mapping
const TAG_KEYWORDS: Record<string, string[]> = {
  "Cultivation": ["修仙", "cultivation", "仙侠", "immortal", "修炼"],
  "Fantasy": ["玄幻", "fantasy", "魔法", "magic", "奇幻"],
  "NSFW": ["nsfw", "adult", "18+", "mature", "r18"],
  "Fanfiction": ["同人", "fanfiction", "fan", "二创", "doujin"],
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

  // Cache management functions
  const getCachedData = useCallback((): GithubFile[] | null => {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { data, timestamp }: CacheData = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_DURATION) {
          return data;
        }
      }
    } catch (error) {
      console.warn("Failed to read cache:", error);
    }
    return null;
  }, []);

  const setCachedData = useCallback((data: GithubFile[]) => {
    try {
      const cacheData: CacheData = {
        data,
        timestamp: Date.now(),
      };
      localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
      console.warn("Failed to cache data:", error);
    }
  }, []);

  const getImageCache = useCallback((): ImageCacheData => {
    try {
      const cached = localStorage.getItem(IMAGE_CACHE_KEY);
      if (cached) {
        const cache: ImageCacheData = JSON.parse(cached);
        // Clean expired entries
        const now = Date.now();
        Object.keys(cache).forEach(key => {
          if (now - cache[key].timestamp > IMAGE_CACHE_DURATION) {
            delete cache[key];
          }
        });
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
    
    const imageCache = getImageCache();
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
        // Try to get cached data first
        const cachedData = getCachedData();
        if (cachedData) {
          setCharacterFiles(cachedData);
          setLoading(false);
          // Start preloading images
          preloadImages(cachedData);
          return;
        }

        // Fetch fresh data
        const res = await fetch(GITHUB_API_URL);
        const data = await res.json();
        
        if (Array.isArray(data)) {
          const pngFiles = data.filter((item: any) => item.name.endsWith(".png"));
          setCharacterFiles(pngFiles);
          setCachedData(pngFiles);
          setLoading(false);
          // Start preloading images
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
          <button 
            className="text-[#c0a480] hover:text-[#ffd475] text-2xl transition-colors"
            onClick={onClose}
          >
            ×
          </button>
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
                          className={`w-full h-56 object-cover transition-opacity duration-300 ${
                            isImageLoaded ? "opacity-100" : "opacity-0"
                          }`}
                          loading="lazy"
                          onLoad={() => handleImageLoad(file.name)}
                          onError={() => handleImageError(file.name)}
                        />
                        {/* Tag Overlay */}
                        {tags.length > 0 && (
                          <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                            {tags.slice(0, 2).map(tag => (
                              <span
                                key={tag}
                                className={`px-2 py-0.5 text-xs rounded-full bg-black/60 text-[#ffd475] ${fontClass}`}
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
