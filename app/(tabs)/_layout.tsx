import React, { useEffect } from 'react';
import { View, Platform, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import { AppInitializer } from '../../utils/AppInitializer';
import { Home, Settings } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useBreakpoint } from '../../hooks/useBreakpoint';
import { AuthGuard } from '../../components/AuthGuard';
import WebSidebar from '../../components/WebSidebar';

export default function TabLayout() {
  const { theme } = useTheme();
  const { isWide } = useBreakpoint();
  const isDesktopWeb = Platform.OS === 'web' && isWide;

  useEffect(() => {
    console.log('TabLayout: Starting app initialization...');
    AppInitializer.initialize()
      .then(() => {
        console.log('TabLayout: App initialization completed successfully');
      })
      .catch((error) => {
        console.error('TabLayout: App initialization failed:', error);
      });
  }, []);

  return (
    <AuthGuard>
      <View style={[styles.root, isDesktopWeb && styles.rootDesktop]}>
        {isDesktopWeb && <WebSidebar />}
        <View style={styles.content}>
          <Tabs
            screenOptions={{
              headerShown: !isDesktopWeb,
              headerStyle: {
                backgroundColor: theme.colors.surface,
              },
              headerTintColor: theme.colors.text,
              tabBarActiveTintColor: theme.colors.primary,
              tabBarInactiveTintColor: theme.colors.textSecondary,
              tabBarStyle: isDesktopWeb
                ? { display: 'none' }
                : {
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
              name="settings"
              options={{
                title: 'Settings',
                tabBarIcon: ({ color, size }) => <Settings size={size} color={color} />,
                headerTitle: 'Settings',
              }}
            />
          </Tabs>
        </View>
      </View>
    </AuthGuard>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  rootDesktop: {
    flexDirection: 'row',
  },
  content: {
    flex: 1,
  },
});
