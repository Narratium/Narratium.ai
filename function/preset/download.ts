import { importPresetFromJson } from "@/function/preset/import";
import { PresetOperations } from "@/lib/data/roleplay/preset-operation";
import { PromptKey } from "@/lib/prompts/preset-prompts";

interface GithubPreset {
  name: string;
  displayName: {
    zh: string;
    en: string;
  };
  description: {
    zh: string;
    en: string;
  };
  filename: string;
}

const GITHUB_API_URL = "https://api.github.com/repos/Narratium/Preset/contents";
const GITHUB_REPO_URL = "https://raw.githubusercontent.com/Narratium/Preset/main";

const AVAILABLE_PRESETS: GithubPreset[] = [
  {
    name: "mirror_realm",
    displayName: {
      zh: "灵镜之境",
      en: "Mirror Realm",
    },
    description: {
      zh: "多面灵魂角色协议，情感互动专家",
      en: "Multi-faceted soul character protocol, emotional interaction expert",
    },
    filename: "system_preset",
  },
  {
    name: "novel_king",
    displayName: {
      zh: "小说之王",
      en: "Novel King",
    },
    description: {
      zh: "史诗织梦叙事大师，故事推进专家",
      en: "Epic narrative master, story progression expert",
    },
    filename: "system_preset",
  },
  {
    name: "professional_heart",
    displayName: {
      zh: "这个杀手不太冷",
      en: "This Killer Isn't So Cold",
    },
    description: {
      zh: "严酷现实反差叙事，外冷内热情感专家",
      en: "Harsh reality contrast narrative, cold exterior warm heart expert",
    },
    filename: "system_preset",
  },
  {
    name: "magician",
    displayName: {
      zh: "魔术师",
      en: "Magician",
    },
    description: {
      zh: "魔术师织机之约，编织现实与幻想的边界",
      en: "Magician's weaving of reality and fantasy",
    },
    filename: "system_preset",
  },
  {
    name: "whisperer",
    displayName: {
      zh: "低语者",
      en: "Whisperer",
    },
    description: {
      zh: "被遗忘者的证言，边缘叙事的守护者",
      en: "Testimonies of the forgotten, guardian of edge narratives",
    },
    filename: "system_preset",
  },
];

export function getAvailableGithubPresets(): GithubPreset[] {
  return AVAILABLE_PRESETS;
}

export function getPresetDisplayName(presetName: string, language: "zh" | "en" = "zh"): string {
  const preset = AVAILABLE_PRESETS.find(p => p.name === presetName);
  if (!preset) return presetName;
  return preset.displayName[language] || preset.displayName.zh || preset.name;
}

export function getPresetDescription(presetName: string, language: "zh" | "en" = "zh"): string {
  const preset = AVAILABLE_PRESETS.find(p => p.name === presetName);
  if (!preset) return "";
  return preset.description[language] || preset.description.zh || "";
}

// export async function isPresetDownloaded(presetName: string): Promise<boolean> {
//   try {
//     const preset = AVAILABLE_PRESETS.find(p => p.name === presetName);
//     if (!preset) return false;

//     // Handle system presets
//     if (preset.filename === "system_preset") {
//       const downloadedPresets = localStorage.getItem("downloaded_github_presets");
//       if (downloadedPresets) {
//         const presets = JSON.parse(downloadedPresets);
//         return presets.includes(presetName);
//       }
//       return false;
//     }

//     // Handle GitHub presets (original logic)
//     const downloadedPresets = localStorage.getItem("downloaded_github_presets");
//     let isMarkedAsDownloaded = false;
    
//     if (downloadedPresets) {
//       const presets = JSON.parse(downloadedPresets);
//       isMarkedAsDownloaded = presets.includes(presetName);
//     }
    
//     if (isMarkedAsDownloaded) {
//       const exists = await doesPresetExist(presetName);
//       return exists;
//     }
    
//     return false;
//   } catch (error) {
//     console.error("Error checking if preset is downloaded:", error);
//     return false;
//   }
// }

// export async function doesPresetExist(presetName: string): Promise<boolean> {
//   try {
//     const allPresets = await PresetOperations.getAllPresets();
    
//     const presetConfig = AVAILABLE_PRESETS.find(p => p.name === presetName);
//     if (!presetConfig) return false;

//     return allPresets.some(preset => 
//       preset.name === presetConfig.displayName.zh || 
//       preset.name === presetConfig.displayName.en ||
//       preset.name.includes(presetConfig.displayName.zh) ||
//       preset.name.includes(presetConfig.displayName.en),
//     );
//   } catch (error) {
//     console.error("Error checking if preset exists:", error);
//     return false;
//   }
// }

