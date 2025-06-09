"use client";

import { useEffect, useRef, memo, useState, useCallback } from "react";
import { useSymbolColorStore } from "@/contexts/SymbolColorStore";

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
  console.log(tags);
  return [...tags];
}

function generatePalette(uniqueTags: string[]): Record<string, string> {
  const { symbolColors, getColorForHtmlTag } = useSymbolColorStore.getState();
  
  const colours: Record<string, string> = {};
  const usedColors = new Set<string>();

  uniqueTags.forEach(tag => {
    const lowerTag = tag.toLowerCase();
    const mappedColor = getColorForHtmlTag(lowerTag);
    
    if (mappedColor) {
      colours[lowerTag] = mappedColor;
      usedColors.add(mappedColor);
    }
  });

  const availableColors = [
    "#fde047", "#a78bfa", "#34d399", "#f59e0b", "#60a5fa",
    "#10b981", "#f97316", "#8b5cf6", "#ef4444", "#06b6d4", "#84cc16",
    "#facc15", "#f472b6", "#818cf8", "#22d3ee", "#4ade80", "#fb923c",
    "#d946ef", "#06b6d4", "#65a30d", "#dc2626", "#7c3aed", "#059669",
  ];

  const unassignedTags = uniqueTags.filter(tag => !colours[tag.toLowerCase()]);
  const unusedColors = availableColors.filter(color => !usedColors.has(color));
  
  unassignedTags.sort((a, b) => a.localeCompare(b)).forEach((tag, i) => {
    const lowerTag = tag.toLowerCase();
    if (!colours[lowerTag]) {
      const colorIndex = i % (unusedColors.length || availableColors.length);
      colours[lowerTag] = unusedColors.length > 0 ? unusedColors[colorIndex] : availableColors[colorIndex];
    }
  });

  return colours;
}

