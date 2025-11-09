import { useNavigation, useRoute } from '@react-navigation/native';
import React, { useState, useRef, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView, Alert, ActivityIndicator, PanResponder, GestureResponderEvent } from 'react-native';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
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
  const [ttsSpeed, setTtsSpeed] = useState<number>(1.0);
  const sliderWidth = useRef<number>(0);
  const [sliderReady, setSliderReady] = useState(false);
  const currentSpeed = useRef<number>(1.0);
  const sliderX = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  console.log('TTS Screen loaded with photo:', photoUri);

  const analyzeImageWithAI = async (promptOverride?: string) => {
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
      
  const promptToUse = promptOverride ?? transcribedText;
  const result = await sendImageWithPrompt(cloudUri, promptToUse);
      
      console.log('AI Analysis result:', result);
      setAiResponse(result);

  // Speak the AI response
  setIsSpeaking(true);
  await textToSpeech(result, ttsSpeed);
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

          // Immediately speak the transcribed text when available
          if (text && text.length > 0) {
            setIsSpeaking(true);
            try {
              await textToSpeech(text, ttsSpeed);
            } catch (err) {
              console.error('Error speaking transcribed text after recording:', err);
            } finally {
              setIsSpeaking(false);
            }

            // After speaking finishes, automatically analyze the image using the transcribed text as the prompt
            try {
              await analyzeImageWithAI(text);
            } catch (err) {
              console.error('Automatic image analysis after speech failed:', err);
            }
          }
        } catch (error) {
          console.error('Transcription failed:', error);
          Alert.alert('Error', 'Failed to transcribe audio.');
          setTranscribedText('Transcription failed');
          // Speak the error so the user hears what went wrong
          try {
            const msg = error instanceof Error ? error.message : String(error);
            setIsSpeaking(true);
            await textToSpeech(`Transcription failed`, ttsSpeed);
          } catch (speakErr) {
            console.error('Error speaking transcription failure:', speakErr);
          } finally {
            setIsSpeaking(false);
          }
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
      await textToSpeech(transcribedText, ttsSpeed);
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
      await textToSpeech(aiResponse, ttsSpeed);
    } catch (error) {
      console.error('Error speaking AI response:', error);
      Alert.alert('Error', 'Failed to speak the response.');
    } finally {
      setIsSpeaking(false);
    }
  };

  // Handle slider value complete - announce the speed
  const handleSliderComplete = async (value: number) => {
    try {
      await Haptics.selectionAsync();
    } catch (e) {}
    
    const speedPercent = Math.round(value * 100);
    let announcement: string;
    
    // Check if at min or max
    if (value <= 0.7) {
      announcement = `Speed set to the minimum speed of ${speedPercent} percent`;
    } else if (value >= 1.2) {
      announcement = `Speed set to the maximum speed of ${speedPercent} percent`;
    } else {
      announcement = `Speed set to ${speedPercent} percent`;
    }
    
    setIsSpeaking(true);
    try {
      await textToSpeech(announcement, value);
    } catch (error) {
      console.error('Error announcing speed:', error);
    } finally {
      setIsSpeaking(false);
    }
  };

  // Update slider value from touch position
  const updateSliderValue = useCallback((evt: GestureResponderEvent) => {
    if (!sliderWidth.current || sliderX.current === null) return;
    
    // Use pageX to get absolute position, subtract slider's absolute X position
    // The thumb is 60px wide and centered with translateX(-30), so touch position is already at center
    const touch = evt.nativeEvent.pageX - sliderX.current;
    const percentage = Math.max(0, Math.min(1, touch / sliderWidth.current));
    const newValue = 0.7 + (percentage * (1.2 - 0.7));
    const roundedValue = Math.round(newValue / 0.05) * 0.05;
    const clampedValue = Math.max(0.7, Math.min(1.2, roundedValue));
    currentSpeed.current = clampedValue;
    setTtsSpeed(clampedValue);
  }, []);

  // Handle slider release
  const handleSliderRelease = useCallback(async () => {
    const value = currentSpeed.current;
    try {
      await Haptics.selectionAsync();
    } catch (e) {}
    
    const speedPercent = Math.round(value * 100);
    let announcement: string;
    
    // Check if at min or max
    if (value <= 0.7) {
      announcement = `Speed set to the minimum speed of ${speedPercent} percent`;
    } else if (value >= 1.2) {
      announcement = `Speed set to the maximum speed of ${speedPercent} percent`;
    } else {
      announcement = `Speed set to ${speedPercent} percent`;
    }
    
    setIsSpeaking(true);
    try {
      await textToSpeech(announcement, value);
    } catch (error) {
      console.error('Error announcing speed:', error);
    } finally {
      setIsSpeaking(false);
    }
  }, []);

  // Create PanResponder for draggable slider
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => !isSpeaking,
        onMoveShouldSetPanResponder: () => !isSpeaking,
        onPanResponderGrant: (evt) => {
          if (isSpeaking) return;
          setIsDragging(true);
          updateSliderValue(evt);
        },
        onPanResponderMove: (evt) => {
          if (isSpeaking) return;
          updateSliderValue(evt);
        },
        onPanResponderRelease: () => {
          if (isSpeaking) return;
          setIsDragging(false);
          handleSliderRelease();
        },
      }),
    [isSpeaking, updateSliderValue, handleSliderRelease]
  );

  return (
      <ScrollView style={styles.container}>
        <View style={styles.content}>
          {photoUri ? (
            <TouchableOpacity
              style={styles.imageContainer}
              onPress={async () => {
                try { await Haptics.selectionAsync(); } catch (e) {}
                navigation.goBack();
              }}
            >
              <Image source={{ uri: photoUri }} style={styles.image} />
            </TouchableOpacity>
          ) : (
            <View style={styles.imageContainer}>
              <Text style={styles.errorText}>No photo provided</Text>
            </View>
          )}
          <View style={styles.recordingContainer}>
            
            <View style={styles.squareActionRow}>
              <TouchableOpacity
                style={[styles.squareActionButton, styles.recordButton, isRecording && styles.recordButtonActive]}
                onPress={async () => { try { await Haptics.selectionAsync(); } catch (e) {} ; toggleRecording(); }}
                disabled={isTranscribing || isAnalyzingImage}
              >
                <Text style={styles.squareActionText}>{isRecording ? '⏹️' : '🎤'}</Text>
                <Text style={styles.squareActionLabel}>{isRecording ? 'Stop' : 'Record'}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.squareActionButton, styles.analyzeButton]}
                onPress={async () => { try { await Haptics.selectionAsync(); } catch (e) {} ; analyzeImageWithAI(); }}
                disabled={isAnalyzingImage || isSpeaking}
              >
                <Text style={styles.squareActionText}>🔍</Text>
                <Text style={styles.squareActionLabel}>Analyze</Text>
              </TouchableOpacity>
            </View>

            {/* Speed slider */}
            <View style={styles.speedSliderContainer}>
              {/* Custom thick progress bar slider */}
              <View
                {...panResponder.panHandlers}
                style={[styles.sliderTrack, isSpeaking && { opacity: 0.5 }]}
                onLayout={(event) => {
                  event.currentTarget.measure((x, y, width, height, pageX, pageY) => {
                    if (width > 0) {
                      sliderWidth.current = width;
                      sliderX.current = pageX;
                      setSliderReady(true);
                    }
                  });
                }}
              >
                {sliderWidth.current > 0 && (
                  <>
                    <View style={[styles.sliderProgress, { width: ((ttsSpeed - 0.7) / (1.2 - 0.7)) * sliderWidth.current }]} />
                    <View style={[styles.sliderThumb, { left: ((ttsSpeed - 0.7) / (1.2 - 0.7)) * sliderWidth.current }]} />
                  </>
                )}
              </View>
            </View>

            {isTranscribing && (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="small" color="#007AFF" />
                <Text style={styles.processingText}>Transcribing audio...</Text>
              </View>
            )}

            {isAnalyzingImage && (
              <View style={styles.processingContainer}>
                <ActivityIndicator size="small" color="#5E17EB" />
                <Text style={styles.processingText}>Uploading to cloud & analyzing...</Text>
              </View>
            )}
            {transcribedText && !isTranscribing && !isAnalyzingImage && (
              <TouchableOpacity
                style={styles.transcribedContainer}
                onPress={async () => { try { await Haptics.selectionAsync(); } catch (e) {} ; speakTranscribedText(); }}
                disabled={isSpeaking}
              >
                <View style={styles.transcribedHeader}>
                  <Text style={styles.transcribedLabel}>You said:</Text>
                </View>
                <Text style={styles.transcribedText}>{transcribedText}</Text>
              </TouchableOpacity>
            )}
            {aiResponse && (
              <TouchableOpacity
                onPress={async () => { try { await Haptics.selectionAsync(); } catch (e) {} ; speakAIResponse(); }}
                disabled={isSpeaking}
                style={styles.aiResponseContainer}
              >
                <View style={styles.aiResponseHeader}>
                  <Text style={styles.aiResponseLabel}>🤖 AI Analysis:</Text>
                </View>
                <ScrollView style={styles.aiResponseScroll} nestedScrollEnabled>
                  <Text style={styles.aiResponseText}>{aiResponse}</Text>
                </ScrollView>
              </TouchableOpacity>
            )}
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
  /* analyzeButtonText removed (unused) */
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
  /* Square action buttons row */
  squareActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 12,
  },
  squareActionButton: {
    width: '48%',
    aspectRatio: 1,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  squareActionText: {
    fontSize: 44,
    marginBottom: 10,
  },
  squareActionLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  /* Speed slider styles */
  speedSliderContainer: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 40,
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#5E17EB',
  },
  speedLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 16,
    textAlign: 'center',
  },
  sliderTrack: {
    width: '100%',
    height: 50,
    backgroundColor: '#d3d3d3',
    borderRadius: 25,
    position: 'relative',
    justifyContent: 'center',
  },
  sliderProgress: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    backgroundColor: '#5E17EB',
    borderRadius: 25,
  },
  sliderThumb: {
    position: 'absolute',
    top: -5,
    width: 60,
    height: 60,
    backgroundColor: '#fff',
    borderRadius: 30,
    transform: [{ translateX: -30 }],
    borderWidth: 4,
    borderColor: '#5E17EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  slider: {
    width: '100%',
    height: 80,
  },
});
