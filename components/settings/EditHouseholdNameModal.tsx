import React from 'react';
import { View, Text, Modal, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme, Theme } from '../../contexts/ThemeContext';

interface EditHouseholdNameModalProps {
  visible: boolean;
  householdName: string;
  loading: boolean;
  onChangeText: (text: string) => void;
  onSave: () => void;
  onClose: () => void;
}

export default function EditHouseholdNameModal({
  visible,
  householdName,
  loading,
  onChangeText,
  onSave,
  onClose,
}: EditHouseholdNameModalProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.editModal, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Edit Household Name</Text>

          <TextInput
            style={[
              styles.modalInput,
              {
                backgroundColor: theme.colors.background,
                borderColor: theme.colors.border,
                color: theme.colors.text,
              },
            ]}
            value={householdName}
            onChangeText={onChangeText}
            placeholder="Enter household name"
            placeholderTextColor={theme.colors.textSecondary}
            autoCapitalize="words"
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.colors.background }]}
              onPress={onClose}
            >
              <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
              onPress={onSave}
              disabled={loading}
            >
              <Text style={[styles.modalButtonText, { color: theme.colors.textOnPrimary }]}>
                {loading ? 'Saving...' : 'Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    editModal: {
      borderRadius: 12,
      padding: 24,
      minWidth: 300,
      maxWidth: 400,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 16,
      textAlign: 'center',
    },
    modalInput: {
      borderWidth: 1,
      borderRadius: 8,
      padding: 12,
      fontSize: 16,
      marginBottom: 20,
    },
    modalButtons: {
      flexDirection: 'row',
      gap: 12,
    },
    modalButton: {
      flex: 1,
      padding: 14,
      borderRadius: 8,
      alignItems: 'center',
    },
    modalButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
  });
