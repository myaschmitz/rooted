import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider, useTheme } from "../contexts/ThemeContext";
import { AuthGuard } from "../components/AuthGuard";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { QUERY_CLIENT_CONFIG, calculateRetryDelay } from "../constants/domain";
import { CacheInvalidationService } from "../services/CacheInvalidationService";

// Create a client with optimized cache settings for plant care app
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: QUERY_CLIENT_CONFIG.DEFAULT_STALE_TIME,
      gcTime: QUERY_CLIENT_CONFIG.DEFAULT_GC_TIME,
      retry: QUERY_CLIENT_CONFIG.RETRY_COUNT,
      retryDelay: calculateRetryDelay,
      refetchOnWindowFocus: false, // Don't refetch when app comes back to foreground
      refetchOnReconnect: true, // Refetch when internet reconnects
    },
    mutations: {
      retry: QUERY_CLIENT_CONFIG.MUTATION_RETRY_COUNT,
    },
  },
});

// Set the query client for cache invalidation service
CacheInvalidationService.setDefaultQueryClient(queryClient);

function ThemedStack() {
  const { theme } = useTheme();

  return (
    <>
      <StatusBar
        style={theme.colors.statusBar === "light-content" ? "light" : "dark"}
      />
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
            title: "Welcome",
          }}
        />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="plant/[id]"
          options={{
            title: "Plant Details",
            headerBackTitle: "My Plants",
          }}
        />
        <Stack.Screen
          name="add-plant"
          options={{
            title: "Add Plant",
            headerBackTitle: "Back",
          }}
        />
        <Stack.Screen
          name="edit-plant"
          options={{
            title: "Edit Plant",
            headerBackTitle: "Back",
          }}
        />
        <Stack.Screen
          name="log-care"
          options={{
            title: "Log Event",
            headerBackTitle: "Back",
          }}
        />
        <Stack.Screen
          name="edit-care-event"
          options={{
            title: "Edit Event",
            headerBackTitle: "Back",
          }}
        />
        <Stack.Screen
          name="theme-settings"
          options={{
            title: "Theme Settings",
            headerBackTitle: "Back",
          }}
        />
        <Stack.Screen
          name="add-tag"
          options={{
            title: "Add Tag",
            headerBackTitle: "Plant Details",
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
