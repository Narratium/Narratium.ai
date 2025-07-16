"use client";

import { useEffect, useRef, memo, useState, useCallback, useMemo } from "react";
import { useSymbolColorStore } from "@/contexts/SymbolColorStore";
import { useLanguage } from "@/app/i18n";

// Virtual queue for rendering optimization
class VirtualRenderQueue {
  private queue: Array<() => void> = [];
  private isProcessing = false;
  private batchSize = 3; // Process multiple updates in batches
  private processingInterval = 16; // ~60fps
  private lastProcessTime = 0;

  // Add render task to queue
  enqueue(task: () => void) {
    this.queue.push(task);
    this.scheduleProcessing();
  }

  // Schedule processing with throttling
  private scheduleProcessing() {
    if (this.isProcessing) return;
    
    const now = Date.now();
    const timeSinceLastProcess = now - this.lastProcessTime;
    
    if (timeSinceLastProcess < this.processingInterval) {
      setTimeout(() => this.processQueue(), this.processingInterval - timeSinceLastProcess);
    } else {
      this.processQueue();
    }
  }

  // Process queue in batches
  private processQueue() {
    if (this.isProcessing || this.queue.length === 0) return;
    
    this.isProcessing = true;
    this.lastProcessTime = Date.now();
    
    // Process batch of tasks
    const batch = this.queue.splice(0, this.batchSize);
    batch.forEach(task => {
      try {
        task();
      } catch (error) {
        console.error("Virtual queue task error:", error);
      }
    });
    
    this.isProcessing = false;
    
    // Continue processing if more tasks exist
    if (this.queue.length > 0) {
      requestAnimationFrame(() => this.processQueue());
    }
  }

  // Clear all pending tasks
  clear() {
    this.queue = [];
    this.isProcessing = false;
  }

  // Get queue length
  get length() {
    return this.queue.length;
  }

  // Get next task from queue safely
  getNextTask() {
    return this.queue.shift();
  }
}

// Global virtual render queue instance
const globalRenderQueue = new VirtualRenderQueue();

function convertMarkdown(str: string): string {
  const imagePlaceholders: string[] = [];

  str = str.replace(/!\[\]\(([^)]+)\)/g, (_match,url) => {
    const placeholder = `__IMAGE_PLACEHOLDER_${imagePlaceholders.length}__`;
    imagePlaceholders.push(`<img src="${url}" alt="Image" />`);
    return placeholder;
  });
  str = str.replace(/^---$/gm, "");
  str = str.replace(/```[\s\S]*?```/g, (match,_) => {
    const content = match.replace(/^```\w*\n?/, "").replace(/```$/, "");
    return `<pre>${content}</pre>`;
  });
  str = str.replace(/^>\s*(.+)$/gm, "<blockquote>$1</blockquote>");
  str = str.replace(/<\/blockquote>\s*<blockquote>/g, "\n");
  str = str.replace(/!\[\]\(([^)]+)\)/g, "<img src=\"$1\" alt=\"Image\" />");
  str = str.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  str = str.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  str = str.replace(/(<[^>]+>)|(["“”][^"“”]+["“”])/g, (_match, tag, quote) => {
    if (tag) return tag;
    return `<talk>${quote}</talk>`;
  });
  str = str.replace(/(<[^>]+>)|(["""][^""]+["""])/g, (_match, tag, quote) => {
    if (tag) return tag;
    return `<talk>${quote}</talk>`;
  });
  str = str.replace(/\[([^\]]+)\]|【([^】]+)】/g, (_match, latinContent, cjkContent) => {
    const content = latinContent || cjkContent;
    return `<bracket-content>${content}</bracket-content>`;
  });

  imagePlaceholders.forEach((html, i) => {
    str = str.replace(`__IMAGE_PLACEHOLDER_${i}__`, html);
  });

  return str;
}

function isCompleteHtmlDocument(str: string): boolean {
  const trimmed = str.trim().toLowerCase();
  return (
    trimmed.includes("<!doctype html") ||
    (trimmed.startsWith("<html") && trimmed.includes("</html>"))
  );
}

