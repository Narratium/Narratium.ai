import { 
  ToolType, 
  ExecutionContext, 
  ExecutionResult, 
} from "../../models/agent-model";
import { BaseTool, ToolParameter } from "../base-tool";
import { TavilySearch } from "@langchain/tavily";
import { ConfigManager } from "../../core/config-manager";

/**
 * Enhanced Search Tool - Tavily API implementation
 * Uses Tavily's professional search API for reliable and high-quality search results
 */
export class SearchTool extends BaseTool {
  readonly toolType = ToolType.SEARCH;
  readonly name = "SEARCH";
  readonly description = "Search for information using Tavily API. USE PRIMARILY when the story relates to existing real-world content like anime, novels, games, movies, or specific cultural references that require accurate information. Also use when you need specific factual details, historical context, or cultural elements that cannot be creatively invented. Do NOT use for generic creative content that can be imagined - only use when accuracy about existing works or real-world elements is essential for the story.";
  
  readonly parameters: ToolParameter[] = [
    {
      name: "query",
      type: "array",
      description: "Array of search queries to execute. The tool will use Tavily's professional search API to gather comprehensive information for character/worldbook generation. Each query should be a specific search string.",
      required: true,
    },
  ];

  private tavilySearch: TavilySearch;
  private configManager: ConfigManager;

  constructor() {
    super();
    this.configManager = ConfigManager.getInstance();
    // Note: Tavily Search will be initialized with API key from ConfigManager in doWork method
    this.tavilySearch = null as any; // Will be initialized with API key from ConfigManager
  }

  protected async doWork(parameters: Record<string, any>, context: ExecutionContext): Promise<ExecutionResult> {
    const query = parameters.query;
    
    // Support both array and string formats for backward compatibility
    let queries: string[];
    if (Array.isArray(query)) {
      queries = query.filter((q: any) => q && typeof q === "string" && q.trim().length > 0);
    } else if (typeof query === "string" && query.trim().length > 0) {
      queries = [query.trim()];
    } else {
      return this.createFailureResult("SEARCH tool requires 'query' parameter as an array of strings or a single string.");
    }

    if (queries.length === 0) {
      return this.createFailureResult("SEARCH tool requires at least one valid query string.");
    }

    // Get LLM configuration from ConfigManager
    const llmConfig = this.configManager.getLLMConfig();
    const tavilyApiKey = llmConfig.tavily_api_key;
    if (!tavilyApiKey || tavilyApiKey.trim() === "") {
      return this.createFailureResult("Tavily API key not configured. Please run './start.sh config' to set up your Tavily API key.");
    }

    console.log("Tavily API key:", tavilyApiKey);
    try {
      console.log(`🔍 Starting Tavily search for ${queries.length} queries: ${queries.join(", ")}`);
      this.tavilySearch = new TavilySearch({
        tavilyApiKey: tavilyApiKey,
        maxResults: 8, // Increased for better coverage
        topic: "general",
        includeAnswer: false, // We'll process results ourselves
        includeRawContent: false, // Keep response size manageable
        includeImages: false, // Focus on text content
        searchDepth: "advanced", // Use advanced search for better quality
        // API key will be set via environment variable
      });
        
      // Set the API key via environment variable (Tavily's expected method)
      process.env.TAVILY_API_KEY = tavilyApiKey;
      console.log("Tavily API key set via environment variable:", process.env.TAVILY_API_KEY);
      
      const allKnowledgeEntries = [];
      const allSources = [];
      let totalResponseTime = 0;

      // Execute searches for all queries
      for (const singleQuery of queries) {
        try {
          console.log(`🔍 Searching for: "${singleQuery}"`);
          // Use Tavily search directly
          const searchResult = await this.tavilySearch.invoke({ query: singleQuery });
      
          // Parse the Tavily response
          const searchData = typeof searchResult === "string" ? JSON.parse(searchResult) : searchResult;
      
          if (!searchData.results || !Array.isArray(searchData.results)) {
            console.warn(`Invalid search response format for query: "${singleQuery}"`);
            continue;
          }
    
          // Convert Tavily results to knowledge entries
          const knowledgeEntries = searchData.results.map((result: any) => 
            this.createKnowledgeEntry(
              `${result.title || "Search Result"} (Query: ${singleQuery})`,
              result.content || result.snippet || "",
              result.url || "Unknown",
              Math.round((result.score || 0.5) * 100), // Convert score to percentage
            ),
          );

          allKnowledgeEntries.push(...knowledgeEntries);
          allSources.push(...searchData.results.map((r: any) => r.title || r.url));
          totalResponseTime += searchData.response_time || 0;

          console.log(`✅ Search completed for "${singleQuery}": ${knowledgeEntries.length} results`);
        } catch (queryError) {
          console.warn(`❌ Search failed for "${singleQuery}":`, queryError);
          // Continue with other queries instead of failing completely
        }
      }

      console.log(`✅ All Tavily searches completed: ${allKnowledgeEntries.length} total knowledge entries created`);

      return this.createSuccessResult({
        queries: queries,
        results_count: allKnowledgeEntries.length,
        sources: allSources.slice(0, 10), // Show top 10 sources
        search_method: "tavily_advanced_multi",
        response_time: totalResponseTime,
        knowledge_entries: allKnowledgeEntries,
      });
    } catch (error) {
      console.error(`❌ Tavily search failed for queries [${queries.join(", ")}]:`, error);
      return this.createFailureResult(`Tavily search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
} 
