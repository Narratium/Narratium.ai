"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLanguage } from "../i18n";
import { startAgentGeneration } from "@/function/agent/start";
import { getAgentSessionStatus } from "@/function/agent/status";
import { getAgentSessionMessages, respondToAgent } from "@/function/agent/messages";
import AgentUserInput from "@/components/AgentUserInput";
import { useSearchParams } from "next/navigation";
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
  Eye,
  EyeOff,
  Download,
  Copy,
  ArrowLeft,
} from "lucide-react";

interface Message {
  id: string;
  role: "agent" | "user";
  content: string;
  type: "agent_thinking" | "agent_action" | "user_input" | "tool_execution" | "quality_evaluation" | "system_prompt";
  timestamp: Date;
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
};

const MESSAGE_TYPE_COLORS = {
  agent_thinking: "text-purple-400 bg-purple-500/10",
  agent_action: "text-blue-400 bg-blue-500/10",
  user_input: "text-green-400 bg-green-500/10",
  tool_execution: "text-amber-400 bg-amber-500/10",
  quality_evaluation: "text-emerald-400 bg-emerald-500/10",
  system_prompt: "text-cyan-400 bg-cyan-500/10",
};

const MessageCard = ({ message, expanded, onToggle }: { 
  message: Message; 
  expanded: boolean; 
  onToggle: () => void; 
}) => {
  const Icon = MESSAGE_TYPE_ICONS[message.type];
  const colorClass = MESSAGE_TYPE_COLORS[message.type];

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
              {message.type.replace("_", " ")}
            </h4>
            <p className="text-[#c0a480]/60 text-xs">
              {new Date(message.timestamp).toLocaleTimeString()}
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
              {message.content}
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

const ProgressPanel = ({ progress, status, result }: { 
  progress: SessionProgress; 
  status: string; 
  result?: AgentResult; 
}) => {
  const [showDetails, setShowDetails] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
    case "THINKING": return "text-amber-400";
    case "EXECUTING": return "text-blue-400";
    case "WAITING_USER": return "text-cyan-400";
    case "COMPLETED": return "text-green-400";
    case "FAILED": return "text-red-400";
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
    a.download = `character-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-black/20 backdrop-blur-sm border border-amber-500/20 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[#c0a480] font-bold text-lg">Creation Progress</h3>
        <div className="flex space-x-2">
          {status === "COMPLETED" && result && (
            <button
              onClick={handleExportResult}
              className="text-[#c0a480]/60 hover:text-[#c0a480] transition-colors"
              title="Export result"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="text-[#c0a480]/60 hover:text-[#c0a480] transition-colors"
            title={showDetails ? "Hide details" : "Show details"}
          >
            {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-[#c0a480]/80">Status</span>
            <span className={`font-medium ${getStatusColor(status)}`}>
              {status.replace("_", " ")}
            </span>
          </div>
        </div>

        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-[#c0a480]/80">Overall Progress</span>
            <span className="text-[#c0a480]">{Math.round(getProgressPercentage())}%</span>
          </div>
          <div className="w-full bg-black/30 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-amber-500 to-orange-400 h-2 rounded-full transition-all duration-500"
              style={{ width: `${getProgressPercentage()}%` }}
            />
          </div>
        </div>

        {progress && (
          <div className="text-xs text-[#c0a480]/60 space-y-1">
            <div className="flex justify-between">
              <span>Tasks Completed:</span>
              <span>{progress.completedTasks}</span>
            </div>
            <div className="flex justify-between">
              <span>Total Iterations:</span>
              <span>{progress.totalIterations}</span>
            </div>
            <div className="flex justify-between">
              <span>Knowledge Base Size:</span>
              <span>{progress.knowledgeBaseSize}</span>
            </div>
          </div>
        )}

        {showDetails && result && (
          <div className="mt-4 pt-3 border-t border-amber-500/20">
            <div>
              <h4 className="text-[#c0a480] font-medium text-sm">Components Status</h4>
              {[
                { key: "character_data", label: "Character Card", icon: User },
                { key: "status_data", label: "Status System", icon: Sparkles },
                { key: "user_setting_data", label: "User Settings", icon: User },
                { key: "world_view_data", label: "World View", icon: Brain },
                { key: "supplement_data", label: "Supplements", icon: MessageSquare },
              ].map(({ key, label, icon: Icon }) => (
                <div key={key} className="flex items-center justify-between py-1">
                  <div className="flex items-center space-x-2">
                    <Icon className="w-3 h-3 text-[#c0a480]/60" />
                    <span className="text-xs text-[#c0a480]/80">{label}</span>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${
                    result[key as keyof AgentResult] ? "bg-green-400" : "bg-gray-600"
                  }`} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default function CreatorAreaPage() {
  const { t, fontClass, serifFontClass } = useLanguage();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<SessionProgress>({ completedTasks: 0, totalIterations: 0, knowledgeBaseSize: 0 });
  const [status, setStatus] = useState<string>("INITIALIZING");
  const [result, setResult] = useState<AgentResult | undefined>();
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string>("");
  const [pendingUserInput, setPendingUserInput] = useState<{
    question: string;
    options?: string[];
  } | null>(null);
  const [isRespondingToAgent, setIsRespondingToAgent] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollInterval = useRef<NodeJS.Timeout | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, pendingUserInput]);

  const startAgentSession = async (userRequest: string, existingSessionId?: string) => {
    try {
      setIsInitializing(true);
      setError("");
      
      const response = await startAgentGeneration({
        userRequest,
        sessionId: existingSessionId,
        userInputCallback: async (message?: string, options?: string[]) => {
          // This callback will be used by the agent service when it needs user input
          if (message) {
            setPendingUserInput({
              question: message,
              options: options,
            });
          }
          return "waiting_for_user_response";
        },
      });

      const data = await response.json();
      
      if (data.success) {
        setSessionId(data.conversationId);
        startPolling(data.conversationId);
      } else {
        setError(data.error || "Failed to start agent session");
        setIsInitializing(false);
      }
    } catch (error) {
      console.error("Error starting agent session:", error);
      setError("Failed to start creation process");
      setIsInitializing(false);
    }
  };

  const handleUserResponse = async (response: string) => {
    if (!sessionId || !pendingUserInput) return;
    
    try {
      setIsRespondingToAgent(true);
      
      // Add user response to messages locally for immediate feedback
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content: response,
        type: "user_input",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, userMessage]);
      
      // Send response to agent
      const responseResult = await respondToAgent({
        sessionId,
        userResponse: response,
      });
      
      const responseData = await responseResult.json();
      
      if (responseData.success) {
        // Clear pending input and continue polling
        setPendingUserInput(null);
      } else {
        setError("Failed to send response to agent");
      }
      
    } catch (error) {
      console.error("Error responding to agent:", error);
      setError("Failed to send response");
    } finally {
      setIsRespondingToAgent(false);
    }
  };

  const startPolling = (sessionId: string) => {
    pollInterval.current = setInterval(async () => {
      try {
        // Get session status
        const statusResponse = await getAgentSessionStatus({ sessionId });
        const statusData = await statusResponse.json();
        
        if (statusData.success) {
          setStatus(statusData.status);
          if (statusData.progress) {
            setProgress(statusData.progress);
          }
          if (statusData.result) {
            setResult(statusData.result);
          }
          
          // Get messages
          const messagesResponse = await getAgentSessionMessages({ sessionId });
          const messagesData = await messagesResponse.json();
          
          if (messagesData.success) {
            const formattedMessages = messagesData.messages.map((msg: any) => ({
              id: msg.id || `${Date.now()}-${Math.random()}`,
              role: msg.role,
              content: msg.content,
              type: msg.type || "agent_thinking",
              timestamp: new Date(msg.timestamp || Date.now()),
              metadata: msg.metadata,
            }));
            
            setMessages(formattedMessages);
            
            // Check for pending user input by parsing message content
            const latestMessage = formattedMessages[formattedMessages.length - 1];
            if (latestMessage && latestMessage.role === "agent" && latestMessage.type === "agent_action" && 
                latestMessage.content.startsWith("INPUT REQUIRED:") && !pendingUserInput && status === "WAITING_USER") {
              
              // Parse the message content to extract question and options
              const content = latestMessage.content;
              const questionMatch = content.match(/INPUT REQUIRED: (.*?)(?:\n\nOptions:|$)/);
              const question = questionMatch ? questionMatch[1].trim() : "Please provide your input:";
              
              const optionsMatch = content.match(/Options: (.+)/);
              const options = optionsMatch ? optionsMatch[1].split(", ").map((opt: string) => opt.trim()) : undefined;
              
              setPendingUserInput({
                question,
                options,
              });
            }
          }
          
          // Stop polling if completed or failed
          if (statusData.status === "COMPLETED" || statusData.status === "FAILED") {
            if (pollInterval.current) {
              clearInterval(pollInterval.current);
            }
            setIsInitializing(false);
          }
        }
        
        setIsInitializing(false);
      } catch (error) {
        console.error("Polling error:", error);
        // Don't set error here to avoid interrupting the process
      }
    }, 2000); // Poll every 2 seconds
  };

  const goBack = () => {
    if (pollInterval.current) {
      clearInterval(pollInterval.current);
    }
    window.history.back();
  };

  useEffect(() => {
    setMounted(true);
    
    // Prevent double execution in React StrictMode
    if (sessionId) return;
    
    const loadSessionOrCreate = async () => {
      // Check if there's a session ID in URL params or localStorage (for resuming)
      const urlSessionId = searchParams.get("sessionId");
      const userRequest = searchParams.get("request");
      console.log("Checking params - sessionId:", urlSessionId, "request:", userRequest); // Debug log
      
      if (urlSessionId) {
        // Try to resume existing session - similar to loading existing dialogue
        console.log("Found session ID, attempting to resume:", urlSessionId);
        try {
          const statusResponse = await getAgentSessionStatus({ sessionId: urlSessionId });
          const statusData = await statusResponse.json();
          
          if (statusData.success && statusData.session) {
            console.log("✅ Found existing session, resuming");
            setSessionId(urlSessionId);
            startPolling(urlSessionId);
            return;
          } else {
            console.log("⚠️ Session not found or invalid, will create new session");
          }
        } catch (error) {
          console.error("Error checking existing session:", error);
        }
      }
      
      // Create new session if no sessionId or session doesn't exist - similar to initializeNewDialogue
      if (userRequest && userRequest.trim()) {
        console.log("Creating new session for request:", userRequest); // Debug log
        await startAgentSession(decodeURIComponent(userRequest));
      } else {
        console.log("No user request found in URL params"); // Debug log
        setError("No creation request found. Please start from the input page.");
        setIsInitializing(false);
      }
    };
    
    loadSessionOrCreate();

    return () => {
      if (pollInterval.current) {
        clearInterval(pollInterval.current);
      }
    };
  }, [searchParams, sessionId]);

  const toggleMessageExpansion = (messageId: string) => {
    const newExpanded = new Set(expandedMessages);
    if (newExpanded.has(messageId)) {
      newExpanded.delete(messageId);
    } else {
      newExpanded.add(messageId);
    }
    setExpandedMessages(newExpanded);
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen w-full overflow-auto fantasy-bg relative">
      <div className="flex h-screen">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-black/20 backdrop-blur-sm border-b border-amber-500/20 p-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={goBack}
                className="text-[#c0a480]/60 hover:text-[#c0a480] transition-colors"
                title="Go back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-2xl font-bold font-cinzel bg-clip-text text-transparent bg-gradient-to-r from-amber-500 via-orange-400 to-yellow-300">
                  AI Character Creator
                </h1>
                <p className="text-[#c0a480]/80 text-sm mt-1">
                  Creating your character with advanced AI assistance
                </p>
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {isInitializing && messages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500 mx-auto mb-4"></div>
                  <p className="text-[#c0a480] text-sm">Initializing AI character creation...</p>
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <span className="text-red-400 font-medium">Error</span>
                </div>
                <p className="text-red-300 text-sm mt-1">{error}</p>
                <button
                  onClick={() => setError("")}
                  className="mt-2 text-red-400 text-sm hover:text-red-300 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            )}

            {messages.map((message) => (
              <MessageCard
                key={message.id}
                message={message}
                expanded={expandedMessages.has(message.id)}
                onToggle={() => toggleMessageExpansion(message.id)}
              />
            ))}

            {/* User Input Component */}
            {pendingUserInput && (
              <AgentUserInput
                question={pendingUserInput.question}
                options={pendingUserInput.options}
                onResponse={handleUserResponse}
                isLoading={isRespondingToAgent}
              />
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Right Progress Panel */}
        <div className="w-80 bg-black/10 backdrop-blur-sm border-l border-amber-500/20 p-4 overflow-y-auto">
          <ProgressPanel progress={progress} status={status} result={result} />
        </div>
      </div>
    </div>
  );
}
