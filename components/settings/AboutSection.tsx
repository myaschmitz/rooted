import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme, Theme } from '../../contexts/ThemeContext';

export default function AboutSection() {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>About</Text>
      <Text style={[styles.aboutText, { color: theme.colors.text }]}>
        Rooted - Plant Care Tracker{'\n'}
        Track your plants, log events, and keep your green friends healthy!
      </Text>
      <Text style={[styles.versionText, { color: theme.colors.textSecondary }]}>Version 1.0.0</Text>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    section: {
      margin: 15,
      padding: 20,
      borderRadius: 10,
      shadowColor: theme.colors.text,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 15,
    },
    aboutText: {
      fontSize: 16,
      marginBottom: 5,
      lineHeight: 22,
    },
    versionText: {
      fontSize: 14,
    },
  });
