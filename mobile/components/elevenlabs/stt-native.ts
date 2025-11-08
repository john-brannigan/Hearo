import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import { ELEVENLABS_API_KEY } from '@env';

export interface SpeechRecognitionResult {
  transcript: string;
  isFinal: boolean;
}

let recording: Audio.Recording | null = null;

export async function requestPermissions(): Promise<boolean> {
  const { status } = await Audio.requestPermissionsAsync();
  return status === 'granted';
}

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
    
    console.log("Recording saved to:", uri);
    return uri;

  } catch (error) {
    console.error("Error stopping recording:", error);
    return null;
  }
}

export async function transcribeAudio(audioUri: string): Promise<string> {
  try {
    console.log("Reading audio file...");
    const audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
      encoding: 'base64',
    });

    const audioData = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0));
    const blob = new Blob([audioData], { type: 'audio/m4a' });

    const formData = new FormData();
    formData.append('file', blob, 'audio.m4a');
    formData.append('model_id', 'scribe_v1');

    console.log("Calling ElevenLabs STT API...");
    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
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

export function useSpeechRecognitionEvent(event: string, callback: (data: any) => void) {
  console.log("Speech recognition event listener:", event);
}