import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';

interface WebContainerProps {
  children: React.ReactNode;
  style?: any;
}

/**
 * Wraps content in a full-width container on web.
 * On mobile, renders children directly with no wrapper.
 */
export default function WebContainer({ children, style }: WebContainerProps) {
  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  return <View style={[styles.container, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
