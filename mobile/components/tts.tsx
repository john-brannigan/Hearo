// filepath: /Users/shrikarkolla/Documents/GitHub/AIATL2025/mobile/app/tts.tsx
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { textToSpeech } from '@/components/elevenlabs/tts';
import { startRecording, stopRecording, requestPermissions } from '@/components/elevenlabs/stt-native';
import sendImageWithPrompt from '@/components/google-image-understanding/image-request';
import * as FileSystem from 'expo-file-system';

const ELEVEN_API_KEY = 'REPLACE_WITH_ELEVEN_LABS_API_KEY';
const ELEVEN_STT_URL = 'https://api.elevenlabs.io/v1/speech-to-text'; // adjust if ElevenLabs endpoint differs
const GOOGLE_API_KEY = 'AQ.Ab8RN6I3DO0ruPa-kJSanXmqsqs21VILyxCiybr59x-OR_P8FQ';
const GOOGLE_STORAGE_BUCKET = 'imagesformyapp';

export default function TTSScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const photoUri = params.photoUri as string;
  
  const [question, setQuestion] = useState<string>('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedAudioUri, setRecordedAudioUri] = useState<string>('');
  const [transcribedText, setTranscribedText] = useState<string>('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [imageAnswer, setImageAnswer] = useState<string>('');
  const [isGeneratingAnswer, setIsGeneratingAnswer] = useState(false);

  console.log('TTS Screen loaded with photo:', photoUri);

  // Generate a question based on the photo
  const generateQuestion = () => {
    const questions = [
      "What do you see in this image?",
      "Can you describe what's happening in this photo?",
      "What objects can you identify in this picture?",
      "Tell me about the scene in this image.",
      "What's the main subject of this photograph?",
      "What colors are prominent in this image?",
      "Can you describe the composition of this photo?"
    ];
    
    const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
    console.log('Generated question:', randomQuestion);
    setQuestion(randomQuestion);
  };

  // Speak the question using TTS (Eleven Labs)
  const speakQuestion = async () => {
    if (!question || isSpeaking) return;
    
    setIsSpeaking(true);
    console.log('Starting TTS for:', question);
    
    try {
      await textToSpeech(question);
      console.log('TTS completed successfully');
    } catch (error) {
      console.error('Error speaking:', error);
      Alert.alert('Error', 'Failed to speak the question.');
    } finally {
      setIsSpeaking(false);
    }
  };

  // Upload image to Google Cloud Storage and return the public URL
  const uploadImageToGCS = async (localUri: string) => {
    if (!localUri) throw new Error('No local image URI provided');

    const fileName = `uploads/${Date.now()}_${localUri.split('/').pop()}`;
    const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${GOOGLE_STORAGE_BUCKET}/o?uploadType=media&name=${encodeURIComponent(fileName)}&key=${GOOGLE_API_KEY}`;

    try {
      console.log('Fetching local image to upload:', localUri);
      const fileResponse = await fetch(localUri);
      const blob = await fileResponse.blob();
      console.log('Uploading to GCS as:', fileName);

      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Type': blob.type || 'application/octet-stream',
        },
        body: blob,
      });

      const text = await res.text();
      let data: any = null;
      try {
        data = text ? JSON.parse(text) : null;
      } catch {
        data = null;
      }

      if (!res.ok) {
        throw new Error(`GCS upload failed: ${res.status} - ${text}`);
      }

      // Construct public URL. Depending on bucket policy, this may not be public.
      const publicUrl = `https://storage.googleapis.com/${GOOGLE_STORAGE_BUCKET}/${encodeURIComponent(fileName)}`;
      console.log('Image uploaded to GCS URL:', publicUrl, 'upload response:', data);
      return publicUrl;
    } catch (err) {
      console.error('Error uploading image to GCS:', err);
      throw err;
    }
  };

  // Transcribe audio using Eleven Labs STT then upload image to GCS and call prompt API
  const transcribeAudio = async (audioUri: string) => {
    setIsTranscribing(true);
    setTranscribedText('');
    setImageAnswer('');

    try {
      console.log('Checking audio file exists at:', audioUri);
      const info = await FileSystem.getInfoAsync(audioUri);
      console.log('File info:', info);

      if (!info.exists) {
        throw new Error(`Audio file not found: ${audioUri}`);
      }

      console.log('Preparing form data for Eleven Labs STT...');
      const formData = new FormData();
      // React Native / Expo: append a file object with uri, name, type
      formData.append('file', {
        uri: audioUri,
        name: 'recording.m4a',
        type: 'audio/m4a',
      } as any);

      console.log('Sending audio to Eleven Labs STT...');
      const sttResponse = await fetch(ELEVEN_STT_URL, {
        method: 'POST',
        headers: {
          'xi-api-key': ELEVEN_API_KEY,
          // Note: Do NOT set Content-Type here; fetch will set the multipart boundary.
          Accept: 'application/json',
        },
        body: formData as any,
      });

      const sttRaw = await sttResponse.text();
      let sttData: any = null;
      try {
        sttData = sttRaw ? JSON.parse(sttRaw) : null;
      } catch (e) {
        console.warn('Eleven Labs STT response not JSON:', sttRaw);
      }

      console.log('Eleven Labs STT response status:', sttResponse.status, 'body:', sttData ?? sttRaw);
      if (!sttResponse.ok) {
        const body = typeof sttData === 'object' ? JSON.stringify(sttData) : sttRaw;
        throw new Error(`Eleven Labs STT failed: ${sttResponse.status} - ${body}`);
      }

      // Extract transcription from common properties
      const transcript =
        (sttData && (sttData.text || sttData.transcript || sttData?.results?.[0]?.alternatives?.[0]?.transcript)) ||
        (typeof sttData === 'string' ? sttData : '') ||
        '';

      if (!transcript) {
        console.warn('No transcript returned from STT:', sttData);
        setTranscribedText('No speech detected');
        return;
      }

      setTranscribedText(transcript);
      console.log('Transcribed text:', transcript);

      // Upload image to Google Cloud and call sendImageWithPrompt with the GCS URL
      try {
        if (!photoUri) {
          console.warn('No photoUri available for image prompt');
          return;
        }
        setIsGeneratingAnswer(true);
        const gcsUrl = await uploadImageToGCS(photoUri);
        const answer = await sendImageWithPrompt(gcsUrl, transcript);
        setImageAnswer(answer);
        // Speak the model's answer via Eleven Labs TTS
        await textToSpeech(answer);
      } catch (err) {
        console.error('Error generating image answer or uploading image:', err);
        Alert.alert('Error', 'Failed to generate image summary or upload image.');
      } finally {
        setIsGeneratingAnswer(false);
      }
    } catch (error) {
      console.error('Transcription error:', error);
      Alert.alert('Error', 'Failed to transcribe audio. Please try again.');
      setTranscribedText('Transcription failed');
    } finally {
      setIsTranscribing(false);
    }
  };

  // Handle recording toggle
  const toggleRecording = async () => {
    if (isRecording) {
      const uri = await stopRecording();
      setIsRecording(false);
      if (uri) {
        setRecordedAudioUri(uri);
        console.log('Audio recorded, starting transcription...');
        await transcribeAudio(uri);
      }
    } else {
      setRecordedAudioUri('');
      setTranscribedText('');
      const hasPermission = await requestPermissions();
      if (!hasPermission) {
        Alert.alert('Permission Required', 'Microphone access is needed.');
        return;
      }
      await startRecording(
        () => {},
        (error) => {
          Alert.alert("Error", error);
          setIsRecording(false);
        }
      );
      setIsRecording(true);
    }
  };

  // Speak the transcribed text
  const speakTranscribedText = async () => {
    if (!transcribedText) {
      Alert.alert("No Text", "Please record something first!");
      return;
    }
    
    setIsSpeaking(true);
    try {
      await textToSpeech(transcribedText);
    } catch (error) {
      console.error('Error speaking transcribed text:', error);
      Alert.alert('Error', 'Failed to speak the text.');
    } finally {
      setIsSpeaking(false);
    }
  };

  useEffect(() => {
    console.log('Generating initial question');
    generateQuestion();
  }, []);

  useEffect(() => {
    if (question) {
      console.log('Auto-speaking question');
      speakQuestion();
    }
  }, [question]);

  return (
    <>
      <Stack.Screen options={{ title: 'Image Analysis', headerShown: true }} />
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          {/* Display the captured image */}
          {photoUri ? (
            <View style={styles.imageContainer}>
              <Image source={{ uri: photoUri }} style={styles.image} />
            </View>
          ) : (
            <View style={styles.imageContainer}>
              <Text style={styles.errorText}>No photo provided</Text>
            </View>
          )}

          {/* Display the question */}
          <View style={styles.questionContainer}>
            <Text style={styles.questionLabel}>Question:</Text>
            <Text style={styles.questionText}>{question || 'Generating question...'}</Text>
          </View>

          {/* Audio Controls */}
          {question && (
            <View style={styles.ttsContainer}>
              <Text style={styles.ttsLabel}>Audio:</Text>
              <TouchableOpacity 
                style={[styles.speakButton, isSpeaking && styles.speakButtonActive]}
                onPress={speakQuestion}
                disabled={isSpeaking}>
                <Text style={styles.speakButtonText}>
                  {isSpeaking ? '🔊 Speaking...' : '🔊 Speak Question'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Recording Section */}
          <View style={styles.recordingContainer}>
            <Text style={styles.recordingLabel}>Voice Input:</Text>
            
            <TouchableOpacity 
              style={[styles.recordButton, isRecording && styles.recordButtonActive]}
              onPress={toggleRecording}
              disabled={isTranscribing}>
              <Text style={styles.recordButtonText}>
                {isRecording ? '⏹️ Stop Recording' : '🎤 Start Recording'}
              </Text>
            </TouchableOpacity>

            {/* Show transcribing indicator */}
            {isTranscribing && (
              <View style={styles.transcribingContainer}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.transcribingText}>Transcribing audio...</Text>
              </View>
            )}

            {/* Show transcribed text */}
            {transcribedText && !isTranscribing && (
              <View style={styles.transcribedContainer}>
                <View style={styles.transcribedHeader}>
                  <Text style={styles.transcribedLabel}>You said:</Text>
                  <TouchableOpacity onPress={speakTranscribedText} disabled={isSpeaking}>
                    <Text style={styles.playbackButton}>
                      {isSpeaking ? '🔊' : '▶️ Play back'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.transcribedText}>{transcribedText}</Text>
              </View>
            )}

            {/* Show audio file path (for debugging) */}
            {recordedAudioUri && !isTranscribing && (
              <View style={styles.debugContainer}>
                <Text style={styles.debugLabel}>Audio file:</Text>
                <Text style={styles.debugText} numberOfLines={1}>{recordedAudioUri}</Text>
              </View>
            )}
          </View>

          {/* Action buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.regenerateButton} 
              onPress={generateQuestion}>
              <Text style={styles.buttonText}>🔄 New Question</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.backButton} 
              onPress={() => router.back()}>
              <Text style={styles.buttonText}>📷 Take Another Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.homeButton} 
              onPress={() => router.push('/(tabs)')}>
              <Text style={styles.buttonText}>🏠 Go Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  imageContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 10,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minHeight: 300,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: 300,
    resizeMode: 'contain',
    borderRadius: 8,
  },
  errorText: {
    color: '#666',
    fontSize: 16,
  },
  questionContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  questionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  questionText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#333',
    lineHeight: 26,
  },
  ttsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  ttsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  speakButton: {
    backgroundColor: '#5E17EB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  speakButtonActive: {
    backgroundColor: '#4B12BB',
    opacity: 0.7,
  },
  speakButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  recordingContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  recordingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  recordButton: {
    backgroundColor: '#ff3b30',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  recordButtonActive: {
    backgroundColor: '#ff1507',
  },
  recordButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  transcribingContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  transcribingText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  transcribedContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#34c759',
  },
  transcribedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  transcribedLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2e7d32',
  },
  playbackButton: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  transcribedText: {
    fontSize: 16,
    color: '#1b5e20',
    fontWeight: '500',
    lineHeight: 24,
  },
  debugContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
  },
  debugLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 4,
  },
  debugText: {
    fontSize: 11,
    color: '#856404',
  },
  buttonContainer: {
    gap: 12,
  },
  regenerateButton: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  backButton: {
    backgroundColor: '#34c759',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  homeButton: {
    backgroundColor: '#666',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});