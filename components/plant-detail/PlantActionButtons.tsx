import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme, Theme } from '../../contexts/ThemeContext';

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
      <TouchableOpacity style={styles.actionButton} onPress={onLogCare}>
        <Text style={styles.actionButtonText}>Log Event</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.actionButton, uploadingPhoto && styles.actionButtonDisabled]}
        onPress={onAddPhoto}
        disabled={uploadingPhoto}
      >
        {uploadingPhoto ? (
          <View style={styles.buttonLoadingContainer}>
            <ActivityIndicator size="small" color={theme.colors.textOnPrimary} />
            <Text style={styles.actionButtonText}>Uploading...</Text>
          </View>
        ) : (
          <Text style={styles.actionButtonText}>Add Photo</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    actionButtons: {
      flexDirection: 'row',
      padding: 10,
      gap: 10,
    },
    actionButton: {
      flex: 1,
      backgroundColor: theme.colors.primary,
      padding: 15,
      borderRadius: 8,
      alignItems: 'center',
    },
    actionButtonText: {
      color: theme.colors.textOnPrimary,
      fontWeight: 'bold',
      fontSize: 16,
    },
    actionButtonDisabled: {
      opacity: 0.6,
    },
    buttonLoadingContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
  });
