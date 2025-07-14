import extract from "png-chunks-extract";
import encode from "png-chunks-encode";
import PNGtext from "png-chunk-text";

const encodeBase64 = (str: string): string => {
  const utf8Bytes = new TextEncoder().encode(str);
  const binary = String.fromCharCode(...utf8Bytes);
  return btoa(binary);
};

const decodeBase64 = (b64: string): string => {
  const binary = atob(b64);
  const bytes = new Uint8Array([...binary].map(char => char.charCodeAt(0)));
  return new TextDecoder().decode(bytes);
};

export const writeCharacterToPng = async (file: File, data: string): Promise<Blob> => {
  const buffer = new Uint8Array(await file.arrayBuffer());
  const chunks = extract(buffer);

  const filteredChunks = chunks.filter(chunk => {
    if (chunk.name !== "tEXt") return true;
    const { keyword } = PNGtext.decode(chunk.data);
    return !["chara", "ccv3"].includes(keyword.toLowerCase());
  });

  const base64Data = encodeBase64(data);
  filteredChunks.splice(-1, 0, PNGtext.encode("chara", base64Data));

  try {
    const v3Data = JSON.parse(data);
    v3Data.spec = "chara_card_v3";
    v3Data.spec_version = "3.0";
    const base64V3 = encodeBase64(JSON.stringify(v3Data));
    filteredChunks.splice(-1, 0, PNGtext.encode("ccv3", base64V3));
  } catch (err) {
    console.warn("Failed to add ccv3 chunk:", err);
  }

  const newBuffer = encode(filteredChunks);
  return new Blob([new Uint8Array(newBuffer)], { type: "image/png" });
};

export const readCharacterFromPng = async (file: File): Promise<string> => {
  const buffer = new Uint8Array(await file.arrayBuffer());
  const chunks = extract(buffer);

  const textChunks = chunks
    .filter(chunk => chunk.name === "tEXt")
    .map(chunk => PNGtext.decode(chunk.data));

  const ccv3 = textChunks.find(c => c.keyword.toLowerCase() === "ccv3");
  const chara = textChunks.find(c => c.keyword.toLowerCase() === "chara");

  const raw = ccv3?.text || chara?.text;
  if (!raw) throw new Error("No PNG metadata found.");

  return decodeBase64(raw);
};

export const parseCharacterCard = async (file: File): Promise<string> => {
  if (!file.name.toLowerCase().endsWith(".png")) {
    throw new Error("Unsupported format");
  }
  return readCharacterFromPng(file);
};
