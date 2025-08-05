import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { AuthGuard } from '../components/AuthGuard';

function ThemedStack() {
  const { theme } = useTheme();
  
  return (
    <>
      <StatusBar style={theme.colors.statusBar === 'light-content' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
          headerTintColor: theme.colors.text,
          headerTitleStyle: {
            color: theme.colors.text,
          },
        }}
      >
        <Stack.Screen 
          name="welcome" 
          options={{ 
            headerShown: false,
            title: 'Welcome'
          }} 
        />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen 
          name="plant/[id]" 
          options={{ 
            title: 'Plant Details',
            headerBackTitle: 'My Plants'
          }} 
        />
        <Stack.Screen 
          name="add-plant" 
          options={{ 
            title: 'Add Plant',
            headerBackTitle: 'Back'
          }} 
        />
        <Stack.Screen 
          name="edit-plant" 
          options={{ 
            title: 'Edit Plant',
            headerBackTitle: 'Back'
          }} 
        />
        <Stack.Screen 
          name="log-care" 
          options={{ 
            title: 'Log Event',
            headerBackTitle: 'Back'
          }} 
        />
        <Stack.Screen 
          name="edit-care-event" 
          options={{ 
            title: 'Edit Event',
            headerBackTitle: 'Back'
          }} 
        />
        <Stack.Screen 
          name="theme-settings" 
          options={{ 
            title: 'Theme Settings',
            headerBackTitle: 'Back'
          }} 
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <ThemedStack />
    </ThemeProvider>
  );
}
