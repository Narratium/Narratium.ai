import {
  AgentStatus,
  PlanTask,
  ToolType,
  ToolExecutionContext,
  ToolExecutionResult,
} from "@/lib/models/agent-model";
import { AgentConversationOperations } from "@/lib/data/agent/agent-conversation-operations";
import { PlanPoolOperations } from "@/lib/data/agent/plan-pool-operations";
import { ResultOperations } from "@/lib/data/agent/result-operations";
import { ThoughtBufferOperations } from "@/lib/data/agent/thought-buffer-operations";
import { ToolRegistry } from "@/lib/tools/tool-registry";

/**
 * Main Agent Engine - Plan-based Architecture
 * LLM acts as the central planner that creates and manages tasks
 */
export class AgentEngine {
  private conversationId: string;

  constructor(conversationId: string) {
    this.conversationId = conversationId;
  }

  /**
   * Start the agent execution
   */
  async start(): Promise<{
    success: boolean;
    result?: any;
    needsUserInput?: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      await AgentConversationOperations.updateStatus(this.conversationId, AgentStatus.THINKING);
      
      // Create initial planning task
      await this.createInitialPlanningTask();
      
      // Main execution loop
      return await this.executionLoop();
      
    } catch (error) {
      console.error("Agent execution failed:", error);
      await AgentConversationOperations.updateStatus(this.conversationId, AgentStatus.FAILED);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Continue execution after user input
   */
  async continueWithUserInput(userInput: string): Promise<{
    success: boolean;
    result?: any;
    needsUserInput?: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      // Add user input as message
      await AgentConversationOperations.addMessage(this.conversationId, {
        role: "user",
        content: userInput,
        message_type: "userInput",
      });

      // Add user input to thought buffer
      await ThoughtBufferOperations.addThought(this.conversationId, {
        type: "observation",
        content: `User provided: ${userInput}`,
      });

      // Continue execution
      await AgentConversationOperations.updateStatus(this.conversationId, AgentStatus.THINKING);
      return await this.executionLoop();
      
    } catch (error) {
      console.error("Continue execution failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Create initial planning task
   */
  private async createInitialPlanningTask(): Promise<void> {
    // Add the planning task as the first task
    await PlanPoolOperations.addTask(this.conversationId, {
      description: "Create initial execution plan",
      tool: ToolType.PLAN,
      parameters: { type: "initial" },
      dependencies: [],
      status: "pending",
      priority: 10, // Highest priority
      reasoning: "Need to create an execution plan before starting",
    });
  }

  /**
   * Main execution loop
   */
  private async executionLoop(): Promise<{
    success: boolean;
    result?: any;
    needsUserInput?: boolean;
    message?: string;
  }> {
    const conversation = await AgentConversationOperations.getConversationById(this.conversationId);
    if (!conversation) throw new Error("Conversation not found");

    let iteration = 0;
    const maxIterations = conversation.context.max_iterations;

    while (iteration < maxIterations) {
      iteration++;
      conversation.context.current_iteration = iteration;

      // Get ready tasks
      const readyTasks = await PlanPoolOperations.getReadyTasks(this.conversationId);
      
      if (readyTasks.length === 0) {
        // No ready tasks - check if we need to plan more or if we're done
        const shouldContinue = await this.evaluateCompletion();
        if (!shouldContinue) break;
        
        // Create a replanning task
        await this.createReplanningTask();
        continue;
      }

      // Execute highest priority task
      const task = readyTasks[0];
      const result = await this.executeTask(task);

      if (result.userInput_required) {
        await AgentConversationOperations.updateStatus(this.conversationId, AgentStatus.WAITING_USER);
        return {
          success: true,
          needsUserInput: true,
          message: result.result?.message || "I need more information from you.",
        };
      }

      if (result.should_update_plan) {
        await this.createReplanningTask();
      }

      if (!result.should_continue) {
        break;
      }

      // Add small delay to prevent tight loops
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Check if task is completed
    const finalResult = await this.checkCompletion();
    if (finalResult.completed) {
      await AgentConversationOperations.updateStatus(this.conversationId, AgentStatus.COMPLETED);
      return {
        success: true,
        result: finalResult.data,
        message: "Character and worldbook generation completed successfully!",
      };
    } else {
      return {
        success: false,
        message: "Maximum iterations reached without completion",
      };
    }
  }

  /**
   * Execute a single task using the unified tool system
   */
  private async executeTask(task: PlanTask): Promise<ToolExecutionResult> {
    await AgentConversationOperations.updateStatus(this.conversationId, AgentStatus.EXECUTING);
    
    // Update task status
    await PlanPoolOperations.updateTask(this.conversationId, task.id, {
      status: "executing",
    });

    // Record tool usage
    await ResultOperations.recordToolUsage(this.conversationId, task.tool);

    // Add execution message
    await AgentConversationOperations.addMessage(this.conversationId, {
      role: "agent",
      content: `Executing: ${task.description}`,
      message_type: "agent_action",
      metadata: {
        task_id: task.id,
        tool_used: task.tool,
        reasoning: task.reasoning,
      },
    });

    try {
      const conversation = await AgentConversationOperations.getConversationById(this.conversationId);
      if (!conversation) throw new Error("Conversation not found");

      const context: ToolExecutionContext = {
        conversation_id: this.conversationId,
        plan_pool: conversation.plan_pool,
        thought_buffer: conversation.thought_buffer,
        current_result: conversation.result,
        llm_config: conversation.llm_config,
      };

      // Use the unified tool registry
      const result = await ToolRegistry.executeTask(task, context);

      if (result.success) {
        await PlanPoolOperations.updateTask(this.conversationId, task.id, {
          status: "completed",
          result: result.result,
        });
      } else {
        await PlanPoolOperations.updateTask(this.conversationId, task.id, {
          status: "failed",
          result: { error: result.error },
        });
      }

      return result;

    } catch (error) {
      console.error("Task execution failed:", error);
      
      await PlanPoolOperations.updateTask(this.conversationId, task.id, {
        status: "failed",
        result: { error: error instanceof Error ? error.message : "Unknown error" },
      });

      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        should_continue: true,
      };
    }
  }

  /**
   * Create a replanning task
   */
  private async createReplanningTask(): Promise<void> {
    await PlanPoolOperations.addTask(this.conversationId, {
      description: "Evaluate progress and update execution plan",
      tool: ToolType.PLAN,
      parameters: { type: "replan" },
      dependencies: [],
      status: "pending",
      priority: 9, // High priority
      reasoning: "Need to update plan based on current progress",
    });
  }

  /**
   * Check if the task is completed
   */
  private async checkCompletion(): Promise<{ completed: boolean; data?: any }> {
    const conversation = await AgentConversationOperations.getConversationById(this.conversationId);
    if (!conversation) return { completed: false };

    const hasCharacterData = !!conversation.result.character_data;
    const hasWorldbookData = !!conversation.result.worldbook_data && conversation.result.worldbook_data.length > 0;

    if (hasCharacterData && hasWorldbookData) {
      return {
        completed: true,
        data: {
          character_data: conversation.result.character_data,
          worldbook_data: conversation.result.worldbook_data,
          integration_notes: conversation.result.integration_notes,
          quality_metrics: conversation.result.quality_metrics,
        },
      };
    }

    return { completed: false };
  }

  /**
   * Evaluate if execution should continue
   */
  private async evaluateCompletion(): Promise<boolean> {
    const conversation = await AgentConversationOperations.getConversationById(this.conversationId);
    if (!conversation) return false;

    // Check if main goal is completed
    const mainGoal = conversation.plan_pool.goal_tree.find(g => g.type === "main_goal");
    if (mainGoal?.status === "completed") return false;

    // Check if we have any pending tasks
    const hasPendingTasks = conversation.plan_pool.current_tasks.some(t => t.status === "pending");
    if (hasPendingTasks) return true;

    // Check completion status
    const completion = await this.checkCompletion();
    return !completion.completed;
  }
} 
 
