import {
  SessionStatus,
  ToolType,
  ExecutionContext,
  ExecutionResult,
  ToolDecision,
  KnowledgeEntry,
  GenerationOutput,
  Message,
  TaskAdjustment,
} from "@/lib/models/agent-model";
import { ResearchSessionOperations } from "@/lib/data/agent/agent-conversation-operations";
import { ToolRegistry } from "@/lib/tools/tool-registry";
import { ChatOpenAI } from "@langchain/openai";
import { ChatOllama } from "@langchain/ollama";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";

// ============================================================================
// BACKGROUND KNOWLEDGE - CHARACTER CARDS AND WORLDBOOKS
// ============================================================================

/**
 * Core background knowledge about character cards and worldbooks for AI roleplay
 * This information is essential for understanding the generation targets
 */
const CORE_KNOWLEDGE_SECTION = `
## BACKGROUND KNOWLEDGE: CHARACTER CARDS & WORLDBOOKS

### CHARACTER CARDS OVERVIEW
A character card is a structured data format that defines AI roleplay scenarios. Character cards can represent either individual characters or entire world-based scenarios and stories, serving as the foundation for persistent conversations and defining how the AI should behave and interact.

#### Character Card Core Fields (ALL REQUIRED):
- **name**: Primary identifier - typically story title, scenario name, or thematic title rather than just character name [REQUIRED]
- **description**: Physical/visual details for characters, or world setting description for scenarios [REQUIRED]
- **personality**: For character cards: behavioral traits and psychological profile; For story cards: atmosphere, tone, and key NPC personalities [REQUIRED]
- **scenario**: Context and circumstances - character's situation or world's current state/events [REQUIRED]
- **first_mes**: Extensive, immersive opening sequence (typically 200-800 words) that establishes the entire narrative foundation including detailed scene setting, atmospheric description, character introduction with visual details, initial dialogue or internal monologue, environmental context, and emotional tone [REQUIRED]
- **mes_example**: Comprehensive dialogue examples (typically 3-6 exchanges) demonstrating complex communication patterns, personality nuances, behavioral consistency, speech patterns, emotional range, decision-making style, and relationship dynamics across different conversation scenarios [REQUIRED]
- **creator_notes**: Usage guidelines, compatibility information, and creator insights [REQUIRED]
- **tags**: Categorization tags including card type (character-card/story-card), genre, and descriptors [REQUIRED]
- **avatar**: Visual representation - character portrait or scenario artwork [OPTIONAL]
- **alternate_greetings**: Array of comprehensive alternative opening scenarios (typically 3-5 entries, each 150-600 words) providing entirely different narrative starting points, worldlines, or timeline variations with unique atmospheric settings, character contexts, and story hooks for meaningful player choice [REQUIRED]

**CRITICAL**: All eight core fields (name through tags) must be completed in the specified order for a professional-quality character card. The CHARACTER tool should be used systematically to build these fields incrementally across multiple tool calls until all required fields are present.

#### Character Card Types & Applications:
1. **Individual Characters**: Focused on a specific person with defined personality, background, and traits
2. **World Scenarios**: Broader settings featuring multiple characters, locations, and ongoing storylines
3. **Hybrid Approaches**: Character-centric cards that include rich world elements and supporting cast

#### Character Card Design Principles:
1. **Clear Identity**: Whether character or world-focused, establish a distinctive identity and voice
2. **Consistency**: Maintain coherent tone, style, and logical consistency throughout all fields
3. **Engaging Content**: Create compelling scenarios that invite meaningful interaction and exploration
4. **Contextual Clarity**: Provide sufficient background for users to understand and engage with the scenario
5. **Multiple Entry Points**: Use alternate_greetings to offer 3-5 comprehensive, fully-developed alternative opening scenarios (each 150-600 words) that provide entirely different narrative paths, emotional tones, and story contexts for enhanced replayability and meaningful player choice
6. **Professional Quality**: Meet standards for AI roleplay applications with polished, well-crafted content

### WORLDBOOKS (LOREBOOKS) OVERVIEW
Worldbooks are dynamic knowledge systems that provide contextual information to enhance AI roleplay. They function as intelligent databases that inject relevant background information when specific keywords are detected, supporting both character-focused and world-based scenarios.

#### Worldbook Core Concepts:
- **Keyword Activation**: Entries trigger when associated keywords appear in conversation
- **Dynamic Insertion**: Only relevant information is injected based on context, preserving token efficiency
- **Context Enhancement**: Provides background lore, character relationships, world rules, and scenario details
- **Token Efficiency**: Conserves prompt space by loading only needed information at appropriate moments
- **Recursive Activation**: Entries can trigger other entries, creating complex information networks

#### Worldbook Entry Structure:
- **key**: Primary trigger keywords that activate the entry
- **keysecondary**: Secondary keywords for conditional or refined activation logic
- **content**: The actual information inserted into the prompt when triggered
- **comment**: Internal organizational notes for creators and maintainers
- **order**: Priority level determining insertion sequence when multiple entries activate
- **position**: Controls context insertion placement (0-1: story beginning, 2: story end, 3: before user input, 4: after user input)
- **constant**: Controls whether entry remains permanently active regardless of keywords
- **selective**: Enables advanced keyword logic with AND/OR/NOT operations for precise activation

#### Essential Entry Excellence Standards:

**STATUS Entry Standard:**
Comprehensive real-time information including temporal context, spatial context, environmental data, character statistics, physical information, interactive elements, visual structure with symbols and organized data presentation, and dynamic elements that change based on story progression.

**WORLD_VIEW Entry Standard:**
A high-quality WORLD_VIEW entry should provide systematic world-building with:
- **Version Control**: Clear versioning for world consistency (e.g., "version: 3.0")
- **Historical Timeline**: Detailed chronological development with specific dates, times, phases
- **System Categories**: Comprehensive coverage of technology, politics, economics, society, environment
- **Hierarchical Structure**: Main categories → subcategories → specific items → detailed descriptions
- **Interconnected Elements**: All systems relate to and support each other logically
- **Expansion Interfaces**: Clear connection points where supplementary entries can add specific details
- **Causal Relationships**: Events, systems, and factions have logical cause-and-effect connections
- **Living World Design**: Dynamic elements that can evolve and change over time

**USER_SETTING Entry Standard:**
A high-quality USER_SETTING entry should provide comprehensive player character profiling with:
- **Multi-dimensional Information**: Basic info, appearance, personality layers (surface vs inner), life circumstances, special experiences, abilities, current state
- **Hierarchical Organization**: Main categories → subcategories → specific items → detailed descriptions
- **Timeline Integration**: Character development across different time periods, before/after major events, transformation arcs
- **Psychological Depth**: Surface personality vs inner nature, mental state evolution, motivations, desires, plans
- **Systematic Ability Description**: Detailed mechanisms, usage methods, limitations, and conditions for special powers or skills
- **Dynamic Character Arc**: Past circumstances → current situation → future intentions, showing character growth and change
- **World Integration**: How the character fits into and interacts with the established world systems and events
- **Behavioral Framework**: Action tendencies, decision-making patterns, relationship dynamics, strategic approaches

These create immersive, comprehensive world foundations that provide rich context for AI responses and clear expansion opportunities for supplementary worldbook entries.

#### Worldbook Best Practices:
1. **Dual Classification System**: Create two types of entries - (1) Essential fixed entries with specific comment values "STATUS" (comprehensive real-time interface), "USER_SETTING" (multi-dimensional player character profiling with hierarchical organization, timeline integration, psychological depth, systematic ability descriptions, dynamic character arc, and behavioral framework), "WORLD_VIEW" (systematic world-building with version control, historical timeline, hierarchical system categories, interconnected elements, and expansion interfaces for supplementary entries) all wrapped in proper XML tags containing 200-1000 words each, and (2) Supplementary keyword-triggered entries that expand specific world elements (NPCs, locations, items, factions, technologies, events) referenced in the WORLD_VIEW foundation
2. **Strict Creation Order**: Follow this exact sequence - FIRST: STATUS entry (current game state), SECOND: USER_SETTING entry (player character info), THIRD: WORLD_VIEW entry (world background), ONLY THEN: supplementary keyword entries. Each essential entry must be completed with proper XML wrapping before proceeding to the next type
3. **Quality over Quantity**: Focus on creating meaningful, well-crafted entries rather than numerous shallow ones
4. **Systematic Expansion**: Supplementary entries should expand specific elements referenced in WORLD_VIEW foundation (e.g., if WORLD_VIEW mentions "资源集散地", create specific entries for individual locations; if it mentions factions, create detailed NPC entries for faction leaders)
5. **Strategic Keywords**: Use discoverable, relevant keywords that naturally appear in conversations for supplementary entries
6. **Content Depth**: Provide useful, detailed information that genuinely enhances storytelling and immersion
7. **Strategic Positioning**: Use position 0-1 for foundational world info, position 2 for supplemental context, position 3-4 for immediate response relevance
8. **Scenario Integration**: Ensure entries complement and enhance the character card's scenario and tone
9. **Token Management**: Balance information richness with efficient token usage for optimal performance

### INTEGRATION PRINCIPLES
Character cards and worldbooks work together to create rich, immersive roleplay experiences across different scenario types:
- **Scenario Foundation**: Character cards establish the core identity, tone, and context
- **Dynamic Enhancement**: Worldbooks provide adaptive background information that enriches interactions
- **Contextual Flow**: Worldbook entries activate naturally based on conversation direction and topics
- **Narrative Coherence**: All elements work together to maintain consistent storytelling and world logic
- **User Experience**: The combination should feel seamless and enhance rather than complicate interactions
- **Flexible Application**: System supports both character-focused and world-building approaches effectively

This knowledge is fundamental to creating professional-quality AI roleplay content that meets industry standards for engagement, consistency, technical excellence, and supports diverse storytelling approaches.
`;

