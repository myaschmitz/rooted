import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Image, ImageProps } from 'expo-image';
import { CachedPhotoService } from '../services/CachedPhotoService';
import { PlantPhoto } from '../types/Plant';

interface CachedImageProps extends Omit<ImageProps, 'source'> {
  source: string | { uri: string } | PlantPhoto;
  useThumbnail?: boolean;
  showLoader?: boolean;
  fallbackSource?: string;
  cachePolicy?: 'memory' | 'disk' | 'memory-disk';
  priority?: 'high' | 'normal' | 'low';
  onCacheHit?: () => void;
  onCacheMiss?: () => void;
}

export const CachedImage: React.FC<CachedImageProps> = ({
  source,
  useThumbnail = false,
  showLoader = true,
  fallbackSource,
  cachePolicy = 'memory-disk',
  priority = 'medium',
  style,
  onCacheHit,
  onCacheMiss,
  onLoad,
  onError,
  ...props
}) => {
  const [imageSource, setImageSource] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    loadImage();
  }, [source, useThumbnail]);

  const loadImage = async () => {
    try {
      setIsLoading(true);
      setHasError(false);

      let imageUrl: string;

      // Handle different source types
      if (typeof source === 'string') {
        imageUrl = source;
      } else if (source && typeof source === 'object' && 'uri' in source) {
        imageUrl = source.uri;
      } else if (source && typeof source === 'object' && 'file_path' in source) {
        // PlantPhoto object
        const photo = source as PlantPhoto;
        imageUrl = await CachedPhotoService.getCachedPhotoUrl(photo, useThumbnail);
        
        // Check if we got a cached version
        if (imageUrl !== photo.file_path && imageUrl !== photo.thumbnail_path) {
          onCacheHit?.();
        } else {
          onCacheMiss?.();
        }
      } else {
        throw new Error('Invalid image source');
      }

      // For HTTP URLs, use our caching service
      if (imageUrl.startsWith('http')) {
        const cachedUrl = await CachedPhotoService.getCachedPhoto(imageUrl, useThumbnail);
        setImageSource(cachedUrl);
        
        if (cachedUrl !== imageUrl) {
          onCacheHit?.();
        } else {
          onCacheMiss?.();
        }
      } else {
        // For local files, use directly
        setImageSource(imageUrl);
      }
    } catch (error) {
      console.error('Failed to load cached image:', error);
      setHasError(true);
      
      // Try fallback source
      if (fallbackSource) {
        setImageSource(fallbackSource);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoad = (event: any) => {
    setIsLoading(false);
    setHasError(false);
    onLoad?.(event);
  };

  const handleError = (error: any) => {
    console.warn('Image load error:', error);
    setHasError(true);
    setIsLoading(false);
    
    // Try fallback source
    if (fallbackSource && imageSource !== fallbackSource) {
      setImageSource(fallbackSource);
      return;
    }
    
    onError?.(error);
  };

  const getCachePolicy = () => {
    switch (cachePolicy) {
      case 'memory':
        return 'memory';
      case 'disk':
        return 'disk';
      case 'memory-disk':
      default:
        return 'memory';
    }
  };

  const getPriority = () => {
    switch (priority) {
      case 'high':
        return 'high';
      case 'low':
        return 'low';
      case 'normal':
      default:
        return 'normal';
    }
  };

  if (!imageSource && !isLoading && !hasError) {
    return null;
  }

  return (
    <View style={[styles.container, style]}>
      {imageSource && (
        <Image
          {...props}
          source={{ uri: imageSource }}
          style={[StyleSheet.absoluteFill, style]}
          onLoad={handleLoad}
          onError={handleError}
          cachePolicy={getCachePolicy()}
          priority={getPriority() as any}
          placeholder={{
            blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4', // Generic plant-like blurhash
            width: 400,
            height: 300,
          }}
          transition={200}
        />
      )}
      
      {showLoader && isLoading && (
        <View style={styles.loader}>
          <ActivityIndicator size="small" color="#4CAF50" />
        </View>
      )}
      
      {hasError && fallbackSource && imageSource === fallbackSource && (
        <View style={styles.error}>
          <View style={styles.errorPlaceholder} />
        </View>
      )}
    </View>
  );
};

// Specialized component for plant photos
interface PlantPhotoImageProps extends Omit<CachedImageProps, 'source'> {
  photo: PlantPhoto;
  useThumbnail?: boolean;
}

export const PlantPhotoImage: React.FC<PlantPhotoImageProps> = ({
  photo,
  useThumbnail = false,
  ...props
}) => {
  return (
    <CachedImage
      {...props}
      source={photo}
      useThumbnail={useThumbnail}
    />
  );
};

// Component for plant thumbnails specifically
interface PlantThumbnailImageProps extends Omit<CachedImageProps, 'source' | 'useThumbnail'> {
  photo: PlantPhoto;
  size?: number;
}

export const PlantThumbnailImage: React.FC<PlantThumbnailImageProps> = ({
  photo,
  size = 100,
  style,
  ...props
}) => {
  const thumbnailStyle = {
    width: size,
    height: size,
    borderRadius: size / 10,
  };

  return (
    <CachedImage
      {...props}
      source={photo}
      useThumbnail={true}
      style={[thumbnailStyle, style]}
      priority="high" // Thumbnails should load quickly
      cachePolicy="memory-disk"
      contentFit="cover"
    />
  );
};

// Progressive image component that loads thumbnail first, then full image
interface ProgressiveImageProps extends Omit<CachedImageProps, 'source'> {
  photo: PlantPhoto;
}

export const ProgressiveImage: React.FC<ProgressiveImageProps> = ({
  photo,
  style,
  onLoad,
  ...props
}) => {
  const [thumbnailLoaded, setThumbnailLoaded] = useState(false);
  const [fullImageLoaded, setFullImageLoaded] = useState(false);

  const handleThumbnailLoad = () => {
    setThumbnailLoaded(true);
  };

  const handleFullImageLoad = (event: any) => {
    setFullImageLoaded(true);
    onLoad?.(event);
  };

  return (
    <View style={style}>
      {/* Thumbnail layer - loads first */}
      <CachedImage
        {...props}
        source={photo}
        useThumbnail={true}
        style={[StyleSheet.absoluteFill, style]}
        onLoad={handleThumbnailLoad}
        showLoader={!thumbnailLoaded}
      />
      
      {/* Full image layer - loads after thumbnail */}
      <CachedImage
        {...props}
        source={photo}
        useThumbnail={false}
        style={[
          StyleSheet.absoluteFill, 
          style, 
          { opacity: fullImageLoaded ? 1 : 0 }
        ]}
        onLoad={handleFullImageLoad}
        showLoader={false}
        priority="low" // Lower priority since thumbnail shows first
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 245, 245, 0.8)',
  },
  error: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorPlaceholder: {
    width: 40,
    height: 40,
    backgroundColor: '#e0e0e0',
    borderRadius: 20,
  },
});

// Utility functions for preloading
export const preloadImages = async (photos: PlantPhoto[], priority: 'high' | 'medium' | 'low' = 'medium') => {
  await CachedPhotoService.preloadThumbnails(photos, priority);
};

export const clearImageCache = async () => {
  await Promise.all([
    CachedPhotoService.clearAllCache(),
    Image.clearMemoryCache(),
  ]);
};