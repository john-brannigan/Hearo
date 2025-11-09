// stt-native.ts
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';

export interface SpeechRecognitionResult {
  transcript: string;
  isFinal: boolean;
}

let recording: Audio.Recording | null = null;

// Request microphone permission
export async function requestPermissions(): Promise<boolean> {
  const { status } = await Audio.requestPermissionsAsync();
  return status === 'granted';
}

// Start recording
export async function startRecording(
  onResult: (result: SpeechRecognitionResult) => void,
  onError: (error: string) => void
): Promise<void> {
  try {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      onError("Microphone permission not granted");
      return;
    }

    console.log("Starting audio recording...");

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    });

    recording = new Audio.Recording();
    await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
    await recording.startAsync();

    console.log("Recording started");
  } catch (error) {
    console.error("Error starting recording:", error);
    onError(String(error));
  }
}

// Stop recording
export async function stopRecording(): Promise<string | null> {
  try {
    if (!recording) {
      console.log("No recording to stop");
      return null;
    }

    console.log("Stopping recording...");
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    recording = null;

    // Reset audio mode to normal playback after recording
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    });

    console.log("Recording saved to:", uri);
    return uri;
  } catch (error) {
    console.error("Error stopping recording:", error);
    return null;
  }
}

// Transcribe audio using ElevenLabs STT
export async function transcribeAudio(audioUri: string): Promise<string> {
  try {
    console.log("Calling ElevenLabs STT API...");

    const apiKey = process.env.EXPO_PUBLIC_ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error('ElevenLabs API key is not set');

    const formData = new FormData();
    // Attach file using URI (no Blob needed)
    formData.append('file', {
      uri: audioUri,
      type: 'audio/m4a',
      name: 'audio.m4a',
    } as any);
    formData.append('model_id', 'scribe_v1');
    formData.append('language', 'en'); // force English

    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        // Do not set 'Content-Type', fetch handles multipart automatically
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`STT request failed: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log("Transcription successful:", data.text);
    return data.text;
  } catch (error) {
    console.error("Transcription error:", error);
    throw error;
  }
}

// Optional: helper to handle speech recognition events
export function useSpeechRecognitionEvent(event: string, callback: (data: any) => void) {
  console.log("Speech recognition event listener:", event);
}