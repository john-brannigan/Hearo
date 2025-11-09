import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Import existing screens
import HomeScreen from './app/index';
import CameraScreen from './app/camera';
import TTSScreen from './app/tts';
import ModalScreen from './app/modal';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Camera" component={CameraScreen} />
        <Stack.Screen name="TTS" component={TTSScreen} />
        <Stack.Screen name="Modal" component={ModalScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
