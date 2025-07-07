/**
 * Creator Area Page Component
 * 
 * This is the main agent creation interface that provides:
 * - Real-time AI agent interaction for character creation
 * - Chat-style message display with expandable details
 * - Progress tracking and component completion status
 * - Export functionality for generated characters and worldbooks
 * - User input handling for agent decisions
 * 
 * The page handles all agent interactions and provides a comprehensive interface for:
 * - Agent thinking process visualization
 * - Tool execution monitoring
 * - Quality evaluation tracking
 * - User choice handling for agent decisions
 * - Character and worldbook generation progress
 * 
 * Dependencies:
 * - getAgentSession: For session loading and management
 * - executeAgentSession: For agent execution control
 * - respondToAgentSession: For user response handling
 * - AgentUserInput: For user interaction components
 */

"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "../i18n";
import { getAgentSession } from "@/function/agent/session";
import { executeAgentSession, respondToAgentSession } from "@/function/agent/execute";
import { getAgentSessionStatus } from "@/function/agent/status";
import AgentUserInput from "@/components/AgentUserInput";
import ErrorToast from "@/components/ErrorToast";
import { 
  Brain, 
  Search, 
  User, 
  MessageSquare, 
  Sparkles, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  ChevronDown, 
  ChevronRight,
  Download,
  ArrowLeft,
  HelpCircle,
  ImageIcon,
  Palette,
  Loader2,
} from "lucide-react";

/**
 * Interface definitions for the component's data structures
 */
interface AgentSession {
  id: string;
  title: string;
  status: string;
  research_state: {
    main_objective: string;
  };
  generation_output?: any;
}

interface Message {
  id: string;
  role: "agent" | "user";
  content: string;
  type?: "agent_thinking" | "agent_action" | "user_input" | "tool_execution" | "quality_evaluation" | "system_prompt" | "user_response" | "tool_result" | "agent_message" | "system_message" | "error";
  timestamp?: Date;
  metadata?: {
    tool?: string;
    parameters?: any;
    result?: any;
    reasoning?: string;
  };
}

interface SessionProgress {
  completedTasks: number;
  totalIterations: number;
  knowledgeBaseSize: number;
}

interface AgentResult {
  character_data?: any;
  status_data?: any;
  user_setting_data?: any;
  world_view_data?: any;
  supplement_data?: any[];
  knowledge_base?: any[];
  completion_status?: any;
}

const MESSAGE_TYPE_ICONS = {
  agent_thinking: Brain,
  agent_action: MessageSquare,
  user_input: User,
  tool_execution: Sparkles,
  quality_evaluation: CheckCircle,
  system_prompt: Search,
  user_response: User,
  tool_result: Sparkles,
  agent_message: MessageSquare,
  system_message: Search,
  error: AlertCircle,
};

const MESSAGE_TYPE_COLORS = {
  agent_thinking: "text-purple-400 bg-purple-500/10",
  agent_action: "text-blue-400 bg-blue-500/10",
  user_input: "text-green-400 bg-green-500/10",
  tool_execution: "text-amber-400 bg-amber-500/10",
  quality_evaluation: "text-emerald-400 bg-emerald-500/10",
  system_prompt: "text-cyan-400 bg-cyan-500/10",
  user_response: "text-green-400 bg-green-500/10",
  tool_result: "text-amber-400 bg-amber-500/10",
  agent_message: "text-blue-400 bg-blue-500/10",
  system_message: "text-cyan-400 bg-cyan-500/10",
  error: "text-red-400 bg-red-500/10",
};

