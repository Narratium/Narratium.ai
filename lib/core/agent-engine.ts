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
} from "../models/agent-model";
import { ResearchSessionOperations } from "../data/agent/agent-conversation-operations";
import { ToolRegistry } from "../tools/tool-registry";
import { ChatOpenAI } from "@langchain/openai";
import { ChatOllama } from "@langchain/ollama";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ConfigManager, loadConfigFromLocalStorage } from "./config-manager";

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
- **personality**: For character cards: behavioral traits and psychological profile; For story cards: atmosphere, tone, and keys NPC personalities [REQUIRED]
- **scenario**: Context and circumstances - character's situation or world's current state/events [REQUIRED]
- **first_mes**: Extensive, immersive opening sequence (typically 200-800 words) that establishes the entire narrative foundation including detailed scene setting, atmospheric description, character introduction with visual details, initial dialogue or internal monologue, environmental context, and emotional tone [REQUIRED]
- **mes_example**: A comprehensive and immersive example of a message (mes) from the character. This should go beyond simple dialogue examples and act as a dynamic narrative segment, typically spanning multiple paragraphs (300-800 words). It MUST integrate:\n  1. Detailed scene introduction and atmospheric setting.\n  2. Deep internal monologue or character reflection, revealing thoughts, memories, and motivations.\n  3. Dynamic display of real-time game information or context, explicitly using the <status> XML tag to encapsulate structured data (e.g., character status, environmental stats, interactive options). This part should be clearly separated from the narrative text.\n  4. Engaging dialogue demonstrating character's communication style, emotional range, and interactions with other entities.\n  5. Character's actions, reactions, and decision-making processes within the scene.\n  This example serves as a living demonstration of the character's in-world behavior and the interactive elements of the scenario. [REQUIRED]
- **alternate_greetings**: Array of comprehensive alternative opening scenarios (typically 3-5 entries, each 150-600 words) providing entirely different narrative starting points, worldlines, or timeline variations with unique atmospheric settings, character contexts, and story hooks for meaningful player choice [REQUIRED]
- **creator_notes**: Usage guidelines, compatibility information, and creator insights [REQUIRED]
- **tags**: Categorization tags including card type (character-card/story-card), genre, and descriptors [REQUIRED]
- **avatar**: Visual representation - character portrait or scenario artwork [OPTIONAL]

**CRITICAL**: All eight core fields (name through tags) must be completed in the specified insert_order for a professional-quality character card. The CHARACTER tool should be used systematically to build these fields incrementally across multiple tool calls until all required fields are present.

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
- **keys**: Primary trigger keywords that activate the entry
- **keysecondary**: Secondary keywords for conditional or refined activation logic
- **content**: The actual information inserted into the prompt when triggered
- **comment**: Internal organizational notes for creators and maintainers
- **insert_order**: Priority level determining insertion sequence when multiple entries activate
- **position**: Controls context insertion placement (0-1: story beginning, 2: story end, 3: before user input, 4: after user input)
- **constant**: Controls whether entry remains permanently active regardless of keywords
- **selective**: Enables advanced keyword logic with AND/OR/NOT operations for precise activation

#### Four-Category Worldbook System:
The worldbook system uses four specialized tools to create comprehensive, organized content:

**1. STATUS Tool - Real-time Game Interface:**
- **Purpose**: Creates the mandatory STATUS entry providing comprehensive real-time game interface with professional visual formatting. This tool generates a single, constant entry. It does NOT accept a 'keys' parameter.
- **Fixed Keywords**: ["status", "current", "state", "condition", "situation"]
- **XML Wrapper**: <status></status>
- **Content Requirements**: Professional game interface formatting with decorative title headers using symbols/dividers, temporal context (current time/date/day/location), environmental data (indoor/outdoor temperatures, weather conditions), character interaction panels with structured data (basic info: name/age/affiliation/occupation/level/status effects, physical data: height/weight/measurements/experience, special attributes: traits/personality/preferences), dynamic statistics with numerical values and progress indicators, interactive elements (available actions list, special events/triggers), and immersive visual organization that creates a real-time game interface experience
- **Configuration**: constant=true, insert_order=1, position=0 (highest priority, always active)