/**
 * Creates a standardized prompt template with core background knowledge
 * This should be used for all major LLM calls in the system
 */
function createStandardPromptTemplate(specificPrompt: string): ChatPromptTemplate {
  const fullPrompt = `${CORE_KNOWLEDGE_SECTION}

${specificPrompt}`;
  
  return ChatPromptTemplate.fromTemplate(fullPrompt);
}

// ============================================================================
// AGENT ENGINE
// ============================================================================

// Define user input callback type
type UserInputCallback = (message?: string) => Promise<string>;

/**
 * Agent Engine - Real-time Decision Architecture
 * Inspired by Jina AI DeepResearch: Keep searching, reading, reasoning until answer found
 * Enhanced with task decomposition and reflection capabilities
 * Following DeepResearch: Planning generates parameters, tools execute
 */
export class AgentEngine {
  private conversationId: string;
  private userInputCallback?: UserInputCallback;
  private model: any; // LLM model instance

  constructor(conversationId: string, userInputCallback?: UserInputCallback) {
    this.conversationId = conversationId;
    this.userInputCallback = userInputCallback;
  }

  /**
   * Start the agent execution with real-time decision making
   */
  async start(userInputCallback?: UserInputCallback): Promise<{
    success: boolean;
    result?: any;
    error?: string;
  }> {
    try {
      if (userInputCallback) {
        this.userInputCallback = userInputCallback;
      }

      await ResearchSessionOperations.updateStatus(this.conversationId, SessionStatus.THINKING);
      
      // Initialize the model and perform task decomposition
      const context = await this.buildExecutionContext();
      this.model = this.createLLM(context.llm_config);
      
      // Initialize with task decomposition - inspired by DeepResearch
      await this.initialize(context);
      
      // Main execution loop - real-time decision making
      return await this.executionLoop();
      
    } catch (error) { 
      await ResearchSessionOperations.updateStatus(this.conversationId, SessionStatus.FAILED);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    } 
  }

  /**
   * Initialize session with task decomposition
   * Inspired by DeepResearch's approach to breaking down complex objectives
   */
  private async initialize (context: ExecutionContext): Promise<void> {
    console.log("🚀 Initializing session with task decomposition...");
    
    // Check if already initialized
    if (context.research_state.task_queue && context.research_state.task_queue.length > 0) {
      console.log("📋 Task queue already initialized, skipping decomposition");
      return;
    }

    const prompt = createStandardPromptTemplate(`
You are an expert task planner for character card and worldbook generation. 
Analyze the user's objective and create a smart, targeted task queue with sub-problems.

USER OBJECTIVE: {main_objective}

ANALYSIS GUIDELINES:
1. FIRST, determine if the story relates to existing real-world content (anime, novels, games, movies, etc.)
   - Look for specific mentions of existing works, characters, or franchises
   - Check if user wants something "based on" or "inspired by" existing content
   - If YES: Include research tasks to gather accurate information

2. SECOND, assess if the story direction is clear enough
   - Is the genre/style clear? (romance, adventure, fantasy, sci-fi, horror, campus life, etc.)
   - Is the story type clear? (single character focus vs world/scenario focus)
   - Is the setting/theme sufficiently defined?
   - If NO: Include user clarification tasks

3. THIRD, create 3-5 specific tasks with actionable sub-problems:
   - Research tasks (if needed for existing content)
   - User clarification tasks (if story is too vague)
   - Character card generation task (REQUIRED)
   - Worldbook generation task (REQUIRED, after character)
   - Quality review task (REQUIRED)

TASK CREATION RULES:
- Character card generation MUST come before worldbook generation
- Each task should be broken down into 2-5 specific sub-problems
- Sub-problems should be tool-agnostic and action-oriented
- Tasks should build upon each other logically
- Sub-problems are completed sequentially within each task

EXAMPLE DECISION LOGIC:
- Story mentions "Harry Potter": ADD research task with sub-problems for different aspects
- Story says "anime girl": ADD clarification task with specific questions  
- Story is vague "fantasy adventure": ADD clarification task for genre/setting details
- Story is clear "cyberpunk detective in Neo-Tokyo": PROCEED with character creation

Respond using the following XML format:
<task_decomposition>
  <analysis>
    <real_world_content_detected>true/false</real_world_content_detected>
    <real_world_details>specific content mentioned (if any)</real_world_details>
    <story_clarity_level>clear/moderate/vague</story_clarity_level>
    <unclear_aspects>list aspects that need clarification (if any)</unclear_aspects>
  </analysis>
  <initial_tasks>
    <task>
      <description>main task description</description>
      <reasoning>why this task is needed</reasoning>
      <sub_problems>
        <sub_problem>
          <description>specific actionable step</description>
          <reasoning>why this step is important</reasoning>
        </sub_problem>
        // 2-5 sub-problems per task
      </sub_problems>
    </task>
    // 3-5 tasks total
  </initial_tasks>
  <task_strategy>explanation of the overall approach</task_strategy>
</task_decomposition>`);

    try {
      const response = await this.model.invoke([
        await prompt.format({
          main_objective: context.research_state.main_objective,
        }),
      ]);

      const content = response.content as string;
      
      // Parse analysis
      const realWorldContent = content.match(/<real_world_content_detected>(.*?)<\/real_world_content_detected>/)?.[1]?.trim() === "true";
      const realWorldDetails = content.match(/<real_world_details>(.*?)<\/real_world_details>/)?.[1]?.trim() || "";
      const clarityLevel = content.match(/<story_clarity_level>(.*?)<\/story_clarity_level>/)?.[1]?.trim() || "moderate";
      const unclearAspects = content.match(/<unclear_aspects>(.*?)<\/unclear_aspects>/)?.[1]?.trim() || "";
      
      // Parse tasks with sub-problems
      const taskMatches = [...content.matchAll(/<task>([\s\S]*?)<\/task>/g)];
      const taskQueue = taskMatches.map((match, index) => {
        const taskContent = match[1];
        const description = taskContent.match(/<description>([\s\S]*?)<\/description>/)?.[1]?.trim() || `Task ${index + 1}`;
        const reasoning = taskContent.match(/<reasoning>([\s\S]*?)<\/reasoning>/)?.[1]?.trim() || "Task planning";
        
        // Parse sub-problems
        const subProblemMatches = [...taskContent.matchAll(/<sub_problem>([\s\S]*?)<\/sub_problem>/g)];
        const sub_problems = subProblemMatches.map((subMatch, subIndex) => {
          const subContent = subMatch[1];
          const subDescription = subContent.match(/<description>([\s\S]*?)<\/description>/)?.[1]?.trim() || `Sub-problem ${subIndex + 1}`;
          const subReasoning = subContent.match(/<reasoning>([\s\S]*?)<\/reasoning>/)?.[1]?.trim() || "Step planning";
          
          return {
            id: `sub_${Date.now()}_${index}_${subIndex}`,
            description: subDescription,
            reasoning: subReasoning,
          };
        });
        
        return {
          id: `init_task_${Date.now()}_${index}`,
          description,
          reasoning,
          sub_problems,
        };
      });

      // Parse strategy
      const taskStrategy = content.match(/<task_strategy>([\s\S]*?)<\/task_strategy>/)?.[1]?.trim() || "Task decomposition completed";

      // Update research state with initial decomposition
      const stateUpdate = {
        task_queue: taskQueue,
      };

      await ResearchSessionOperations.updateResearchState(this.conversationId, stateUpdate);
      
      console.log(`✅ Task decomposition complete: ${taskQueue.length} tasks created`);
      console.log(`📊 Analysis: Real-world content: ${realWorldContent}, Clarity: ${clarityLevel}`);

      // Add comprehensive initialization message
      let analysisMessage = `🎯 Task Planning Analysis:
- Real-world content detected: ${realWorldContent ? "Yes" : "No"}`;
      
      if (realWorldContent && realWorldDetails) {
        analysisMessage += `\n- Content details: ${realWorldDetails}`;
      }
      
      analysisMessage += `\n- Story clarity level: ${clarityLevel}`;
      
      if (unclearAspects) {
        analysisMessage += `\n- Needs clarification: ${unclearAspects}`;
      }
      
      analysisMessage += `\n\n📋 Task Strategy: ${taskStrategy}
      
Created ${taskQueue.length} tasks with sub-problems:
${taskQueue.map((task, i) => `${i + 1}. ${task.description} (${task.sub_problems.length} sub-problems)`).join("\n")}`;

      await ResearchSessionOperations.addMessage(this.conversationId, {
        role: "agent",
        content: analysisMessage,
        type: "agent_thinking",
      });

    } catch (error) {
      console.error("❌ Task decomposition failed:", error);
      console.log("🔄 Using fallback task queue due to decomposition failure");
    }
  }

