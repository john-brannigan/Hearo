import { Tabs, usePathname } from 'expo-router';
import React from 'react';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const pathname = usePathname();
  
  // Hide tab bar on specific routes
  const hideTabBar = pathname === '/camera' || pathname === '/tts' || pathname === '/modal';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: hideTabBar ? { display: 'none' } : undefined, // Conditionally hide
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }: { color: string }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Explore',
          tabBarIcon: ({ color }: { color: string }) => <IconSymbol size={28} name="paperplane.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="camera"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="tts"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="modal"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}