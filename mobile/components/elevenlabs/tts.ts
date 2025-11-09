// tts.ts
import * as Speech from "expo-speech";
import * as FileSystem from "expo-file-system/legacy";
import { Audio } from "expo-av"; // new package for audio playback

const ELEVENLABS_MODEL = "eleven_turbo_v2";
const VOICE_ID = "iP95p4xoKVk53GoZ742B";

// Load API key safely
const rawApiKey = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY;
if (!rawApiKey) {
  throw new Error("ELEVENLABS_API_KEY is not defined in environment variables.");
}
const ELEVENLABS_API_KEY: string = rawApiKey;

const getCacheDirectory = (): string =>
  FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? "";

// Helper: convert Uint8Array to base64 (React Native compatible)
function uint8ArrayToBase64(u8Arr: Uint8Array): string {
  let CHUNK_SIZE = 0x8000;
  let index = 0;
  let length = u8Arr.length;
  let result = '';
  let slice: Uint8Array;

  while (index < length) {
    slice = u8Arr.subarray(index, Math.min(index + CHUNK_SIZE, length));
    result += String.fromCharCode.apply(null, slice as unknown as number[]);
    index += CHUNK_SIZE;
  }

  return global.btoa(result);
}

export async function textToSpeech(text: string): Promise<string> {
  try {
    const fileUri = await textToSpeechElevenLabs(text);
    return fileUri;
  } catch (error) {
    console.warn("⚠️ ElevenLabs failed, falling back to native:", error);
    await textToSpeechNative(text);
    return "native";
  }
}

async function textToSpeechElevenLabs(text: string): Promise<string> {
  const headers: HeadersInit = {
    Accept: "audio/mpeg",
    "Content-Type": "application/json",
    "xi-api-key": ELEVENLABS_API_KEY,
  };

  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    {
      method: "POST",
      headers,
      body: JSON.stringify({
        text,
        model_id: ELEVENLABS_MODEL,
        voice_settings: { stability: 0.4, similarity_boost: 0.7 },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("ElevenLabs API error:", response.status, errorText);
    throw new Error(errorText);
  }

  const arrayBuffer = await response.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);

  const base64Audio = uint8ArrayToBase64(uint8Array);

  const fileName = `temp-audio-${Date.now()}.mp3`;
  const fileUri = getCacheDirectory() + fileName;

  await FileSystem.writeAsStringAsync(fileUri, base64Audio, { encoding: "base64" });

  // Play audio using expo-audio
  const playbackObject = new Audio.Sound();
  await playbackObject.loadAsync({ uri: fileUri });
  await playbackObject.playAsync();

  return fileUri;
}

async function textToSpeechNative(text: string): Promise<void> {
  return new Promise((resolve) => {
    Speech.speak(text, { onDone: resolve, language: "en" });
  });
}