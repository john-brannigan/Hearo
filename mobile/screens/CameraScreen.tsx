import React, { useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions, CameraType } from 'expo-camera';
import * as MediaLibrary from 'expo-media-library';

export default function CameraScreen() {
  const camRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [photo, setPhoto] = useState<string | null>(null);
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
      setPhoto(result.uri);
    } catch (e) {
      console.warn('Error taking picture:', e);
      alert('Failed to take picture');
    } finally {
      setIsTaking(false);
    }
  };

  const saveToGallery = async () => {
    if (!photo) return;
    
    if (!mediaPermission?.granted) {
      const result = await requestMediaPermission();
      if (!result.granted) {
        alert('Permission to access media library is required');
        return;
      }
    }
    
    try {
      await MediaLibrary.createAssetAsync(photo);
      alert('Photo saved to gallery! 📸');
      setPhoto(null);
    } catch (e) {
      console.warn('Error saving photo:', e);
      alert('Failed to save photo');
    }
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  return (
    <View style={styles.container}>
      {!photo ? (
        <CameraView style={styles.camera} facing={facing} ref={camRef}>
          <View style={styles.controls}>
            <TouchableOpacity style={styles.flipButton} onPress={toggleCameraFacing}>
              <Text style={styles.controlText}>🔄 Flip</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.captureButton, isTaking && styles.captureButtonDisabled]} 
              onPress={takePicture} 
              disabled={isTaking}>
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>

            <View style={styles.placeholder} />
          </View>
        </CameraView>
      ) : (
        <View style={styles.preview}>
          <Image source={{ uri: photo }} style={styles.previewImage} />
          <View style={styles.previewControls}>
            <TouchableOpacity style={styles.retakeButton} onPress={() => setPhoto(null)}>
              <Text style={styles.controlText}>↺ Retake</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveButton} onPress={saveToGallery}>
              <Text style={styles.controlText}>💾 Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  flipButton: {
    padding: 12,
    backgroundColor: '#00000099',
    borderRadius: 12,
  },
  controlText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    padding: 20,
    width: '100%',
  },
  previewImage: {
    width: '100%',
    height: '85%',
    resizeMode: 'contain',
    borderRadius: 12,
  },
  previewControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
  },
  retakeButton: {
    padding: 16,
    backgroundColor: '#ff3b30',
    borderRadius: 12,
    minWidth: 120,
    alignItems: 'center',
  },
  saveButton: {
    padding: 16,
    backgroundColor: '#34c759',
    borderRadius: 12,
    minWidth: 120,
    alignItems: 'center',
  },
});