import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView, Alert } from 'react-native';
import { textToSpeech } from '@/components/elevenlabs/tts';
import { startRecording, stopRecording, useSpeechRecognitionEvent } from '@/components/elevenlabs/stt-native';

export default function TTSScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const photoUri = params.photoUri as string;
  
  const [question, setQuestion] = useState<string>('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedText, setRecordedText] = useState<string>('');
  const [interimText, setInterimText] = useState<string>('');

  console.log('TTS Screen loaded with photo:', photoUri);

  // Listen for speech recognition events
  useSpeechRecognitionEvent("result", (event) => {
    console.log("Speech result:", event.results);
    const transcript = event.results[0]?.transcript || "";
    
    if (event.isFinal) {
      console.log("Final transcript:", transcript);
      setRecordedText(transcript);
      setInterimText('');
      setIsRecording(false);
    } else {
      setInterimText(transcript);
    }
  });

  useSpeechRecognitionEvent("error", (event) => {
    console.error("Speech recognition error:", event.error);
    Alert.alert("Error", `Recognition failed: ${event.error}`);
    setIsRecording(false);
    setInterimText('');
  });

  useSpeechRecognitionEvent("end", () => {
    console.log("Speech recognition ended");
    setIsRecording(false);
  });

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
      Alert.alert('Error', 'Failed to speak the question. Check console for details.');
    } finally {
      setIsSpeaking(false);
    }
  };

  // Handle recording toggle
  const toggleRecording = async () => {
    if (isRecording) {
      await stopRecording();
      setIsRecording(false);
    } else {
      setRecordedText('');
      setInterimText('');
      await startRecording(
        (result) => {
          console.log("Recording result:", result);
        },
        (error) => {
          Alert.alert("Error", error);
          setIsRecording(false);
        }
      );
      setIsRecording(true);
    }
  };

  // Speak the recorded text
  const speakRecordedText = async () => {
    if (!recordedText) {
      Alert.alert("No Text", "Please record something first!");
      return;
    }
    
    setIsSpeaking(true);
    try {
      await textToSpeech(recordedText);
    } catch (error) {
      console.error('Error speaking recorded text:', error);
      Alert.alert('Error', 'Failed to speak the recorded text.');
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
              onPress={toggleRecording}>
              <Text style={styles.recordButtonText}>
                {isRecording ? '⏹️ Stop Recording' : '🎤 Start Recording'}
              </Text>
            </TouchableOpacity>

            {/* Show interim results while recording */}
            {interimText && (
              <View style={styles.interimContainer}>
                <Text style={styles.interimLabel}>Listening...</Text>
                <Text style={styles.interimText}>{interimText}</Text>
              </View>
            )}

            {/* Show final recorded text */}
            {recordedText && (
              <View style={styles.recordedContainer}>
                <View style={styles.recordedHeader}>
                  <Text style={styles.recordedLabel}>You said:</Text>
                  <TouchableOpacity onPress={speakRecordedText} disabled={isSpeaking}>
                    <Text style={styles.playbackButton}>
                      {isSpeaking ? '🔊' : '▶️ Play back'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <Text style={styles.recordedText}>{recordedText}</Text>
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
  interimContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  interimLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    marginBottom: 4,
  },
  interimText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
  },
  recordedContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#e8f5e9',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#34c759',
  },
  recordedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  recordedLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2e7d32',
  },
  playbackButton: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  recordedText: {
    fontSize: 16,
    color: '#1b5e20',
    fontWeight: '500',
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