// export async function downloadPresetFromGithub(presetName: string, language: "zh" | "en" = "zh"): Promise<{ success: boolean; message?: string; presetId?: string }> {
//   try {
//     const preset = AVAILABLE_PRESETS.find(p => p.name === presetName);
//     if (!preset) {
//       return { success: false, message: "Preset not found" };
//     }

//     // Handle system presets (built-in presets)
//     if (preset.filename === "system_preset") {
//       try {
//         // Set the system preset type in localStorage
//         let presetType: string;
//         if (presetName === "novel_king") {
//           presetType = "novel_king";
//         } else if (presetName === "professional_heart") {
//           presetType = "professional_heart";
//         } else {
//           presetType = "mirror_realm";
//         }
//         localStorage.setItem("system_preset_type", presetType);
//         localStorage.setItem("system_preset_name", preset.displayName[language]);
        
//         // Mark as downloaded
//         markPresetAsDownloaded(presetName);
        
//         return { 
//           success: true, 
//           presetId: `system_${presetName}`,
//           message: `${preset.displayName[language]} 系统预设已启用`,
//         };
//       } catch (error) {
//         return { success: false, message: `Failed to set system preset: ${error instanceof Error ? error.message : String(error)}` };
//       }
//     }

//     // Handle GitHub presets (original logic)
//     try {
//       const apiResponse = await fetch(GITHUB_API_URL);
//       if (apiResponse.ok) {
//         const files = await apiResponse.json();
//         if (Array.isArray(files)) {
//           const matchingFile = files.find((file: any) =>
//             file.name === preset.filename ||
//             file.name.toLowerCase() === preset.filename.toLowerCase(),
//           );
          
//           if (matchingFile && matchingFile.download_url) {
//             const response = await fetch(matchingFile.download_url);
//             if (!response.ok) {
//               return { success: false, message: `Failed to download preset: ${response.statusText}` };
//             }
            
//             const jsonContent = await response.text();
//             const localizedName = getPresetDisplayName(presetName, language);
//             const result = await importPresetFromJson(jsonContent, localizedName);
            
//             if (result.success && result.presetId) {
//               markPresetAsDownloaded(presetName);
//               return { success: true, presetId: result.presetId };
//             } else {
//               return { success: false, message: result.error || "Failed to import preset" };
//             }
//           }
//         }
//       }
//     } catch (apiError) {
//       console.error("Failed to fetch file list from GitHub API:", apiError);
//     }

//     const encodedFilename = encodeURIComponent(preset.filename);
//     const fileUrl = `${GITHUB_REPO_URL}/${encodedFilename}`;
//     const response = await fetch(fileUrl);
    
//     if (!response.ok) {
//       return { success: false, message: `Failed to download preset: ${response.statusText}` };
//     }
    
//     const jsonContent = await response.text();
//     const localizedName = getPresetDisplayName(presetName, language);
//     const result = await importPresetFromJson(jsonContent, localizedName);
    
//     if (result.success && result.presetId) {
//       markPresetAsDownloaded(presetName);
//       return { success: true, presetId: result.presetId };
//     } else {
//       return { success: false, message: result.error || "Failed to import preset" };
//     }
//   } catch (error) {
//     console.error("Error downloading preset from Github:", error);
//     return { success: false, message: `Error downloading preset: ${error instanceof Error ? error.message : String(error)}` };
//   }
// }

function markPresetAsDownloaded(presetName: string): void {
  try {
    const downloadedPresets = localStorage.getItem("downloaded_github_presets");
    let presets: string[] = [];
    
    if (downloadedPresets) {
      presets = JSON.parse(downloadedPresets);
    }
    
    if (!presets.includes(presetName)) {
      presets.push(presetName);
      localStorage.setItem("downloaded_github_presets", JSON.stringify(presets));
    }
  } catch (error) {
    console.error("Error marking preset as downloaded:", error);
  }
}

export function getCurrentSystemPresetType(): PromptKey {
  try {
    const presetType = localStorage.getItem("system_preset_type");
    if (presetType === "novel_king") {
      return "novel_king";
    } else if (presetType === "professional_heart") {
      return "professional_heart";
    } else if (presetType === "magician") {
      return "magician";
    } else {
      return "mirror_realm";
    }
  } catch (error) {
    console.error("Error getting system preset type:", error);
    return "mirror_realm";
  }
}

// export function getCurrentSystemPresetName(): string | null {
//   try {
//     return localStorage.getItem("system_preset_name");
//   } catch (error) {
//     console.error("Error getting system preset name:", error);
//     return null;
//   }
// }
