import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { textToSpeech } from '@/components/elevenlabs/tts';
import { startRecording, stopRecording, requestPermissions } from '@/components/elevenlabs/stt-native';
import * as FileSystem from 'expo-file-system';

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

  // Speak the question using TTS
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

  // Transcribe audio using Google Cloud Speech-to-Text
  const transcribeAudio = async (audioUri: string) => {
    setIsTranscribing(true);
    setTranscribedText('');
    
    try {
      console.log('Reading audio file:', audioUri);
      
      // Read the audio file as base64
       const audioBase64 = await FileSystem.readAsStringAsync(audioUri, {
        encoding: 'base64' as any, // Changed from FileSystem.EncodingType.Base64
      });

      console.log('Sending to Google Cloud Speech-to-Text API...');
      
      // Call Google Cloud Speech-to-Text API
      const response = await fetch(
        'https://speech.googleapis.com/v1/speech:recognize?key=sk_87f129a69d2948f1960f3724281e658cb6fd92facf603f27',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            config: {
              encoding: 'LINEAR16',
              sampleRateHertz: 44100,
              languageCode: 'en-US',
            },
            audio: {
              content: audioBase64,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('Transcription response:', data);

      if (data.results && data.results.length > 0) {
        const transcript = data.results[0].alternatives[0].transcript;
        setTranscribedText(transcript);
        console.log('Transcribed text:', transcript);
      } else {
        setTranscribedText('No speech detected');
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