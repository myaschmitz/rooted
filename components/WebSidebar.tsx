import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Home, Settings, Leaf } from 'lucide-react-native';
import { router, usePathname } from 'expo-router';
import { useTheme, Theme } from '../contexts/ThemeContext';

/**
 * Self-contained sidebar for desktop web.
 * Uses usePathname to determine active tab and router to navigate.
 */
export default function WebSidebar() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const pathname = usePathname();

  const tabs = [
    { key: '/', label: 'Plants', icon: Home },
    { key: '/settings', label: 'Settings', icon: Settings },
  ];

  const handleTabPress = (path: string) => {
    router.push(path as any);
  };

  return (
    <View style={styles.sidebar}>
      {/* Brand / Logo area */}
      <View style={styles.brand}>
        <Leaf size={28} color={theme.colors.primary} />
        <Text style={styles.brandText}>Rooted</Text>
      </View>

      {/* Navigation items */}
      <View style={styles.nav}>
        {tabs.map((tab) => {
          const isActive = pathname === tab.key || (tab.key === '/' && pathname === '/index');
          const Icon = tab.icon;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => handleTabPress(tab.key)}
            >
              <Icon
                size={20}
                color={isActive ? theme.colors.primary : theme.colors.textSecondary}
              />
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Bottom spacer */}
      <View style={styles.spacer} />
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    sidebar: {
      width: 220,
      backgroundColor: theme.colors.surface,
      borderRightWidth: 1,
      borderRightColor: theme.colors.border,
      paddingTop: 16,
      paddingBottom: 16,
    },
    brand: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      marginBottom: 8,
    },
    brandText: {
      fontSize: 22,
      fontWeight: 'bold',
      color: theme.colors.textPrimary,
      marginLeft: 10,
    },
    nav: {
      paddingHorizontal: 12,
    },
    navItem: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderRadius: 8,
      marginBottom: 4,
      ...(Platform.OS === 'web'
        ? {
            cursor: 'pointer' as any,
            transition: 'background-color 0.15s ease' as any,
          }
        : {}),
    },
    navItemActive: {
      backgroundColor: theme.colors.surfaceSecondary,
    },
    navLabel: {
      fontSize: 15,
      fontWeight: '500',
      color: theme.colors.textSecondary,
      marginLeft: 12,
    },
    navLabelActive: {
      color: theme.colors.primary,
      fontWeight: '600',
    },
    spacer: {
      flex: 1,
    },
  });
