import { Stack } from 'expo-router';
import { useEffect } from 'react';

export default function RootLayout() {
  useEffect(() => {
    console.log('RootLayout mounted');
  }, []);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'none',
        contentStyle: { backgroundColor: 'transparent' },
      }}>
      <Stack.Screen 
        name="index" 
        options={{ 
          title: 'Home',
          navigationBarHidden: true,
        }} 
      />
      <Stack.Screen 
        name="camera" 
        options={{ 
          title: 'Camera',
          navigationBarHidden: true,
        }} 
      />
      <Stack.Screen 
        name="tts" 
        options={{ 
          title: 'TTS',
          navigationBarHidden: true,
        }} 
      />
      <Stack.Screen 
        name="modal" 
        options={{ 
          presentation: 'modal', 
          title: 'Modal',
          navigationBarHidden: true,
        }} 
      />
    </Stack>
  );
}