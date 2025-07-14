import { LocalCharacterRecordOperations } from "@/lib/data/roleplay/character-record-operation";

export async function moveToTop(character_id: string): Promise<{ success?: boolean; error?: string }> {
  try {
    if (!character_id) {
      return { error: "Character ID is required" };
    }

    const character = await LocalCharacterRecordOperations.getCharacterById(character_id);
    if (!character) {
      return { error: "Character not found" };
    }

    const moved = await LocalCharacterRecordOperations.moveCharacterToTop(character_id);
    if (!moved) {
      return { error: "Failed to move character to top" };
    }

    return { success: true };
  } catch (err: any) {
    console.error("Failed to move character to top:", err);
    return { error: `Failed to move character to top: ${err.message}` };
  }
}
