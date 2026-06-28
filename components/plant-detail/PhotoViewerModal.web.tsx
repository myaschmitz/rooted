import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Image,
  Pressable,
} from 'react-native';
import { X, ChevronLeft, ChevronRight, Download } from 'lucide-react-native';
import { PlantPhoto } from '../../types/Plant';
import { PhotoService } from '../../services/PhotoService';
import { useTheme, Theme } from '../../contexts/ThemeContext';
import { BaseColors } from '../../styles/theme';

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
  currentIndex: initialIndex,
  currentThumbnailId,
  formattedDates,
  onClose,
  onDownload,
  onSetThumbnail,
}: PhotoViewerModalProps) {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [currentIndex, setCurrentIndex] = React.useState(initialIndex);

  React.useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex, visible]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!visible) return;
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && currentIndex > 0) setCurrentIndex(currentIndex - 1);
      if (e.key === 'ArrowRight' && currentIndex < photos.length - 1) setCurrentIndex(currentIndex + 1);
    },
    [visible, currentIndex, photos.length, onClose]
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown]);

  if (!visible || photos.length === 0 || currentIndex < 0) {
    return null;
  }

  const currentPhoto = photos[currentIndex];
  if (!currentPhoto) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.iconButton} onPress={() => onDownload(currentPhoto)}>
            <Download size={22} color={BaseColors.white} />
          </TouchableOpacity>
          <Text style={styles.counter}>
            {currentIndex + 1} / {photos.length}
          </Text>
          <TouchableOpacity style={styles.iconButton} onPress={onClose}>
            <X size={22} color={BaseColors.white} />
          </TouchableOpacity>
        </View>

        {/* Image area with navigation */}
        <View style={styles.imageArea}>
          {currentIndex > 0 && (
            <Pressable
              style={[styles.navButton, styles.navButtonLeft]}
              onPress={() => setCurrentIndex(currentIndex - 1)}
            >
              <ChevronLeft size={32} color={BaseColors.white} />
            </Pressable>
          )}

          <Image
            source={{ uri: PhotoService.getImageUrl(currentPhoto, false) }}
            style={styles.image}
            resizeMode="contain"
          />

          {currentIndex < photos.length - 1 && (
            <Pressable
              style={[styles.navButton, styles.navButtonRight]}
              onPress={() => setCurrentIndex(currentIndex + 1)}
            >
              <ChevronRight size={32} color={BaseColors.white} />
            </Pressable>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.dateText}>
            {formattedDates[currentPhoto.id]
              ? `${formattedDates[currentPhoto.id].date} (${formattedDates[currentPhoto.id].timeAgo})`
              : ''}
          </Text>
          <TouchableOpacity
            style={styles.thumbnailButton}
            onPress={() => onSetThumbnail(currentPhoto.id)}
          >
            <Text style={styles.thumbnailButtonText}>
              {currentThumbnailId === currentPhoto.id ? '\u2605 Thumbnail' : 'Set as Thumbnail'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const handleKey = (e: KeyboardEvent) => {
        if (visible && e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKey);
      return () => window.removeEventListener('keydown', handleKey);
    }
  }, [visible, onClose]);

  if (!visible || !thumbnailPhoto) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.header}>
          <View />
          <TouchableOpacity style={styles.iconButton} onPress={onClose}>
            <X size={22} color={BaseColors.white} />
          </TouchableOpacity>
        </View>
        <View style={styles.imageArea}>
          <Image
            source={{ uri: PhotoService.getImageUrl(thumbnailPhoto, false) }}
            style={styles.image}
            resizeMode="contain"
          />
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.95)',
      justifyContent: 'space-between',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 10,
    },
    counter: {
      color: BaseColors.white,
      fontSize: 16,
      fontWeight: '500',
    },
    iconButton: {
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      borderRadius: 20,
      width: 40,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
    },
    imageArea: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      position: 'relative',
    },
    image: {
      width: '90%',
      height: '90%',
    },
    navButton: {
      position: 'absolute',
      top: '50%',
      zIndex: 10,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      borderRadius: 24,
      width: 48,
      height: 48,
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: -24,
    },
    navButtonLeft: {
      left: 16,
    },
    navButtonRight: {
      right: 16,
    },
    footer: {
      padding: 20,
      alignItems: 'center',
    },
    dateText: {
      color: BaseColors.white,
      fontSize: 14,
      marginBottom: 12,
      opacity: 0.8,
    },
    thumbnailButton: {
      backgroundColor: theme.colors.surface,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: 8,
    },
    thumbnailButtonText: {
      color: theme.colors.text,
      fontSize: 14,
      fontWeight: '600',
    },
  });
