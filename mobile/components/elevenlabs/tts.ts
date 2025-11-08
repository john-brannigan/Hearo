import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/next';
import * as Speech from 'expo-speech';
import { ELEVENLABS_API_KEY } from '@env';

// Get the cache directory path
const getCacheDirectory = () => {
  return FileSystem.Paths.cache + '/';
};

const VOICE_ID = "iP95p4xoKVk53GoZ742B";

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
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_monolingual_v1',
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
  
  console.log('Saving audio to:', fileUri);

  console.log('Playing audio...');
  const { sound } = await Audio.Sound.createAsync(
    { uri: fileUri },
    { shouldPlay: true }
  );

  await new Promise<void>((resolve) => {
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) resolve();
    });
  });

  await sound.unloadAsync();
  console.log('Audio saved at:', fileUri);
  return fileUri;
}

// Native fallback
async function textToSpeechNative(text: string): Promise<string> {
  await new Promise<void>((resolve, reject) => {
    Speech.speak(text, {
      language: 'en-US',
      pitch: 1.0,
      rate: 0.9,
      onDone: resolve,
      onError: reject,
    });
  });
  return 'native-tts-dummy-path.mp3';
}