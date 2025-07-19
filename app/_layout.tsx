import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="auto" />
      <Stack>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="plant/[id]" options={{ title: 'Plant Details' }} />
        <Stack.Screen name="add-plant" options={{ title: 'Add Plant' }} />
        <Stack.Screen name="edit-plant" options={{ title: 'Edit Plant' }} />
        <Stack.Screen name="log-care" options={{ title: 'Log Care Event' }} />
        <Stack.Screen name="edit-care-event" options={{ title: 'Edit Care Event' }} />
      </Stack>
    </>
  );
}
