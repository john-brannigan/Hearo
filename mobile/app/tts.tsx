import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { textToSpeech } from '@/components/elevenlabs/tts';
import { startRecording, stopRecording, requestPermissions, transcribeAudio } from '@/components/elevenlabs/stt-native';
import sendImageWithPrompt from '@/components/google-image-understanding/image-request';
import { uploadImageToBackend } from '@/components/google-image-understanding/upload-image';

export default function TTSScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  // @ts-ignore - route.params typing varies
  const photoUri = (route.params && (route.params as any).photoUri) as string;
  
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcribedText, setTranscribedText] = useState<string>('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [aiResponse, setAiResponse] = useState<string>('');
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);

  console.log('TTS Screen loaded with photo:', photoUri);

  const analyzeImageWithAI = async () => {
    if (!photoUri) {
      Alert.alert('Error', 'No image to analyze');
      return;
    }

    setIsAnalyzingImage(true);
    setAiResponse('');
    console.log('Its running idk');
    

    try {
      console.log('Uploading image to Google Cloud Storage...');
      
      // Upload image to backend, which uploads to GCS and returns gs:// URI
      const uploadResult = await uploadImageToBackend(photoUri);
      const cloudUri = uploadResult.gsUri || uploadResult.httpsUrl;
      
      if (!cloudUri) {
        throw new Error('Failed to get cloud URI from upload');
      }

      console.log('Image uploaded to cloud:', cloudUri);
      console.log('Analyzing image with Google Gemini...');
      
      // Use the gs:// or https:// URI from Google Cloud Storage
      
      const result = await sendImageWithPrompt(cloudUri, transcribedText);
      
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

  // Handle recording toggle
  const toggleRecording = async () => {
    if (isRecording) {
      const uri = await stopRecording();
      setIsRecording(false);
      if (uri) {
        console.log('Audio recorded, starting transcription...');
        setIsTranscribing(true);
        try {
          const text = await transcribeAudio(uri);
          setTranscribedText(text);
        } catch (error) {
          console.error('Transcription failed:', error);
          Alert.alert('Error', 'Failed to transcribe audio.');
          setTranscribedText('Transcription failed');
        } finally {
          setIsTranscribing(false);
        }
      }
    } else {
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

  return (
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

          {/* Recording Section */}
          <View style={styles.recordingContainer}>
            <Text style={styles.recordingLabel}>Voice Input:</Text>
            <Text style={styles.hintText}>
              Try saying: "What is in front of me?" or "Describe this image"
            </Text>
            <Text style={styles.warningText}>
              📝 Using mock transcription for testing. Image uploads to Google Cloud Storage.
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
                <Text style={styles.processingText}>Uploading to cloud & analyzing...</Text>
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
              style={styles.backButton} 
              onPress={() => navigation.goBack()}>
              <Text style={styles.buttonText}>📷 Take Another Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.homeButton} 
              onPress={() => navigation.navigate('Home' as any)}>
              <Text style={styles.buttonText}>🏠 Go Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
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
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  hintText: {
    fontSize: 12,
    color: '#007AFF',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  warningText: {
    fontSize: 11,
    color: '#ff9500',
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