function replaceTags(html: string) {
  const tags = detectHtmlTags(html);
  if (tags.length === 0) return html;
  const colours = generatePalette(tags);
  const { getColorForHtmlTag } = useSymbolColorStore.getState();

  function processHtml(htmlStr: string): string {
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
}

export default memo(function ChatHtmlBubble({
  html: rawHtml,
  isLoading = false,
}: Props) {
  const [showLoader, setShowLoader] = useState(
    isLoading || rawHtml.trim() === "",
  );
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setShowLoader(isLoading || rawHtml.trim() === "");
    if (rawHtml.trim() !== "") {
      const t = setTimeout(() => setShowLoader(false), 250);
      return () => clearTimeout(t);
    }
  }, [rawHtml, isLoading]);

  const adjustHeightOnce = useCallback(() => {
    const frame = frameRef.current;
    if (!frame) return;
    try {
      const doc = frame.contentDocument || frame.contentWindow?.document;
      if (!doc) return;
      const h = doc.documentElement.scrollHeight || doc.body.scrollHeight;
      frame.style.height = `${h}px`;
    } catch (_) {
    }
  }, []);
  
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
  const html = convertMarkdown(rawHtml);
  const processedHtml = replaceTags(html).replace(/^[\s\r\n]+|[\s\r\n]+$/g, "");

  const srcDoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>*,*::before,*::after{box-sizing:border-box;max-width:100%}html,body{margin:0;padding:0;color:#f4e8c1;font:16px/${1.5} serif;background:transparent;word-wrap:break-word;overflow-wrap:break-word;hyphens:auto;white-space:pre-wrap;}img,video,iframe{max-width:100%;height:auto;display:block;margin:0 auto}table{width:100%;border-collapse:collapse;overflow-x:auto;display:block}code,pre{font-family:monospace;font-size:0.9rem;white-space:pre-wrap;background:rgba(40,40,40,0.8);padding:4px 8px;border-radius:4px;border:1px solid rgba(255,255,255,0.1);}pre{background:rgba(40,40,40,0.8);padding:12px;border-radius:6px;border:1px solid rgba(255,255,255,0.1);margin:8px 0;}blockquote{margin:8px 0;padding:8px 12px;border-left:4px solid #93c5fd;background:rgba(147,197,253,0.08);border-radius:0 4px 4px 0;font-style:italic;color:#93c5fd;}strong{color:#fb7185;font-weight:bold;}em{color:#c4b5fd;font-style:italic;}.dialogue{color:#fda4af;}a{color:#93c5fd}.tag-styled{white-space:inherit;}</style></head><body><div id="content-wrapper">${processedHtml}</div><script>
// Configuration for height calculation
let lastHeight = 0;
let lastWidth = 0;
let calculationCount = 0;
const MAX_CALCULATIONS = 5; // Reduced from 10 to 5
const MAX_CALCULATIONS_PER_SECOND = 3; // Maximum allowed calculations per second
const DEBOUNCE_TIME = 100; // Debounce time in ms
const SIGNIFICANT_CHANGE_THRESHOLD = 8; // Minimum pixels change to consider significant

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

// Throttle function to limit calculations
function throttleCalculation(fn) {
  const now = Date.now();
  if (now - lastCalculationTime > 1000) {
    // Reset counter each second
    calculationsInLastSecond = 0;
    lastCalculationTime = now;
  }
  
  if (calculationsInLastSecond >= MAX_CALCULATIONS_PER_SECOND) {
    if (!isCalculationThrottled) {
      console.log('Height calculation throttled');
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
  fn();
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
  // Reduced number of checks and increased intervals
  setTimeout(() => debounceCalculation(checkSizeChanges), 100);
  setTimeout(() => debounceCalculation(checkSizeChanges), 500);
}

// Set up event listeners with throttling
window.addEventListener('load', function() {
  calculationCount = 0;
  checkSizeChanges();
  delayedChecks();
});

document.addEventListener('DOMContentLoaded', function() {
  calculationCount = 0;
  checkSizeChanges();
});

// Throttle resize events
let resizeTimeout;
window.addEventListener('resize', function() {
  if (resizeTimeout) clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    calculationCount = 0;
    throttleCalculation(checkSizeChanges);
  }, 100);
});

// Use ResizeObserver with throttling
const resizeObserver = new ResizeObserver(function() {
  debounceCalculation(() => {
    calculationCount = 0;
    checkSizeChanges();
  });
});

resizeObserver.observe(document.body);
if (contentWrapper) {
  resizeObserver.observe(contentWrapper);
}

// Handle recalculation requests from parent with throttling
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
    debounceCalculation(checkSizeChanges);
    delayedChecks();
  }
});
</script></body></html>`;

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
        frameRef.current!.style.height = `${e.data.__chatBubbleHeight}px`;
        
        // Check if width changed significantly
        const currentWidth = frameRef.current.parentElement?.clientWidth || 0;
        if (
          containerWidthRef.current && 
          Math.abs(currentWidth - containerWidthRef.current) > (containerWidthRef.current * 0.1)
        ) {
          // Throttle resize notifications to iframe
          const now = Date.now();
          if (now - lastResizeTimeRef.current > 500) { // Max once per 500ms
            lastResizeTimeRef.current = now;
            containerWidthRef.current = currentWidth;
            frameRef.current.contentWindow?.postMessage({ __recalculateHeight: true }, "*");
          }
        }
      }
    };
    
    window.addEventListener("message", handler);
    
    // Throttled resize handler
    const resizeHandler = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      
      resizeTimeoutRef.current = setTimeout(() => {
        if (frameRef.current && frameRef.current.contentWindow) {
          const now = Date.now();
          if (now - lastResizeTimeRef.current > 300) { // Max once per 300ms
            lastResizeTimeRef.current = now;
            frameRef.current.contentWindow.postMessage({ __recalculateHeight: true }, "*");
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
  }, [showLoader]);

  if (showLoader) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin w-6 h-6 border-2 border-t-transparent border-b-transparent rounded-full" />
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
      `}</style>
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
  );
});
