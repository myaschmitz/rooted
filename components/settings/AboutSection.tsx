import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Sprout } from 'lucide-react-native';
import { useTheme, Theme } from '../../contexts/ThemeContext';
import { Spacing, Typography } from '../../styles/theme';

export default function AboutSection() {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.about}>
      <Sprout size={22} color={theme.colors.primary} />
      <Text style={styles.name}>Rooted</Text>
      <Text style={styles.tagline}>
        Track your plants, log events, and keep your green friends healthy.
      </Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    about: {
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: Spacing['2xl'],
      paddingTop: Spacing['2xl'],
      paddingBottom: Spacing['3xl'],
    },
    name: {
      fontSize: Typography.base,
      fontWeight: Typography.weights.semibold,
      color: theme.colors.text,
      marginTop: 4,
    },
    tagline: {
      fontSize: Typography.xs + 1,
      lineHeight: (Typography.xs + 1) * 1.4,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
  });
