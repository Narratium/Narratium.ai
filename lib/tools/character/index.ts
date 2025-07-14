import { 
  ToolType, 
  ExecutionContext, 
  ExecutionResult, 
} from "../../models/agent-model";
import { BaseTool, ToolParameter } from "../base-tool";

/**
 * Character Tool - Pure Execution Unit
 * Updates or adds one or more character fields to the character card data
 * Can be used incrementally to build up the character over multiple tool calls
 */
export class CharacterTool extends BaseTool {
  readonly toolType = ToolType.CHARACTER;
  readonly name = "CHARACTER";
  readonly description = "Generate or update character card data - one of the most frequently used tools. Build character incrementally by adding fields in REQUIRED logical insert_order: name → description → personality → scenario → first_mes → mes_example → creator_notes → tags. ALL EIGHT CORE FIELDS ARE REQUIRED for a complete character card. Optional fields like alternate_greetings can be added to enhance player choice. IMPORTANT: Generally generate ONE attribute at a time and make the content as rich and detailed as possible. Use multiple tool calls to build systematically, focusing on creating comprehensive, immersive content for each field. CHARACTER generation with all required fields must be completed BEFORE starting worldbook creation, as worldbook entries should complement and enhance the established character.";
  
  readonly parameters: ToolParameter[] = [
    {
      name: "name",
      type: "string",
      description: "The primary identifier - typically the story title, scenario name, or thematic title rather than just a character name. For complex scenarios, use descriptive titles like 'The Enchanted Academy' or 'Cyberpunk Detective Story'. For simple character-focused cards, can be a character name with descriptive prefix like 'Elara the Sorceress'.",
      required: false,
    },
    {
      name: "description",
      type: "string", 
      description: "Physical appearance and basic character description",
      required: false,
    },
    {
      name: "personality",
      type: "string",
      description: "For character-focused cards: personality traits, behavior patterns, and psychological profile. For story/scenario cards: overall story atmosphere, tone, and key NPC personalities (e.g., 'Dark mysterious atmosphere with Professor Magnus (stern mentor), Luna (cheerful student), Marcus (rival)')",
      required: false,
    },
    {
      name: "scenario",
      type: "string",
      description: "The setting, situation, or context where the character exists",
      required: false,
    },
    {
      name: "first_mes",
      type: "string",
      description: "An extensive, immersive opening sequence that establishes the entire narrative foundation. This should be a substantial multi-paragraph text (typically 200-800 words) that includes: detailed scene setting, atmospheric description, character introduction with visual details, initial dialogue or internal monologue, environmental context, and emotional tone. For character cards: comprehensive character debut with backstory hints, personality showcase, and engaging first interaction. For story cards: elaborate world-building opening that establishes location, time period, social dynamics, and compelling hook to draw users into the narrative world.",
      required: false,
    },
    {
      name: "mes_example",
      type: "string", 
      description: "A comprehensive and immersive example of a message (mes) from the character. This should go beyond simple dialogue examples and act as a dynamic narrative segment, typically spanning multiple paragraphs (300-800 words). It MUST integrate:\n1. Detailed scene introduction and atmospheric setting.\n2. Deep internal monologue or character reflection, revealing thoughts, memories, and motivations.\n3. Dynamic display of real-time game information or context, explicitly using the <status> XML tag to encapsulate structured data (e.g., character status, environmental stats, interactive options). This part should be clearly separated from the narrative text.\n4. Engaging dialogue demonstrating character's communication style, emotional range, and interactions with other entities.\n5. Character's actions, reactions, and decision-making processes within the scene.\nThis example serves as a living demonstration of the character's in-world behavior and the interactive elements of the scenario.",
      required: false,
    },
    {
      name: "creator_notes",
      type: "string",
      description: "Additional notes about the character's background, motivations, or usage guidelines",
      required: false,
    },
    {
      name: "alternate_greetings",
      type: "array",
      description: "Array of comprehensive alternative opening scenarios (typically 3-5 entries, each 150-600 words) that provide entirely different narrative starting points, worldlines, or timeline variations. Each greeting should be a fully-developed immersive sequence with unique atmospheric setting, character context, emotional tone, and story hook. Examples include: seasonal variations (summer festival vs winter solitude), relationship dynamics (first meeting vs established friendship vs conflict resolution), location changes (academy library vs mysterious forest vs bustling marketplace), temporal shifts (peaceful times vs crisis moments vs celebration periods). Each alternate greeting should offer players meaningful choice in how their story begins, with distinct mood, circumstances, and narrative potential.",
      required: false,
    },
    {
      name: "tags",
      type: "array", 
      description: "Array of categorization tags. REQUIRED CATEGORIES: Card Type ['character-card' OR 'story-card']. GENRE OPTIONS: ['fantasy', 'romance', 'sci-fi', 'mystery', 'horror', 'slice-of-life', 'historical', 'modern', 'cyberpunk', 'steampunk', 'urban-fantasy', 'isekai', 'school-life', 'workplace', 'adventure', 'thriller', 'comedy', 'drama', 'supernatural', 'post-apocalyptic']. ADDITIONAL DESCRIPTORS: ['cute', 'dark', 'mature', 'wholesome', 'intense', 'lighthearted', 'serious', 'mysterious', 'action-packed', 'emotional']. Example: ['story-card', 'fantasy', 'school-life', 'mysterious', 'wholesome']",
      required: false,
    },
  ];

  protected async doWork(parameters: Record<string, any>, context: ExecutionContext): Promise<ExecutionResult> {
    // Filter out undefined/null parameters and build character data
    const characterUpdates: any = {};
    
    if (parameters.name) characterUpdates.name = parameters.name;
    if (parameters.description) characterUpdates.description = parameters.description;
    if (parameters.personality) characterUpdates.personality = parameters.personality;
    if (parameters.scenario) characterUpdates.scenario = parameters.scenario;
    if (parameters.first_mes) characterUpdates.first_mes = parameters.first_mes;
    if (parameters.mes_example) characterUpdates.mes_example = parameters.mes_example;
    if (parameters.creator_notes) characterUpdates.creator_notes = parameters.creator_notes;
    if (parameters.alternate_greetings) {
      // Support both array and comma-separated string formats
      if (Array.isArray(parameters.alternate_greetings)) {
        characterUpdates.alternate_greetings = parameters.alternate_greetings.filter((greeting: string) => greeting && greeting.trim().length > 0);
      } else if (typeof parameters.alternate_greetings === "string") {
        // Convert comma-separated string to array for backward compatibility
        characterUpdates.alternate_greetings = parameters.alternate_greetings.split("|").map((greeting: string) => greeting.trim()).filter((greeting: string) => greeting.length > 0);
      }
    }
    if (parameters.tags) {
      // Support both array and comma-separated string formats
      if (Array.isArray(parameters.tags)) {
        characterUpdates.tags = parameters.tags.filter((tag: string) => tag && tag.trim().length > 0);
      } else if (typeof parameters.tags === "string") {
        // Convert comma-separated string to array for backward compatibility
        characterUpdates.tags = parameters.tags.split(",").map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0);
      }
    }

    if (Object.keys(characterUpdates).length === 0) {
      return this.createFailureResult("CHARACTER tool requires at least one character field to be provided.");
    }
    
    return this.createSuccessResult({
      character_data: characterUpdates,
    });
  }

}
