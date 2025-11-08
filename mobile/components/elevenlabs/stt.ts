import fs from "fs";
import FormData from "form-data";
import fetch from "node-fetch";

const ELEVENLABS_API_KEY = "sk_87f129a69d2948f1960f3724281e658cb6fd92facf603f27";

// Example: use ElevenLabs default speech-to-text model
const MODEL_ID = "scribe_v1";

export async function speechToText(audioPath: string): Promise<string> {
  if (!fs.existsSync(audioPath)) {
    throw new Error(`Audio file does not exist: ${audioPath}`);
  }

  const audioBuffer = fs.readFileSync(audioPath);
  const form = new FormData();
  form.append("file", audioBuffer, "audio.wav");
  form.append("model_id", MODEL_ID);

  const response = await fetch("https://api.elevenlabs.io/v1/speech-to-text", {
    method: "POST",
    headers: {
      "xi-api-key": ELEVENLABS_API_KEY,
      ...form.getHeaders(),
    },
    body: form as any,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`STT request failed: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  return data.text;
}