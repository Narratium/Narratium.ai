import { BaseTool } from "./base-tool";
import { ToolType, ToolExecutionContext, ToolExecutionResult, PlanTask } from "@/lib/models/agent-model";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

/**
 * Ask User Tool - Dynamically generate contextual questions using LLM
 */
export class AskUserTool extends BaseTool {
  readonly toolType = ToolType.ASK_USER;
  readonly name = "Ask User";
  readonly description = "Ask user for additional information or clarification using intelligent question generation";

  async executeTask(task: PlanTask, context: ToolExecutionContext): Promise<ToolExecutionResult> {
    await this.addThought(
      context.conversation_id,
      "reasoning",
      `Need to ask user for more information about: ${task.description}`,
      task.id,
    );

    try {
      // Generate contextual questions using LLM
      const questions = await this.generateContextualQuestions(task, context);
      
      await this.addMessage(context.conversation_id, "agent", questions);

      return {
        success: true,
        result: { 
          message: questions,
          questionType: task.parameters.type || "general",
          context: {
            currentFocus: context.plan_pool.context.current_focus,
            completedTasks: context.plan_pool.completed_tasks.length,
            currentTasks: context.plan_pool.current_tasks.length,
          },
        },
        userInput_required: true,
        should_continue: false,
      };
    } catch (error) {
      console.error("Failed to generate questions:", error);
      
      // Fallback to basic questions
      const fallbackQuestions = this.generateFallbackQuestions(task, context);
      
      await this.addMessage(context.conversation_id, "agent", fallbackQuestions);
      
      return {
        success: true,
        result: { message: fallbackQuestions },
        userInput_required: true,
        should_continue: false,
      };
    }
  }

  /**
   * Generate intelligent, contextual questions using LLM
   */
  private async generateContextualQuestions(task: PlanTask, context: ToolExecutionContext): Promise<string> {
    const llm = this.createLLM(context.llm_config);
    
    // Build context information
    const contextInfo = this.buildContextInfo(context);
    
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", `You are an expert character and worldbook creator. Generate intelligent, specific questions to gather the information needed to create the perfect character and world.

Guidelines:
- Ask specific, targeted questions based on the current context
- Consider what information is already available
- Focus on the most critical missing pieces
- Be conversational and engaging
- Ask 3-5 focused questions maximum
- Consider the user's original request and current progress

Question types to consider:
- Character personality and background details
- World setting and atmosphere
- Specific themes or elements they want
- Constraints or preferences
- Creative direction and style
- Cultural or historical references

Format your response as a natural, conversational message that includes the questions.`],
      ["human", `User's original request: ${context.plan_pool.context.user_request}

Current task: ${task.description}
Task parameters: ${JSON.stringify(task.parameters)}

Current context:
${contextInfo}

What specific questions should I ask the user to gather the missing information needed for this task?`],
    ]);

    try {
      const chain = prompt.pipe(llm).pipe(new StringOutputParser());
      const questions = await chain.invoke({});
      return questions;
    } catch (error) {
      throw new Error("Failed to generate contextual questions");
    }
  }

  /**
   * Build context information for question generation
   */
  private buildContextInfo(context: ToolExecutionContext): string {
    const info = [];
    
    // Current focus
    info.push(`Current focus: ${context.plan_pool.context.current_focus}`);
    
    // Progress information
    info.push(`Completed tasks: ${context.plan_pool.completed_tasks.length}`);
    info.push(`Current tasks: ${context.plan_pool.current_tasks.length}`);
    
    // What's already been generated
    if (context.current_result.character_data) {
      info.push("Character data: Already generated");
    } else {
      info.push("Character data: Not yet created");
    }
    
    if (context.current_result.worldbook_data && context.current_result.worldbook_data.length > 0) {
      info.push(`Worldbook entries: ${context.current_result.worldbook_data.length} created`);
    } else {
      info.push("Worldbook entries: Not yet created");
    }
    
    // Recent thoughts and decisions
    const recentThoughts = context.thought_buffer.thoughts.slice(-3);
    if (recentThoughts.length > 0) {
      info.push("Recent thoughts:");
      recentThoughts.forEach(thought => {
        info.push(`- ${thought.content.substring(0, 100)}...`);
      });
    }
    
    return info.join("\n");
  }

  /**
   * Generate fallback questions when LLM fails
   */
  private generateFallbackQuestions(task: PlanTask, context: ToolExecutionContext): string {
    const type = task.parameters.type || "general";
    const userRequest = context.plan_pool.context.user_request;
    
    switch (type) {
    case "requirements_gathering":
      return `I'd like to create the perfect character and worldbook for you! Based on your request "${userRequest}", could you tell me more about:

1. What kind of character personality are you envisioning? (e.g., brave, mysterious, wise, rebellious)
2. What setting or world should they exist in? (e.g., medieval fantasy, modern urban, sci-fi space station)
3. Any specific themes, genres, or inspirations you'd like me to incorporate?
4. Any particular details or constraints I should keep in mind?`;

    case "character_details":
      return `I'm working on creating your character. To make them more unique and engaging, could you help me understand:

1. What drives this character? What are their main goals or motivations?
2. Do they have any special abilities, skills, or unique traits?
3. What's their background story? Any significant events in their past?
4. How do they interact with others? Are they outgoing, reserved, or something else?`;

    case "world_details":
      return `I'm building the world for your character. To create a rich, immersive setting, could you tell me about:

1. What kind of atmosphere or mood should this world have?
2. Are there any specific locations or environments that are important?
3. What's the social structure like? Any conflicts or tensions?
4. Any magical or technological elements that define this world?`;

    case "clarification":
      return "I need some clarification to continue creating your character and world. Could you provide more details about your preferences? Specifically, what aspects would you like me to focus on or adjust?";

    default:
      return "I need more information to proceed with creating your character and worldbook. Could you provide additional details about what you're looking for?";
    }
  }
}
