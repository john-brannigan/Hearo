import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/next';
import * as Speech from 'expo-speech';

const ELEVENLABS_MODEL = "eleven_turbo_v2";

const VOICE_ID = "iP95p4xoKVk53GoZ742B";

const getCacheDirectory = () => {
  return FileSystem.Paths.cache + '/';
};

export async function textToSpeech(text: string): Promise<string> {
  try {
    console.log('Attempting ElevenLabs TTS...');
    const filePath = await textToSpeechElevenLabs(text);
    console.log('ElevenLabs TTS succeeded');
    return filePath;
  } catch (error) {
    console.warn('ElevenLabs TTS failed, falling back to native TTS:', error);
    const filePath = await textToSpeechNative(text);
    console.log('Native TTS succeeded');
    return filePath;
  }
}

async function textToSpeechElevenLabs(text: string): Promise<string> {
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
  });

  console.log('Calling ElevenLabs API...');
  if (!process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY) {
    throw new Error('Missing ELEVENLABS_API_KEY environment variable');
  }
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: ELEVENLABS_MODEL,
        voice_settings: { stability: 0.5, similarity_boost: 0.5 },
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('ElevenLabs API error response:', errorBody);
    throw new Error(`TTS request failed: ${response.status} - ${errorBody}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const audioBytes = new Uint8Array(arrayBuffer);

  // Save to temporary file
  const fileName = `temp-audio-${Date.now()}.mp3`;
  const fileUri = getCacheDirectory() + fileName;

  const file = new FileSystem.File(fileUri);
  await file.write(audioBytes);

  console.log('Audio file saved at:', fileUri);
  return fileUri;
}

// Fallback native text-to-speech using Expo Speech
async function textToSpeechNative(text: string): Promise<string> {
  return new Promise((resolve) => {
    Speech.speak(text, {
      onDone: () => resolve('native'),
      language: 'en',
    });
  });
}
