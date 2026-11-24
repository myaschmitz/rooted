import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { CalendarPlus, Camera } from 'lucide-react-native';
import { useTheme, Theme } from '../../contexts/ThemeContext';
import { Spacing, Typography, BorderRadius } from '../../styles/theme';

interface PlantActionButtonsProps {
  onLogCare: () => void;
  onAddPhoto: () => void;
  uploadingPhoto: boolean;
}

export default function PlantActionButtons({
  onLogCare,
  onAddPhoto,
  uploadingPhoto,
}: PlantActionButtonsProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <View style={styles.actionButtons}>
      <TouchableOpacity style={[styles.button, styles.primary]} onPress={onLogCare}>
        <CalendarPlus size={18} color={theme.colors.textOnPrimary} />
        <Text style={[styles.buttonText, styles.primaryText]} numberOfLines={1}>
          Log Event
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.button, styles.secondary, uploadingPhoto && styles.disabled]}
        onPress={onAddPhoto}
        disabled={uploadingPhoto}
      >
        {uploadingPhoto ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : (
          <Camera size={18} color={theme.colors.primary} />
        )}
        <Text style={[styles.buttonText, styles.secondaryText]} numberOfLines={1}>
          {uploadingPhoto ? 'Uploading…' : 'Add Photo'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    actionButtons: {
      flexDirection: 'row',
      marginHorizontal: Spacing.sm + 2,
      marginBottom: Spacing.sm + 2,
      gap: Spacing.sm + 2,
    },
    button: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: Spacing.sm,
      paddingVertical: Spacing.sm + 4,
      borderRadius: BorderRadius.xl,
    },
    primary: {
      backgroundColor: theme.colors.primary,
    },
    secondary: {
      backgroundColor: theme.colors.surface,
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    buttonText: {
      fontWeight: Typography.weights.semibold,
      fontSize: Typography.base,
    },
    primaryText: {
      color: theme.colors.textOnPrimary,
    },
    secondaryText: {
      color: theme.colors.primary,
    },
    disabled: {
      opacity: 0.6,
    },
  });
