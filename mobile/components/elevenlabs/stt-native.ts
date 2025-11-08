import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
} from "expo-speech-recognition";

export interface SpeechRecognitionResult {
  transcript: string;
  isFinal: boolean;
}

export async function requestPermissions(): Promise<boolean> {
  const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
  return result.granted;
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

    console.log("Starting speech recognition...");
    
    await ExpoSpeechRecognitionModule.start({
      lang: "en-US",
      interimResults: true,
      maxAlternatives: 1,
      continuous: false,
      requiresOnDeviceRecognition: false,
    });

  } catch (error) {
    console.error("Error starting recording:", error);
    onError(String(error));
  }
}

export async function stopRecording(): Promise<void> {
  try {
    console.log("Stopping speech recognition...");
    await ExpoSpeechRecognitionModule.stop();
  } catch (error) {
    console.error("Error stopping recording:", error);
  }
}

// Export the hook for use in components
export { useSpeechRecognitionEvent };