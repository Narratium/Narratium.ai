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
import { Toast } from "@/components/Toast";
import CreatorAreaBanner from "@/components/CreatorAreaBanner";
import { ArrowLeft, Sparkles, BrainCircuit } from "lucide-react";
import { Message, ResearchSession, GenerationOutput } from "@/lib/models/agent-model";
import { motion } from "framer-motion";

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
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const prevMessagesLengthRef = useRef<number>(0);
  
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

  const maybeScrollToBottom = (threshold = 120) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distance < threshold) {
      scrollToBottom();
    }
  };

  const shouldAutoScroll = (newMessages: Message[]) => {
    // Always scroll on initial load
    if (prevMessagesLengthRef.current === 0) {
      return true;
    }
    
    // Only scroll if new messages were added
    if (newMessages.length > prevMessagesLengthRef.current) {
      return true;
    }
    
    return false;
  };

  const startResearchSession = async (sessionId: string) => {
    try {
      console.log("🔥 Starting agent execution for session:", sessionId);
      setIsInitializing(true);
      isInitializingRef.current = true;
      setLoadingPhase("Starting agent execution...");

      setIsInitializing(false);
      isInitializingRef.current = false;
      setLoadingPhase("");

      // Call executeAgentSession directly without streaming
      executeAgentSession({
        sessionId: sessionId,
        modelName: localStorage.getItem("openaiModel") || "",
        baseUrl: localStorage.getItem("openaiBaseUrl") || "",
        apiKey: localStorage.getItem("openaiApiKey") || "",
        llmType: (localStorage.getItem("llmType") as "openai" | "ollama") || "openai",
        language: (localStorage.getItem("language") as "zh" | "en") || "zh",
      }).then((result) => {
        console.log("🎯 Agent execution completed:", result);
        
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
      console.error("❌ Error starting session:", error);
      showErrorToast(error.message || "Failed to start session");
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
      
      // Auto-scroll after user response since it's new content
      setTimeout(() => maybeScrollToBottom(), 300);
      
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
            const newMessages = sessionData.session.formattedMessages || [];
            
            // Check if we should auto-scroll
            if (shouldAutoScroll(newMessages)) {
              setMessages(newMessages);
              maybeScrollToBottom();
            } else {
              setMessages(newMessages);
            }
            
            // Update previous messages length
            prevMessagesLengthRef.current = newMessages.length;
          }

          // Stop polling if completed or failed
          if (currentStatus === "completed" || currentStatus === "failed") {
            if (pollInterval.current) {
              clearInterval(pollInterval.current);
              pollInterval.current = null;
            }
          }
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
          const initialMessages = sessionData.formattedMessages;
          setMessages(initialMessages);
          prevMessagesLengthRef.current = initialMessages.length;
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
    const stages = [
      t("creatorAreaLoading.stages.analyze"),
      t("creatorAreaLoading.stages.plan"),
      t("creatorAreaLoading.stages.create"),
      t("creatorAreaLoading.stages.complete"),
    ];

    return (
      <div className="min-h-screen fantasy-bg flex items-center justify-center p-4">
        <div className="w-full max-w-sm">
          <div className="bg-black/40 border border-amber-500/20 rounded-xl p-6 space-y-5">
            {/* Header */}
            <div className="text-center space-y-1.5">
              <div className="inline-block p-2.5 bg-gradient-to-r from-amber-500/20 to-orange-400/20 rounded-full mb-2">
                <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
              </div>
              <h2 className={`text-xl text-[#f4e8c1] ${serifFontClass} font-bold magical-text`}>
                {t("creatorAreaLoading.title")}
              </h2>
              <p className={`text-xs text-[#c0a480]/80 ${fontClass}`}>
                {t("creatorAreaLoading.subtitle")}
              </p>
            </div>

            {/* Animated SVG Spinner */}
            <div className="flex items-center justify-center h-16">
              <svg className="w-16 h-16" viewBox="0 0 100 100">
                <defs>
                  <linearGradient id="spinner-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="rgba(251, 191, 36, 0)" />
                    <stop offset="50%" stopColor="rgba(251, 191, 36, 1)" />
                    <stop offset="100%" stopColor="rgba(251, 191, 36, 0)" />
                  </linearGradient>
                </defs>
                <path
                  d="M 50,50 m 0,-40 a 40,40 0 1 1 0,80 a 40,40 0 1 1 0,-80"
                  stroke="url(#spinner-gradient)"
                  strokeWidth="4"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray="125.6, 251.2"
                >
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    from="0 50 50"
                    to="360 50 50"
                    dur="1.5s"
                    repeatCount="indefinite"
                  />
                </path>
                <path
                  d="M 50,50 m 0,-30 a 30,30 0 1 1 0,60 a 30,30 0 1 1 0,-60"
                  stroke="rgba(192, 164, 128, 0.2)"
                  strokeWidth="2"
                  fill="none"
                />
              </svg>
            </div>

            {/* Status Text and Progress Bar */}
            <div className="text-center space-y-3 pt-1">
              <p className={`text-[#f4e8c1]/90 ${fontClass} text-sm font-medium`}>
                {loadingPhase || t("creatorAreaLoading.initializing")}
              </p>
              
              {isInitializing && (
                <div className="space-y-2">
                  <div className="w-full bg-black/20 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-orange-400 rounded-full"
                      style={{
                        width: "100%",
                        animation: "indeterminate-progress 2s infinite ease-in-out",
                      }}
                    />
                  </div>
                  <p className={`text-[#c0a480]/70 text-xs ${fontClass} leading-relaxed`}>
                    {t("creatorAreaLoading.analyzingNeeds")}
                  </p>
                </div>
              )}
            </div>

            {/* Simplified Stage Indicators */}
            <div className="pt-2">
              <div className="flex items-center justify-between text-xs">
                {stages.map((stage, index) => (
                  <React.Fragment key={stage}>
                    <span className={`transition-colors duration-300 ${fontClass} ${
                      index === 0 ? "text-amber-400 font-semibold" : "text-[#c0a480]/60"
                    }`}>
                      {stage}
                    </span>
                    {index < stages.length - 1 && (
                      <div className="flex-1 h-px bg-gradient-to-r from-amber-500/0 via-amber-500/20 to-amber-500/0 mx-2" />
                    )}
                  </React.Fragment>
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
    <div className="min-h-screen fantasy-bg overflow-x-hidden creator-area-container flex flex-col">
      {/* Header Banner */}
      <CreatorAreaBanner 
        session={session}
        onBack={goBack}
        fontClass={fontClass}
        serifFontClass={serifFontClass}
      />
      
      {/* Main Content */}
      <div className="flex-1 p-4 sm:p-6">
        {/* Messages Container with Fantasy Styling */}
        <div className="flex-1 overflow-hidden">
          <div 
            ref={scrollContainerRef}
            className="h-full overflow-y-auto pr-2 sm:pr-3 pb-6 space-y-1 fantasy-scrollbar"
          >
            <div className="space-y-4 max-w-full">
              <MessageStream 
                messages={messages} 
                progress={progress}
                status={status}
                result={result}
              />
              
              {/* Show thinking state when agent is working but not waiting for user */}
              {(status === "thinking" || status === "executing") && !needsUserInput && (
                <div className="mt-6">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-3"
                  >
                    <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-full flex-shrink-0">
                      <BrainCircuit className="w-5 h-5 text-amber-400 animate-pulse" />
                    </div>
                    <div className="flex-1 pt-1.5 min-w-0">
                      <p className="text-[#c0a480] text-sm italic">
                        {status === "thinking" ? "Agent is thinking..." : "Agent is executing..."}
                      </p>
                    </div>
                  </motion.div>
                </div>
              )}
              
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

      {/* Fantasy Error Toast */}
      <Toast
        type="error"
        isVisible={errorToast.isVisible}
        message={errorToast.message}
        onClose={hideErrorToast}
      />
    </div>
  );
}
