import fs from "fs";

const ELEVENLABS_API_KEY = "sk_87f129a69d2948f1960f3724281e658cb6fd92facf603f27";

const VOICE_ID = "iP95p4xoKVk53GoZ742B";

export async function textToSpeech(text: string): Promise<string> {
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: "POST",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`TTS request failed: ${response.status} ${errorText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const fileName = `tts_${Date.now()}.mp3`;
  fs.writeFileSync(fileName, Buffer.from(arrayBuffer));
  return fileName;
}