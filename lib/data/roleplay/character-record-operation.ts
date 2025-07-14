import { readData, writeData, CHARACTERS_RECORD_FILE } from "@/lib/data/local-storage";
import { RawCharacterData } from "@/lib/models/rawdata-model";
import { LocalCharacterDialogueOperations } from "@/lib/data/roleplay/character-dialogue-operation";

export interface CharacterRecord {
  id: string;
  data: RawCharacterData;
  imagePath: string;
  created_at: string;
  updated_at: string;
}

export class LocalCharacterRecordOperations {
  static async createCharacter(characterId: string, rawCharacterData: RawCharacterData, imagePath: string): Promise<CharacterRecord> {
    const characterRecords = await readData(CHARACTERS_RECORD_FILE);
    const characterRecord: CharacterRecord = {
      id: characterId,
      data: rawCharacterData,
      imagePath,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    characterRecords.push(characterRecord);
    await writeData(CHARACTERS_RECORD_FILE, characterRecords);
    
    return characterRecord;
  }
  
  static async getAllCharacters(): Promise<CharacterRecord[]> {
    return await readData(CHARACTERS_RECORD_FILE);
  }
  
  static async getCharacterById(characterId: string): Promise<CharacterRecord> {
    const characterRecords = await readData(CHARACTERS_RECORD_FILE);
  
    const characterRecord = characterRecords.find(
      (record: CharacterRecord) => record.id === characterId,
    );

    return characterRecord;
  }
  
  static async updateCharacter(characterId: string, characterData: Partial<RawCharacterData>): Promise<CharacterRecord | null> {
    const characterRecords = await readData(CHARACTERS_RECORD_FILE);
    const index = characterRecords.findIndex((characterRecord: CharacterRecord) => characterRecord.id === characterId);
    
    if (index === -1) {
      return null;
    }
    
    characterRecords[index].data = { ...characterRecords[index].data, ...characterData };
    characterRecords[index].updated_at = new Date().toISOString();
    
    await writeData(CHARACTERS_RECORD_FILE, characterRecords);
    
    return characterRecords[index];
  }
  
  static async deleteCharacter(characterId: string): Promise<boolean> {
    const characterRecords = await readData(CHARACTERS_RECORD_FILE);
    const initialLength = characterRecords.length;
    
    const filteredCharacterRecords = characterRecords.filter((characterRecord: CharacterRecord) => characterRecord.id !== characterId);
    
    if (filteredCharacterRecords.length === initialLength) {
      return false;
    }
    
    await writeData(CHARACTERS_RECORD_FILE, filteredCharacterRecords);
    
    await LocalCharacterDialogueOperations.deleteDialogueTree(characterId);
    
    return true;
  }

  /**
 * As we rendering the array as descending order, 
 * we need to move character to end of the array to bring the card to the top of the screen
 * @param characterId 
 * @returns 
 */
  static async moveCharacterToTop(characterId: string): Promise<boolean> {
    const characterRecords = await readData(CHARACTERS_RECORD_FILE);
    const index = characterRecords.findIndex((characterRecord: CharacterRecord) => characterRecord.id === characterId);
    
    if (index === characterRecords.length - 1) {
      return true;
    } else if (index === -1) {
      return false;
    }

    const characterRecord = characterRecords[index];
    characterRecords.splice(index, 1);
    characterRecords.push(characterRecord);
    await writeData(CHARACTERS_RECORD_FILE, characterRecords);

    return true;
  }
}
