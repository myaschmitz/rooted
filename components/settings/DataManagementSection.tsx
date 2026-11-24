import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, StyleSheet } from 'react-native';
import { Download, Image as ImageIcon, Trash2 } from 'lucide-react-native';
import { useTheme, Theme } from '../../contexts/ThemeContext';
import { BaseColors } from '../../styles/theme';
import { SettingsGroup, SettingsRow } from './SettingsList';

interface DataManagementSectionProps {
  loading: boolean;
  exporting: boolean;
  onExportData: () => Promise<void>;
  onGenerateThumbnails: () => Promise<void>;
  onDeleteAllData: () => Promise<void>;
}

export default function DataManagementSection({
  loading,
  exporting,
  onExportData,
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
      <SettingsGroup title="Data">
        <SettingsRow
          icon={Download}
          label={exporting ? 'Preparing export…' : 'Export data & photos'}
          subtitle="ZIP of all household data and original photos"
          onPress={onExportData}
          disabled={loading || exporting}
          loading={exporting}
          chevron={false}
        />
        <SettingsRow
          icon={ImageIcon}
          iconColor={BaseColors.info}
          label="Generate photo thumbnails"
          subtitle="Smaller copies of existing photos to save data"
          onPress={handleGenerateThumbnails}
          disabled={loading || exporting}
          chevron={false}
        />
      </SettingsGroup>

      <SettingsGroup footer="Permanently deletes all plants, event history, photos, and settings.">
        <SettingsRow
          icon={Trash2}
          label="Delete all plants & data"
          onPress={handleDeleteAllData}
          disabled={loading || exporting}
          destructive
        />
      </SettingsGroup>

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
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    editModal: {
      borderRadius: 16,
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
      borderRadius: 12,
      alignItems: 'center',
    },
    modalButtonText: {
      fontSize: 16,
      fontWeight: '600',
    },
  });
