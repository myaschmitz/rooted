import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import ImageViewing from 'react-native-image-viewing';
import { X, Download } from 'lucide-react-native';
import { PlantPhoto } from '../../types/Plant';
import { PhotoService } from '../../services/PhotoService';
import { useTheme, Theme } from '../../contexts/ThemeContext';
import { BaseColors } from '../../styles/theme';
import { TextSkeleton } from '../Skeleton';

interface FormattedDate {
  date: string;
  timeAgo: string;
}

interface PhotoViewerModalProps {
  visible: boolean;
  photos: PlantPhoto[];
  currentIndex: number;
  currentThumbnailId: string | null;
  formattedDates: { [key: string]: FormattedDate };
  onClose: () => void;
  onDownload: (photo: PlantPhoto) => void;
  onSetThumbnail: (photoId: string) => void;
}

export default function PhotoViewerModal({
  visible,
  photos,
  currentIndex,
  currentThumbnailId,
  formattedDates,
  onClose,
  onDownload,
  onSetThumbnail,
}: PhotoViewerModalProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  if (photos.length === 0) {
    return null;
  }

  return (
    <ImageViewing
      images={photos.map((photo) => ({ uri: PhotoService.getImageUrl(photo, false) }))}
      imageIndex={Math.max(0, currentIndex)}
      visible={visible && photos.length > 0 && currentIndex >= 0}
      onRequestClose={onClose}
      swipeToCloseEnabled={false}
      HeaderComponent={({ imageIndex }) => {
        const currentPhoto = photos[imageIndex];
        if (!currentPhoto) {
          return (
            <View style={styles.imageViewerHeader}>
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <X size={24} color={BaseColors.white} />
              </TouchableOpacity>
            </View>
          );
        }
        return (
          <View style={styles.imageViewerHeader}>
            <TouchableOpacity
              style={styles.downloadButton}
              onPress={() => onDownload(currentPhoto)}
            >
              <Download size={24} color={BaseColors.white} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={24} color={BaseColors.white} />
            </TouchableOpacity>
          </View>
        );
      }}
      FooterComponent={({ imageIndex }) => {
        const currentPhoto = photos[imageIndex];
        if (!currentPhoto) {
          return (
            <View style={styles.imageViewerFooter}>
              <View style={styles.photoInfo}>
                <TextSkeleton width={100} height={14} />
                {photos.length > 1 && (
                  <Text style={styles.photoCounter}>
                    {imageIndex + 1} of {photos.length}
                  </Text>
                )}
              </View>
            </View>
          );
        }
        return (
          <View style={styles.imageViewerFooter}>
            <View style={styles.photoInfo}>
              <Text style={styles.photoInfoText}>
                {formattedDates[currentPhoto.id]
                  ? `${formattedDates[currentPhoto.id].date} (${formattedDates[currentPhoto.id].timeAgo})`
                  : ''}
              </Text>
              {photos.length > 1 && (
                <Text style={styles.photoCounter}>
                  {imageIndex + 1} of {photos.length}
                </Text>
              )}
            </View>

            <TouchableOpacity
              style={styles.thumbnailButton}
              onPress={() => onSetThumbnail(currentPhoto.id)}
            >
              <Text style={styles.thumbnailButtonText}>
                {currentThumbnailId === currentPhoto.id ? '★ Thumbnail' : 'Set as Thumbnail'}
              </Text>
            </TouchableOpacity>
          </View>
        );
      }}
    />
  );
}

interface ThumbnailViewerModalProps {
  visible: boolean;
  thumbnailPhoto: PlantPhoto | null | undefined;
  onClose: () => void;
}

export function ThumbnailViewerModal({
  visible,
  thumbnailPhoto,
  onClose,
}: ThumbnailViewerModalProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);

  if (!thumbnailPhoto) {
    return null;
  }

  return (
    <ImageViewing
      images={[{ uri: PhotoService.getImageUrl(thumbnailPhoto, false) }]}
      imageIndex={0}
      visible={visible}
      onRequestClose={onClose}
      swipeToCloseEnabled={true}
      doubleTapToZoomEnabled={true}
      presentationStyle="overFullScreen"
      HeaderComponent={() => (
        <View style={styles.thumbnailViewerHeader}>
          <TouchableOpacity style={styles.thumbnailCloseButton} onPress={onClose}>
            <X size={24} color={BaseColors.white} />
          </TouchableOpacity>
        </View>
      )}
    />
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    imageViewerHeader: {
      position: 'absolute',
      top: 50,
      left: 0,
      right: 0,
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      zIndex: 1000,
    },
    downloadButton: {
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      borderRadius: 20,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    closeButton: {
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      borderRadius: 20,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    imageViewerFooter: {
      padding: 20,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
    },
    photoInfo: {
      backgroundColor: 'rgba(0, 0, 0, 0.7)',
      padding: 15,
      borderRadius: 8,
      marginBottom: 10,
    },
    photoInfoText: {
      color: theme.colors.textOnPrimary,
      fontSize: 16,
      textAlign: 'center',
    },
    photoCounter: {
      color: theme.colors.textOnPrimary,
      fontSize: 14,
      textAlign: 'center',
      marginTop: 5,
      opacity: 0.8,
    },
    thumbnailButton: {
      backgroundColor: theme.colors.surface,
      padding: 15,
      borderRadius: 8,
      alignItems: 'center',
    },
    thumbnailButtonText: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '600',
    },
    thumbnailViewerHeader: {
      position: 'absolute',
      top: 50,
      right: 20,
      zIndex: 1000,
    },
    thumbnailCloseButton: {
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      borderRadius: 20,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });
