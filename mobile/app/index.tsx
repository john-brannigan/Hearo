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
    const tutorialText = `Welcome to Hearo, your AI-powered vision assistant. 
    
    Here's how to use the app:
    
    On the home screen, you'll find a large camera button in the center. Below it is the How to Use button. Press the camera button to open the camera. 
    
    Once in the camera, tap anywhere on the screen to capture a photo. At the bottom center, there's a flip camera button to switch between front and back cameras.
    
    After taking a photo, you'll see the analysis screen. At the top is your captured image - tap it anytime to go back to the camera and take a new photo. Below the image on the left is the analyze button to get an AI description of what's in the image. To the right of that is the microphone button to ask specific questions about the photo. At the bottom is a speech speed slider - slide left for slower, right for faster speech.
    
    That's it! Let's get started.`;
    
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
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 40,
  },
  cameraButton: {
    width: 360,
    height: 360,
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
    width: 170,
    height: 170,
  },
  tutorialButton: {
    marginTop: 40,
    paddingVertical: 28,
    paddingHorizontal: 60,
    backgroundColor: '#fff',
    borderRadius: 20,
    borderWidth: 4,
    borderColor: '#5E17EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
    minWidth: 320,
    alignItems: 'center',
  },
  tutorialButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  tutorialButtonText: {
    fontSize: 26,
    fontWeight: '700',
    color: '#5E17EB',
  },
});