const MessageCard = ({ message, expanded, onToggle }: { 
  message: Message; 
  expanded: boolean; 
  onToggle: () => void; 
}) => {
  // Ensure message.type exists and is valid, provide fallback
  const messageType = message.type || "agent_message";
  const Icon = MESSAGE_TYPE_ICONS[messageType] || HelpCircle;
  const colorClass = MESSAGE_TYPE_COLORS[messageType] || "text-[#c0a480] bg-[#c0a480]/10";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-black/20 backdrop-blur-sm border border-amber-500/20 rounded-lg p-4 mb-3"
    >
      <div className="flex items-center justify-between cursor-pointer" onClick={onToggle}>
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-lg ${colorClass}`}>
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-[#c0a480] font-medium text-sm capitalize">
              {messageType.replace("_", " ")}
            </h4>
            <p className="text-[#c0a480]/60 text-xs">
              {message.timestamp ? new Date(message.timestamp).toLocaleTimeString() : "Unknown time"}
            </p>
          </div>
        </div>
        {expanded ? <ChevronDown className="w-4 h-4 text-[#c0a480]/60" /> : <ChevronRight className="w-4 h-4 text-[#c0a480]/60" />}
      </div>
      
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mt-3 pt-3 border-t border-amber-500/20"
          >
            <div className="text-[#c0a480] text-sm whitespace-pre-wrap break-words">
              {message.content || "No content available"}
            </div>
            {message.metadata && (
              <div className="mt-3 p-3 bg-black/30 rounded-lg">
                <h5 className="text-[#c0a480] font-medium text-xs mb-2">Details</h5>
                <div className="text-[#c0a480]/70 text-xs">
                  {message.metadata.tool && (
                    <div className="mb-1">
                      <span className="font-medium">Tool:</span> {message.metadata.tool}
                    </div>
                  )}
                  {message.metadata.reasoning && (
                    <div className="mb-1">
                      <span className="font-medium">Reasoning:</span> {message.metadata.reasoning}
                    </div>
                  )}
                  {message.metadata.parameters && (
                    <div className="mb-1">
                      <span className="font-medium">Parameters:</span>
                      <pre className="mt-1 p-2 bg-black/20 rounded text-xs overflow-x-auto">
                        {JSON.stringify(message.metadata.parameters, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const AvatarGenerationSection = ({ sessionId }: { sessionId: string | null }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageChoice, setImageChoice] = useState<"search" | "generate">("search");
  const [imageStyle, setImageStyle] = useState("anime");
  const [avatarResult, setAvatarResult] = useState<any>(null);
  const [showOptions, setShowOptions] = useState(false);

  const handleGenerateAvatar = async () => {
    if (!sessionId) return;
    
    setIsGenerating(true);
    try {
      // Import and call the generateAvatar function directly
      const { generateAvatar } = await import("@/function/agent/avatar");
      
      const params = new URLSearchParams({
        sessionId,
        imageChoice,
        imageStyle,
      });
      
      const result = await generateAvatar(params);
      
      if (result.success) {
        setAvatarResult(result.data);
      } else {
        console.error("Avatar generation failed:", result.error);
      }
    } catch (error) {
      console.error("Avatar generation error:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const imageStyleOptions = [
    { value: "kawaii", label: "Cute/Kawaii" },
    { value: "anime", label: "Japanese Anime" },
    { value: "scifi", label: "Sci-fi/Tech" },
    { value: "realistic", label: "Realistic/Photo" },
    { value: "fantasy", label: "Fantasy" },
    { value: "gothic", label: "Dark/Gothic" },
    { value: "minimalist", label: "Minimalist" },
    { value: "vintage", label: "Retro/Vintage" },
  ];

  return (
    <div className="space-y-3">
      <button
        onClick={() => setShowOptions(!showOptions)}
        className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
      >
        <ImageIcon className="w-4 h-4" />
        <span>Generate Character Card</span>
      </button>

      {showOptions && (
        <div className="space-y-3 p-3 bg-black/20 rounded-lg border border-purple-500/20">
          <div>
            <label className="text-[#c0a480] text-sm font-medium mb-2 block">
              Image Source
            </label>
            <div className="flex space-x-2">
              <button
                onClick={() => setImageChoice("search")}
                className={`flex-1 py-2 px-3 rounded text-sm transition-all ${
                  imageChoice === "search"
                    ? "bg-purple-600 text-white"
                    : "bg-black/30 text-[#c0a480] hover:bg-black/50"
                }`}
              >
                Search Online
              </button>
              <button
                onClick={() => setImageChoice("generate")}
                className={`flex-1 py-2 px-3 rounded text-sm transition-all ${
                  imageChoice === "generate"
                    ? "bg-purple-600 text-white"
                    : "bg-black/30 text-[#c0a480] hover:bg-black/50"
                }`}
              >
                AI Generate
              </button>
            </div>
          </div>

          {imageChoice === "generate" && (
            <div>
              <label className="text-[#c0a480] text-sm font-medium mb-2 block">
                Image Style
              </label>
              <select
                value={imageStyle}
                onChange={(e) => setImageStyle(e.target.value)}
                className="w-full bg-black/30 border border-amber-500/20 text-[#c0a480] rounded p-2 text-sm"
              >
                {imageStyleOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={handleGenerateAvatar}
            disabled={isGenerating}
            className="w-full bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 disabled:from-gray-600 disabled:to-gray-500 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating...</span>
              </>
            ) : (
              <>
                <Palette className="w-4 h-4" />
                <span>Generate Card</span>
              </>
            )}
          </button>

          {avatarResult && (
            <div className="mt-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="text-green-400 text-sm font-medium mb-2">
                Avatar Generated Successfully!
              </div>
              <div className="text-amber-400 text-xs mb-2">
                ⚡ Character data embedded in PNG - ready for import!
              </div>
              {avatarResult.imageUrl && (
                <div className="space-y-2">
                  <img
                    src={avatarResult.imageUrl}
                    alt="Generated Avatar"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <button
                    onClick={async () => {
                      try {
                        // Fetch the image data from the remote URL
                        const response = await fetch(avatarResult.imageUrl);
                        const blob = await response.blob();
                        
                        // Create a local blob URL
                        const blobUrl = URL.createObjectURL(blob);
                        
                        // Create download link with the blob URL
                        const link = document.createElement("a");
                        link.href = blobUrl;
                        link.download = `character-card-${Date.now()}.png`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        
                        // Clean up the blob URL
                        URL.revokeObjectURL(blobUrl);
                      } catch (error) {
                        console.error("Download failed:", error);
                        // Fallback: open in new tab if download fails
                        window.open(avatarResult.imageUrl, "_blank");
                      }
                    }}
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download Character Card</span>
                  </button>
                </div>
              )}
              <div className="text-[#c0a480] text-xs mt-2">
                {avatarResult.imageDescription}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const ProgressPanel = ({ progress, status, result, sessionId }: { 
  progress: SessionProgress; 
  status: string; 
  result?: AgentResult; 
  sessionId: string | null;
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const { t } = useLanguage();

  const getStatusColor = (status: string) => {
    switch (status) {
    case "thinking": return "text-amber-400";
    case "executing": return "text-blue-400";
    case "waiting_user": return "text-cyan-400";
    case "completed": return "text-green-400";
    case "failed": return "text-red-400";
    default: return "text-[#c0a480]";
    }
  };

  const getProgressPercentage = () => {
    if (!result) return 0;
    
    let completedComponents = 0;
    let totalComponents = 5; // character + 4 worldbook components
    
    if (result.character_data) completedComponents++;
    if (result.status_data) completedComponents++;
    if (result.user_setting_data) completedComponents++;
    if (result.world_view_data) completedComponents++;
    if (result.supplement_data && result.supplement_data.length >= 5) completedComponents++;
    
    return (completedComponents / totalComponents) * 100;
  };

  const handleExportResult = () => {
    if (!result) return;
    
    const exportData = {
      character: result.character_data,
      worldbook: {
        status: result.status_data,
        user_setting: result.user_setting_data,
        world_view: result.world_view_data,
        supplement: result.supplement_data,
      },
      metadata: {
        created_at: new Date().toISOString(),
        completion_status: result.completion_status,
      },
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `agent-result-${new Date().getTime()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-black/30 backdrop-blur-sm border border-amber-500/20 rounded-lg p-4">
      <h3 className="text-[#f4e8c1] font-semibold mb-4">Creation Progress</h3>
      
      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-[#c0a480] text-sm">Overall Progress</span>
            <span className="text-[#c0a480] text-sm">{Math.round(getProgressPercentage())}%</span>
          </div>
          <div className="w-full bg-black/20 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-amber-600 to-amber-400 h-2 rounded-full transition-all duration-300"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[#c0a480] text-sm">Status</span>
            <span className={`text-sm ${getStatusColor(status)}`}>
              {status.replace("_", " ")}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span className="text-[#c0a480] text-sm">Components</span>
            <span className="text-[#c0a480] text-sm">
              {result ? Object.keys(result).filter(key => result[key as keyof AgentResult]).length : 0}/5
            </span>
          </div>
        </div>

        {result && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[#c0a480] text-sm">Character</span>
              {result.character_data ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ) : (
                <Clock className="w-4 h-4 text-amber-400" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#c0a480] text-sm">Status Data</span>
              {result.status_data ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ) : (
                <Clock className="w-4 h-4 text-amber-400" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#c0a480] text-sm">User Setting</span>
              {result.user_setting_data ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ) : (
                <Clock className="w-4 h-4 text-amber-400" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#c0a480] text-sm">World View</span>
              {result.world_view_data ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ) : (
                <Clock className="w-4 h-4 text-amber-400" />
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#c0a480] text-sm">Supplement</span>
              {result.supplement_data && result.supplement_data.length >= 5 ? (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ) : (
                <Clock className="w-4 h-4 text-amber-400" />
              )}
            </div>
          </div>
        )}

        {status === "completed" && result && (
          <div className="space-y-2">
            <AvatarGenerationSection sessionId={sessionId} />
            <button
              onClick={handleExportResult}
              className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-700 hover:to-amber-600 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export Result</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Main creator area page component
 * 
 * Manages all agent interactions and provides a comprehensive interface for:
 * - Agent session management with URL parameters
 * - Real-time message display and progress tracking
 * - User input handling for agent decisions
 * - Character and worldbook generation monitoring
 * - Export functionality for completed results
 * 
 * @returns {JSX.Element} The complete agent creation interface
 */
export default function CreatorAreaPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("id");
  const { t, fontClass, serifFontClass } = useLanguage();

  const [session, setSession] = useState<AgentSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState("");
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<SessionProgress>({
    completedTasks: 0,
    totalIterations: 0,
    knowledgeBaseSize: 0,
  });
  const [result, setResult] = useState<AgentResult | undefined>(undefined);
  const [status, setStatus] = useState("IDLE");
  
  const pollInterval = useRef<NodeJS.Timeout | null>(null);
  const initializationRef = useRef(false);
  const isInitializingRef = useRef(false);
  const messageEndRef = useRef<HTMLDivElement>(null);
  
  const [loadingPhase, setLoadingPhase] = useState<string>("");
  
  const [errorToast, setErrorToast] = useState({
    isVisible: false,
    message: "",
  });

  const showErrorToast = useCallback((message: string) => {
    setErrorToast({
      isVisible: true,
      message,
    });
  }, []);

  const hideErrorToast = useCallback(() => {
    setErrorToast({
      isVisible: false,
      message: "",
    });
  }, []);

  const scrollToBottom = () => {
    setTimeout(() => {
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: "smooth",
      });
    }, 100);
  };

  const startAgentSession = async (sessionId: string) => {
    try {
      console.log("🔥 Starting agent execution for session:", sessionId);
      setIsInitializing(true);
      isInitializingRef.current = true; // Track in ref
      setLoadingPhase("Starting agent execution...");

      // Trigger agent execution asynchronously - don't wait for completion
      executeAgentSession({
        sessionId: sessionId,
        // userRequest is NOT passed here - this is for starting execution
        modelName: localStorage.getItem("openaiModel") || "",
        baseUrl: localStorage.getItem("openaiBaseUrl") || "",
        apiKey: localStorage.getItem("openaiApiKey") || "",
        llmType: (localStorage.getItem("llmType") as "openai" | "ollama") || "openai",
        language: (localStorage.getItem("language") as "zh" | "en") || "zh",
      }).catch((error) => {
        console.error("❌ Agent execution failed:", error);
        showErrorToast("Failed to start agent execution");
        setIsInitializing(false);
        isInitializingRef.current = false;
      });

      // Small delay to allow execution to start
      await new Promise(resolve => setTimeout(resolve, 500));

      console.log("✅ Agent execution triggered, beginning polling");
      // Start polling immediately to get status updates
      startPolling(sessionId);
      setIsInitializing(false);
      
    } catch (error: any) {
      console.error("❌ Error starting agent session:", error);
      showErrorToast(error.message || "Failed to start agent session");
      setIsInitializing(false);
      isInitializingRef.current = false;
    }
  };

  const handleUserResponse = async (response: string) => {
    if (!session) return;

    try {
      const result = await respondToAgentSession({
        sessionId: session.id,
        userResponse: response,
      });

      const data = await result.json();
      
      if (!data.success) {
        showErrorToast(data.error || "Failed to send response");
        return;
      }

      // Continue polling for updates
      if (!pollInterval.current) {
        startPolling(session.id);
      }
      
    } catch (error: any) {
      console.error("Error responding to agent:", error);
      showErrorToast(error.message || "Failed to send response");
    }
  };

  const startPolling = (sessionId: string) => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
    }

    const poll = async () => {
      try {
        const response = await getAgentSessionStatus({ sessionId });
        const data = await response.json();
        
        if (data.success && data.session) {
          setSession(data.session);
          const currentStatus = data.status || "idle";
          setStatus(currentStatus);
          setProgress(data.progress || { completedTasks: 0, totalIterations: 0, knowledgeBaseSize: 0 });
          setResult(data.result);

          // Stop initializing state when agent starts working
          if (currentStatus !== "idle" && isInitializingRef.current) {
            console.log("🎯 Agent status changed to:", currentStatus, "- stopping initialization");
            setIsInitializing(false);
            isInitializingRef.current = false;
          }

          // Get messages
          const sessionData = await getAgentSession(sessionId);
          if (sessionData.success && sessionData.session) {
            setMessages(sessionData.session.formattedMessages || []);
          }

          // Stop polling if completed or failed
          if (currentStatus === "completed" || currentStatus === "failed") {
            if (pollInterval.current) {
              clearInterval(pollInterval.current);
              pollInterval.current = null;
            }
          }
          
          scrollToBottom();
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    };

    poll(); // Initial poll
    pollInterval.current = setInterval(poll, 2000); // Poll every 2 seconds
  };

  // Load session data on component mount or sessionId change
  useEffect(() => {
    const loadSession = async () => {
      if (!sessionId) {
        setError("Session ID is missing from URL");
        setIsLoading(false);
        return;
      }
      
      setIsLoading(true);
      setIsInitializing(false);
      isInitializingRef.current = false; // Reset ref
      setError("");
      setLoadingPhase("Loading agent session...");
      
      initializationRef.current = false;
      
      const startTime = Date.now();
      const minLoadingTime = 500;
      
      try {
        const response = await getAgentSession(sessionId);
        if (!response.success) {
          throw new Error(response.error || "Failed to load session");
        }
        
        const sessionData = response.session;
        
        setSession({
          id: sessionData.session.id,
          title: sessionData.session.title,
          status: sessionData.session.status,
          research_state: sessionData.session.research_state,
          generation_output: sessionData.session.generation_output,
        });

        if (sessionData.formattedMessages) {
          setMessages(sessionData.formattedMessages);
        }

        // Check if session needs initialization
        if (sessionData.session.status === "idle" && !initializationRef.current) {
          console.log("🚀 Starting agent session - status is idle");
          setLoadingPhase("Initializing agent...");
          setIsInitializing(true);
          initializationRef.current = true;
          await startAgentSession(sessionId);
        } else {
          console.log("📊 Session status:", sessionData.session.status, "- starting polling");
          // Session already active, start polling
          startPolling(sessionId);
        }
        
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, minLoadingTime - elapsedTime);
        
        if (remainingTime > 0) {
          await new Promise(resolve => setTimeout(resolve, remainingTime));
        }
        
        setIsLoading(false);
        
      } catch (err) {
        console.error("Error loading session:", err);
        const errorMessage = typeof err === "object" && err !== null && "message" in err 
          ? (err as Error).message 
          : "Failed to load session";
        setError(errorMessage);
        setIsLoading(false);
        setIsInitializing(false);
        isInitializingRef.current = false; // Reset ref on error
      }
    };

    loadSession();
    
    // Cleanup polling on unmount
    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
  }, [sessionId]);

  const goBack = () => {
    router.push("/");
  };

  const toggleMessageExpansion = (messageId: string) => {
    setExpandedMessages(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  // Check if agent is waiting for user input
  const needsUserInput = status === "waiting_user";
  let userInputQuestion: string | undefined;
  let userInputOptions: string[] | undefined;

  if (needsUserInput && messages.length > 0) {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.content.includes("INPUT REQUIRED:")) {
      const lines = lastMessage.content.split("\n");
      const questionLine = lines.find(line => line.includes("INPUT REQUIRED:"));
      const optionsLine = lines.find(line => line.includes("Options:"));
      
      if (questionLine) {
        userInputQuestion = questionLine.replace("INPUT REQUIRED:", "").trim();
      }
      if (optionsLine) {
        userInputOptions = optionsLine
          .replace("Options:", "")
          .split(",")
          .map(opt => opt.trim())
          .filter(opt => opt.length > 0);
      }
    }
  }

  // Show loading animation during any loading phase
  if (isLoading || isInitializing) {
    return (
      <div className="flex flex-col justify-center items-center h-full fantasy-bg">
        <div className="relative w-12 h-12 flex items-center justify-center mb-4">
          <div className="absolute inset-0 rounded-full border-2 border-t-[#f9c86d] border-r-[#c0a480] border-b-[#a18d6f] border-l-transparent animate-spin"></div>
          <div className="absolute inset-2 rounded-full border-2 border-t-[#a18d6f] border-r-[#f9c86d] border-b-[#c0a480] border-l-transparent animate-spin-slow"></div>
        </div>
        <p className={`text-[#f4e8c1] ${serifFontClass} text-center mb-2`}>
          {loadingPhase}
        </p>
        {isInitializing && (
          <p className={`text-[#a18d6f] text-xs mt-4 max-w-xs text-center ${fontClass}`}>
            Agent is analyzing your request and setting up the creation process...
          </p>
        )}
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="flex flex-col items-center justify-center h-full fantasy-bg">
        <h1 className="text-2xl text-[#f4e8c1] mb-4">Error</h1>
        <p className="text-[#c0a480] mb-6">{error || "Session not found"}</p>
        <button
          onClick={goBack}
          className="bg-[#252220] hover:bg-[#342f25] text-[#f4e8c1] font-medium py-2 px-4 rounded border border-[#534741]"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="h-full fantasy-bg">
      <div className="container mx-auto px-4 py-6 h-full">
        <div className="h-full flex gap-6">
          {/* Left Panel - Messages */}
          <div className="flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <button
                  onClick={goBack}
                  className="p-2 bg-black/20 backdrop-blur-sm border border-amber-500/20 rounded-lg hover:bg-black/30 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-[#c0a480]" />
                </button>
                <div>
                  <h1 className={`text-2xl text-[#f4e8c1] ${serifFontClass}`}>
                    {session.title}
                  </h1>
                  <p className="text-[#c0a480]/70 text-sm">
                    {session.research_state.main_objective}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {messages.map((message) => (
                <MessageCard
                  key={message.id}
                  message={message}
                  expanded={expandedMessages.has(message.id)}
                  onToggle={() => toggleMessageExpansion(message.id)}
                />
              ))}
              
              {needsUserInput && userInputQuestion && (
                <div className="mt-4">
                  <AgentUserInput
                    question={userInputQuestion}
                    options={userInputOptions}
                    onResponse={handleUserResponse}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Progress */}
          <div className="w-80">
            <ProgressPanel 
              progress={progress} 
              status={status} 
              result={result} 
              sessionId={sessionId}
            />
          </div>
        </div>
      </div>

      {/* Error Toast */}
      <ErrorToast
        isVisible={errorToast.isVisible}
        message={errorToast.message}
        onClose={hideErrorToast}
      />
    </div>
  );
}
