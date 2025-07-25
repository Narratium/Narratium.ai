import { NodeTool } from "@/lib/nodeflow/NodeTool";
import { PresetOperations } from "@/lib/data/roleplay/preset-operation";
import { PresetAssembler } from "@/lib/core/preset-assembler";
import { LocalCharacterRecordOperations } from "@/lib/data/roleplay/character-record-operation";
import { Character } from "@/lib/core/character";
import { PromptKey } from "@/lib/prompts/preset-prompts";

export class PresetNodeTools extends NodeTool {
  protected static readonly toolType: string = "preset";
  protected static readonly version: string = "1.0.0";

  static getToolType(): string {
    return this.toolType;
  }

  static async executeMethod(methodName: string, ...params: any[]): Promise<any> {
    const method = (this as any)[methodName];
    
    if (typeof method !== "function") {
      console.error(`Method lookup failed: ${methodName} not found in PresetNodeTools`);
      console.log("Available methods:", Object.getOwnPropertyNames(this).filter(name => 
        typeof (this as any)[name] === "function" && !name.startsWith("_"),
      ));
      throw new Error(`Method ${methodName} not found in ${this.getToolType()}Tool`);
    }

    try {
      this.logExecution(methodName, params);
      return await (method as Function).apply(this, params);
    } catch (error) {
      this.handleError(error as Error, methodName);
    }
  }

  static async buildPromptFramework(
    characterId: string,
    language: "zh" | "en" = "zh",
    username?: string,
    charName?: string,
    number?: number,
    fastModel: boolean = false,
    systemPresetType: PromptKey = "mirror_realm",
  ): Promise<{ systemMessage: string; userMessage: string; presetId?: string }> {
    try {
      const characterRecord = await LocalCharacterRecordOperations.getCharacterById(characterId);
      const character = new Character(characterRecord);
      
      const allPresets = await PresetOperations.getAllPresets();
      const enabledPreset = allPresets.find(preset => preset.enabled === true);
      
      let orderedPrompts: any[] = [];
      let presetId: string | undefined = undefined;
      
      if (enabledPreset && enabledPreset.id) {
        orderedPrompts = await PresetOperations.getOrderedPrompts(enabledPreset.id);
        presetId = enabledPreset.id;
      } else {
        console.log(`No enabled preset found, using ${systemPresetType} system framework for character ${characterId}`);
      }
      
      const enrichedPrompts = this.enrichPromptsWithCharacterInfo(orderedPrompts, character);
      
      const { systemMessage, userMessage } = PresetAssembler.assemblePrompts(
        enrichedPrompts,
        language,
        fastModel,
        { username, charName: charName || character.characterData.name, number },
        systemPresetType,
      );

      return { 
        systemMessage: systemMessage, 
        userMessage: userMessage,
        presetId: presetId,
      };
    } catch (error) {
      this.handleError(error as Error, "buildPromptFramework");
    }
  }

  private static enrichPromptsWithCharacterInfo(
    prompts: any[],
    character: Character,
  ): any[] {
    return prompts.map(prompt => {
      const enrichedPrompt = { ...prompt };
      
      switch (prompt.identifier) {
      case "charDescription":
        if (!enrichedPrompt.content && character.characterData.description) {
          enrichedPrompt.content = character.characterData.description;
        }
        break;
          
      case "charPersonality":
        if (!enrichedPrompt.content && character.characterData.personality) {
          enrichedPrompt.content = character.characterData.personality;
        }
        break;
          
      case "scenario":
        if (!enrichedPrompt.content && character.characterData.scenario) {
          enrichedPrompt.content = character.characterData.scenario;
        }
        break;
      }
      
      return enrichedPrompt;
    });
  }
} 