  /**
   * Real-time execution loop - core planning and decision making
   * Based on DeepResearch philosophy: continuous search and reasoning
   */
  private async executionLoop(): Promise<{
    success: boolean;
    result?: any;
    error?: string;
  }> {
    const session = await ResearchSessionOperations.getSessionById(this.conversationId);
    if (!session) throw new Error("Session not found");

    let iteration = 0;
    const maxIterations = session.execution_info.max_iterations;
    const tokenBudget = session.execution_info.token_budget;
    let usedTokens = session.execution_info.total_tokens_used || 0;

    while (iteration < maxIterations && usedTokens < tokenBudget) {
      iteration++;
      await ResearchSessionOperations.incrementIteration(this.conversationId);

      // Get current context
      const context = await this.buildExecutionContext();
      
      // Real-time planning: What should we do next?
      const decision = await this.selectNextDecision(context);
      
      if (!decision) {
        console.log("🎯 No more decisions available");
        continue; // Continue to end of loop where task queue check happens
      }

      // MANDATORY: Always apply task optimization after planning
      if (decision.taskAdjustment) {
        console.log(`📋 Applying MANDATORY task optimization: ${decision.taskAdjustment.reasoning}`);
        await this.applyTaskAdjustment(decision.taskAdjustment);
      }

      // Execute the decided tool
      const result = await this.executeDecision(decision, context);
      console.log("🔄 Execution result:", result);
      
      // Handle tool execution failure with LLM analysis
      if (!result.success) {
        console.error(`❌ Tool ${decision.tool} failed: ${result.error}`);
        await this.analyzeToolFailure(decision, result, context);
        continue; // Continue to next iteration despite tool failure
      }

      // Handle SEARCH tool - update knowledge base with search results
      if (decision.tool === ToolType.SEARCH && result.success) {        
        // Add knowledge entries from search results
        if (result.result?.knowledge_entries && result.result.knowledge_entries.length > 0) {
          await ResearchSessionOperations.addKnowledgeEntries(this.conversationId, result.result.knowledge_entries);
          console.log(`📊 Knowledge base updated: added ${result.result.knowledge_entries.length} new entries`);
        }
        
        // Complete current sub-problem after successful tool execution
        await ResearchSessionOperations.completeCurrentSubProblem(this.conversationId); 
      }

      // Handle ASK_USER tool - special case for user interaction flow control
      if (decision.tool === ToolType.ASK_USER && result.success) {
        if (!this.userInputCallback) {
          throw new Error("User input required but no callback provided");
        }

        await ResearchSessionOperations.updateStatus(this.conversationId, SessionStatus.WAITING_USER);
        
        const userInput = await this.userInputCallback(result.result?.message);

        await ResearchSessionOperations.addMessage(this.conversationId, {
          role: "agent",
          content: result.result?.message,
          type: "agent_action",
        });
        
        await ResearchSessionOperations.addMessage(this.conversationId, {
          role: "user",
          content: userInput,
          type: "user_input",
        });
        
        await ResearchSessionOperations.updateStatus(this.conversationId, SessionStatus.THINKING);
        
        // Complete current sub-problem after successful user interaction
        await ResearchSessionOperations.completeCurrentSubProblem(this.conversationId);
      }

      // Handle CHARACTER or WORLDBOOK tool - data updates and task completion evaluation
      if ((decision.tool === ToolType.CHARACTER || decision.tool === ToolType.WORLDBOOK) && result.success) {
        console.log(`✅ ${decision.tool} execution completed with generated content`);
        
        // Update generation output with new data
        if (decision.tool === ToolType.CHARACTER && result.result?.character_data) {
          console.log("🔄 Updating generation output with character data");
          await ResearchSessionOperations.updateGenerationOutput(this.conversationId, {
            character_data: result.result.character_data,
          });
        }
        
        if (decision.tool === ToolType.WORLDBOOK && result.result?.worldbook_data) {
          console.log("🔄 Updating generation output with worldbook data");
          
          // Use the new simplified method for appending worldbook data
          const newEntries = result.result.worldbook_data;
          await ResearchSessionOperations.appendWorldbookData(this.conversationId, newEntries);
          
          console.log(`📚 Added ${newEntries.length} new worldbook entries`);
        }
        
        // Complete current sub-problem after successful tool execution
        await ResearchSessionOperations.completeCurrentSubProblem(this.conversationId);
      }

      // Handle REFLECT tool - add new tasks to the current queue
      if (decision.tool === ToolType.REFLECT && result.success) {
        console.log("🔄 Reflection completed");
        
        // Efficiently add new tasks without fetching the entire session
        if (result.result.new_tasks && result.result.new_tasks.length > 0) {
          await ResearchSessionOperations.addTasksToQueue(this.conversationId, result.result.new_tasks);
          console.log(`📋 Added ${result.result.tasks_count} new tasks to queue`);
        }
        
        await ResearchSessionOperations.completeCurrentSubProblem(this.conversationId);
      }

      // Handle COMPLETE tool - clear all tasks and end session
      if (decision.tool === ToolType.COMPLETE && result.success) {
        console.log("✅ Completion tool executed");
        
        if (result.result.finished === true) {
          console.log("🎯 Session completion confirmed, clearing all tasks");
          await ResearchSessionOperations.clearAllTasks(this.conversationId);
          
          // Complete current sub-problem after successful completion
          await ResearchSessionOperations.completeCurrentSubProblem(this.conversationId);
        }
      }

      // Check if task queue is empty at the end of each iteration
      const currentContext = await this.buildExecutionContext();
      if (!currentContext.research_state.task_queue || currentContext.research_state.task_queue.length === 0) {
        console.log("📋 Task queue is empty, checking final generation completion...");
        const generationOutput = await ResearchSessionOperations.getGenerationOutput(this.conversationId);
        if (generationOutput) {
          const evaluationResult = await this.evaluateGenerationProgress(generationOutput);
          if (evaluationResult === null) {
            console.log("✅ Final generation evaluation: Complete");
            await ResearchSessionOperations.updateStatus(this.conversationId, SessionStatus.COMPLETED);
            return {
              success: true,
              result: await this.generateFinalResult(),
            };
          } else {
            console.log("❓ Final generation evaluation: Incomplete, adding completion task");
          }
        }
      }

      // Small delay to prevent tight loops
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // If we exit the loop due to limits, return failure
    return {
      success: false,
      error: usedTokens >= tokenBudget ? "Token budget exceeded" : "Maximum iterations reached without completion",
    };
  }

  /**
   * Core planning module - real-time decision making with complete content generation
   * Following DeepResearch: planner generates ALL content, tools just store/process results
   */
  private async selectNextDecision(context: ExecutionContext): Promise<ToolDecision | null> {
    console.log("🔄 Selecting next decision");
    
    // Get detailed tool information in XML format to inject into the prompt
    const availableTools = ToolRegistry.getDetailedToolsInfo();
    
    const prompt = createStandardPromptTemplate(`
<prompt>
  <system_role>
    You are a master planning agent for a character and world-building assistant.
    Your primary goal is to analyze the user's request, the current state of the project, and the available tools to decide the single best next action.
    You must think step-by-step and provide your reasoning, your chosen action, and the complete parameters for that action in the specified XML format.
  </system_role>

  <tools_schema>
    // These are all the tools available for the agent to call, along with their parameters and usage guidelines
    {available_tools}
  </tools_schema>

  <main_objective>
    // The main objective of the agent, which is to create a character and worldbook based on the user's request
    {main_objective}
  </main_objective>

  <completed_tasks>
    // The tasks that have been completed so far, which are used to assess the progress of the agent
    {completed_tasks}
  </completed_tasks>

  <existing_knowledge>
    // The knowledge base of the agent, which is used to store the information that the agent has gathered from the user's request
    {knowledge_base}
  </existing_knowledge>

  <conversation_context>
    // The recent conversation history of the agent, which is used to store the conversation history of the agent
    {recent_conversation}
  </conversation_context>

  <current_task_queue>
    // The current task queue of the agent, which is used to store the current task queue of the agent
    {task_queue_status}
  </current_task_queue>

  <current_sub_problem>
    // The current sub-problem of the agent, which is used to store the current sub-problem of the agent
    {current_sub_problem}
  </current_sub_problem>

  <current_generation_output>
    // Current generation output state - this is the core information that needs to be analyzed for decision making
    <character_progress>
      {character_progress}
    </character_progress>
    <worldbook_progress>
      {worldbook_progress}
    </worldbook_progress>
    <completion_status>
      {completion_status}
    </completion_status>
  </current_generation_output>

  <tool_usage_guidelines>
    <generation_based_tool_selection>
      TOOL SELECTION BASED ON GENERATION OUTPUT:
      
      CHARACTER PROGRESS ANALYSIS:
      - If character is < 50% complete: Focus on CHARACTER tool to build core fields
      - If character is 50-80% complete: Use CHARACTER tool to fill remaining required fields
      - If character is > 80% complete: Continue with CHARACTER tool until 100% complete
      - If character is 100% complete: Only then consider WORLDBOOK tool
      
      🚫 CRITICAL CONSTRAINT: Worldbook creation is BLOCKED until ALL character fields are complete
      - Required character fields: name, description, personality, scenario, first_mes, mes_example, alternate_greetings, creator_notes, tags
      - Do NOT use WORLDBOOK tool if any character field is missing
      - Character completion is mandatory before worldbook creation
      
      WORLDBOOK PROGRESS ANALYSIS (only if character is 100% complete):
      - If worldbook has < 3 entries: Focus on creating core world elements
      - If worldbook has 3-7 entries: Add supporting character relationships and world rules
      - If worldbook has > 7 entries: Focus on quality refinement and completion
      
      COMPLETION STATUS ANALYSIS:
      - If "Generation not started": Start with CHARACTER tool
      - If "Character incomplete": Use CHARACTER tool to complete missing fields
      - If "Character complete - Ready for worldbook": Use WORLDBOOK tool
      - If "Ready for final evaluation": Use COMPLETE tool to finish session
      - If "Task queue empty but output incomplete": Use REFLECT tool to create new tasks
    </generation_based_tool_selection>
    
    <tool_priority_and_criteria>
      TOOL PRIORITY ORDER:
      1. ASK_USER: Use ONLY for fundamental uncertainties about story direction, genre, or core creative decisions
      2. SEARCH: Use when referencing existing anime/novels/games or needing factual information
      3. CHARACTER: Primary tool - complete character development BEFORE worldbook
      4. WORLDBOOK: Secondary tool - use ONLY AFTER character is 100% complete
      5. REFLECT: Use ONLY when task queue is empty but generation output is incomplete
      6. COMPLETE: Use when generation is finished and session should end

      TOOL SELECTION CRITERIA:
      <ask_user_when>
        - Uncertain about story genre/style (Cthulhu, romance, campus, etc.)
        - Unclear if single character or world scenario
        - Major creative direction affects entire generation
        - Cannot determine user's fundamental preferences
        DO NOT use for details that can be inferred or creatively determined
      </ask_user_when>

      <search_when>
        - Story references existing anime, novels, games, movies
        - Need accurate information about real-world cultural elements
        - Require specific factual details or historical context
        DO NOT use for generic creative content that can be imagined
      </search_when>

      <character_when>
        - Most frequently used tool
        - Build incrementally in REQUIRED order: name → description → personality → scenario → first_mes → alternate_greetings → mes_example → creator_notes → tags
        - ALL EIGHT FIELDS ARE MANDATORY for complete character card
        - Use multiple tool calls to build systematically, adding one or more fields each time
        - Must have ALL required fields complete BEFORE starting worldbook
        - Character completion is verified by presence of all eight required fields
      </character_when>

      <worldbook_when>
        - Use ONLY AFTER character creation is 100% complete
        - ALL character fields must be present: name, description, personality, scenario, first_mes, mes_example, alternate_greetings, creator_notes, tags
        - Do NOT use if any character field is missing or empty
        - Follow STRICT CREATION ORDER: FIRST create STATUS entry, SECOND create USER_SETTING entry, THIRD create WORLD_VIEW entry, ONLY THEN create supplementary entries
        - Check existing worldbook for missing essential entries: if STATUS missing, create STATUS; if USER_SETTING missing, create USER_SETTING; if WORLD_VIEW missing, create WORLD_VIEW
        - Essential entries must use proper XML wrapping: STATUS uses <status>content</status>, USER_SETTING uses <user_setting>content</user_setting>, WORLD_VIEW uses <world_view>content</world_view>
        - Create 1-3 high-quality entries per call, prioritizing missing essential entries first
        - Only create supplementary keyword entries (NPCs, locations, items) after all three essential entries exist
        - Entries should complement and enhance the established character
      </worldbook_when>

      <reflect_when>
        - Task queue is empty but main objective is not yet complete
        - Current tasks are finished but generation output is incomplete
        - Need to create new tasks to continue progress toward completion
        - Session is ending but final output quality is insufficient
        DO NOT use for task refinement or sub-problem adjustment - that's handled by task optimization
      </reflect_when>

      <complete_when>
        - Character and worldbook creation are both 100% complete
        - All required fields are filled and quality standards are met
        - Generation output is ready for final delivery
        - Session should terminate and return final results
        - Use with finished=true to clear all tasks and end session
      </complete_when>
    </tool_priority_and_criteria>
  </tool_usage_guidelines>

  <instructions>
    CRITICAL DECISION PROCESS - Follow this order of importance:
    
    1. MAIN OBJECTIVE (Highest Priority): Analyze <main_objective> to understand the user's core request and desired outcome
    
    2. GENERATION OUTPUT (Critical Priority): Examine <current_generation_output> to assess current character and worldbook progress
       - Check character completion status and identify missing fields
       - Check worldbook progress ONLY if character is 100% complete
       - 🚫 CRITICAL: Character must be fully complete before any worldbook creation
    
    3. CURRENT TASK: Review <current_task_queue> to understand what specific work is planned
    
    4. CURRENT SUB-PROBLEM: Examine <current_sub_problem> to identify the immediate next step
    
    5. TOOL GUIDELINES: Apply the tool selection guidelines based on generation output analysis
       - Use CHARACTER tool until all 8 required fields are complete
       - Only use WORLDBOOK tool after character is 100% complete
       - Use REFLECT ONLY when task queue is empty but generation output is incomplete
       - Follow the priority order and selection criteria
    
    6. KNOWLEDGE & CONTEXT: Review <existing_knowledge> and <conversation_context> for additional context
    
    7. TASK OPTIMIZATION: Evaluate if current task needs adjustment based on recent progress
    
    8. DECISION: Select the single most critical tool action to complete the current sub-problem
    
    🚫 MANDATORY CONSTRAINT: Character completion (all 8 fields) is REQUIRED before worldbook creation can begin.
  </instructions>

  <output_specification>
    You MUST respond using the following XML format. Do not include any other text, explanations, or formatting outside of the <response> block.

    <response>
      <think>
        Provide detailed reasoning in TWO parts:
        1. TASK ADJUSTMENT ANALYSIS: Analyze current task and sub-problems based on recent tool results and progress.
        2. TOOL SELECTION: Explain your choice of the next tool action and how it helps achieve the main objective.
      </think>
      <task_adjustment>
        MANDATORY: Always analyze and optimize current task based on recent tool execution results:
        <reasoning>Brief reasoning for why current task needs optimization based on recent progress</reasoning>
        <task_description>New optimized task description that better reflects current progress</task_description>
        <new_subproblems>New sub-problems separated by | (MUST be <= current sub-problem count, max 2)</new_subproblems>
        
        RULES:
        - task_description MUST be rewritten to reflect current progress and needs
        - new_subproblems MUST be <= current sub-problem count
        - new_subproblems MUST be focused and actionable based on recent tool results
        - Maximum 3 sub-problems allowed
        
        Example - After successful character tool execution:
        <reasoning>Character name and description completed, need to focus on personality development</reasoning>
        <task_description>Develop character personality and behavioral traits</task_description>
        <new_subproblems>Define core personality traits|Create character background story</new_subproblems>
        
        Example - After search tool execution:
        <reasoning>Background research completed, can now focus on specific character creation</reasoning>
        <task_description>Create character based on researched background</task_description>
        <new_subproblems>Design character appearance and personality</new_subproblems>
      </task_adjustment>
      <action>The name of the ONE tool you are choosing to use (e.g., SEARCH, CHARACTER, WORLDBOOK).</action>
      <parameters>
        <!--
        - Provide all parameters for the chosen action inside this block.
        - Use simple parameter names directly, no complex JSON structures needed.
        - For array parameters, use CDATA format: <param_name><![CDATA[["item1", "item2"]]]></param_name>
        - For other parameters, use simple values: <param_name>value</param_name>
        - Example for SEARCH: <query><![CDATA["dragon mythology", "magic system"]]]></query>
        - Example for ASK_USER: <question>What genre style do you prefer?</question>
        - Example for CHARACTER: <name>Elara</name><description>A cunning sorceress...</description><alternate_greetings><![CDATA[["Summer festival version", "Library encounter", "Rainy day meeting", "Battle aftermath scenario"]]]></alternate_greetings><tags><![CDATA[["fantasy", "sorceress"]]]></tags>
        - Example for WORLDBOOK: <key><![CDATA[["magic", "spell"]]]></key><content>Details...</content><comment>Magic system</comment><constant>false</constant><position>0</position><order>100</order>
        - Example for REFLECT: <new_tasks>
            <task>
              <description>Research character background</description>
              <reasoning>Need more depth</reasoning>
              <sub_problem>Find character family history</sub_problem>
              <sub_problem>Research character education</sub_problem>
            </task>
          </new_tasks>
        -->
      </parameters>
    </response>
  </output_specification>
</prompt>
    `);

    try {
      const response = await this.model.invoke([
        await prompt.format({
          available_tools: availableTools,
          main_objective: context.research_state.main_objective,
          completed_tasks: this.buildCompletedTasksSummary(context),
          knowledge_base: this.buildKnowledgeBaseSummary(context.research_state.knowledge_base),
          recent_conversation: this.buildRecentConversationSummary(context.message_history),
          task_queue_status: this.buildTaskQueueSummary(context),
          current_sub_problem: context.research_state.task_queue?.[0]?.sub_problems?.[0]?.description || "No current sub-problem",
          character_progress: this.buildCharacterProgressSummary(context.generation_output),
          worldbook_progress: this.buildWorldbookProgressSummary(context.generation_output),
          completion_status: this.buildCompletionStatusSummary(context.generation_output),
        }),
      ]);

      const content = response.content as string;
      
      // Parse XML response directly
      const think = content.match(/<think>([\s\S]*?)<\/think>/)?.[1].trim() ?? "No reasoning provided";
      const taskAdjustmentBlock = content.match(/<task_adjustment>([\s\S]*?)<\/task_adjustment>/)?.[1] ?? "";
      const action = content.match(/<action>([\s\S]*?)<\/action>/)?.[1].trim() ?? "null";
      
      // Parse task adjustment details
      const adjustmentReasoning = taskAdjustmentBlock.match(/<reasoning>([\s\S]*?)<\/reasoning>/)?.[1]?.trim() ?? "Task optimization based on current progress";
      const newTaskDescription = taskAdjustmentBlock.match(/<task_description>([\s\S]*?)<\/task_description>/)?.[1]?.trim() ?? "";
      const newSubproblemsText = taskAdjustmentBlock.match(/<new_subproblems>([\s\S]*?)<\/new_subproblems>/)?.[1]?.trim() ?? "";
      
      const taskAdjustment = {
        reasoning: adjustmentReasoning,
        taskDescription: newTaskDescription || undefined,
        newSubproblems: newSubproblemsText ? newSubproblemsText.split("|").map(s => s.trim()).filter(s => s.length > 0).slice(0, 3) : undefined,
      };
      
      if (action === "null" || !action) {
        return null;
      }

      // Parse parameters
      const paramsMatch = content.match(/<parameters>([\s\S]*?)<\/parameters>/);
      const parameters: Record<string, any> = {};

      if (paramsMatch && paramsMatch[1]) {
        const paramsString = paramsMatch[1].trim();
        const paramRegex = /<(\w+)>([\s\S]*?)<\/(\1)>/g;
        let match;

        while ((match = paramRegex.exec(paramsString)) !== null) {
          const key = match[1];
          let value = match[2].trim();

          const cdataMatch = value.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
          if (cdataMatch) {
            try {
              parameters[key] = JSON.parse(cdataMatch[1]);
            } catch (e) {
              parameters[key] = cdataMatch[1];
            }
          } else {
            // Simple parameter parsing - handle basic types
            if (value.toLowerCase() === "true") {
              parameters[key] = true;
            } else if (value.toLowerCase() === "false") {
              parameters[key] = false;
            } else if (!isNaN(Number(value)) && value.trim() !== "") {
              parameters[key] = Number(value);
            } else {
              parameters[key] = value;
            }
          }
        }
        console.log("🔄 finished parsing parameters");
      }

      return {
        tool: action as ToolType,
        parameters: parameters,
        reasoning: think,
        priority: 5,
        taskAdjustment: taskAdjustment as TaskAdjustment,
      };
    } catch (error) {
      console.error("Error in selectNextDecision:", error);
      return null;
    }
  }

  /**
   * Analyze tool failure using LLM and record the analysis
   */
  private async analyzeToolFailure(
    decision: ToolDecision, 
    result: ExecutionResult, 
    context: ExecutionContext,
  ): Promise<void> {
    try {
      // Get tool information to understand expected parameters
      const toolInfo = ToolRegistry.getDetailedToolsInfo();
      
      const prompt = createStandardPromptTemplate(`
You are analyzing a tool execution failure to understand what went wrong and provide actionable insights.

FAILED TOOL: {tool_name}
EXPECTED PARAMETERS: {expected_parameters}
ACTUAL PARAMETERS PROVIDED: {actual_parameters}
ERROR MESSAGE: {error_message}
TOOL REASONING: {tool_reasoning}

RECENT MESSAGE HISTORY:
{message_history}

CURRENT CONTEXT:
- Current Task: {current_task}
- Main Objective: {main_objective}

ANALYSIS INSTRUCTIONS:
1. Identify the root cause of the failure (parameter mismatch, missing data, logic error, etc.)
2. Explain why the LLM planner provided incorrect parameters
3. Suggest what should have been provided instead
4. Recommend how to prevent similar failures in the future

Provide your analysis in the following XML format:
<failure_analysis>
  <root_cause>Brief description of what caused the failure</root_cause>
  <parameter_analysis>Analysis of parameter issues - what was expected vs what was provided</parameter_analysis>
  <planner_issue>Why the LLM planner made this mistake</planner_issue>
  <correct_approach>What should have been done instead</correct_approach>
  <prevention>How to prevent similar failures</prevention>
  <impact>Impact on the current session and task progress</impact>
</failure_analysis>
      `);

      const response = await this.model.invoke([
        await prompt.format({
          tool_name: decision.tool,
          expected_parameters: this.extractToolParameters(toolInfo, decision.tool),
          actual_parameters: JSON.stringify(decision.parameters, null, 2),
          error_message: result.error || "Unknown error",
          tool_reasoning: decision.reasoning || "No reasoning provided",
          message_history: this.buildRecentConversationSummary(context.message_history.slice(-5)),
          current_task: context.research_state.task_queue?.[0]?.description || "No current task",
          main_objective: context.research_state.main_objective,
        }),
      ]);

      const content = response.content as string;
      
      // Parse the analysis
      const rootCause = content.match(/<root_cause>([\s\S]*?)<\/root_cause>/)?.[1]?.trim() || "Analysis failed";
      const parameterAnalysis = content.match(/<parameter_analysis>([\s\S]*?)<\/parameter_analysis>/)?.[1]?.trim() || "";
      const plannerIssue = content.match(/<planner_issue>([\s\S]*?)<\/planner_issue>/)?.[1]?.trim() || "";
      const correctApproach = content.match(/<correct_approach>([\s\S]*?)<\/correct_approach>/)?.[1]?.trim() || "";
      const prevention = content.match(/<prevention>([\s\S]*?)<\/prevention>/)?.[1]?.trim() || "";
      const impact = content.match(/<impact>([\s\S]*?)<\/impact>/)?.[1]?.trim() || "";

      // Create comprehensive failure analysis message
      const analysisContent = `TOOL FAILURE ANALYSIS - ${decision.tool}

Root Cause: ${rootCause}

Parameter Analysis: ${parameterAnalysis}

Planner Issue: ${plannerIssue}

Correct Approach: ${correctApproach}

Prevention: ${prevention}

Impact: ${impact}

Technical Details:
- Expected Parameters: ${this.extractToolParameters(toolInfo, decision.tool)}
- Actual Parameters: ${JSON.stringify(decision.parameters, null, 2)}
- Error: ${result.error}`;

      // Record the failure analysis
      await ResearchSessionOperations.addMessage(this.conversationId, {
        role: "agent",
        content: analysisContent,
        type: "tool_failure",
      });

      console.log(`🔍 Tool failure analysis completed for ${decision.tool}`);

    } catch (error) {
      console.error("❌ Failed to analyze tool failure:", error);
      
      // Fallback: Simple error recording
      await ResearchSessionOperations.addMessage(this.conversationId, {
        role: "agent",
        content: `Tool execution failed: ${decision.tool} - ${result.error}. Analysis failed: ${error instanceof Error ? error.message : String(error)}`,
        type: "tool_failure",
      });
    }
  }

  /**
   * Extract tool parameter definitions for a specific tool
   */
  private extractToolParameters(toolsXml: string, toolType: ToolType): string {
    try {
      // Parse the XML to find the specific tool's parameters
      const toolRegex = new RegExp(`<tool>\\s*<type>${toolType}</type>[\\s\\S]*?<parameters>([\\s\\S]*?)</parameters>[\\s\\S]*?</tool>`);
      const match = toolsXml.match(toolRegex);
      
      if (match && match[1]) {
        return match[1].trim();
      }
      
      return `Parameters not found for tool ${toolType}`;
    } catch (error) {
      return `Error extracting parameters for ${toolType}: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  /**
   * Apply task optimization based on planning analysis
   * MANDATORY: Always optimize current task and sub-problems
   */
  private async applyTaskAdjustment(taskAdjustment: TaskAdjustment): Promise<void> {
    try {
      console.log(`🔄 Processing MANDATORY task optimization: ${taskAdjustment.reasoning}`);
      
      // MANDATORY: Always apply optimization (no type checking needed)
      // Get current task info to validate constraints
      const currentTaskInfo = await ResearchSessionOperations.getCurrentSubProblem(this.conversationId);
      const currentSubproblemCount = currentTaskInfo.task?.sub_problems?.length || 0;
      
      // ENFORCE CONSTRAINTS: Ensure new sub-problems don't exceed current count and max limit of 2
      let finalSubproblems = taskAdjustment.newSubproblems || [];
      
      // Constraint 1: Cannot exceed current sub-problem count
      if (finalSubproblems.length > currentSubproblemCount) {
        console.log(`⚠️ Sub-problem count constraint: requested ${finalSubproblems.length}, current ${currentSubproblemCount}, truncating`);
        finalSubproblems = finalSubproblems.slice(0, currentSubproblemCount);
      }
      
      // Constraint 2: Maximum 2 sub-problems allowed
      if (finalSubproblems.length > 3) {
        console.log(`⚠️ Sub-problem max constraint: requested ${finalSubproblems.length}, max 3, truncating`);
        finalSubproblems = finalSubproblems.slice(0, 3);
      }
      
      // MANDATORY: Always rewrite task description
      const newTaskDescription = taskAdjustment.taskDescription || currentTaskInfo.task?.description || "Task optimization";
      
      // Apply the optimization
      await ResearchSessionOperations.modifyCurrentTaskAndSubproblems(
        this.conversationId, 
        newTaskDescription,
        finalSubproblems,
      );
      
      console.log("✅ MANDATORY task optimization applied:");
      console.log(`   - New task description: ${newTaskDescription}`);
      console.log(`   - New sub-problems (${finalSubproblems.length}): ${finalSubproblems.join(", ")}`);
      console.log(`   - Constraints enforced: max ${Math.min(currentSubproblemCount, 2)} sub-problems`);
      
      // Record the mandatory task optimization in conversation history
      await ResearchSessionOperations.addMessage(this.conversationId, {
        role: "agent",
        content: `MANDATORY task optimization applied: ${taskAdjustment.reasoning || "Task refinement based on progress"}`,
        type: "system_info",
      });
      
    } catch (error) {
      console.error("❌ Failed to apply mandatory task optimization:", error);
      // Don't throw - continue with execution even if optimization fails
    }
  }

  /**
   * Build task queue summary for decision making
   */
  private buildTaskQueueSummary(context: ExecutionContext): string {
    if (!context.research_state.task_queue || context.research_state.task_queue.length === 0) {
      return "No tasks in queue";
    }

    const currentTask = context.research_state.task_queue[0];
    if (!currentTask.sub_problems || currentTask.sub_problems.length === 0) {
      return `Current Task: ${currentTask.description}\nNo sub-problems defined`;
    }

    const currentSubProblem = currentTask.sub_problems[0];
    const remainingSubProblems = currentTask.sub_problems.length - 1;
    const upcomingTasks = context.research_state.task_queue.length - 1;

    return `Current Task: ${currentTask.description}
Current Sub-Problem: ${currentSubProblem.description}
Remaining Sub-Problems in Current Task: ${remainingSubProblems}
Upcoming Tasks: ${upcomingTasks}

Task Progress: ${currentTask.sub_problems.length - remainingSubProblems}/${currentTask.sub_problems.length} sub-problems completed`;
  }

  private buildCompletedTasksSummary(context: ExecutionContext): string {
    if (!context.research_state.completed_tasks || context.research_state.completed_tasks.length === 0) {
      return "No tasks completed yet";
    }

    const completedTasks = context.research_state.completed_tasks;
    let summary = `Total Completed: ${completedTasks.length} tasks\n\n`;
    
    // Show the most recent completed tasks (up to 5)
    const recentCompleted = completedTasks.slice(-5);
    summary += "Recently Completed Tasks:\n";
    recentCompleted.forEach((task, index) => {
      summary += `${recentCompleted.length - index}. ${task}\n`;
    });

    return summary.trim();
  }

  /**
   * Evaluate if current task has been completed using LLM analysis
   * Enhanced with tool-specific evaluation logic
   */

  /**
   * Execute a tool decision
   */
  private async executeDecision(
    decision: ToolDecision, 
    context: ExecutionContext,
  ): Promise<ExecutionResult> {
    await ResearchSessionOperations.updateStatus(this.conversationId, SessionStatus.EXECUTING);

    // Add execution message
    await ResearchSessionOperations.addMessage(this.conversationId, {
      role: "agent",
      content: `Executing: ${decision.tool} - ${decision.reasoning}`,
      type: "agent_action",
    });

    try {
      return await ToolRegistry.executeToolDecision(decision, context);
    } catch (error) {
      console.error("❌ Tool execution failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Evaluate generation progress - assess if GenerationOutput meets completion standards
   * Returns null if satisfied, or improvement suggestions string if not satisfied
   */
  private async evaluateGenerationProgress(generationOutput: GenerationOutput): Promise<string | null> {
    // First, perform basic validation checks
    const basicValidation = this.performBasicValidation(generationOutput);
    if (!basicValidation.isValid) {
      const improvementMsg = `Basic validation failed: ${basicValidation.reason}`;

      await ResearchSessionOperations.addMessage(this.conversationId, {
        role: "agent",
        content: improvementMsg,
        type: "quality_evaluation",
      });

      console.log(`❌ Basic validation failed: ${basicValidation.reason}`);
      return improvementMsg;
    }

    console.log("✅ Basic validation passed, proceeding with LLM quality assessment");

    // If basic validation passes, use LLM for quality assessment
    const prompt = createStandardPromptTemplate(`
<prompt>
  <system_role>
    You are an expert quality assurance agent for character and worldbook generation. Your task is to evaluate the GenerationOutput and determine if it meets high-quality standards for completion.
  </system_role>

  <evaluation_context>
    <generation_output>
      {generation_output}
    </generation_output>
  </evaluation_context>

  <evaluation_criteria>
    <character_data_criteria>
      - All required fields must be complete and non-empty
      - Character personality should be distinctive, engaging, and well-developed
      - Scenario should be compelling and provide clear context
      - First message should be engaging and in-character
      - Example messages should demonstrate consistent personality and writing style
      - Creator notes should provide useful guidance
    </character_data_criteria>
    
    <worldbook_criteria>
      - MANDATORY: Must contain exactly THREE essential fixed entries with proper XML wrapping: (1) comment="STATUS" with <status>content</status> containing comprehensive real-time interface, (2) comment="USER_SETTING" with <user_setting>content</user_setting> containing multi-dimensional player character profiling with hierarchical organization, timeline integration, psychological depth, systematic ability descriptions, dynamic character arc, and behavioral framework, (3) comment="WORLD_VIEW" with <world_view>content</world_view> containing systematic world-building with version control, historical timeline, hierarchical system categories, interconnected elements, and expansion interfaces
      - STATUS entry must demonstrate excellence standard: immersive game-like interface with organized sections, dynamic values, clear formatting with symbols, and comprehensive real-time information display
      - USER_SETTING entry must demonstrate excellence standard: multi-dimensional character profiling with basic info, appearance, personality layers (surface vs inner), life circumstances, special experiences, abilities with detailed mechanisms, timeline integration showing character development, psychological depth including motivations and plans, and behavioral framework for decision-making patterns
      - WORLD_VIEW entry must demonstrate excellence standard: systematic world-building with version control, detailed chronological development, comprehensive system coverage (technology, politics, economics, society, environment), hierarchical structure, interconnected elements, and clear expansion interfaces for supplementary entries
      - Essential entries must contain substantial content (200-1000 words each) within their respective XML tags
      - Must have at least 5 total high-quality entries (3 essential + minimum 2 supplementary)
      - Supplementary entries must include: character relationships, world information, world rules, NPCs, locations, or items
      - Each supplementary entry should have appropriate keywords for discovery
      - All content should be detailed, useful, and consistent
      - All entries should complement the character and enhance the storytelling experience
      - STRICT ENFORCEMENT: Worldbook is considered INCOMPLETE if any of the three essential entries are missing, lack proper XML wrapping, or fail to meet excellence standards
    </worldbook_criteria>
    
    <overall_quality_standards>
      - Content should be engaging, creative, and well-written
      - All elements should work together cohesively
      - Quality should meet professional standards for character AI applications
    </overall_quality_standards>
  </evaluation_criteria>

  <instructions>
    Evaluate the GenerationOutput strictly based on the criteria above. Focus on content quality, completeness, and overall excellence. Be thorough but demanding in your assessment.
    
    IMPORTANT: When providing improvement suggestions, focus on actionable tasks that can be used with the REFLECT tool to generate new tasks. Each suggestion should be specific enough to create concrete sub-problems for task planning.
  </instructions>

  <output_specification>
    You MUST respond using the following XML format. Do not include any other text outside this block.

    <evaluation_response>
      <reasoning>Detailed explanation of your assessment, covering character data quality, worldbook quality, and overall cohesion.</reasoning>
      <character_quality_score>Character data quality score from 0 to 100.</character_quality_score>
      <worldbook_quality_score>Worldbook data quality score from 0 to 100.</worldbook_quality_score>
      <overall_quality_score>Overall quality score from 0 to 100.</overall_quality_score>
      <is_sufficient>true or false, based on whether the generation meets high-quality completion standards (overall_quality_score >= 85).</is_sufficient>
      <improvement_suggestions>
        <suggestion>Specific improvement suggestion that can be used with REFLECT tool to create new tasks</suggestion>
        <suggestion>Another specific improvement suggestion for REFLECT tool task generation</suggestion>
      </improvement_suggestions>
    </evaluation_response>
  </output_specification>
</prompt>`);

    const context = await this.buildExecutionContext();
    const llm = this.createLLM(context.llm_config);
    const chain = prompt.pipe(llm).pipe(new StringOutputParser());

    try {
      const response = await chain.invoke({
        generation_output: JSON.stringify(generationOutput, null, 2),
      });

      // Parse XML response directly
      const reasoning = response.match(/<reasoning>([\s\S]*?)<\/reasoning>/)?.[1].trim() ?? "No reasoning provided";
      const character_quality_score = parseInt(response.match(/<character_quality_score>(\d+)<\/character_quality_score>/)?.[1] ?? "0", 10);
      const worldbook_quality_score = parseInt(response.match(/<worldbook_quality_score>(\d+)<\/worldbook_quality_score>/)?.[1] ?? "0", 10);
      const overall_quality_score = parseInt(response.match(/<overall_quality_score>(\d+)<\/overall_quality_score>/)?.[1] ?? "0", 10);
      const is_sufficient = response.match(/<is_sufficient>(true|false)<\/is_sufficient>/)?.[1] === "true";

      const improvement_suggestions: string[] = [];
      const suggestionsMatch = response.match(/<improvement_suggestions>([\s\S]*?)<\/improvement_suggestions>/)?.[1] ?? "";
      const suggestionRegex = /<suggestion>([\s\S]*?)<\/suggestion>/g;
      let match;
      while ((match = suggestionRegex.exec(suggestionsMatch)) !== null) {
        improvement_suggestions.push(match[1].trim());
      }

      console.log(`📊 Quality Assessment - Character: ${character_quality_score}%, Worldbook: ${worldbook_quality_score}%, Overall: ${overall_quality_score}%`);
      
      if (is_sufficient) {
        // Generation meets completion standards
        return null;
      } else {
        // Generation needs improvement - return suggestions
        const improvementMsg = `Quality assessment indicates improvements needed (Overall: ${overall_quality_score}%):\n${reasoning}\n\nSpecific suggestions:\n${improvement_suggestions.map(s => `- ${s}`).join("\n")}\n\n🚨 IMMEDIATE ACTION: Use REFLECT tool to generate new tasks based on the following optimization suggestions:\n${improvement_suggestions.map(s => `- ${s}`).join("\n")}`;

        await ResearchSessionOperations.addMessage(this.conversationId, {
          role: "agent",
          content: improvementMsg,
          type: "quality_evaluation",
        }); 

        return improvementMsg;
      }

    } catch (error) {
      console.error("❌ Generation evaluation failed:", error);
      const errorMsg = `Generation evaluation failed: ${error instanceof Error ? error.message : String(error)}\n\nNext step: Call REFLECT tool to analyze and create new tasks to continue generation progress.`;
      
      await ResearchSessionOperations.addMessage(this.conversationId, {
        role: "agent",
        content: errorMsg,
        type: "quality_evaluation",
      });

      return errorMsg;
    }
  }

  /**
   * Perform basic validation of GenerationOutput before LLM assessment
   */
  private performBasicValidation(generationOutput: GenerationOutput): { isValid: boolean; reason?: string } {
    // Check if character_data exists and all required fields are non-empty
    if (!generationOutput.character_data) {
      return { 
        isValid: false, 
        reason: "character_data is missing. Next step: Call REFLECT tool to analyze and create new tasks to complete character creation. Required fields: name, description, personality, scenario, first_mes, mes_example, alternate_greetings, creator_notes, tags", 
      };
    }

    const charData = generationOutput.character_data;
    const requiredCharFields = ["name", "description", "personality", "scenario", "first_mes", "mes_example", "alternate_greetings", "creator_notes", "tags"];
    
    for (const field of requiredCharFields) {
      if (!charData[field] || charData[field].toString().trim() === "") {
        return { 
          isValid: false, 
          reason: `character_data.${field} is empty or missing. Next step: Call REFLECT tool to analyze and create new tasks to complete the missing character field: ${field}`, 
        };
      }
    }

    // Check if worldbook_data exists and has at least 5 entries
    if (!generationOutput.worldbook_data || !Array.isArray(generationOutput.worldbook_data)) {
      return { 
        isValid: false, 
        reason: "worldbook_data is missing or not an array. Next step: Call REFLECT tool to analyze and create new tasks to start worldbook creation (character is complete, ready for worldbook)", 
      };
    }

    if (generationOutput.worldbook_data.length < 5) {
      return { 
        isValid: false, 
        reason: `worldbook_data has only ${generationOutput.worldbook_data.length} entries, minimum 5 required. Next step: Call REFLECT tool to analyze and create new tasks to complete worldbook creation (need ${5 - generationOutput.worldbook_data.length} more entries)`, 
      };
    }
    return { isValid: true };
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private async buildExecutionContext(): Promise<ExecutionContext> {
    const session = await ResearchSessionOperations.getSessionById(this.conversationId);
    if (!session) throw new Error("Session not found");

    return {
      session_id: this.conversationId,
      research_state: session.research_state,
      message_history: session.messages,
      generation_output: session.generation_output,
      llm_config: session.llm_config,  
    };
  }

  private createLLM(config: ExecutionContext["llm_config"]) {
    if (config.llm_type === "openai") {
      return new ChatOpenAI({
        modelName: config.model_name,
        openAIApiKey: config.api_key,
        configuration: {
          baseURL: config.base_url,
        },
        temperature: config.temperature,
        maxTokens: config.max_tokens,
        streaming: false,
      });
    } else if (config.llm_type === "ollama") {
      return new ChatOllama({
        model: config.model_name,
        baseUrl: config.base_url || "http://localhost:11434",
        temperature: config.temperature,
        streaming: false,
      });
    }

    throw new Error(`Unsupported LLM type: ${config.llm_type}`);
  }

  private buildRecentConversationSummary(messages: Message[]): string {
    return messages.slice(-5).map(m => `${m.type}: ${m.content}`).join("\n");
  }

  private buildKnowledgeBaseSummary(knowledgeBase: KnowledgeEntry[]): string {
    if (!knowledgeBase || knowledgeBase.length === 0) {
      return "No knowledge gathered yet.";
    }

    return knowledgeBase
      .slice(0, 5)
      .map(k => `- ${k.source}: ${k.content.substring(0, 100)}...`)
      .join("\n");
  }

  private async generateFinalResult(): Promise<any> {
    // For final result generation, we do need the complete session data
    // This is acceptable since it only happens once at the very end
    const session = await ResearchSessionOperations.getSessionById(this.conversationId);
    if (!session) return null;

    return {
      character_data: session.generation_output.character_data,
      worldbook_data: session.generation_output.worldbook_data,
      knowledge_base: session.research_state.knowledge_base,
    };
  }

  private buildCharacterProgressSummary(generationOutput: GenerationOutput): string {
    if (!generationOutput?.character_data) {
      return "CHARACTER STATUS: Not started - No character data available";
    }

    const charData = generationOutput.character_data;
    const requiredCharFields = ["name", "description", "personality", "scenario", "first_mes", "mes_example", "creator_notes", "tags"];
    const completedFields = charData ? requiredCharFields.filter(field => charData[field] && charData[field].toString().trim() !== "") : [];
    const missingFields = charData ? requiredCharFields.filter(field => !charData[field] || charData[field].toString().trim() === "") : requiredCharFields;
    
    const progressPercentage = Math.round((completedFields.length / requiredCharFields.length) * 100);
    
    let summary = `CHARACTER STATUS: ${progressPercentage}% Complete (${completedFields.length}/${requiredCharFields.length} fields)`;
    
    if (completedFields.length > 0) {
      summary += `\n✅ Completed: ${completedFields.join(", ")}`;
    }
    
    if (missingFields.length > 0) {
      summary += `\n❌ Missing: ${missingFields.join(", ")}`;
    }
    
    return summary;
  }

  private buildWorldbookProgressSummary(generationOutput: GenerationOutput): string {
    if (!generationOutput?.worldbook_data || generationOutput.worldbook_data.length === 0) {
      return "WORLDBOOK STATUS: Not started - No worldbook entries available";
    }

    const entries = generationOutput.worldbook_data;
    
    // Check for essential fixed entries
    const hasStatus = entries.some(entry => entry.comment === "STATUS");
    const hasUserSetting = entries.some(entry => entry.comment === "USER_SETTING");
    const hasWorldView = entries.some(entry => entry.comment === "WORLD_VIEW");
    
    const completedEntries = entries.filter(entry => entry.content && entry.content.trim() !== "").length;
    const totalEntries = entries.length;
    const progressPercentage = Math.round((completedEntries / totalEntries) * 100);
    
    let summary = `WORLDBOOK STATUS: ${progressPercentage}% Complete (${completedEntries}/${totalEntries} entries)`;
    
    // Essential entries check
    const essentialStatus = `STATUS:${hasStatus ? "✅" : "❌"} USER_SETTING:${hasUserSetting ? "✅" : "❌"} WORLD_VIEW:${hasWorldView ? "✅" : "❌"}`;
    summary += `\n🔥 Essential: ${essentialStatus}`;
    
    // Show some example entry types
    const entryTypes = entries.slice(0, 3).map(entry => entry.comment || "Unnamed entry").join(", ");
    if (entryTypes) {
      summary += `\n📚 Sample entries: ${entryTypes}`;
    }
    
    return summary;
  }

  private buildCompletionStatusSummary(generationOutput: GenerationOutput): string {
    if (!generationOutput) {
      return "OVERALL STATUS: No generation output available";
    }

    const hasCharacterData = !!generationOutput.character_data;
    const hasWorldbookData = !!generationOutput.worldbook_data && generationOutput.worldbook_data.length > 0;
    
    if (!hasCharacterData && !hasWorldbookData) {
      return "OVERALL STATUS: Generation not started - Start with CHARACTER tool";
    }
    
    if (!hasCharacterData && hasWorldbookData) {
      return "OVERALL STATUS: ⚠️ INVALID STATE - Worldbook exists but no character data. Character must be completed first before worldbook creation.";
    }
    
    // Character exists, check completion
    const charData = generationOutput.character_data;
    const requiredCharFields = ["name", "description", "personality", "scenario", "first_mes", "mes_example", "creator_notes", "tags"];
    const completedFields = charData ? requiredCharFields.filter(field => charData[field] && charData[field].toString().trim() !== "") : [];
    const missingFields = charData ? requiredCharFields.filter(field => !charData[field] || charData[field].toString().trim() === "") : requiredCharFields;
    const charComplete = missingFields.length === 0;
    
    if (!charComplete) {
      let status = `OVERALL STATUS: Character incomplete - ${completedFields.length}/${requiredCharFields.length} fields done`;
      status += `\n❌ MISSING CHARACTER FIELDS: ${missingFields.join(", ")}`;
      status += "\n🚫 BLOCKED: Cannot create worldbook until ALL character fields are complete";
      status += "\n📋 NEXT ACTION: Use CHARACTER tool to complete missing fields";
      return status;
    }
    
    // Character is complete, check worldbook
    if (hasCharacterData && !hasWorldbookData) {
      return "OVERALL STATUS: ✅ Character complete - Ready for worldbook creation. Use WORLDBOOK tool to start world-building.";
    }
    
    // Both exist, check worldbook completion
    const worldbookEntries = generationOutput.worldbook_data;
    const worldbookComplete = worldbookEntries && worldbookEntries.length >= 5 && worldbookEntries.every(entry => entry.content && entry.content.trim() !== "");
    
    if (charComplete && worldbookComplete) {
      return "OVERALL STATUS: ✅ Generation complete - Ready for final evaluation";
    } else if (charComplete && !worldbookComplete) {
      return "OVERALL STATUS: Character complete - Worldbook needs completion. Continue with WORLDBOOK tool.";
    } else {
      return "OVERALL STATUS: Both character and worldbook in progress - Focus on character completion first.";
    }
  }
} 
 
