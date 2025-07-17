export function adaptText(text: string, language: "en" | "zh", username?: string, charName?: string): string {
  let parsed = text.replace(/<br\s*\/?>/gi, "\n");
  const userReplacement = username ?? (language === "zh" ? "我" : "I");
  parsed = parsed.replace(/{{user}}/g, userReplacement);
  parsed = parsed.replace(/{{char}}/g, charName ?? "");
  return parsed;
}
  
export function adaptCharacterData(
  characterData: any,
  language: "en" | "zh",
  username?: string,
): any {
  const result = { ...characterData };
  const charReplacement = characterData.name || "";
  
  const fieldsToProcess = [
    "description", "personality", "first_mes", "scenario",
    "mes_example", "creatorcomment", "creator_notes",
  ];
  
  for (const field of fieldsToProcess) {
    if (result[field]) {
      let processed = adaptText(result[field], language, username, charReplacement);
      result[field] = processed;
    }
  }
  
  if (result.character_book) {
    const bookEntries = Array.isArray(result.character_book)
      ? result.character_book
      : (result.character_book.entries || []);
  
    result.character_book = bookEntries.map((entry: any) => {
      const processedEntry = { ...entry };
  
      if (processedEntry.comment) {
        let processed = adaptText(processedEntry.comment, language, username, charReplacement);
        processedEntry.comment = processed;
      }
  
      if (processedEntry.content) {
        let processed = adaptText(processedEntry.content, language, username, charReplacement);
        processedEntry.content = processed;
      }
  
      return processedEntry;
    });
  }
  
  if (Array.isArray(result.alternate_greetings)) {
    for (let i = 0; i < result.alternate_greetings.length; i++) {
      let greeting = result.alternate_greetings[i];
      greeting = adaptText(greeting, language, username, charReplacement);
      result.alternate_greetings[i] = greeting;
    }
  }
  
  return result;
}
  