function detectHtmlTags(str: string) {
  const htmlTagRegex = /<\s*([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>([\s\S]*?)<\s*\/\s*\1\s*>/g;
  const selfClosingTagRegex = /<\s*([a-zA-Z][a-zA-Z0-9]*)\b[^>]*\/\s*>/g;
  const tags = new Set<string>();

  let match: RegExpExecArray | null;
  while ((match = htmlTagRegex.exec(str)) !== null) tags.add(match[1].toLowerCase());
  while ((match = selfClosingTagRegex.exec(str)) !== null) tags.add(match[1].toLowerCase());
  return [...tags];
}
  
// Semantic color categories for intelligent tag mapping
const SEMANTIC_COLOR_GROUPS = {
  // Communication & dialogue tags
  communication: [
    "#e5d7b5",
  ],
  // Status & state tags  
  status: [
    "#d4c4a8", // Muted gold - similar brightness to #f4e8c1
  ],
  // Emotion & feeling tags
  emotion: [
    "#e8c8b0", // Soft peach - similar brightness to #f4e8c1
  ],
  // Action & movement tags
  action: [
    "#c8d4b0", // Muted sage - similar brightness to #f4e8c1
  ],
  // Thought & mental tags
  thought: [
    "#d0c8e0", // Soft lavender - similar brightness to #f4e8c1
  ],
  // Narrative & description tags
  narrative: [
    "#f4e8c1", // Default narrative color - same as base text
  ],
  // Emphasis & attention tags
  emphasis: [
    "#e0b8a8", // Muted coral - similar brightness to #f4e8c1
  ],
  // Mystical & special tags
  mystical: [
    "#d8c0e8", // Soft violet - similar brightness to #f4e8c1
  ],
};

// Simplified color palette with similar brightness to #f4e8c1
const OPTIMIZED_COLOR_PALETTE = [
  // Warm colors with similar brightness to #f4e8c1
  "#e5d7b5", // Warm beige
  "#d4c4a8", // Muted gold
  "#e8c8b0", // Soft peach
  "#e0b8a8", // Muted coral
  
  // Cool colors with similar brightness to #f4e8c1
  "#c8d4b0", // Muted sage
  "#d0c8e0", // Soft lavender
  "#d8c0e8", // Soft violet
  "#c0d8e0", // Soft blue-gray
  
  // Neutral colors with similar brightness to #f4e8c1
  "#d8d0c0", // Warm gray
  "#e0d8c8", // Light beige
  "#d0c8c0", // Muted taupe
  "#e8e0d0", // Cream
];

// Smart tag categorization for semantic color assignment
function categorizeTag(tagName: string): keyof typeof SEMANTIC_COLOR_GROUPS | "default" {
  const lowerTag = tagName.toLowerCase();
  
  // Communication patterns
  if (["speech", "dialogue", "talk", "say", "voice", "whisper", "shout"].includes(lowerTag)) {
    return "communication";
  }
  
  // Status patterns
  if (["status", "state", "condition", "mode", "phase"].includes(lowerTag) || 
      lowerTag.includes("status") || lowerTag.includes("state")) {
    return "status";
  }
  
  // Emotion patterns
  if (["emotion", "feeling", "mood", "heart", "soul", "passion", "love", "anger", "joy", "sad"].includes(lowerTag) ||
      lowerTag.includes("feel") || lowerTag.includes("emotion")) {
    return "emotion";
  }
  
  // Action patterns
  if (["action", "move", "walk", "run", "jump", "dance", "fight", "attack", "defend"].includes(lowerTag) ||
      lowerTag.includes("action") || lowerTag.includes("move")) {
    return "action";
  }
  
  // Thought patterns
  if (["think", "thought", "mind", "brain", "consider", "ponder", "reflect", "remember"].includes(lowerTag) ||
      lowerTag.includes("think") || lowerTag.includes("mind")) {
    return "thought";
  }
  
  // Narrative patterns
  if (["screen", "scene", "setting", "background", "environment", "description", "narrative","content"].includes(lowerTag)) {
    return "narrative";
  }
  
  // Emphasis patterns
  if (["emphasis", "important", "urgent", "warning", "alert", "critical"].includes(lowerTag) ||
      lowerTag.includes("emphasis") || lowerTag.includes("important")) {
    return "emphasis";
  }
  
  // Mystical patterns
  if (["magic", "mystical", "spell", "enchant", "divine", "sacred", "ritual", "prophecy"].includes(lowerTag) ||
      lowerTag.includes("magic") || lowerTag.includes("mystical")) {
    return "mystical";
  }
  
  return "default";
}

// Performance optimization: Cache color palettes to avoid recalculation
const colorPaletteCache = new Map<string, Record<string, string>>();
const CACHE_MAX_SIZE = 50; // Limit cache size to prevent memory bloat

// Generate a cache key from unique tags
function generateCacheKey(tags: string[]): string {
  return tags.sort().join("|");
}

// Clear old cache entries when limit is reached
function pruneCache(): void {
  if (colorPaletteCache.size >= CACHE_MAX_SIZE) {
    const keysToDelete = Array.from(colorPaletteCache.keys()).slice(0, 10);
    keysToDelete.forEach(key => colorPaletteCache.delete(key));
  }
}

function generatePalette(uniqueTags: string[]): Record<string, string> {
  // Check cache first for performance
  const cacheKey = generateCacheKey(uniqueTags);
  const cachedPalette = colorPaletteCache.get(cacheKey);
  if (cachedPalette) {
    return cachedPalette;
  }

  const { symbolColors, getColorForHtmlTag, addCustomTag } = useSymbolColorStore.getState();
  const colours: Record<string, string> = {};
  const usedColors = new Set<string>();

  // First pass: assign existing colors from store
  uniqueTags.forEach(tag => {
    try {
      const lowerTag = tag.toLowerCase();
      const mappedColor = getColorForHtmlTag(lowerTag);
      
      if (mappedColor && /^#[0-9A-Fa-f]{6}$/.test(mappedColor)) { // Validate hex color format
        colours[lowerTag] = mappedColor;
        usedColors.add(mappedColor);
      }
    } catch (error) {
      console.warn(`Error processing tag "${tag}":`, error);
    }
  });

  // Second pass: smart semantic assignment for unassigned tags
  const unassignedTags = uniqueTags.filter(tag => !colours[tag.toLowerCase()]);
  const availableColors = OPTIMIZED_COLOR_PALETTE.filter(color => !usedColors.has(color));
  
  // Group unassigned tags by semantic category
  const categorizedTags: Record<string, string[]> = {};
  unassignedTags.forEach(tag => {
    const category = categorizeTag(tag);
    if (!categorizedTags[category]) categorizedTags[category] = [];
    categorizedTags[category].push(tag.toLowerCase());
  });

  let colorIndex = 0;
  
  // Assign colors by semantic groups first
  Object.entries(categorizedTags).forEach(([category, tags]) => {
    if (category !== "default" && SEMANTIC_COLOR_GROUPS[category as keyof typeof SEMANTIC_COLOR_GROUPS]) {
      const categoryColors = SEMANTIC_COLOR_GROUPS[category as keyof typeof SEMANTIC_COLOR_GROUPS]
        .filter(color => !usedColors.has(color));
      
      tags.sort((a, b) => a.localeCompare(b)).forEach((tag, i) => {
        if (!colours[tag]) {
          let selectedColor: string;
          
          if (categoryColors.length > 0) {
            selectedColor = categoryColors[i % categoryColors.length];
          } else {
            selectedColor = availableColors[colorIndex % availableColors.length];
            colorIndex++;
          }
          
          colours[tag] = selectedColor;
          usedColors.add(selectedColor);
          
          try {
            addCustomTag(tag, selectedColor);
          } catch (error) {
            console.warn(`Error adding custom tag "${tag}":`, error);
          }
        }
      });
    }
  });
  
  // Assign remaining colors to 'default' category tags
  if (categorizedTags.default) {
    categorizedTags.default.sort((a, b) => a.localeCompare(b)).forEach(tag => {
      if (!colours[tag]) {
        const remainingColors = availableColors.filter(color => !usedColors.has(color));
        const selectedColor = remainingColors.length > 0 
          ? remainingColors[colorIndex % remainingColors.length]
          : OPTIMIZED_COLOR_PALETTE[colorIndex % OPTIMIZED_COLOR_PALETTE.length];
        
        colours[tag] = selectedColor;
        usedColors.add(selectedColor);
        
        try {
          addCustomTag(tag, selectedColor);
        } catch (error) {
          console.warn(`Error adding custom tag "${tag}":`, error);
        }
        colorIndex++;
      }
    });
  }

  // Cache the result for future use
  pruneCache();
  colorPaletteCache.set(cacheKey, colours);

  return colours;
}

function replaceTags(html: string) {
  const tags = detectHtmlTags(html);
  if (tags.length === 0) return html;
  const colours = generatePalette(tags);
  const { getColorForHtmlTag } = useSymbolColorStore.getState();

  function processHtml(htmlStr: string): string {
    htmlStr = htmlStr.replace(/>\s*\n\s*</g, "><");
    
    const tagRegex = /<([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>([\s\S]*?)<\/\1>/g;
    
    return htmlStr.replace(tagRegex, (match, tagName: string, attributes: string, innerContent: string) => {
      const lowerTagName = tagName.toLowerCase();

      const skipTags = ["script", "style", "head", "meta", "link", "title"];
      if (skipTags.includes(lowerTagName)) {
        return match;
      }

      const processedInner = processHtml(innerContent);

      let className = "";
      const classMatch = attributes.match(/class\s*=\s*["']([^"']*)["']/i);
      if (classMatch) {
        className = classMatch[1];
      }

      let tagColor = getColorForHtmlTag(lowerTagName, className);
      
      if (!tagColor && colours[lowerTagName]) {
        tagColor = colours[lowerTagName];
      }

      if (tagColor) {
        const preservedAttrs = attributes.trim();
        const styleAttr = `style="color:${tagColor}"`;
        const dataAttr = `data-tag="${tagName}"`;
        const classAttr = "class=\"tag-styled\"";
        
        let finalAttrs = "";
        if (preservedAttrs) {
          const styleMatch = preservedAttrs.match(/style\s*=\s*["']([^"']*)["']/i);
          const classMatch = preservedAttrs.match(/class\s*=\s*["']([^"']*)["']/i);
          
          let modifiedAttrs = preservedAttrs;
          
          if (styleMatch) {
            const existingStyle = styleMatch[1];
            const newStyle = `${existingStyle}; color:${tagColor}`;
            modifiedAttrs = modifiedAttrs.replace(styleMatch[0], `style="${newStyle}"`);
          } else {
            modifiedAttrs += ` ${styleAttr}`;
          }
          
          if (classMatch) {
            const existingClass = classMatch[1];
            const newClass = `${existingClass} tag-styled`;
            modifiedAttrs = modifiedAttrs.replace(classMatch[0], `class="${newClass}"`);
          } else {
            modifiedAttrs += ` ${classAttr}`;
          }
          
          finalAttrs = modifiedAttrs + ` ${dataAttr}`;
        } else {
          finalAttrs = `${classAttr} ${styleAttr} ${dataAttr}`;
        }
        
        return `<${tagName}${finalAttrs ? " " + finalAttrs : ""}>${processedInner}</${tagName}>`;
      } else {
        return `<${tagName}${attributes ? " " + attributes : ""}>${processedInner}</${tagName}>`;
      }
    });
  }
  
  function processSelfClosingTags(htmlStr: string): string {
    const selfClosingRegex = /<([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)\s*\/\s*>/g;
    
    return htmlStr.replace(selfClosingRegex, (match, tagName: string, attributes: string) => {
      const lowerTagName = tagName.toLowerCase();
      
      const skipTags = ["br", "hr", "img", "input", "meta", "link"];
      if (skipTags.includes(lowerTagName)) {
        return match;
      }
      
      let className = "";
      const classMatch = attributes.match(/class\s*=\s*["']([^"']*)["']/i);
      if (classMatch) {
        className = classMatch[1];
      }

      let tagColor = getColorForHtmlTag(lowerTagName, className);
      
      if (!tagColor && colours[lowerTagName]) {
        tagColor = colours[lowerTagName];
      }
      
      if (tagColor) {
        const preservedAttrs = attributes.trim();
        const styleAttr = `style="color:${tagColor}"`;
        const dataAttr = `data-tag="${tagName}"`;
        const classAttr = "class=\"tag-styled\"";
        
        let finalAttrs = "";
        if (preservedAttrs) {
          const styleMatch = preservedAttrs.match(/style\s*=\s*["']([^"']*)["']/i);
          const classMatch = preservedAttrs.match(/class\s*=\s*["']([^"']*)["']/i);
          
          let modifiedAttrs = preservedAttrs;
          
          if (styleMatch) {
            const existingStyle = styleMatch[1];
            const newStyle = `${existingStyle}; color:${tagColor}`;
            modifiedAttrs = modifiedAttrs.replace(styleMatch[0], `style="${newStyle}"`);
          } else {
            modifiedAttrs += ` ${styleAttr}`;
          }
          
          if (classMatch) {
            const existingClass = classMatch[1];
            const newClass = `${existingClass} tag-styled`;
            modifiedAttrs = modifiedAttrs.replace(classMatch[0], `class="${newClass}"`);
          } else {
            modifiedAttrs += ` ${classAttr}`;
          }
          
          finalAttrs = modifiedAttrs + ` ${dataAttr}`;
        } else {
          finalAttrs = `${classAttr} ${styleAttr} ${dataAttr}`;
        }
        
        return `<${tagName}${finalAttrs ? " " + finalAttrs : ""} />`;
      } else {
        return match;
      }
    });
  }
  
  let result = processHtml(html);
  result = processSelfClosingTags(result);

  return result;
}

interface Props {
  html: string;
  isLoading?: boolean;
  serifFontClass?: string;
  forceFullDocument?: boolean;
  enableStreaming?: boolean;
  onContentChange?: () => void;
}

export default memo(function ChatHtmlBubble({
  html: rawHtml,
  isLoading = false,
  enableStreaming = false,
  onContentChange,
}: Props) {
  const [showLoader, setShowLoader] = useState(
    isLoading || rawHtml.trim() === "",
  );
  const frameRef = useRef<HTMLIFrameElement>(null);
  const { serifFontClass } = useLanguage();
  
  // Virtual queue integration for rendering optimization
  const renderQueueRef = useRef<VirtualRenderQueue>(globalRenderQueue);
  const lastProcessedHtmlRef = useRef<string>("");
  const pendingUpdateRef = useRef<NodeJS.Timeout | null>(null);
  const isUpdatingRef = useRef<boolean>(false);

  // Memoized HTML processing to prevent unnecessary recalculations
  const processedHtml = useMemo(() => {
    if (rawHtml === lastProcessedHtmlRef.current) {
      return lastProcessedHtmlRef.current;
    }
    
    const md = convertMarkdown(rawHtml);
    const tagged = replaceTags(md);
    const result = tagged.replace(/^[\s\r\n]+|[\s\r\n]+$/g, "");
    lastProcessedHtmlRef.current = result;
    return result;
  }, [rawHtml]);

  // Batched update function using virtual queue
  const batchedUpdate = useCallback((updateFn: () => void) => {
    if (isUpdatingRef.current) {
      // Queue the update if already processing
      renderQueueRef.current.enqueue(updateFn);
      return;
    }
    
    isUpdatingRef.current = true;
    
    // Clear any pending timeout
    if (pendingUpdateRef.current) {
      clearTimeout(pendingUpdateRef.current);
    }
    
    // Batch the update with a small delay to collect multiple changes
    pendingUpdateRef.current = setTimeout(() => {
      try {
        updateFn();
      } finally {
        isUpdatingRef.current = false;
        pendingUpdateRef.current = null;
        
        // Process any queued updates
        if (renderQueueRef.current.length > 0) {
          requestAnimationFrame(() => {
            const nextUpdate = renderQueueRef.current.getNextTask();
            if (nextUpdate) {
              batchedUpdate(nextUpdate);
            }
          });
        }
      }
    }, 16); // ~60fps
  }, []);

  // Optimized height adjustment using virtual queue
  const adjustHeightOptimized = useCallback(() => {
    const frame = frameRef.current;
    if (!frame) return;
    
    batchedUpdate(() => {
      try {
        const doc = frame.contentDocument || frame.contentWindow?.document;
        if (!doc) return;
        const h = doc.documentElement.scrollHeight || doc.body.scrollHeight;
        frame.style.height = `${h}px`;
      } catch (_) {
        // Silent error handling
      }
    });
  }, [batchedUpdate]);

  useEffect(() => {
    setShowLoader(isLoading || rawHtml.trim() === "");
    if (rawHtml.trim() !== "") {
      const t = setTimeout(() => setShowLoader(false), 250);
      return () => clearTimeout(t);
    }
  }, [rawHtml, isLoading]);

  const adjustHeightOnce = useCallback(() => {
    adjustHeightOptimized();
  }, [adjustHeightOptimized]);
  
  const isFullDoc = isCompleteHtmlDocument(rawHtml);
  if (isFullDoc) {
    return (
      <iframe
        ref={frameRef}
        sandbox="allow-scripts allow-same-origin"
        srcDoc={rawHtml}
        onLoad={adjustHeightOnce}
        style={{
          width: "100%",
          border: 0,
          overflow: "auto",
          height: "600px",
          background: "transparent",
        }}
      />
    );
  }

  // Optimized streaming script with virtual queue integration
  const streamingScript = enableStreaming
    ? `<script>
      const full = ${JSON.stringify(processedHtml)};
      const wrap = document.getElementById('content-wrapper');
      let i = 0;
      let streamingQueue = [];
      let isStreaming = false;
      
      function processStreamingQueue() {
        if (streamingQueue.length === 0 || isStreaming) return;
        isStreaming = true;
        
        const batch = streamingQueue.splice(0, 3); // Process in batches
        batch.forEach(() => {
          if (i > full.length) return;
          wrap.innerHTML = full.slice(0, i);
          i += 2;
        });
        
        isStreaming = false;
        checkSizeChanges();
        
        if (streamingQueue.length > 0) {
          requestAnimationFrame(processStreamingQueue);
        }
      }
      
      function step() {
        if (i > full.length) return;
        streamingQueue.push(true);
        processStreamingQueue();
        requestAnimationFrame(step);
      }
      step();
    <\/script>`
    : "";

  const initialContent = enableStreaming ? "" : processedHtml;

  const srcDoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>*,*::before,*::after{box-sizing:border-box;max-width:100%}html,body{margin:0;padding:0;color:#f4e8c1;font:16px/${1.5} serif;background:transparent;word-wrap:break-word;overflow-wrap:break-word;hyphens:auto;white-space:pre-wrap;overflow:hidden;}img,video,iframe{max-width:100%;height:auto;display:block;margin:0 auto}table{width:100%;border-collapse:collapse;overflow-x:auto;display:block}code,pre{font-family:monospace;font-size:0.9rem;white-space:pre-wrap;background:rgba(40,40,40,0.8);padding:4px 8px;border-radius:4px;border:1px solid rgba(255,255,255,0.1);}pre{background:rgba(40,40,40,0.8);padding:12px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);margin:8px 0;}blockquote{margin:8px 0;padding:8px 12px;border-left:4px solid #93c5fd;background:rgba(147,197,253,0.08);border-radius:0 4px 4px 0;font-style:italic;color:#93c5fd;}strong{color:#fb7185;font-weight:bold;}em{color:#c4b5fd;font-style:italic;}.dialogue{color:#fda4af;}a{color:#93c5fd}.tag-styled{white-space:inherit;}</style></head><body><div id="content-wrapper">${initialContent}</div><script>
// Virtual queue integration for performance optimization
const virtualQueue = {
  tasks: [],
  isProcessing: false,
  batchSize: 2,
  processInterval: 16,
  lastProcessTime: 0,
  
  enqueue(task) {
    this.tasks.push(task);
    this.scheduleProcessing();
  },
  
  scheduleProcessing() {
    if (this.isProcessing) return;
    
    const now = Date.now();
    const timeSinceLastProcess = now - this.lastProcessTime;
    
    if (timeSinceLastProcess < this.processInterval) {
      setTimeout(() => this.processBatch(), this.processInterval - timeSinceLastProcess);
    } else {
      this.processBatch();
    }
  },
  
  processBatch() {
    if (this.isProcessing || this.tasks.length === 0) return;
    
    this.isProcessing = true;
    this.lastProcessTime = Date.now();
    
    const batch = this.tasks.splice(0, this.batchSize);
    batch.forEach(task => {
      try {
        task();
      } catch (error) {
        console.error('Virtual queue task error:', error);
      }
    });
    
    this.isProcessing = false;
    
    if (this.tasks.length > 0) {
      requestAnimationFrame(() => this.processBatch());
    }
  }
};

// Configuration for height calculation with virtual queue optimization
let lastHeight = 0;
let lastWidth = 0;
let calculationCount = 0;
const MAX_CALCULATIONS = 5; // Reduced from 10 to 5
const MAX_CALCULATIONS_PER_SECOND = 3; // Maximum allowed calculations per second
const DEBOUNCE_TIME = 100; // Debounce time in ms
const SIGNIFICANT_CHANGE_THRESHOLD = 5; // Minimum pixels change to consider significant

// Tracking calculation rate
let calculationsInLastSecond = 0;
let lastCalculationTime = 0;
let pendingCalculationTimeout = null;
let isCalculationThrottled = false;

const contentWrapper = document.getElementById('content-wrapper');

function getAccurateHeight() {
  return contentWrapper ? contentWrapper.offsetHeight : Math.max(
    document.documentElement.scrollHeight,
    document.body.scrollHeight,
    document.documentElement.offsetHeight,
    document.body.offsetHeight
  );
}

// Throttle function to limit calculations with virtual queue
function throttleCalculation(fn) {
  const now = Date.now();
  if (now - lastCalculationTime > 1000) {
    // Reset counter each second
    calculationsInLastSecond = 0;
    lastCalculationTime = now;
  }
  
  if (calculationsInLastSecond >= MAX_CALCULATIONS_PER_SECOND) {
    if (!isCalculationThrottled) {
      isCalculationThrottled = true;
      setTimeout(() => {
        isCalculationThrottled = false;
        calculationsInLastSecond = 0;
      }, 1000);
    }
    return;
  }
  
  calculationsInLastSecond++;
  lastCalculationTime = now;
  
  // Use virtual queue for calculation tasks
  virtualQueue.enqueue(fn);
}

// Debounce function to prevent rapid consecutive calls
function debounceCalculation(fn) {
  if (pendingCalculationTimeout) {
    clearTimeout(pendingCalculationTimeout);
  }
  pendingCalculationTimeout = setTimeout(() => {
    pendingCalculationTimeout = null;
    throttleCalculation(fn);
  }, DEBOUNCE_TIME);
}

function checkSizeChanges() {
  try {
    // Hard limit on recalculations to prevent infinite loops
    if (calculationCount >= MAX_CALCULATIONS) {
      return;
    }
    calculationCount++;
    
    const w = document.body.clientWidth;
    const h = getAccurateHeight();

    // Only report significant changes to parent
    if (Math.abs(h - lastHeight) > SIGNIFICANT_CHANGE_THRESHOLD || 
        Math.abs(w - lastWidth) > SIGNIFICANT_CHANGE_THRESHOLD) {
      lastHeight = h;
      lastWidth = w;
      // Add a fixed buffer to avoid layout jumps
      parent.postMessage({__chatBubbleHeight: h + 20, __chatBubbleWidth: w}, '*');
    }
  } catch(e) {
    console.error('Height calculation error:', e);
  }
}

function delayedChecks() {
  // Reduced number of checks and increased intervals with virtual queue
  virtualQueue.enqueue(() => {
    setTimeout(() => debounceCalculation(checkSizeChanges), 100);
    setTimeout(() => debounceCalculation(checkSizeChanges), 500);
  });
}

// Set up event listeners with throttling and virtual queue
window.addEventListener('load', function() {
  calculationCount = 0;
  virtualQueue.enqueue(() => {
    checkSizeChanges();
    delayedChecks();
  });
});

document.addEventListener('DOMContentLoaded', function() {
  calculationCount = 0;
  virtualQueue.enqueue(checkSizeChanges);
});

// Throttle resize events with virtual queue
let resizeTimeout;
window.addEventListener('resize', function() {
  if (resizeTimeout) clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    calculationCount = 0;
    virtualQueue.enqueue(() => throttleCalculation(checkSizeChanges));
  }, 100);
});

// Use ResizeObserver with throttling and virtual queue
const resizeObserver = new ResizeObserver(function() {
  debounceCalculation(() => {
    calculationCount = 0;
    virtualQueue.enqueue(checkSizeChanges);
  });
});

resizeObserver.observe(document.body);
if (contentWrapper) {
  resizeObserver.observe(contentWrapper);
}

// Handle recalculation requests from parent with throttling and virtual queue
let lastRecalculateRequest = 0;
window.addEventListener('message', function(e) {
  if (e.data && e.data.__recalculateHeight) {
    const now = Date.now();
    // Limit recalculation requests to once per 300ms
    if (now - lastRecalculateRequest < 300) {
      return;
    }
    lastRecalculateRequest = now;
    
    calculationCount = 0;
    virtualQueue.enqueue(() => {
      debounceCalculation(checkSizeChanges);
      delayedChecks();
    });
  }
});
</script>${streamingScript}</body></html>`;

  const containerWidthRef = useRef<number | null>(null);
  const lastResizeTimeRef = useRef<number>(0);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (showLoader) return;
    
    if (frameRef.current) {
      containerWidthRef.current = frameRef.current.parentElement?.clientWidth || null;
    }
    
    const handler = (e: MessageEvent) => {
      if (
        e.source === frameRef.current?.contentWindow &&
        typeof e.data === "object" &&
        e.data.__chatBubbleHeight
      ) {
        // Use virtual queue for height updates
        batchedUpdate(() => {
          frameRef.current!.style.height = `${e.data.__chatBubbleHeight + 30}px`; // Add extra space for padding
          onContentChange?.();
        });
        
        const currentWidth = frameRef.current.parentElement?.clientWidth || 0;
        if (
          containerWidthRef.current && 
          Math.abs(currentWidth - containerWidthRef.current) > (containerWidthRef.current * 0.1)
        ) {
          const now = Date.now();
          if (now - lastResizeTimeRef.current > 500) {
            lastResizeTimeRef.current = now;
            containerWidthRef.current = currentWidth;
            // Use virtual queue for recalculation requests
            renderQueueRef.current.enqueue(() => {
              frameRef.current?.contentWindow?.postMessage({ __recalculateHeight: true }, "*");
            });
          }
        }
      }
    };
    
    window.addEventListener("message", handler);

    const resizeHandler = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      
      resizeTimeoutRef.current = setTimeout(() => {
        if (frameRef.current && frameRef.current.contentWindow) {
          const now = Date.now();
          if (now - lastResizeTimeRef.current > 300) {
            lastResizeTimeRef.current = now;
            // Use virtual queue for resize handling
            renderQueueRef.current.enqueue(() => {
              frameRef.current?.contentWindow?.postMessage({ __recalculateHeight: true }, "*");
            });
          }
        }
      }, 200);
    };
    
    window.addEventListener("resize", resizeHandler);
    
    return () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      window.removeEventListener("message", handler);
      window.removeEventListener("resize", resizeHandler);
    };
  }, [showLoader, batchedUpdate]);

  useEffect(() => {
    if (!onContentChange) return;
    const frame = frameRef.current;
    if (!frame) return;
    
    // Use virtual queue for ResizeObserver updates
    const ro = new ResizeObserver(() => {
      renderQueueRef.current.enqueue(() => onContentChange());
    });
    ro.observe(frame);
    return () => ro.disconnect();
  }, [onContentChange]);

  useEffect(() => {
    if (frameRef.current) {
      const frame = frameRef.current;
      const doc = frame.contentDocument;
      if (doc) {
        // Use virtual queue for content updates
        batchedUpdate(() => {
          doc.body.innerHTML = "";
          const contentDiv = doc.createElement("div");
          contentDiv.innerHTML = processedHtml;
          doc.body.appendChild(contentDiv);
        });
      }
    }
  }, [processedHtml, batchedUpdate]);

  // Cleanup virtual queue on unmount
  useEffect(() => {
    // Clear color cache to ensure new color configuration takes effect
    colorPaletteCache.clear();
    
    return () => {
      if (pendingUpdateRef.current) {
        clearTimeout(pendingUpdateRef.current);
      }
      renderQueueRef.current.clear();
    };
  }, []);

  if (showLoader) {
    return (
      <div className="flex flex-col items-center justify-center py-6 px-4">
        <div className={`text-[15px] text-gray-400 font-medium leading-relaxed text-center ${serifFontClass}`}>
          No response received. Please check your network connection or API configuration.
        </div>
      </div>
    );
  }

  return (
    <div className="chat-bubble-container" style={{ maxWidth: "calc(100% - 10px)", margin: "0 auto" }}>
      <style jsx>{`
        .chat-bubble-container {
          width: 100%;
          position: relative;
          max-width: 780px;
        }
        @media (max-width: 880px) {
          .chat-bubble-container {
            max-width: 100%;
          }
        }
        .iframe-wrapper {
          padding-bottom: 20px;
          margin-bottom: 10px;
        }
      `}</style>
      <div className="iframe-wrapper">
        <iframe
          ref={frameRef}
          sandbox="allow-scripts allow-same-origin"
          srcDoc={srcDoc}
          style={{ 
            width: "100%", 
            border: 0, 
            overflow: "hidden", 
            height: "150px",
            background: "transparent",
          }}
        />
      </div>
    </div>
  );
});

