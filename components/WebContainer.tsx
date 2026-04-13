import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { useBreakpoint } from '../hooks/useBreakpoint';

interface WebContainerProps {
  children: React.ReactNode;
  maxWidth?: number;
  style?: any;
}

/**
 * Wraps content in a centered, max-width container on web.
 * On mobile, renders children directly with no wrapper.
 */
export default function WebContainer({ children, maxWidth = 800, style }: WebContainerProps) {
  const { isWide } = useBreakpoint();

  if (Platform.OS !== 'web') {
    return <>{children}</>;
  }

  return (
    <View style={[styles.outer, style]}>
      <View style={[styles.inner, isWide && { maxWidth }]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    alignItems: 'center',
  },
  inner: {
    flex: 1,
    width: '100%',
  },
});
