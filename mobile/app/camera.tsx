import { useNavigation } from '@react-navigation/native';
import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, Alert, Pressable } from 'react-native';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';

export default function CameraScreen() {
  const camRef = useRef<CameraView>(null);
  const navigation = useNavigation();
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [isTaking, setIsTaking] = useState(false);

  if (!permission) {
    return (
        <View style={styles.container}>
          <Text style={styles.message}>Loading camera...</Text>
        </View>
    );
  }

  if (!permission.granted) {
    return (
        <View style={styles.container}>
          <Text style={styles.message}>We need camera access to take photos</Text>
          <TouchableOpacity onPress={requestPermission} style={styles.button}>
            <Text style={styles.buttonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
    );
  }

  const takePicture = async () => {
    if (!camRef.current || isTaking) return;
    setIsTaking(true);
    try {
      const result = await camRef.current.takePictureAsync({ quality: 0.7 });
      console.log('Photo taken:', result.uri);
      
      // Automatically navigate to TTS screen with the photo
      console.log('Auto-navigating to TTS with photo:', result.uri);
      navigation.navigate('TTS' as any, { photoUri: result.uri });
      
    } catch (e) {
      console.error('Error taking picture:', e);
      Alert.alert('Error', 'Failed to take picture');
    } finally {
      setIsTaking(false);
    }
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  return (
      <View style={styles.container}>
        {/* Wrap camera in Pressable to make it tappable */}
        <Pressable style={styles.camera} onPress={takePicture} disabled={isTaking}>
          <CameraView style={styles.camera} facing={facing} ref={camRef} />
        </Pressable>

        {/* Controls overlay */}
        <View style={styles.controls}>
          <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing}>
            <Text style={styles.controlText}>🔄 Flip Camera</Text>
          </TouchableOpacity>
        </View>
      </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  message: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 16,
    borderRadius: 12,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  controls: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  flipButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    backgroundColor: '#00000099',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#ffffff66',
  },
  controlText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#ffffff88',
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
  },
  placeholder: {
    width: 80,
  },
  preview: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '85%',
    resizeMode: 'contain',
  },
  previewControls: {
    position: 'absolute',
    bottom: 40,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 8,
  },
  retakeButton: {
    padding: 14,
    backgroundColor: '#ff3b30',
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
  },
  processButton: {
    padding: 14,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
  },
  saveButton: {
    padding: 14,
    backgroundColor: '#34c759',
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
  },
});