**2. USER_SETTING Tool - Player Character Profile:**
- **Purpose**: Creates the mandatory USER_SETTING entry for comprehensive player character profiling with detailed hierarchical structure. This tool generates a single, constant entry. It does NOT accept a 'keys' parameter.
- **Fixed Keywords**: ["user", "player", "character", "protagonist", "you"]
- **XML Wrapper**: <user_setting></user_setting>
- **Content Requirements**: Comprehensive character profiling (800-1500 words) with deep hierarchical organization using 4-level Markdown structure (## → ### → #### → -). Must include: ## 基础信息 (personal overview including name/age/gender/physical stats/occupation, appearance features covering facial/body/clothing), ## 性格特征 (surface personality, inner personality, psychological states with contrasts), ## 生活状态 (living environment details, social relationships dynamics), ## 重生经历/特殊经历 (past experiences, timeline events, known/unknown information patterns), ## 特殊能力 (systems/powers with detailed limitations and usage methods), ## 当前状态 (controlled resources, psychological dynamics, action tendencies). Focus on character depth, contradictions, growth arcs, systematic ability descriptions, and world integration with specific examples and detailed descriptions
- **Configuration**: constant=true, insert_order=2, position=0 (second priority, always active)

**3. WORLD_VIEW Tool - Foundation Framework:**
- **Purpose**: Creates the mandatory WORLD_VIEW entry as the structural foundation for all supplementary content. This tool generates a single, constant entry. It does NOT accept a 'keys' parameter.
- **Fixed Keywords**: ["world", "universe", "realm", "setting", "reality"]
- **XML Wrapper**: <world_view></world_view>
- **Content Requirements**: Comprehensive world structure with deep hierarchical organization using multi-level categorization (## Major Systems → ### Subsystems → #### Specific Elements → - Detailed Points). Must include: world origins/history with detailed timelines, core systems (technology/magic/power) with specific mechanisms, geographical structure with environmental details, societal frameworks with power dynamics, cultural aspects with behavioral patterns, faction systems with relationships and conflicts, resource distribution with scarcity factors, communication networks, survival challenges, and hierarchical organization that clearly defines expansion opportunities for supplementary entries
- **Configuration**: constant=true, insert_order=3, position=0 (third priority, always active)

**4. SUPPLEMENT Tool - Contextual Expansions:**
- **Purpose**: Creates supplementary entries that provide detailed descriptions of specific nouns/entities mentioned in the WORLD_VIEW entry.
- **Custom Keywords**: This tool REQUIRES a 'keys' parameter which MUST be a NON-EMPTY ARRAY of specific nouns extracted from WORLD_VIEW content as trigger keywords (e.g., ["血十字帮", "美好公寓", "雪上列车", "冰雪分子能量转化技术"]). If the 'keys' array is empty or not provided, the tool will fail.
- **Content Format**: Detailed Markdown formatting (no XML wrapper for supplementary entries)
- **Content Requirements**: 500-1000 words of comprehensive detail expanding specific WORLD_VIEW nouns. Each entry focuses on one particular entity mentioned in WORLD_VIEW, providing deep background, operational details, relationships, and context that wasn't fully covered in the foundational entry. Minimum 5 entries required covering diverse WORLD_VIEW elements.
- **Configuration**: constant=false, insert_order=10+, position=2 (contextual activation)

#### Worldbook Creation Workflow:
1. **Mandatory Sequence**: Always create in this exact order:
   - FIRST: STATUS entry (current game state interface)
   - SECOND: USER_SETTING entry (player character profile)
   - THIRD: WORLD_VIEW entry (foundational world structure)
   - FOURTH: SUPPLEMENT entries (minimum 5 expansions)

2. **Quality Standards**: 
   - **STATUS**: 500-1500 words with professional game interface formatting including decorative headers, visual symbols, structured data panels, numerical statistics, progress indicators, and immersive real-time display elements
   - **USER_SETTING**: 800-1500 words with deep hierarchical structure (## → ### → #### → -) covering comprehensive character profiling including 基础信息, 性格特征, 生活状态, 重生经历/特殊经历, 特殊能力, 当前状态 with character depth, contradictions, and systematic descriptions
   - **WORLD_VIEW**: 800-2000 words with deep hierarchical structure using multi-level Markdown formatting (## → ### → #### → -) covering comprehensive world systems, detailed timelines, specific mechanisms, power dynamics, and clear expansion frameworks
   - **SUPPLEMENT**: 500-1000 words each focusing on specific nouns/entities mentioned in WORLD_VIEW, using those nouns as keywords and providing detailed background not covered in the foundational entry

3. **Content Excellence**: 
   - **Hierarchical Organization**: Use consistent multi-level structure with clear categorization
   - **Temporal Detail**: Include specific dates, phases, timelines, and chronological development
   - **System Depth**: Provide detailed mechanisms, processes, and operational frameworks
   - **Relational Complexity**: Show interconnections, power dynamics, conflicts, and dependencies
   - **Environmental Immersion**: Rich atmospheric details, survival challenges, and contextual elements

4. **Strategic Integration**: Ensure all entries complement and enhance the character card's scenario and tone while maintaining internal consistency across the worldbook system

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

// Define user input callback type with optional choice options
type UserInputCallback = (message?: string, options?: string[]) => Promise<string>;

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
  private configManager: ConfigManager;

  constructor(conversationId: string, userInputCallback?: UserInputCallback) {
    this.conversationId = conversationId;
    this.userInputCallback = userInputCallback;
    this.configManager = ConfigManager.getInstance();
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
      // Initialize ConfigManager with localStorage data if not already configured
      if (!this.configManager.isConfigured()) {
        const config = loadConfigFromLocalStorage();
        this.configManager.setConfig(config);
      }

      if (userInputCallback) {
        this.userInputCallback = userInputCallback;
      }

      await ResearchSessionOperations.updateStatus(this.conversationId, SessionStatus.THINKING);
      
      // Initialize the model and perform task decomposition
      const context = await this.buildExecutionContext();
      this.model = this.createLLM();
      
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
1. **INITIAL CLARITY ASSESSMENT:**
   - Determine if the story relates to existing real-world content (anime, novels, games, movies, etc.). If YES, plan research.
   - Assess if the story direction is clear enough (genre, style, focus). If NO, plan user clarification.
   - **MANDATORY**: At least one task or sub-problem must involve user clarification (using the ASK_USER tool).
   - **MANDATORY**: At least one task or sub-problem must involve external research/search (using the SEARCH tool).

2. **TASK DECOMPOSITION - CRITICAL REQUIREMENTS:**
   - You MUST create between 5 and 8 high-level tasks. Prefer 6-7 tasks for comprehensive coverage.
   - These tasks must logically progress towards the main objective (character card and worldbook generation).
   - Each task should be broken down into 2-5 specific, action-oriented sub-problems that are tool-agnostic.

3. **CONTENT COVERAGE - MULTI-ANGLE ANALYSIS:**
   - **Character Analysis**: Ensure tasks cover multiple aspects of character creation, such as personality depth, background story development, dialogue examples, and unique abilities.
   - **Worldbook Analysis**: Ensure tasks cover multiple aspects of worldbook creation, such as foundational world structure (STATUS, USER_SETTING, WORLD_VIEW), detailed lore (SUPPLEMENT), and interconnected systems.

TASK CREATION RULES:
- Character card generation MUST be a primary focus and come before comprehensive worldbook generation.
- Tasks should build upon each other logically.
- Sub-problems are completed sequentially within each task.
- Ensure a mix of clarification, research, character-building, and world-building sub-problems across the tasks.

EXAMPLE DECISION LOGIC (Ideal Workflow):
- User wants "fantasy adventure based on Lord of the Rings":
  - Task 1: Clarify user preferences and scenario focus (sub: ask_user for genre/style, ask_user for main character or world focus)
  - Task 2: Research real-world references if needed (sub: search for Lord of the Rings lore, search for main characters, search for world details)
  - Task 3: Complete all character card fields step by step (sub: define name, description, personality, scenario, first_mes, mes_example, alternate_greetings, creator_notes, tags)
  - Task 4: Create STATUS entry (sub: design real-time game interface, define status panels and stats)
  - Task 5: Create USER_SETTING entry (sub: build player character profile, organize hierarchical structure)
  - Task 6: Create WORLD_VIEW entry (sub: develop foundational world structure, define major systems and history)
  - Task 7: Create at least 5 SUPPLEMENT entries (sub: extract keys terms from WORLD_VIEW/STATUS/USER_SETTING, expand each with detailed lore, ensure diversity of topics)

- User wants "a unique sci-fi detective story":
  - Task 1: Clarify specific sci-fi sub-genre and protagonist's core motivation (sub: ask_user for sub-genre, ask_user for motivation)
  - Task 2: Research relevant references if needed (sub: search for sci-fi detective tropes, search for futuristic city inspirations)
  - Task 3: Complete all character card fields step by step (sub: develop character background, define personality, create scenario, write first_mes, provide mes_example, add alternate_greetings, creator_notes, tags)
  - Task 4: Create STATUS entry (sub: design interface, define stats and panels)
  - Task 5: Create USER_SETTING entry (sub: build protagonist profile, organize sections)
  - Task 6: Create WORLD_VIEW entry (sub: develop world structure, define systems and factions)
  - Task 7: Create at least 5 SUPPLEMENT entries (sub: extract keys terms from WORLD_VIEW/STATUS/USER_SETTING, expand each with detailed lore, ensure diversity)

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
    // BETWEEN 5 AND 8 tasks total
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
        
        const userInput = await this.userInputCallback(result.result?.message, result.result?.options);

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

      // Handle CHARACTER, STATUS, USER_SETTING, WORLD_VIEW, SUPPLEMENT tools - data updates and task completion evaluation
      if (
        decision.tool === ToolType.CHARACTER ||
        decision.tool === ToolType.STATUS ||
        decision.tool === ToolType.USER_SETTING ||
        decision.tool === ToolType.WORLD_VIEW ||
        decision.tool === ToolType.SUPPLEMENT
      ) {
        console.log(`✅ ${decision.tool} execution completed with generated content`);
        
        if (decision.tool === ToolType.CHARACTER && result.result?.character_data) {
          console.log("🔄 Updating generation output with character data");
          await ResearchSessionOperations.updateGenerationOutput(this.conversationId, {
            character_data: result.result.character_data,
          });
        } else if (decision.tool === ToolType.STATUS && result.result?.status_data) {
          console.log("🔄 Updating generation output with status data");
          await ResearchSessionOperations.appendWorldbookData(this.conversationId, {
            status_data: result.result.status_data,
          });
        } else if (decision.tool === ToolType.USER_SETTING && result.result?.user_setting_data) {
          console.log("🔄 Updating generation output with user setting data");
          await ResearchSessionOperations.appendWorldbookData(this.conversationId, {
            user_setting_data: result.result.user_setting_data,
          });
        } else if (decision.tool === ToolType.WORLD_VIEW && result.result?.world_view_data) {
          console.log("🔄 Updating generation output with world view data");
          await ResearchSessionOperations.appendWorldbookData(this.conversationId, {
            world_view_data: result.result.world_view_data,
          });
        } else if (decision.tool === ToolType.SUPPLEMENT && result.result?.supplement_data) {
          console.log("🔄 Updating generation output with supplementary data");
          await ResearchSessionOperations.appendWorldbookData(this.conversationId, {
            supplement_data: result.result.supplement_data,
          });
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

  <recent_conversation>
    // The most recent 5 conversation turns with emphasis on quality_evaluation and tool_failure messages
    // This provides immediate feedback and execution context for decision making
    {recent_conversation}
  </recent_conversation>

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
      - If character is 100% complete: Only then consider worldbook tools (STATUS, USER_SETTING, WORLD_VIEW, SUPPLEMENT)
      
      🚫 CRITICAL CONSTRAINT: Worldbook creation is BLOCKED until ALL character fields are complete
      - Required character fields: name, description, personality, scenario, first_mes, mes_example, alternate_greetings, creator_notes, tags
        - Do NOT use any worldbook tools if any character field is missing
      - Character completion is mandatory before worldbook creation
      
      WORLDBOOK PROGRESS ANALYSIS (only if character is 100% complete):
      - Check STATUS, USER_SETTING, WORLD_VIEW completion in order:
        - If STATUS entry is missing or empty: Use STATUS tool to create the initial STATUS entry.
        - If STATUS entry is complete but USER_SETTING entry is missing or empty: Use USER_SETTING tool to create the player character profile.
        - If STATUS and USER_SETTING entries are complete but WORLD_VIEW entry is missing or empty: Use WORLD_VIEW tool to create the foundational world structure.
      - If STATUS, USER_SETTING, and WORLD_VIEW entries are all complete and have content:
        - Check SUPPLEMENT entries:
          - If less than 5 supplementary entries exist or any existing supplementary entry is empty: Use SUPPLEMENT tool to add more entries or fill content until at least 5 non-empty entries are present. Remember, SUPPLEMENT entries are *expansions* of WORLD_VIEW, not a replacement. If WORLD_VIEW is already present, focus ONLY on generating more SUPPLEMENT entries. Only expand WORLD_VIEW if its current content is explicitly insufficient to support the creation of the required number of quality SUPPLEMENT entries.
          - If 5 or more non-empty supplementary entries exist: Worldbook is structurally complete.
      - MANDATORY MINIMUM: All 3 mandatory entries (STATUS, USER_SETTING, WORLD_VIEW) must be present AND have content. At least 5 SUPPLEMENT entries must be present AND have content.
      - Focus on quality refinement and completion if all structural requirements are met.
      
      COMPLETION STATUS ANALYSIS:
      - If "Generation not started": Start with CHARACTER tool
      - If "Character incomplete": Use CHARACTER tool to complete missing fields
              - If "Character complete - Ready for worldbook": Use worldbook tools (STATUS → USER_SETTING → WORLD_VIEW → SUPPLEMENT)
      - If "Ready for final evaluation": Use COMPLETE tool to finish session
      - If "Task queue empty but output incomplete": Use REFLECT tool to create new tasks
    </generation_based_tool_selection>
    
    <tool_priority_and_criteria>
      TOOL PRIORITY insert_order:
      1. ASK_USER: Use for fundamental uncertainties about story direction, genre, tone, or core creative decisions - prioritize early in generation
      2. SEARCH: Use when referencing existing anime/novels/games or needing factual information
      3. CHARACTER: Primary tool - complete character development BEFORE worldbook
      4. STATUS: Use ONLY AFTER character creation is 100% complete. STATUS is the first worldbook tool to use (highest priority among worldbook tools).
      5. USER_SETTING: Use ONLY AFTER character creation is 100% complete AND STATUS entry is present. USER_SETTING is the second worldbook tool to use.
      6. WORLD_VIEW: Use ONLY AFTER character creation is 100% complete AND STATUS and USER_SETTING entries are present. WORLD_VIEW is the third worldbook tool to use.
      7. SUPPLEMENT: Use ONLY AFTER character creation is 100% complete AND WORLD_VIEW entry is present. The keys parameter is MANDATORY and must be a non-empty array of proper nouns or keys terms, typically extracted from WORLD_VIEW, STATUS, or USER_SETTING content (such as locations, factions, systems, or other important entities). If no valid keys can be provided, do NOT use the SUPPLEMENT tool. SUPPLEMENT is used to create supplementary entries based on these extracted terms.
      8. REFLECT: Use ONLY when task queue is empty but generation output is incomplete
      9. COMPLETE: Use when generation is finished and session should end

      TOOL SELECTION CRITERIA:
      <ask_user_when>
        - Uncertain about story genre or style (e.g., fantasy, romance, school, isekai, urban, sci-fi, etc.)
        - Unclear whether the focus is on a single character or a broader world scenario
        - Story tone or atmosphere needs clarification (e.g., lighthearted, serious, comedic, healing, tense, etc.)
        - Major creative direction decisions that impact the entire generation process
        - Unable to determine the user's fundamental preferences
        - User's initial description is vague or lacks specific genre information
        USE EARLY in the generation process when the story direction is ambiguous
        DO NOT use for details that can be reasonably inferred or creatively determined

        ENHANCED OPTIONS SUPPORT:
        - Provide 2-4 predefined choice options using the 'options' parameter
        - Include common genre categories: ["Xianxia Fantasy", "Modern Urban", "School Youth", "Isekai/Rebirth"]
        - Or story tones: ["Lighthearted & Humorous", "Sweet Romance", "Passionate Adventure", "Warm & Healing"]
        - Options help users make quick decisions with arrow keys navigation
        - Users can still provide custom input if none of the options fit
      </ask_user_when>

      <search_when>
        - Story references existing anime, novels, games, movies
        - Need accurate information about real-world cultural elements
        - Require specific factual details or historical context
        DO NOT use for generic creative content that can be imagined
      </search_when>

      <character_when>
        - Most frequently used tool
        - Build incrementally in REQUIRED insert_order: name → description → personality → scenario → first_mes → mes_example → alternate_greetings → creator_notes → tags
        - ALL EIGHT FIELDS ARE MANDATORY for complete character card
        - Use multiple tool calls to build systematically, adding one or more fields each time
        - Must have ALL required fields complete BEFORE starting worldbook
        - Character completion is verified by presence of all eight required fields
      </character_when>

      <status_when>
        - Use ONLY AFTER character creation is 100% complete
        - Creates mandatory STATUS entry (real-time game interface)
        - Professional formatting with decorative headers, time/location/temperature, character interaction panels
        - First worldbook tool to use (highest priority)
      </status_when>

      <user_setting_when>
        - Use ONLY AFTER character creation is 100% complete  
        - Creates mandatory USER_SETTING entry (player character profiling)
        - Hierarchical structure: 基础信息, 性格特征, 生活状态, 重生经历/特殊经历, 特殊能力, 当前状态
        - Second worldbook tool to use (after STATUS)
      </user_setting_when>

      <world_view_when>
        - Use ONLY AFTER character creation is 100% complete
        - Creates mandatory WORLD_VIEW entry (foundational world structure) 
        - Deep hierarchical organization with expansion opportunities for supplementary entries
        - Third worldbook tool to use (after STATUS and USER_SETTING)
      </world_view_when>

      <supplement_when>
        - Use ONLY AFTER character creation is 100% complete AND WORLD_VIEW entry exists.
        - This tool generates **a single batch** of supplementary entries to enrich the WORLD_VIEW section.
        - It is NOT a multi-category filler — it extracts **a coherent set of related entities** from the WORLD_VIEW (e.g., faction names, locations, systems, ideologies, etc.) and creates corresponding entries in one call.
        - Each generated supplementary entry must include:
          - keys: the unique identifier or title of the entity.
          - content: a detailed explanation (500–1000 words) expanding the background and unseen depth of the entity beyond WORLD_VIEW.
          - comment: a brief annotation or purpose of this entry in narrative/world context.
          - insert_order: a suggested relative insertion index (for chronological or logical placement).
        - Minimum of 5 entries should be generated per call for worldbook completeness.
        - Supplementary entries should **not repeat** content already described in WORLD_VIEW, but rather **expand, explain, or contextualize** mentioned terms.
      </supplement_when>

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
    You need to think step-by-step through the decision-making process using a structured chain of thought. Follow this thinking framework:

    STEP 1: SITUATION ANALYSIS
    - What is the user's main objective and current progress?
    - What happened in the **most recent** conversation? Any failures or quality issues to address? (Prioritize recent messages)
    - What is my current task and sub-problem focus? (Refer to the *latest* task queue status and current sub-problem)

    STEP 2: PROGRESS EVALUATION  
    - Character creation status: Which of the 8 required fields (name, description, personality, scenario, first_mes, mes_example, alternate_greetings, creator_notes, tags) are complete/missing? (Based on *current* generation output)
    - Worldbook status: How many entries exist and what type? (Can only work on worldbook AFTER character is 100% complete, based on *current* generation output)
    - Overall completion level: Where am I in the generation process? (Based on *current* generation output)

    STEP 3: PROBLEM IDENTIFICATION
    - What is the most critical gap or issue that needs immediate attention?
    - Are there any quality problems or execution failures I need to resolve?
    - What is blocking progress toward the main objective?

    STEP 4: SOLUTION REASONING
    - Which tool would best address the identified problem?
    - Why is this tool the most appropriate choice right now?
    - How will this action move me closer to the main objective?

    STEP 5: ACTION PLANNING
    - What specific parameters do I need to provide for the chosen tool?
    - How should I optimize the current task based on recent progress?
    - What sub-problems should I focus on next?

    Remember: The tool selection emerges naturally from your analysis - you're not choosing a tool, you're solving the most critical problem using the most appropriate method available.

    🚫 CRITICAL CONSTRAINT: Character must have ALL 8 required fields complete before any worldbook creation can begin.
  </instructions>

  <output_specification>
    You MUST respond using the following XML format. Do not include any other text, explanations, or formatting outside of the <response> block.

    <response>
      <think>
        Follow the 5-step thinking framework systematically:
        
        STEP 1 - SITUATION ANALYSIS:
        [Analyze user's main objective, recent conversation context, and current task focus]
        
        STEP 2 - PROGRESS EVALUATION:
        [Evaluate character creation status (8 fields) and worldbook status, assess overall completion]
        
        STEP 3 - PROBLEM IDENTIFICATION:
        [Identify the most critical gap, quality issues, or blocking factors]
        
        STEP 4 - SOLUTION REASONING:
        [Determine which tool best addresses the identified problem and why]
        
        STEP 5 - ACTION PLANNING:
        [Plan specific parameters and task optimization strategy]
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
      <action>The name of the ONE tool you are choosing to use (e.g., SEARCH, CHARACTER, STATUS, USER_SETTING, WORLD_VIEW, SUPPLEMENT).</action>
      <parameters>
        <!--
        - Provide all parameters for the chosen action inside this block.
        - Use simple parameter names directly, no complex JSON structures needed.
        - For array parameters, use CDATA format: <param_name><![CDATA[["item1", "item2"]]]></param_name>
        - For other parameters, use simple values: <param_name>value</param_name>
        - Example for SEARCH: <query><![CDATA["dragon mythology", "magic system"]]]></query>
        - Example for ASK_USER: <question>What genre style do you prefer?</question><options><![CDATA[["Fantasy adventure", "Modern romance", "Sci-fi thriller"]]]></options>
        - Example for CHARACTER: <name>Elara</name><description>A cunning sorceress...</description><alternate_greetings><![CDATA[["Summer festival version", "Library encounter", "Rainy day meeting", "Battle aftermath scenario"]]]></alternate_greetings><tags><![CDATA[["fantasy", "sorceress"]]]></tags>
        - Example for STATUS: <content><![CDATA[<status>## Current Status\n\n**Location:** Academy</status>]]></content><comment>STATUS</comment>
        - Example for SUPPLEMENT: <keys><![CDATA[["magic", "spell"]]]></keys><content>Details...</content><comment>Magic system</comment><constant>false</constant><position>0</position><insert_order>100</insert_order>
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
          completion_status: this.buildCompletionStatusSummary(context.generation_output, context.message_history),
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
        console.log("🔄 paramsMatch", paramsMatch[1]);
        const paramsString = paramsMatch[1].trim();
        const paramRegex = /<(\w+)>([\s\S]*?)<\/(\1)>/g;
        let match;

        while ((match = paramRegex.exec(paramsString)) !== null) {
          const key = match[1];
          let value = match[2].trim();

          const cdataMatch = value.match(/<!\[CDATA\[([\s\S]*?)\]\]>/);
          if (cdataMatch) {
            let cdata = cdataMatch[1];
            let parsed = undefined;
            let fixed = false;
            // Try to parse as JSON, if fail, try to auto-fix common issues
            try {
              parameters[key] = JSON.parse(cdata);
            } catch (e) {
              // Auto-fix: If starts with [ or { but missing closing ] or }
              let fixedCdata = cdata;
              // Fix missing closing bracket for array
              if (/^\s*\[/.test(fixedCdata) && !/\]\s*$/.test(fixedCdata)) {
                fixedCdata = fixedCdata + "]";
                fixed = true;
              }
              // Fix missing closing bracket for object
              if (/^\s*\{/.test(fixedCdata) && !/\}\s*$/.test(fixedCdata)) {
                fixedCdata = fixedCdata + "}";
                fixed = true;
              }
              // Fix unbalanced double quotes
              const quoteCount = (fixedCdata.match(/\"/g) || []).length;
              if (quoteCount % 2 !== 0) {
                fixedCdata = fixedCdata + "\"";
                fixed = true;
              }
              // Try parsing again if fixed
              if (fixed) {
                try {
                  parsed = JSON.parse(fixedCdata);
                } catch (e2) {
                  // fallback below
                }
              }
              // If still not parsed, try to close both array and object
              if (parsed === undefined) {
                let tryCdata = cdata;
                if (/^\s*\[/.test(tryCdata) && !/\]\s*$/.test(tryCdata)) {
                  tryCdata = tryCdata + "]";
                }
                if (/^\s*\{/.test(tryCdata) && !/\}\s*$/.test(tryCdata)) {
                  tryCdata = tryCdata + "}";
                }
                try {
                  parsed = JSON.parse(tryCdata);
                } catch (e3) {
                  // fallback below
                }
              }
              // If still not parsed, fallback to raw string
              parameters[key] = parsed !== undefined ? parsed : cdata;
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

    // If basic validation passes, use LLM for strict quality assessment
    const prompt = createStandardPromptTemplate(`
<prompt>
  <system_role>
    You are an expert quality assurance specialist for professional character AI content generation. Your role is to conduct rigorous, detailed quality assessment of character data and worldbook components to ensure they meet industry excellence standards. You must be extremely thorough and demanding in your evaluation.
  </system_role>

  <evaluation_context>
    <generation_output>
      {generation_output}
    </generation_output>
  </evaluation_context>

  <strict_evaluation_criteria>
    <essential_entry_analysis>
      MANDATORY STRUCTURAL REQUIREMENTS:
      1. Essential Entry Validation:
         - STATUS entry: Must exist (only one), comment="STATUS", XML wrapper <status>content</status>
         - USER_SETTING entry: Must exist (only one), comment="USER_SETTING", XML wrapper <user_setting>content</user_setting>
         - WORLD_VIEW entry: Must exist (only one), comment="WORLD_VIEW", XML wrapper <world_view>content</world_view>
         - SUPPLEMENT entries: Must be an array with at least 5 entries, each with non-empty content, each expanding a specific noun/entity from WORLD_VIEW
      2. Content Length Assessment:
         - STATUS, USER_SETTING, WORLD_VIEW: Each must be at least 500 words, optimal 800-1500 words
         - SUPPLEMENT: Each entry must be at least 300 words, optimal 500-1000 words; report count and average word count
      3. Content Quality Standards:
         - STATUS: Must be a comprehensive real-time interface with organized sections, dynamic values, clear formatting with symbols, temporal/spatial context, character statistics, interactive elements
         - USER_SETTING: Must include multi-dimensional profiling (basic info, appearance, personality layers, life circumstances, abilities with mechanisms, timeline integration, psychological depth, behavioral framework)
         - WORLD_VIEW: Must contain systematic world-building (version control, historical timeline, system categories, hierarchical structure, interconnected elements, expansion interfaces)
         - SUPPLEMENT: Each entry must expand a specific WORLD_VIEW element with rich detail, no duplication, and high diversity
    </essential_entry_analysis>

    <content_depth_analysis>
      CONTENT QUALITY METRICS:
      1. Detail Density: Are descriptions comprehensive and immersive, not superficial summaries?
      2. World Coherence: Do all entries work together to create a logical, consistent world?
      3. Narrative Utility: Does each entry provide actionable information for storytelling?
      4. Professional Standards: Does content meet commercial-grade character AI expectations?
      5. XML Format Compliance: Are essential entries properly wrapped in their specific XML tags?
      6. Supplement Diversity: Are supplement entries based on different key terms/entities, and do they avoid duplication?
    </content_depth_analysis>

    <character_data_analysis>
      CHARACTER EXCELLENCE STANDARDS:
      - Personality: Multi-layered, distinctive, engaging personality with depth
      - Scenario: Compelling context that provides clear roleplay direction
      - First Message: Engaging, in-character, sets proper tone and context
      - Example Messages: Consistent personality demonstration across multiple scenarios
      - Creator Notes: Practical guidance for users and character behavior
      - Description: Vivid, detailed character presentation
    </character_data_analysis>
  </strict_evaluation_criteria>

  <critical_assessment_process>
    STEP 1: Essential Entry Audit
    - Verify presence of STATUS, USER_SETTING, WORLD_VIEW (each must exist, only one of each)
    - Check XML wrapper format compliance for each essential entry
    - Measure word count in each essential entry's content
    - Assess content quality against excellence standards for each entry
    - For SUPPLEMENT: count entries, check each for non-empty content, diversity, and connection to WORLD_VIEW nouns/entities
    - Calculate average word count for supplement entries
    - Assess overall supplement quality and diversity

    STEP 2: Content Depth Evaluation
    - Analyze detail density and comprehensiveness of each entry
    - Evaluate world coherence and logical consistency
    - Check narrative utility and storytelling enhancement value
    - Assess professional quality standards

    STEP 3: Supplementary Entry Assessment
    - Verify minimum quantity requirements (at least 5 supplement entries)
    - Check entry diversity: Tools/Weapons, Characters/NPCs, Buildings, Geography, Astronomy, War History, Organizations, Systems, Culture, Historical Figures, etc.
    - Evaluate keyword strategies and discoverability in 'keys' field
    - Check content depth and narrative value (500-1000 words per entry preferred)
    - Assess integration with WORLD_VIEW foundation WITHOUT content duplication
    - Verify each entry provides NEW specific details not covered in WORLD_VIEW

    STEP 4: Overall Cohesion Analysis
    - Character-worldbook integration and compatibility
    - Consistency across all content elements
    - Professional quality and commercial viability
  </critical_assessment_process>

  <instructions>
    Conduct a RIGOROUS and DEMANDING evaluation. You must:
    1. Actually count words in each essential entry (status, user_setting, world_view) and in each supplement entry
    2. Specifically identify any missing essential entries or XML format issues
    3. Evaluate content depth - reject superficial or brief content
    4. Assess professional quality standards strictly
    5. Provide specific, actionable improvement suggestions for REFLECT tool usage
    6. FAIL any worldbook that lacks comprehensive, detailed content or proper structure
    7. PASS only content that meets professional industry standards for character AI applications
  </instructions>

  <output_specification>
    You MUST respond using the following XML format. Do not include any other text outside this block.

    <evaluation_response>
      <detailed_analysis>
        <essential_entries_status>
          <status_entry>
            <present>true/false</present>
            <xml_format_correct>true/false</xml_format_correct>
            <word_count>actual number</word_count>
            <quality_assessment>detailed quality analysis</quality_assessment>
          </status_entry>
          <user_setting_entry>
            <present>true/false</present>
            <xml_format_correct>true/false</xml_format_correct>
            <word_count>actual number</word_count>
            <quality_assessment>detailed quality analysis</quality_assessment>
          </user_setting_entry>
          <world_view_entry>
            <present>true/false</present>
            <xml_format_correct>true/false</xml_format_correct>
            <word_count>actual number</word_count>
            <quality_assessment>detailed quality analysis</quality_assessment>
          </world_view_entry>
        </essential_entries_status>
        <supplementary_entries_assessment>
          <count>actual number of supplement entries</count>
          <average_word_count>average words per supplement entry</average_word_count>
          <quality_summary>overall quality assessment of supplement content</quality_summary>
        </supplementary_entries_assessment>
        <content_depth_evaluation>Comprehensive analysis of content depth, detail density, and professional quality</content_depth_evaluation>
      </detailed_analysis>
      <character_quality_score>Character data quality score from 0 to 100</character_quality_score>
      <worldbook_quality_score>Worldbook data quality score from 0 to 100</worldbook_quality_score>
      <overall_quality_score>Overall quality score from 0 to 100</overall_quality_score>
      <meets_professional_standards>true or false - only true if content meets commercial-grade standards (overall >= 90, worldbook >= 85, all essential entries present with proper XML and 500+ words, minimum 5 supplement entries)</meets_professional_standards>
      <critical_issues>
        <issue>Specific critical issue that must be addressed</issue>
        <issue>Another critical issue requiring immediate attention</issue>
      </critical_issues>
      <improvement_tasks>
        <task>Specific task for REFLECT tool to generate concrete action items</task>
        <task>Another specific task for REFLECT tool task generation</task>
      </improvement_tasks>
    </evaluation_response>
  </output_specification>
</prompt>`);

    const context = await this.buildExecutionContext();
    const llm = this.createLLM();
    const chain = prompt.pipe(llm).pipe(new StringOutputParser());

    try {
      const response = await chain.invoke({
        generation_output: JSON.stringify(generationOutput, null, 2),
      });

      // Parse detailed XML response
      const character_quality_score = parseInt(response.match(/<character_quality_score>(\d+)<\/character_quality_score>/)?.[1] ?? "0", 10);
      const worldbook_quality_score = parseInt(response.match(/<worldbook_quality_score>(\d+)<\/worldbook_quality_score>/)?.[1] ?? "0", 10);
      const overall_quality_score = parseInt(response.match(/<overall_quality_score>(\d+)<\/overall_quality_score>/)?.[1] ?? "0", 10);
      const meets_professional_standards = response.match(/<meets_professional_standards>(true|false)<\/meets_professional_standards>/)?.[1] === "true";

      // Extract detailed analysis sections
      const content_depth_evaluation = response.match(/<content_depth_evaluation>([\s\S]*?)<\/content_depth_evaluation>/)?.[1].trim() ?? "No content depth evaluation provided";
      
      // Extract critical issues
      const critical_issues: string[] = [];
      const issuesMatch = response.match(/<critical_issues>([\s\S]*?)<\/critical_issues>/)?.[1] ?? "";
      const issueRegex = /<issue>([\s\S]*?)<\/issue>/g;
      let issueMatch;
      while ((issueMatch = issueRegex.exec(issuesMatch)) !== null) {
        critical_issues.push(issueMatch[1].trim());
      }

      // Extract improvement tasks
      const improvement_tasks: string[] = [];
      const tasksMatch = response.match(/<improvement_tasks>([\s\S]*?)<\/improvement_tasks>/)?.[1] ?? "";
      const taskRegex = /<task>([\s\S]*?)<\/task>/g;
      let taskMatch;
      while ((taskMatch = taskRegex.exec(tasksMatch)) !== null) {
        improvement_tasks.push(taskMatch[1].trim());
      }

      // Extract essential entries analysis for detailed logging
      const status_present = response.match(/<status_entry>[\s\S]*?<present>(true|false)<\/present>[\s\S]*?<\/status_entry>/)?.[1] === "true";
      const status_word_count = response.match(/<status_entry>[\s\S]*?<word_count>(\d+)<\/word_count>[\s\S]*?<\/status_entry>/)?.[1] ?? "0";
      const user_setting_present = response.match(/<user_setting_entry>[\s\S]*?<present>(true|false)<\/present>[\s\S]*?<\/user_setting_entry>/)?.[1] === "true";
      const user_setting_word_count = response.match(/<user_setting_entry>[\s\S]*?<word_count>(\d+)<\/word_count>[\s\S]*?<\/user_setting_entry>/)?.[1] ?? "0";
      const world_view_present = response.match(/<world_view_entry>[\s\S]*?<present>(true|false)<\/present>[\s\S]*?<\/world_view_entry>/)?.[1] === "true";
      const world_view_word_count = response.match(/<world_view_entry>[\s\S]*?<word_count>(\d+)<\/word_count>[\s\S]*?<\/world_view_entry>/)?.[1] ?? "0";

      console.log("📊 Detailed Quality Assessment:");
      console.log(`   Character: ${character_quality_score}%, Worldbook: ${worldbook_quality_score}%, Overall: ${overall_quality_score}%`);
      console.log(`   Essential Entries: STATUS(${status_present ? "✅" : "❌"}, ${status_word_count}w), USER_SETTING(${user_setting_present ? "✅" : "❌"}, ${user_setting_word_count}w), WORLD_VIEW(${world_view_present ? "✅" : "❌"}, ${world_view_word_count}w)`);
      console.log(`   Professional Standards: ${meets_professional_standards ? "✅ MET" : "❌ NOT MET"}`);
      
      if (meets_professional_standards) {
        // Generation meets professional completion standards
        console.log("✅ Content meets professional standards - Generation complete");
        return null;
      } else {
        // Generation needs improvement - return detailed analysis
        const improvementMsg = `🔍 RIGOROUS QUALITY ASSESSMENT RESULTS (Overall: ${overall_quality_score}%):

📊 SCORES:
• Character Quality: ${character_quality_score}%
• Worldbook Quality: ${worldbook_quality_score}%
• Overall Quality: ${overall_quality_score}%
• Professional Standards: ${meets_professional_standards ? "✅ MET" : "❌ NOT MET"}

🔍 ESSENTIAL ENTRIES STATUS:
• STATUS: ${status_present ? "✅ Present" : "❌ Missing"} (${status_word_count} words)
• USER_SETTING: ${user_setting_present ? "✅ Present" : "❌ Missing"} (${user_setting_word_count} words) 
• WORLD_VIEW: ${world_view_present ? "✅ Present" : "❌ Missing"} (${world_view_word_count} words)

📝 CONTENT DEPTH EVALUATION:
${content_depth_evaluation}

🚨 CRITICAL ISSUES:
${critical_issues.length > 0 ? critical_issues.map(issue => `• ${issue}`).join("\n") : "• No critical issues identified"}

🎯 IMMEDIATE ACTION REQUIRED:
Use REFLECT tool to generate new tasks based on these specific improvement requirements:
${improvement_tasks.map(task => `• ${task}`).join("\n")}`;

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

    // Validate individual worldbook components
    if (!generationOutput.status_data) {
      return { 
        isValid: false, 
        reason: "status_data is missing. Next step: Call REFLECT tool to analyze and create new tasks to generate status data.", 
      };
    }

    if (!generationOutput.user_setting_data) {
      return { 
        isValid: false, 
        reason: "user_setting_data is missing. Next step: Call REFLECT tool to analyze and create new tasks to generate user setting data.", 
      };
    }

    if (!generationOutput.world_view_data) {
      return { 
        isValid: false, 
        reason: "world_view_data is missing. Next step: Call REFLECT tool to analyze and create new tasks to generate world view data.", 
      };
    }

    if (!generationOutput.supplement_data || !Array.isArray(generationOutput.supplement_data)) {
      return { 
        isValid: false, 
        reason: "supplement_data is missing or not an array. Next step: Call REFLECT tool to analyze and create new tasks to generate supplementary data.", 
      };
    }

    const validSupplementEntries = generationOutput.supplement_data.filter(e => e.content && e.content.trim() !== "");
    if (validSupplementEntries.length < 5) {
      return { 
        isValid: false, 
        reason: `supplement_data has only ${validSupplementEntries.length} valid entries, minimum 5 required. Next step: Call REFLECT tool to analyze and create new tasks to generate more supplementary entries (need ${5 - validSupplementEntries.length} more valid entries).`, 
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
    };
  }

  private createLLM() {
    // Get LLM configuration directly from ConfigManager
    const llmConfig = this.configManager.getLLMConfig();

    if (llmConfig.llm_type === "openai") {
      return new ChatOpenAI({
        modelName: llmConfig.model_name,
        openAIApiKey: llmConfig.api_key,
        configuration: {
          baseURL: llmConfig.base_url,
        },
        temperature: llmConfig.temperature,
        maxTokens: llmConfig.max_tokens,
        streaming: false,
      });
    } else if (llmConfig.llm_type === "ollama") {
      return new ChatOllama({
        model: llmConfig.model_name,
        baseUrl: llmConfig.base_url || "http://localhost:11434",
        temperature: llmConfig.temperature,
        streaming: false,
      });
    }

    throw new Error(`Unsupported LLM type: ${llmConfig.llm_type}`);
  }

  private buildRecentConversationSummary(messages: Message[]): string {
    const recentMessages = messages.slice(-5);
    
    if (recentMessages.length === 0) {
      return "No recent conversation history available";
    }
    
    let summary = "RECENT CONVERSATION (Last 5 turns):\n";
    
    // Check for critical message types first
    const criticalMessages = recentMessages.filter(m => 
      m.type === "quality_evaluation" || m.type === "tool_failure",
    );
    
    if (criticalMessages.length > 0) {
      summary += "\n🚨 CRITICAL RECENT FEEDBACK:\n";
      criticalMessages.forEach(m => {
        summary += `⚠️ ${m.type.toUpperCase()}: ${m.content.substring(0, 200)}...\n`;
      });
      summary += "\n";
    }
    
    // Add all recent messages
    summary += recentMessages.map(m => {
      const prefix = (m.type === "quality_evaluation" || m.type === "tool_failure") ? "🚨 " : "";
      return `${prefix}${m.type}: ${m.content}`;
    }).join("\n");
    
    return summary;
  }

  private buildFullConversationSummary(messages: Message[]): string {
    // Get all messages except the last 5
    const fullMessages = messages.slice(0, -5);
    
    if (fullMessages.length === 0) {
      return "No earlier conversation history available";
    }
    
    let summary = `FULL CONVERSATION HISTORY (${fullMessages.length} earlier messages):\n`;
    
    // Group messages by type for better organization
    const messagesByType = fullMessages.reduce((acc, msg) => {
      if (!acc[msg.type]) acc[msg.type] = [];
      acc[msg.type].push(msg);
      return acc;
    }, {} as Record<string, Message[]>);
    
    // Show summary by message types
    Object.entries(messagesByType).forEach(([type, msgs]) => {
      summary += `\n${type.toUpperCase()} (${msgs.length} messages):\n`;
      msgs.slice(0, 3).forEach((msg, idx) => {
        summary += `  ${idx + 1}. ${msg.content.substring(0, 150)}...\n`;
      });
      if (msgs.length > 3) {
        summary += `  ... and ${msgs.length - 3} more ${type} messages\n`;
      }
    });
    
    return summary;
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
      status_data: session.generation_output.status_data,
      user_setting_data: session.generation_output.user_setting_data,
      world_view_data: session.generation_output.world_view_data,
      supplement_data: session.generation_output.supplement_data,
      knowledge_base: session.research_state.knowledge_base,
    };
  }

  private buildCharacterProgressSummary(generationOutput: GenerationOutput): string {
    if (!generationOutput?.character_data) {
      return "CHARACTER STATUS: Not started - No character data available";
    }

    const charData = generationOutput.character_data;
    const requiredCharFields = ["name", "description", "personality", "scenario", "first_mes", "mes_example", "alternate_greetings", "creator_notes", "tags"];
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
    if (!generationOutput) {
      return "WORLDBOOK STATUS: No generation output available";
    }

    // STATUS
    let statusSummary = "";
    if (generationOutput.status_data && generationOutput.status_data.content && generationOutput.status_data.content.trim() !== "") {
      const wordCount = generationOutput.status_data.content.trim().split(/\s+/).length;
      statusSummary = `STATUS: ✅ Present (${wordCount} words)`;
    } else {
      statusSummary = "STATUS: ❌ Missing";
    }

    // USER_SETTING
    let userSettingSummary = "";
    if (generationOutput.user_setting_data && generationOutput.user_setting_data.content && generationOutput.user_setting_data.content.trim() !== "") {
      const wordCount = generationOutput.user_setting_data.content.trim().split(/\s+/).length;
      userSettingSummary = `USER_SETTING: ✅ Present (${wordCount} words)`;
    } else {
      userSettingSummary = "USER_SETTING: ❌ Missing";
    }

    // WORLD_VIEW
    let worldViewSummary = "";
    if (generationOutput.world_view_data && generationOutput.world_view_data.content && generationOutput.world_view_data.content.trim() !== "") {
      const wordCount = generationOutput.world_view_data.content.trim().split(/\s+/).length;
      worldViewSummary = `WORLD_VIEW: ✅ Present (${wordCount} words)`;
    } else {
      worldViewSummary = "WORLD_VIEW: ❌ Missing";
    }

    // SUPPLEMENT
    let supplementSummary = "";
    if (generationOutput.supplement_data && Array.isArray(generationOutput.supplement_data) && generationOutput.supplement_data.length > 0) {
      const validSupplements = generationOutput.supplement_data.filter(entry => entry.content && entry.content.trim() !== "");
      const count = validSupplements.length;
      const avgWordCount = count > 0 ? Math.round(validSupplements.map(e => e.content.trim().split(/\s+/).length).reduce((a, b) => a + b, 0) / count) : 0;
      supplementSummary = `SUPPLEMENT: ${count} entries (avg ${avgWordCount} words)`;
    } else {
      supplementSummary = "SUPPLEMENT: ❌ None";
    }

    // 合并描述
    return [statusSummary, userSettingSummary, worldViewSummary, supplementSummary].join("\n");
  }

  private buildCompletionStatusSummary(generationOutput: GenerationOutput, message_history: Message[]): string {
    // Atomic feedback: If the latest message is a quality_evaluation or tool_failure, return its content immediately
    if (Array.isArray(message_history) && message_history.length > 0) {
      const lastMsg = message_history[message_history.length - 1];
      if (lastMsg.type === "quality_evaluation" || lastMsg.type === "tool_failure") {
        // Return only this feedback, do not append or combine with other status
        return lastMsg.content;
      }
    }
    if (!generationOutput) {
      return "OVERALL STATUS: No generation output available";
    }

    const hasCharacterData = !!generationOutput.character_data;
    
    // Check individual worldbook components
    const hasStatusData = !!generationOutput.status_data;
    const hasUserSettingData = !!generationOutput.user_setting_data;
    const hasWorldViewData = !!generationOutput.world_view_data;
    const supplementEntries = generationOutput.supplement_data || [];
    const hasSupplementData = Array.isArray(supplementEntries) && supplementEntries.length > 0;
    
    const hasAnyWorldbookData = hasStatusData || hasUserSettingData || hasWorldViewData || hasSupplementData;
    const hasAllMandatoryWorldbookData = hasStatusData && hasUserSettingData && hasWorldViewData;
    
    if (!hasCharacterData && !hasAnyWorldbookData) {
      return "OVERALL STATUS: Generation not started - Start with CHARACTER tool";
    }
    
    if (!hasCharacterData && hasAnyWorldbookData) {
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
    
    // Character is complete, check worldbook status
    if (hasCharacterData && !hasAnyWorldbookData) {
      return "OVERALL STATUS: ✅ Character complete - Ready for worldbook creation. Start with STATUS tool.";
    }

    // Sequentially check each worldbook component and return immediately if missing
    // 1. STATUS
    if (!hasStatusData) {
      return "OVERALL STATUS: Character complete - Worldbook in progress\n❌ MISSING WORLDBOOK COMPONENT: STATUS\n📋 NEXT ACTION: Use tool: STATUS";
    }
    // 2. USER_SETTING
    if (!hasUserSettingData) {
      return "OVERALL STATUS: Character complete - Worldbook in progress\n❌ MISSING WORLDBOOK COMPONENT: USER_SETTING\n📋 NEXT ACTION: Use tool: USER_SETTING";
    }
    // 3. WORLD_VIEW
    if (!hasWorldViewData) {
      return "OVERALL STATUS: Character complete - Worldbook in progress\n❌ MISSING WORLDBOOK COMPONENT: WORLD_VIEW\n📋 NEXT ACTION: Use tool: WORLD_VIEW";
    }
    // 4. SUPPLEMENT (must have at least 5 entries and all non-empty)
    const supplementComplete = supplementEntries.length >= 5 && supplementEntries.every(entry => entry.content && entry.content.trim() !== "");
    if (!supplementComplete) {
      // Collect all existing supplement keys (support string and string[])
      const existingKeys: string[] = [];
      for (const entry of supplementEntries) {
        const keys = entry.keys;
        if (typeof keys === "string") {
          existingKeys.push(`"${keys}"`);
        } else if (Array.isArray(keys)) {
          // If key is an array, add all non-empty strings
          keys  .forEach(k => {
            if (typeof k === "string" && k.trim() !== "") {
              existingKeys.push(`"${k}"`);
            }
          });
        }
      }
      let keyInfo = "";
      if (existingKeys.length > 0) {
        keyInfo = `\n⚠️ Existing SUPPLEMENT keys: ${existingKeys.join(", ")}\n🚫 Do NOT use new or similar keys. Please avoid duplication or similar expressions.`;
      }
      return `OVERALL STATUS: Character complete - Worldbook in progress\n❌ MISSING WORLDBOOK COMPONENT: SUPPLEMENT (need 5+)\n📋 NEXT ACTION: Use tool: SUPPLEMENT${keyInfo}`;
    }
    
    // All worldbook components complete
    return "OVERALL STATUS: ✅ Generation complete - Ready for final evaluation";
  }
} 
 
