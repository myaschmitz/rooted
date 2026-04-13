import { PlantPhoto } from '../types/Plant';

/**
 * Web implementation of CachedPhotoService.
 * On web, the browser handles image caching natively via HTTP cache headers.
 * We simply return the original URLs without local file system caching.
 */
export class CachedPhotoService {
  static async initialize(): Promise<void> {
    // No-op on web — browser cache handles this
  }

  static async getCachedPhoto(photoUrl: string, _isThumbnail = false): Promise<string> {
    return photoUrl;
  }

  static async getCachedPhotoUrl(photo: PlantPhoto, useThumbnail = false): Promise<string> {
    const imageUrl = useThumbnail && photo.thumbnail_path ? photo.thumbnail_path : photo.file_path;
    return imageUrl;
  }

  static async batchCachePhotos(
    _photos: PlantPhoto[],
    _prioritizeThumbnails = true,
    _maxConcurrent = 3
  ): Promise<{ cached: number; failed: number }> {
    // No-op on web
    return { cached: 0, failed: 0 };
  }

  static async preloadThumbnails(
    photos: PlantPhoto[],
    _priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<void> {
    // Preload using browser Image objects for faster rendering
    photos.slice(0, 10).forEach(photo => {
      if (photo.thumbnail_path) {
        const img = new window.Image();
        img.src = photo.thumbnail_path;
      }
    });
  }

  static async cleanExpiredCache(): Promise<{ cleaned: number; errors: number; sizeFreed: number }> {
    return { cleaned: 0, errors: 0, sizeFreed: 0 };
  }

  static async clearAllCache(): Promise<{ success: boolean; error?: string }> {
    return { success: true };
  }

  static async getCacheStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    photosCacheSize: number;
    thumbnailsCacheSize: number;
    oldestFile?: Date;
    newestFile?: Date;
    hitRate?: number;
  }> {
    return {
      totalFiles: 0,
      totalSize: 0,
      photosCacheSize: 0,
      thumbnailsCacheSize: 0,
    };
  }

  static async optimizeCache(): Promise<void> {
    // No-op on web
  }

  static async prefetchPlantPhotos(_plantId: string, photos: PlantPhoto[]): Promise<void> {
    await this.preloadThumbnails(photos, 'high');
  }

  static async isHealthy(): Promise<boolean> {
    return true;
  }
}
