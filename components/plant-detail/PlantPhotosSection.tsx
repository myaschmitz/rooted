import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { PlantPhoto } from '../../types/Plant';
import { PhotoService } from '../../services/PhotoService';
import { useTheme, Theme } from '../../contexts/ThemeContext';
import { TextSkeleton } from '../Skeleton';

interface FormattedDate {
  date: string;
  timeAgo: string;
}

interface PlantPhotosSectionProps {
  photos: PlantPhoto[];
  thumbnailPhotoId: string | null;
  isMultiSelectMode: boolean;
  selectedPhotos: Set<string>;
  formattedDates: { [key: string]: FormattedDate };
  onPhotoPress: (photo: PlantPhoto) => void;
  onPhotoLongPress: (photo: PlantPhoto) => void;
  onToggleMultiSelect: () => void;
  onTogglePhotoSelection: (photoId: string) => void;
  onDeleteSelectedPhotos: () => void;
}

export default function PlantPhotosSection({
  photos,
  thumbnailPhotoId,
  isMultiSelectMode,
  selectedPhotos,
  formattedDates,
  onPhotoPress,
  onPhotoLongPress,
  onToggleMultiSelect,
  onTogglePhotoSelection,
  onDeleteSelectedPhotos,
}: PlantPhotosSectionProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  if (photos.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Photos ({photos.length})</Text>
        <View style={styles.multiSelectButtonsContainer}>
          {isMultiSelectMode && selectedPhotos.size > 0 && (
            <TouchableOpacity
              style={[styles.multiSelectButton, styles.deleteButton]}
              onPress={onDeleteSelectedPhotos}
            >
              <Text style={styles.deleteButtonText}>
                Delete ({selectedPhotos.size})
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.multiSelectButton,
              !isMultiSelectMode && styles.deletePhotosButton,
              isMultiSelectMode && styles.cancelButton,
            ]}
            onPress={onToggleMultiSelect}
          >
            <Text
              style={[
                styles.multiSelectButtonText,
                isMultiSelectMode && styles.cancelButtonText,
              ]}
            >
              {isMultiSelectMode ? 'Cancel' : 'Delete Photos'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {photos.map((photo) => (
          <TouchableOpacity
            key={photo.id}
            style={styles.photoItem}
            onPress={() => {
              if (isMultiSelectMode) {
                onTogglePhotoSelection(photo.id);
              } else {
                onPhotoPress(photo);
              }
            }}
            onLongPress={() => !isMultiSelectMode && onPhotoLongPress(photo)}
          >
            <Image
              source={{ uri: PhotoService.getImageUrl(photo, true) }}
              style={[
                styles.photoImage,
                thumbnailPhotoId === photo.id && styles.thumbnailPhotoImage,
                selectedPhotos.has(photo.id) && styles.selectedPhotoImage,
              ]}
              contentFit="cover"
              cachePolicy="memory-disk"
              transition={200}
            />
            {isMultiSelectMode && (
              <View style={styles.selectionOverlay}>
                <View
                  style={[
                    styles.selectionCheckbox,
                    selectedPhotos.has(photo.id) && styles.selectedCheckbox,
                  ]}
                >
                  {selectedPhotos.has(photo.id) && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </View>
              </View>
            )}
            <View style={styles.photoDateContainer}>
              {formattedDates[photo.id] ? (
                <>
                  <Text style={styles.photoDate}>{formattedDates[photo.id].date}</Text>
                  <Text style={styles.photoTimeAgo}>
                    ({formattedDates[photo.id].timeAgo})
                  </Text>
                </>
              ) : (
                <TextSkeleton width={120} height={14} />
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    section: {
      backgroundColor: theme.colors.surface,
      margin: 10,
      marginTop: 0,
      padding: 15,
      borderRadius: 8,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    multiSelectButtonsContainer: {
      flexDirection: 'row',
      gap: 8,
    },
    multiSelectButton: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      backgroundColor: theme.colors.primary,
      borderRadius: 6,
    },
    deleteButton: {
      backgroundColor: '#DC3545',
      alignItems: 'center',
      justifyContent: 'center',
    },
    deletePhotosButton: {
      backgroundColor: '#DC3545',
    },
    multiSelectButtonText: {
      color: theme.colors.textOnPrimary,
      fontSize: 14,
      fontWeight: '600',
    },
    cancelButton: {
      backgroundColor: 'transparent',
      borderWidth: 2,
      borderColor: '#999999',
    },
    cancelButtonText: {
      color: '#999999',
    },
    deleteButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
    photoItem: {
      marginRight: 15,
      width: 80,
      alignItems: 'center',
    },
    photoImage: {
      width: 60,
      height: 60,
      borderRadius: 8,
      marginBottom: 5,
    },
    thumbnailPhotoImage: {
      borderWidth: 3,
      borderColor: '#FFD700',
    },
    selectedPhotoImage: {
      borderWidth: 3,
      borderColor: theme.colors.primary,
      opacity: 0.8,
    },
    selectionOverlay: {
      position: 'absolute',
      top: 5,
      right: 5,
    },
    selectionCheckbox: {
      width: 20,
      height: 20,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: theme.colors.textOnPrimary,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    selectedCheckbox: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
    checkmark: {
      color: theme.colors.textOnPrimary,
      fontSize: 12,
      fontWeight: 'bold',
    },
    photoDateContainer: {
      alignItems: 'center',
      marginBottom: 2,
    },
    photoDate: {
      fontSize: 12,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    },
    photoTimeAgo: {
      fontSize: 11,
      color: theme.colors.textTertiary,
      textAlign: 'center',
      marginTop: 1,
    },
  });
