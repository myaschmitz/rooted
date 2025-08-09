import React, { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { AppInitializer } from '../../utils/AppInitializer';
import { Home, Droplets, Settings } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { AuthGuard } from '../../components/AuthGuard';

export default function TabLayout() {
  const { theme } = useTheme();

  useEffect(() => {
    console.log('TabLayout: Starting app initialization...');
    AppInitializer.initialize()
      .then(() => {
        console.log('TabLayout: App initialization completed successfully');
      })
      .catch((error) => {
        console.error('TabLayout: App initialization failed:', error);
        // Don't crash - log error and continue
      });
  }, []);

  return (
    <AuthGuard>
      <Tabs
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
          headerTintColor: theme.colors.text,
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: theme.colors.textSecondary,
          tabBarStyle: {
            backgroundColor: theme.colors.surface,
            borderTopWidth: 1,
            borderTopColor: theme.colors.border,
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
            title: 'Quick Events',
            tabBarIcon: ({ color, size }) => <Droplets size={size} color={color} />,
            headerTitle: 'Quick Events',
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
    </AuthGuard>
  );
}
