import readline from "readline";
import { textToSpeech } from "./tts.ts";
import { speechToText } from "./stt.ts";

// setup readline interface for input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// promisified question
function questionAsync(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
  try {
    // text input from user
    const inputText = await questionAsync("Enter text to convert to speech: ");

    // TTS
    console.log("Generating TTS audio...");
    const ttsFile = await textToSpeech(inputText);
    console.log(`TTS audio saved as: ${ttsFile}`);

    // feed TTS into STT
    console.log("Transcribing TTS audio with STT...");
    const transcribedText = await speechToText(ttsFile);
    console.log("Transcribed text:", transcribedText);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    rl.close();
  }
}

// run test
main();