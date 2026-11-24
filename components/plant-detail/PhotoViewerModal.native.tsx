import React from 'react';
import ImageViewing from 'react-native-image-viewing';
import { PlantPhoto } from '../../types/Plant';
import { FormattedDate, PhotoViewerHeader, PhotoViewerFooter } from './PhotoViewerChrome';
import { useProgressivePhotoSources } from './useProgressivePhotoSources';

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
  const isOpen = visible && photos.length > 0 && currentIndex >= 0;
  const [activeIndex, setActiveIndex] = React.useState(currentIndex);

  React.useEffect(() => {
    setActiveIndex(currentIndex);
  }, [currentIndex, visible]);

  const images = useProgressivePhotoSources(photos, activeIndex, isOpen);

  if (photos.length === 0) {
    return null;
  }

  return (
    <ImageViewing
      images={images}
      imageIndex={Math.max(0, currentIndex)}
      visible={isOpen}
      onRequestClose={onClose}
      onImageIndexChange={setActiveIndex}
      swipeToCloseEnabled={false}
      HeaderComponent={({ imageIndex }) => {
        const currentPhoto = photos[imageIndex];
        return (
          <PhotoViewerHeader
            index={imageIndex}
            total={photos.length}
            onClose={onClose}
            onDownload={currentPhoto ? () => onDownload(currentPhoto) : undefined}
          />
        );
      }}
      FooterComponent={({ imageIndex }) => {
        const currentPhoto = photos[imageIndex];
        return (
          <PhotoViewerFooter
            formattedDate={currentPhoto ? formattedDates[currentPhoto.id] : undefined}
            isThumbnail={!!currentPhoto && currentThumbnailId === currentPhoto.id}
            onSetThumbnail={currentPhoto ? () => onSetThumbnail(currentPhoto.id) : undefined}
          />
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
  const photos = React.useMemo(
    () => (thumbnailPhoto ? [thumbnailPhoto] : []),
    [thumbnailPhoto],
  );
  const images = useProgressivePhotoSources(photos, 0, visible && !!thumbnailPhoto);

  if (!thumbnailPhoto) {
    return null;
  }

  return (
    <ImageViewing
      images={images}
      imageIndex={0}
      visible={visible}
      onRequestClose={onClose}
      swipeToCloseEnabled={true}
      doubleTapToZoomEnabled={true}
      presentationStyle="overFullScreen"
      HeaderComponent={() => <PhotoViewerHeader index={0} total={1} onClose={onClose} />}
    />
  );
}
