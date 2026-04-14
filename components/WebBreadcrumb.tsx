import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';
import { useTheme, Theme } from '../contexts/ThemeContext';
import { useBreakpoint } from '../hooks/useBreakpoint';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface WebBreadcrumbProps {
  items: BreadcrumbItem[];
}

/**
 * Breadcrumb navigation for desktop web.
 * Hidden on mobile.
 */
export default function WebBreadcrumb({ items }: WebBreadcrumbProps) {
  const { theme } = useTheme();
  const { isWide } = useBreakpoint();
  const styles = createStyles(theme);

  if (Platform.OS !== 'web' || !isWide) {
    return null;
  }

  return (
    <View style={styles.container}>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <View key={index} style={styles.itemRow}>
            {item.href && !isLast ? (
              <TouchableOpacity onPress={() => router.push(item.href as any)} style={styles.link}>
                <Text style={styles.linkText}>{item.label}</Text>
              </TouchableOpacity>
            ) : (
              <Text style={[styles.text, isLast && styles.currentText]}>{item.label}</Text>
            )}
            {!isLast && (
              <ChevronRight size={14} color={theme.colors.textTertiary} style={styles.separator} />
            )}
          </View>
        );
      })}
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 16,
      paddingVertical: 10,
      backgroundColor: theme.colors.background,
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    link: {
      ...(Platform.OS === 'web'
        ? {
            cursor: 'pointer' as any,
          }
        : {}),
    },
    linkText: {
      fontSize: 14,
      color: theme.colors.primary,
      fontWeight: '500',
    },
    text: {
      fontSize: 14,
      color: theme.colors.textTertiary,
    },
    currentText: {
      color: theme.colors.textPrimary,
      fontWeight: '500',
    },
    separator: {
      marginHorizontal: 6,
    },
  });
