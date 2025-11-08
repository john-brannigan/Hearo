import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as Speech from 'expo-speech';

const ELEVENLABS_API_KEY = "sk_87f129a69d2948f1960f3724281e658cb6fd92facf603f27";
const VOICE_ID = "iP95p4xoKVk53GoZ742B";

export async function textToSpeech(text: string): Promise<void> {
  try {
    console.log('Attempting ElevenLabs TTS...');
    await textToSpeechElevenLabs(text);
    console.log('ElevenLabs TTS succeeded');
  } catch (error) {
    console.warn('ElevenLabs TTS failed, falling back to native TTS:', error);
    // Fallback to device's native text-to-speech
    await textToSpeechNative(text);
    console.log('Native TTS succeeded');
  }
}

// ElevenLabs implementation
async function textToSpeechElevenLabs(text: string): Promise<void> {
  // Configure audio mode
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
    staysActiveInBackground: false,
    shouldDuckAndroid: true,
  });

  console.log('Calling ElevenLabs API...');
  // Call ElevenLabs API
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
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.5,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorBody = await response.text();
    console.error('ElevenLabs API error response:', errorBody);
    throw new Error(`API request failed: ${response.status} - ${errorBody}`);
  }

  console.log('ElevenLabs API response received, processing audio...');

  // Get the audio as array buffer
  const arrayBuffer = await response.arrayBuffer();
  const base64Audio = btoa(
    String.fromCharCode(...new Uint8Array(arrayBuffer))
  );

  // Save to temporary file
  const fileUri = `${(FileSystem as any).documentDirectory}temp-audio-${Date.now()}.mp3`;
  console.log('Saving audio to:', fileUri);
  await FileSystem.writeAsStringAsync(fileUri, base64Audio, {
    encoding: 'base64' as any,
  });

  console.log('Playing audio...');
  // Play the audio
  const { sound } = await Audio.Sound.createAsync(
    { uri: fileUri },
    { shouldPlay: true }
  );

  // Wait for playback to finish
  await new Promise<void>((resolve) => {
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        console.log('Audio playback finished');
        resolve();
      }
    });
  });

  // Cleanup
  await sound.unloadAsync();
  await FileSystem.deleteAsync(fileUri, { idempotent: true });
  console.log('Cleanup completed');
}

// Native TTS fallback
async function textToSpeechNative(text: string): Promise<void> {
  return new Promise((resolve, reject) => {
    Speech.speak(text, {
      language: 'en-US',
      pitch: 1.0,
      rate: 0.9,
      onDone: () => {
        console.log('Native TTS finished');
        resolve();
      },
      onError: (error) => {
        console.error('Native TTS error:', error);
        reject(error);
      },
    });
  });
}