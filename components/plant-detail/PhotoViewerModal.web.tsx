import React, { useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  PressableStateCallbackType,
  StyleProp,
  ImageStyle,
} from 'react-native';
import { Image } from 'expo-image';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { PlantPhoto } from '../../types/Plant';
import { PhotoService } from '../../services/PhotoService';
import { BaseColors } from '../../styles/theme';
import { getPrefetchOrder } from '../../utils/photoPrefetch';
import { FormattedDate, PhotoViewerHeader, PhotoViewerFooter } from './PhotoViewerChrome';

// react-native-web adds `hovered` to the Pressable state; RN types only know `pressed`.
const isHovered = (state: PressableStateCallbackType) =>
  !!(state as PressableStateCallbackType & { hovered?: boolean }).hovered;

/**
 * Full-size photo that shows the small thumbnail right away and fades to the
 * full image once it has downloaded.
 */
function ProgressivePhoto({ photo, style }: { photo: PlantPhoto; style: StyleProp<ImageStyle> }) {
  return (
    <Image
      source={{ uri: PhotoService.getImageUrl(photo, false) }}
      placeholder={photo.thumbnail_path ? { uri: photo.thumbnail_path } : undefined}
      placeholderContentFit="contain"
      contentFit="contain"
      transition={150}
      cachePolicy="memory-disk"
      recyclingKey={photo.id}
      style={style}
    />
  );
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

  // Download the next and previous photos in the background so moving
  // between photos is instant.
  useEffect(() => {
    if (!visible) return;
    const neighborUrls = getPrefetchOrder(currentIndex, photos.length)
      .slice(1)
      .map((index) => PhotoService.getImageUrl(photos[index], false));
    if (neighborUrls.length > 0) {
      Image.prefetch(neighborUrls, 'memory-disk').catch(() => {});
    }
  }, [visible, currentIndex, photos]);

  if (!visible || photos.length === 0 || currentIndex < 0) {
    return null;
  }

  const currentPhoto = photos[currentIndex];
  if (!currentPhoto) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <PhotoViewerHeader
          index={currentIndex}
          total={photos.length}
          onClose={onClose}
          onDownload={() => onDownload(currentPhoto)}
        />

        <View style={styles.imageArea}>
          <ProgressivePhoto photo={currentPhoto} style={styles.image} />

          {currentIndex > 0 && (
            <Pressable
              style={(state) => [
                styles.navButton,
                styles.navButtonLeft,
                isHovered(state) && styles.navButtonHovered,
              ]}
              onPress={() => setCurrentIndex(currentIndex - 1)}
              accessibilityRole="button"
              accessibilityLabel="Previous photo"
            >
              <ChevronLeft size={26} color={BaseColors.white} />
            </Pressable>
          )}

          {currentIndex < photos.length - 1 && (
            <Pressable
              style={(state) => [
                styles.navButton,
                styles.navButtonRight,
                isHovered(state) && styles.navButtonHovered,
              ]}
              onPress={() => setCurrentIndex(currentIndex + 1)}
              accessibilityRole="button"
              accessibilityLabel="Next photo"
            >
              <ChevronRight size={26} color={BaseColors.white} />
            </Pressable>
          )}
        </View>

        <PhotoViewerFooter
          formattedDate={formattedDates[currentPhoto.id]}
          isThumbnail={currentThumbnailId === currentPhoto.id}
          onSetThumbnail={() => onSetThumbnail(currentPhoto.id)}
        />
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
        <PhotoViewerHeader index={0} total={1} onClose={onClose} />
        <View style={styles.imageArea}>
          <ProgressivePhoto photo={thumbnailPhoto} style={styles.image} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: BaseColors.black,
  },
  imageArea: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  navButton: {
    position: 'absolute',
    top: '50%',
    marginTop: -22,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  navButtonHovered: {
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  navButtonLeft: {
    left: 20,
  },
  navButtonRight: {
    right: 20,
  },
});
