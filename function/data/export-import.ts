import { exportAllData, importAllData } from "@/lib/data/local-storage";

/**
 * Export all data from IndexedDB to a JSON file
 * @returns {Promise<Blob>} A blob containing the exported data
 */
export async function exportDataToFile(): Promise<Blob> {
  try {
    const data = await exportAllData();
    const jsonString = JSON.stringify(data);
    return new Blob([jsonString], { type: "application/json" });
  } catch (error) {
    console.error("Export failed:", error);
    throw new Error("Export failed");
  }
}

/**
 * Import data from a JSON file to IndexedDB
 * @param {File} file - The JSON file to import
 * @returns {Promise<void>}
 */
export async function importDataFromFile(file: File): Promise<void> {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    await importAllData(data);
  } catch (error) {
    console.error("Import failed:", error);
    throw new Error("Import failed");
  }
}

/**
 * Generate a filename for the exported data
 * @returns {string} The generated filename
 */
export function generateExportFilename(): string {
  const date = new Date()
  return `narratium-backup-${date.toISOString().split("T")[0]}_${date.getTime()}.json`;
}

/**
 * Create and trigger a download for the exported data
 * @param {Blob} blob - The data blob to download
 * @param {string} filename - The name of the file to download
 */
export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
} 
