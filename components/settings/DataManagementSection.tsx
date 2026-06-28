import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, StyleSheet } from 'react-native';
import { RefreshCw } from 'lucide-react-native';
import { useTheme, Theme } from '../../contexts/ThemeContext';
import { BaseColors } from '../../styles/theme';

interface DataManagementSectionProps {
  loading: boolean;
  onGenerateThumbnails: () => Promise<void>;
  onDeleteAllData: () => Promise<void>;
}

export default function DataManagementSection({
  loading,
  onGenerateThumbnails,
  onDeleteAllData,
}: DataManagementSectionProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [thumbnailConfirmVisible, setThumbnailConfirmVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const handleGenerateThumbnails = () => {
    setThumbnailConfirmVisible(true);
  };

  const handleConfirmGenerateThumbnails = async () => {
    setThumbnailConfirmVisible(false);
    await onGenerateThumbnails();
  };

  const handleDeleteAllData = () => {
    setDeleteConfirmText('');
    setDeleteConfirmVisible(true);
  };

  const handleConfirmDelete = async () => {
    if (deleteConfirmText !== 'CONFIRM DELETE') {
      return;
    }
    setDeleteConfirmVisible(false);
    await onDeleteAllData();
  };

  return (
    <>
      <View style={[styles.section, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Data Management</Text>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.primary }, loading && styles.disabledButton]}
          onPress={handleGenerateThumbnails}
          disabled={loading}
        >
          <RefreshCw size={16} color={theme.colors.textOnPrimary} />
          <Text style={[styles.buttonText, { color: theme.colors.textOnPrimary }]}>
            {loading ? 'Processing...' : 'Generate Photo Thumbnails'}
          </Text>
        </TouchableOpacity>

        <Text style={[styles.warningText, { color: theme.colors.textSecondary }]}>
          Creates smaller versions of existing photos to reduce data usage.
        </Text>

        <TouchableOpacity
          style={[styles.deleteButton, loading && styles.disabledButton]}
          onPress={handleDeleteAllData}
          disabled={loading}
        >
          <Text style={styles.deleteButtonText}>{loading ? 'Deleting...' : 'Delete All Plants & Data'}</Text>
        </TouchableOpacity>

        <Text style={[styles.warningText, { color: theme.colors.textSecondary }]}>
          This will permanently delete all plants, event history, photos, and settings.
        </Text>
      </View>

      {/* Thumbnail Generation Confirmation Modal */}
      <Modal
        visible={thumbnailConfirmVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setThumbnailConfirmVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.editModal, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Generate Photo Thumbnails</Text>

            <Text style={[styles.modalDescription, { color: theme.colors.text }]}>
              This will create optimized thumbnail versions of existing photos to reduce data usage. This may
              take a few minutes.
            </Text>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.colors.background }]}
                onPress={() => setThumbnailConfirmVisible(false)}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleConfirmGenerateThumbnails}
                disabled={loading}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.textOnPrimary }]}>
                  {loading ? 'Generating...' : 'Generate'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteConfirmVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setDeleteConfirmVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.editModal, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.error || '#ff4444' }]}>
              Delete All Plants & Data
            </Text>

            <Text style={[styles.modalDescription, { color: theme.colors.text }]}>
              This will permanently delete all plants, events, photos, and settings. This action cannot be
              undone.
            </Text>

            <Text style={[styles.confirmationInstructions, { color: theme.colors.text }]}>
              Type "CONFIRM DELETE" to confirm:
            </Text>

            <TextInput
              style={[
                styles.modalInput,
                {
                  backgroundColor: theme.colors.background,
                  borderColor:
                    deleteConfirmText === 'CONFIRM DELETE' ? theme.colors.primary : theme.colors.border,
                  color: theme.colors.text,
                },
              ]}
              value={deleteConfirmText}
              onChangeText={setDeleteConfirmText}
              placeholder="Type here..."
              placeholderTextColor={theme.colors.textSecondary}
              autoCapitalize="characters"
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.colors.background }]}
                onPress={() => setDeleteConfirmVisible(false)}
              >
                <Text style={[styles.modalButtonText, { color: theme.colors.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalButton,
                  {
                    backgroundColor:
                      deleteConfirmText === 'CONFIRM DELETE'
                        ? theme.colors.error || '#ff4444'
                        : theme.colors.disabled,
                  },
                ]}
                onPress={handleConfirmDelete}
                disabled={deleteConfirmText !== 'CONFIRM DELETE' || loading}
              >
                <Text
                  style={[
                    styles.modalButtonText,
                    {
                      color:
                        deleteConfirmText === 'CONFIRM DELETE'
                          ? theme.colors.textOnPrimary
                          : theme.colors.textSecondary,
                    },
                  ]}
                >
                  {loading ? 'Deleting...' : 'Delete Everything'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
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
    button: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 6,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    buttonText: {
      fontSize: 16,
      fontWeight: '500',
    },
    disabledButton: {
      opacity: 0.6,
    },
    deleteButton: {
      backgroundColor: theme.colors.error,
      paddingVertical: 15,
      paddingHorizontal: 20,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 20,
    },
    deleteButtonText: {
      color: BaseColors.white,
      fontSize: 16,
      fontWeight: 'bold',
    },
    warningText: {
      fontSize: 14,
      textAlign: 'center',
      fontStyle: 'italic',
      marginTop: 10,
    },
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
    modalDescription: {
      fontSize: 16,
      lineHeight: 22,
      marginBottom: 20,
      textAlign: 'center',
    },
    confirmationInstructions: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 12,
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
