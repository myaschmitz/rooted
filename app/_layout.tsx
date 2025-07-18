import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AppInitializer } from '../utils/AppInitializer';

export default function RootLayout() {
  useEffect(() => {
    AppInitializer.initialize().catch(console.error);
  }, []);

  return (
    <>
      <StatusBar style="auto" />
      <Stack>
        <Stack.Screen name="index" options={{ title: 'My Plants' }} />
        <Stack.Screen name="plant/[id]" options={{ title: 'Plant Details' }} />
        <Stack.Screen name="add-plant" options={{ title: 'Add Plant' }} />
        <Stack.Screen name="log-care" options={{ title: 'Log Care Event' }} />
      </Stack>
    </>
  );
}
