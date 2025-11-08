import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { textToSpeech } from '@/components/elevenlabs/tts';
import { startRecording, stopRecording, requestPermissions } from '@/components/elevenlabs/stt-native';
import sendImageWithPrompt from '@/components/google-image-understanding/image-request';
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
  const [aiResponse, setAiResponse] = useState<string>('');
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);

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

  // Check if the transcribed text is asking about the image
  const isAskingAboutImage = (text: string): boolean => {
    const imageQuestions = [
      'what is in front of me',
      'what do you see',
      'what is this',
      'describe this',
      'what am i looking at',
      'tell me about this',
      'what is in this image',
      'what is in the picture',
      'what is in the photo',
      'analyze this',
      'whats in front of me',
      'whats this',
      'describe the image',
      'tell me what you see'
    ];
    
    const lowerText = text.toLowerCase();
    return imageQuestions.some(q => lowerText.includes(q));
  };

  // Analyze image using Google Cloud Vision API via google-image-understanding
  const analyzeImageWithAI = async () => {
    if (!photoUri) {
      Alert.alert('Error', 'No image to analyze');
      return;
    }

    setIsAnalyzingImage(true);
    setAiResponse('');

    try {
      console.log('Analyzing image with Google Gemini...');
      console.log('Image URI:', photoUri);
      
      // Use the sendImageWithPrompt function directly with the local file:// URI
      const prompt = "Describe what you see in this image in detail. What objects, people, or scenes are present? Be descriptive and helpful.";
      
      const result = await sendImageWithPrompt(photoUri, prompt);
      
      console.log('AI Analysis result:', result);
      setAiResponse(result);

      // Speak the AI response
      setIsSpeaking(true);
      await textToSpeech(result);
      setIsSpeaking(false);

    } catch (error) {
      console.error('Image analysis error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      Alert.alert('Error', `Failed to analyze image: ${errorMessage}`);
      setAiResponse(`Analysis failed: ${errorMessage}`);
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  // Mock transcribe for testing (replace with real backend call later)
  const transcribeAudio = async (audioUri: string) => {
    setIsTranscribing(true);
    setTranscribedText('');
    setImageAnswer('');
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
      Alert.alert('Error', 'Failed to transcribe audio.');
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
      setAiResponse('');
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

  // Speak the AI response
  const speakAIResponse = async () => {
    if (!aiResponse) {
      Alert.alert("No Response", "No AI response available!");
      return;
    }
    
    setIsSpeaking(true);
    try {
      await textToSpeech(aiResponse);
    } catch (error) {
      console.error('Error speaking AI response:', error);
      Alert.alert('Error', 'Failed to speak the response.');
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
            <Text style={styles.hintText}>
              Try saying: "What is in front of me?" or "Describe this image"
            </Text>
            
            <TouchableOpacity 
              style={[styles.recordButton, isRecording && styles.recordButtonActive]}
              onPress={toggleRecording}
              disabled={isTranscribing || isAnalyzingImage}>
              <Text style={styles.recordButtonText}>
                {isRecording ? '⏹️ Stop Recording' : '🎤 Start Recording'}
              </Text>
            </TouchableOpacity>

            {/* Show transcribing indicator */}
            {isTranscribing && (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.processingText}>Transcribing audio...</Text>
              </View>
            )}

            {/* Show analyzing indicator */}
            {isAnalyzingImage && (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="small" color="#5E17EB" />
                <Text style={styles.processingText}>Analyzing image with AI...</Text>
              </View>
            )}

            {/* Show transcribed text */}
            {transcribedText && !isTranscribing && !isAnalyzingImage && (
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

            {/* Show AI analysis result */}
            {aiResponse && (
              <View style={styles.aiResponseContainer}>
                <View style={styles.aiResponseHeader}>
                  <Text style={styles.aiResponseLabel}>🤖 AI Analysis:</Text>
                  <TouchableOpacity onPress={speakAIResponse} disabled={isSpeaking}>
                    <Text style={styles.playbackButton}>
                      {isSpeaking ? '🔊' : '▶️ Play back'}
                    </Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.aiResponseScroll} nestedScrollEnabled>
                  <Text style={styles.aiResponseText}>{aiResponse}</Text>
                </ScrollView>
              </View>
            )}
          </View>

          {/* Manual Analysis Button */}
          <View style={styles.manualAnalysisContainer}>
            <TouchableOpacity 
              style={styles.analyzeButton}
              onPress={analyzeImageWithAI}
              disabled={isAnalyzingImage || isSpeaking}>
              <Text style={styles.analyzeButtonText}>
                {isAnalyzingImage ? '🔄 Analyzing...' : '🔍 Analyze Image Now'}
              </Text>
            </TouchableOpacity>
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

// ...existing styles...
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
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  hintText: {
    fontSize: 12,
    color: '#007AFF',
    marginBottom: 12,
    fontStyle: 'italic',
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
  processingContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  processingText: {
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
  aiResponseContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#e3f2fd',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#5E17EB',
    maxHeight: 300,
  },
  aiResponseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  aiResponseLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1565c0',
  },
  aiResponseScroll: {
    maxHeight: 200,
  },
  aiResponseText: {
    fontSize: 16,
    color: '#0d47a1',
    fontWeight: '500',
    lineHeight: 24,
  },
  manualAnalysisContainer: {
    marginBottom: 20,
  },
  analyzeButton: {
    backgroundColor: '#5E17EB',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  analyzeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
function setImageAnswer(arg0: string) {
    // No-op: This functionality is handled by aiResponse state
    // Originally intended to clear image analysis results
}
