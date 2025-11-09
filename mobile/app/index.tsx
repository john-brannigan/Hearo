import { StyleSheet, View, Pressable, Text, Image, StatusBar, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import * as Haptics from 'expo-haptics';
import CameraScreen from './camera';
import { textToSpeech } from '@/components/elevenlabs/tts';

export default function HomeScreen() {
  const [showCamera, setShowCamera] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const handleCameraPress = async () => {
    console.log('Camera button pressed!');
    try {
      await Haptics.selectionAsync();
    } catch (e) {
      // ignore haptics errors
    }
    setShowCamera(true);
  };

  const handleTutorialPress = async () => {
    setIsSpeaking(true);
    const tutorialText = `Welcome to Hearo! This app strives to help visually-impaired individuals aid in understanding their surroundings. 
    The home page consists of a large camera button to take a photo for image analysis. Use the analyze button to summarize the image, the voice recording button to ask a question about the image with AI analysis, and a speech speed slider to control how fast the AI is talking. Let's get started!`;
    
    try {
      await textToSpeech(tutorialText, 1.0);
    } catch (error) {
      console.error('TTS error:', error);
    } finally {
      setIsSpeaking(false);
    }
  };

  // If camera screen should be shown, render it instead
  if (showCamera) {
    return <CameraScreen />;
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f5f5f5" />
      {/* Header with Title and Logo */}
      <View style={styles.header}>
        <Text style={styles.title}>Hearo</Text>
        <Image 
          source={require('@/assets/images/hearo-logo-new.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Big Square Camera Button */}
      <View style={styles.mainContent}>
        <Pressable 
          style={({ pressed }) => [
            styles.cameraButton,
            pressed && styles.cameraButtonPressed
          ]}
          onPress={handleCameraPress}
        >
          <Image 
            source={{ uri: 'https://img.icons8.com/?size=100&id=11772&format=png&color=FFFFFF' }}
            style={styles.cameraIcon}
          />
        </Pressable>
        <Text style={styles.tapToStart}>Tap to Start</Text>
        
        {/* Tutorial Button */}
        <Pressable 
          style={({ pressed }) => [
            styles.tutorialButton,
            pressed && styles.tutorialButtonPressed
          ]}
          onPress={handleTutorialPress}
          disabled={isSpeaking}
        >
          {isSpeaking ? (
            <ActivityIndicator color="#5E17EB" size="small" />
          ) : (
            <Text style={styles.tutorialButtonText}>🎧 How to Use</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 30,
    alignItems: 'center',
    flexDirection: 'column',
    gap: 16,
  },
  logoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e0e0e0',
  },
  logo: {
    width: 125,
    height: 125,
  },
  title: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#5E17EB',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  cameraButton: {
    width: 320,
    height: 320,
    borderRadius: 24,
    backgroundColor: '#5E17EB',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  cameraButtonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  cameraIcon: {
    width: 150,
    height: 150,
  },
  tapToStart: {
    marginTop: 24,
    fontSize: 20,
    fontWeight: '600',
    color: '#5E17EB',
  },
  tutorialButton: {
    marginTop: 20,
    paddingVertical: 16,
    paddingHorizontal: 32,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#5E17EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    minWidth: 200,
    alignItems: 'center',
  },
  tutorialButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  tutorialButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#5E17EB',
  },
});
