import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppInitializer } from '../../utils/AppInitializer';
import { Home, Droplets, Settings } from 'lucide-react-native';

export default function TabLayout() {
  useEffect(() => {
    AppInitializer.initialize().catch(console.error);
  }, []);

  return (
    <>
      <StatusBar style="auto" />
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#4CAF50',
          tabBarInactiveTintColor: '#666',
          tabBarStyle: {
            backgroundColor: 'white',
            borderTopWidth: 1,
            borderTopColor: '#eee',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Plants',
            tabBarIcon: ({ color, size }) => <Home size={size} color={color} />,
            headerTitle: 'My Plants',
          }}
        />
        <Tabs.Screen
          name="quick-care"
          options={{
            title: 'Quick Care',
            tabBarIcon: ({ color, size }) => <Droplets size={size} color={color} />,
            headerTitle: 'Quick Care',
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
            headerTitle: 'Settings',
          }}
        />
      </Tabs>
    </>
  );
}
