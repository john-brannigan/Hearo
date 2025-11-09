import { StyleSheet, View, Pressable, Text, Image, StatusBar } from 'react-native';
import { useState } from 'react';
import CameraScreen from './camera';

export default function HomeScreen() {
  const [showCamera, setShowCamera] = useState(false);

  const handleCameraPress = () => {
    console.log('Camera button pressed!');
    setShowCamera(true);
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

      {/* Big Circular Camera Button */}
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
      </View>

      {/* Features */}
      <View style={styles.features}>
        <Text style={styles.featureText}>• AI-powered image analysis</Text>
        <Text style={styles.featureText}>• Voice commands & text-to-speech</Text>
        <Text style={styles.featureText}>• Real-time object recognition</Text>
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
    width: 150,
    height: 150,
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
  features: {
    paddingHorizontal: 40,
    paddingBottom: 40,
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
});
