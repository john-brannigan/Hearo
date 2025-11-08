import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Platform } from 'react-native';

// Import existing screens
import HomeScreen from './app/index';
import CameraScreen from './app/camera';
import TTSScreen from './app/tts';
import ModalScreen from './app/modal';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Explore" component={HomeScreen /* TODO: replace with Explore screen */} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="Camera" component={CameraScreen} options={{ headerShown: false }} />
        <Stack.Screen name="TTS" component={TTSScreen} options={{ title: 'Image Analysis' }} />
        <Stack.Group screenOptions={{ presentation: Platform.OS === 'ios' ? 'modal' : 'card' }}>
          <Stack.Screen name="Modal" component={ModalScreen} options={{ headerShown: true }} />
        </Stack.Group>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
