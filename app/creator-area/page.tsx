/**
 * Creator Area Page Component
 * 
 * This is the main agent creation interface that provides:
 * - Real-time AI agent interaction for character creation
 * - Streamlined message display with optimized visual hierarchy
 * - Enhanced progress tracking and component completion status
 * - Export functionality for generated characters and worldbooks
 * - Intuitive user input handling for agent decisions
 * 
 * The page handles all agent interactions and provides a comprehensive interface for:
 * - Agent thinking process visualization with modern design
 * - Tool execution monitoring with clean indicators
 * - Quality evaluation tracking with professional styling
 * - User choice handling for agent decisions
 * - Character and worldbook generation progress
 * 
 * Dependencies:
 * - getResearchSession: For session loading and management
 * - executeResearchSession: For agent execution control
 * - respondToResearchSession: For user response handling
 * - AgentUserInput: For user interaction components
 */

"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useLanguage } from "../i18n";
import { getResearchSession  } from "@/function/agent/session";
import { executeAgentSession, respondToResearchSession } from "@/function/agent/execute";
import { getResearchSessionStatus } from "@/function/agent/status";
import MessageStream from "@/components/MessageStream";
import InlineUserInput from "@/components/InlineUserInput";
import AgentProgressPanel from "@/components/AgentProgressPanel";
import ErrorToast from "@/components/ErrorToast";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Message, ResearchSession, GenerationOutput } from "@/lib/models/agent-model";

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

  const [session, setSession] = useState<ResearchSession | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState({
    completedTasks: 0,
    totalIterations: 0,
    knowledgeBaseSize: 0,
  });
  const [result, setResult] = useState<GenerationOutput | undefined>(undefined);
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
      if (messageEndRef.current) {
        messageEndRef.current.scrollIntoView({ 
          behavior: "smooth", 
          block: "end",
          inline: "nearest",
        });
      }
    }, 100);
  };

  const [streamingContent, setStreamingContent] = useState("");
  const [currentStreamingMessage, setCurrentStreamingMessage] = useState<Message | null>(null);

  const startResearchSession = async (sessionId: string) => {
    try {
      console.log("🔥 Starting streaming agent execution for session:", sessionId);
      setIsInitializing(true);
      isInitializingRef.current = true;
      setLoadingPhase("Starting agent execution...");

      // Create streaming callback for real-time token updates
      const streamingCallback = (chunk: string) => {
        // Use functional updates to ensure we always have the latest state
        setCurrentStreamingMessage(prev => {
          if (!prev) {
            // If no message is currently streaming, create a new one
            return {
              id: `streaming_${Date.now()}`,
              type: "agent_thinking",
              role: "agent",
              content: chunk,
              metadata: { streaming: true },
            };
          } else {
            // If a message is already streaming, append the new chunk
            return {
              ...prev,
              content: prev.content + chunk,
            };
          }
        });
      };

      setIsInitializing(false);
      isInitializingRef.current = false;
      setLoadingPhase("");

      // Call executeAgentSession directly with streaming support
      executeAgentSession({
        sessionId: sessionId,
        modelName: localStorage.getItem("openaiModel") || "",
        baseUrl: localStorage.getItem("openaiBaseUrl") || "",
        apiKey: localStorage.getItem("openaiApiKey") || "",
        llmType: (localStorage.getItem("llmType") as "openai" | "ollama") || "openai",
        language: (localStorage.getItem("language") as "zh" | "en") || "zh",
        streamingCallback: streamingCallback,
      }).then((result) => {
        console.log("🎯 Agent execution completed:", result);
        setStreamingContent("");
        setCurrentStreamingMessage(null);
        
        if (result.success) {
          // Start regular polling for final result
          startPolling(sessionId);
        } else {
          showErrorToast(result.error || "Agent execution failed");
        }
      }).catch((error) => {
        console.error("❌ Failed to start execution:", error);
        showErrorToast("Failed to start agent execution");
        setIsInitializing(false);
        isInitializingRef.current = false;
      });
      
    } catch (error: any) {
      console.error("❌ Error starting streaming session:", error);
      showErrorToast(error.message || "Failed to start streaming session");
      setIsInitializing(false);
      isInitializingRef.current = false;
    }
  };

  const handleUserResponse = async (response: string) => {
    if (!session) return;

    try {
      const result = await respondToResearchSession({
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
        const response = await getResearchSessionStatus({ sessionId });
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
          const sessionData = await getResearchSession(sessionId);
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
        const response = await getResearchSession(sessionId);
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
          messages: sessionData.session.messages || [],
          execution_info: sessionData.session.execution_info || {},
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
          await startResearchSession(sessionId);
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
      <div className="min-h-screen fantasy-bg flex items-center justify-center">
        <div className="max-w-md w-full mx-4">
          {/* Enhanced Loading Interface */}
          <div className="bg-black/40 border border-amber-500/20 rounded-xl p-8 space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-400/20">
                  <Sparkles className="w-6 h-6 text-amber-400" />
                </div>
                <h2 className={`text-2xl text-[#f4e8c1] ${serifFontClass} font-bold`}>
                  创作工坊
                </h2>
              </div>
              <p className="text-[#c0a480]/80 text-sm">
                正在为您准备AI创作环境
              </p>
            </div>

            {/* Enhanced Progress Indicator */}
            <div className="flex items-center justify-center">
              <div className="relative w-20 h-20">
                {/* Outer ring */}
                <div className="absolute inset-0 rounded-full border-4 border-amber-500/20"></div>
                {/* Animated ring */}
                <div className="absolute inset-0 rounded-full border-4 border-t-amber-400 border-r-amber-400/50 border-b-transparent border-l-transparent animate-spin"></div>
                {/* Inner ring */}
                <div className="absolute inset-3 rounded-full border-2 border-t-orange-400 border-r-transparent border-b-orange-400/50 border-l-transparent animate-spin-slow"></div>
                {/* Center dot */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-gradient-to-r from-amber-400 to-orange-400 animate-pulse"></div>
                </div>
              </div>
            </div>

            {/* Status Text */}
            <div className="text-center space-y-3">
              <p className={`text-[#f4e8c1] ${fontClass} font-medium`}>
                {loadingPhase}
              </p>
              
              {isInitializing && (
                <div className="space-y-2">
                  <div className="w-full bg-black/20 rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full animate-pulse"></div>
                  </div>
                  <p className={`text-[#c0a480]/70 text-xs ${fontClass} leading-relaxed`}>
                    智能体正在分析您的需求并设置创作流程...
                  </p>
                </div>
              )}
            </div>

            {/* Stage Indicators */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#c0a480]/60">创作阶段</span>
                <span className="text-amber-400">初始化中</span>
              </div>
              
              <div className="grid grid-cols-4 gap-2">
                {["分析", "规划", "创作", "完成"].map((stage, index) => (
                  <div key={stage} className="text-center">
                    <div className={`w-8 h-8 rounded-full border-2 mx-auto mb-1 flex items-center justify-center ${
                      index === 0 
                        ? "border-amber-400 bg-amber-400/20 text-amber-400" 
                        : "border-slate-400/30 text-slate-400"
                    }`}>
                      <div className={`w-2 h-2 rounded-full ${
                        index === 0 ? "bg-amber-400 animate-pulse" : "bg-slate-400/50"
                      }`}></div>
                    </div>
                    <span className={`text-xs ${
                      index === 0 ? "text-amber-400" : "text-slate-400"
                    }`}>
                      {stage}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
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
    <div className="min-h-screen fantasy-bg">
      <div className="container mx-auto px-6 py-8 min-h-screen">
        <div className="h-full flex gap-8">
          {/* Left Panel - Messages with Enhanced Design */}
          <div className="flex-1 flex flex-col min-h-0">
            {/* Enhanced Header */}
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center space-x-6">
                <button
                  onClick={goBack}
                  className="group p-3 bg-black/30 border border-amber-500/30 rounded-xl hover:bg-black/40 hover:border-amber-400/50 transition-all duration-200"
                >
                  <ArrowLeft className="w-5 h-5 text-[#c0a480] group-hover:text-amber-400 transition-colors" />
                </button>
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <h1 className={`text-3xl text-[#f4e8c1] ${serifFontClass} font-bold`}>
                      {session?.title || "创作工坊"}
                    </h1>
                    <div className="p-1 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-400/20">
                      <Sparkles className="w-5 h-5 text-amber-400" />
                    </div>
                  </div>
                  {session?.research_state?.main_objective && (
                    <p className="text-[#c0a480]/80 text-sm max-w-md leading-relaxed">
                      {session.research_state.main_objective}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Messages Container with Improved Styling */}
            <div className="flex-1 overflow-hidden">
              <div className="h-full overflow-y-auto pr-3 pb-6 space-y-1">
                <div className="space-y-4">
                  <MessageStream 
                    messages={messages} 
                    streamingMessage={currentStreamingMessage}
                  />
                  
                  {needsUserInput && userInputQuestion && (
                    <div className="mt-6">
                      <InlineUserInput
                        question={userInputQuestion}
                        options={userInputOptions}
                        onResponse={handleUserResponse}
                        isLoading={isInitializing}
                      />
                    </div>
                  )}
                  
                  <div ref={messageEndRef} className="h-4" />
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Progress with Enhanced Design */}
          <div className="w-full md:w-64 lg:w-72 flex-shrink-0">
            <div className="sticky top-20">
              <AgentProgressPanel 
                progress={progress} 
                status={status} 
                result={result} 
                sessionId={sessionId}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Error Toast */}
      <ErrorToast
        isVisible={errorToast.isVisible}
        message={errorToast.message}
        onClose={hideErrorToast}
      />
    </div>
  );
}
