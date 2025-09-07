import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { AuthGuard } from '../components/AuthGuard';
import { ErrorBoundary } from '../components/ErrorBoundary';

// Create a client with optimized cache settings for plant care app
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data is considered fresh for 5 minutes
      cacheTime: 30 * 60 * 1000, // 30 minutes - keep unused data in cache for 30 minutes
      retry: 3, // Retry failed requests 3 times
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
      refetchOnWindowFocus: false, // Don't refetch when app comes back to foreground
      refetchOnReconnect: true, // Refetch when internet reconnects
    },
    mutations: {
      retry: 2, // Retry failed mutations 2 times
    },
  },
});

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
        <Stack.Screen 
          name="create-reminder" 
          options={{ 
            title: 'Create Reminder',
            headerBackTitle: 'Back'
          }} 
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ErrorBoundary>
          <ThemedStack />
        </ErrorBoundary>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
