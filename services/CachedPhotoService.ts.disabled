import * as FileSystem from 'expo-file-system';
import { PlantPhoto } from '../types/Plant';

export class CachedPhotoService {
  private static readonly CACHE_DIR = `${FileSystem.cacheDirectory}photos/`;
  private static readonly THUMBNAIL_CACHE_DIR = `${FileSystem.cacheDirectory}thumbnails/`;
  private static readonly CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days for full photos
  private static readonly THUMBNAIL_CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days for thumbnails

  static async getCachedPhoto(photoUrl: string, isThumbail = false): Promise<string> {
    if (!photoUrl || !photoUrl.startsWith('http')) {
      return photoUrl;
    }

    const cacheDir = isThumbail ? this.THUMBNAIL_CACHE_DIR : this.CACHE_DIR;
    const fileName = this.getFileNameFromUrl(photoUrl);
    const localPath = `${cacheDir}${fileName}`;
    const duration = isThumbail ? this.THUMBNAIL_CACHE_DURATION : this.CACHE_DURATION;
    
    try {
      // Check if cached version exists and is fresh
      const fileInfo = await FileSystem.getInfoAsync(localPath);
      if (fileInfo.exists) {
        const isExpired = Date.now() - fileInfo.modificationTime > duration;
        if (!isExpired) {
          return localPath; // Return cached version
        } else {
          // Clean up expired file
          await FileSystem.deleteAsync(localPath).catch(() => {});
        }
      }
      
      // Download and cache
      await this.ensureCacheDirectory(cacheDir);
      await FileSystem.downloadAsync(photoUrl, localPath);
      return localPath;
    } catch (error) {
      console.warn(`Failed to cache photo ${photoUrl}:`, error);
      return photoUrl; // Fallback to original URL
    }
  }

  static async getCachedPhotoUrl(photo: PlantPhoto, useThumbnail = false): Promise<string> {
    const imageUrl = useThumbnail && photo.thumbnail_path ? photo.thumbnail_path : photo.file_path;
    return this.getCachedPhoto(imageUrl, useThumbnail);
  }

  private static getFileNameFromUrl(url: string): string {
    // Extract filename from URL, handle query parameters
    const urlParts = url.split('?')[0].split('/');
    const filename = urlParts.pop();
    return filename || `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
  }

  private static async ensureCacheDirectory(dir: string): Promise<void> {
    try {
      const dirInfo = await FileSystem.getInfoAsync(dir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      }
    } catch (error) {
      console.error(`Failed to create cache directory ${dir}:`, error);
      throw error;
    }
  }

  // Batch cache photos for performance
  static async batchCachePhotos(photos: PlantPhoto[], prioritizeThumbnails = true): Promise<void> {
    const promises: Promise<string>[] = [];
    
    photos.forEach(photo => {
      if (prioritizeThumbnails && photo.thumbnail_path) {
        promises.push(this.getCachedPhoto(photo.thumbnail_path, true));
      } else {
        promises.push(this.getCachedPhoto(photo.file_path, false));
      }
    });

    // Process in batches to avoid overwhelming the system
    const batchSize = 5;
    for (let i = 0; i < promises.length; i += batchSize) {
      const batch = promises.slice(i, i + batchSize);
      await Promise.allSettled(batch);
      
      // Small delay between batches
      if (i + batchSize < promises.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  // Preload critical images in background
  static async preloadThumbnails(photos: PlantPhoto[]): Promise<void> {
    // Don't await these - fire and forget for background loading
    photos.slice(0, 10).forEach(photo => {
      if (photo.thumbnail_path) {
        this.getCachedPhoto(photo.thumbnail_path, true).catch(() => {});
      }
    });
  }

  // Cache cleanup methods
  static async cleanExpiredCache(): Promise<{ cleaned: number; errors: number }> {
    let cleaned = 0;
    let errors = 0;

    try {
      const directories = [this.CACHE_DIR, this.THUMBNAIL_CACHE_DIR];
      
      for (const dir of directories) {
        const duration = dir === this.THUMBNAIL_CACHE_DIR ? this.THUMBNAIL_CACHE_DURATION : this.CACHE_DURATION;
        
        try {
          const dirInfo = await FileSystem.getInfoAsync(dir);
          if (!dirInfo.exists) continue;
          
          const files = await FileSystem.readDirectoryAsync(dir);
          
          for (const fileName of files) {
            const filePath = `${dir}${fileName}`;
            try {
              const fileInfo = await FileSystem.getInfoAsync(filePath);
              if (fileInfo.exists && Date.now() - fileInfo.modificationTime > duration) {
                await FileSystem.deleteAsync(filePath);
                cleaned++;
              }
            } catch (error) {
              console.warn(`Failed to clean cache file ${filePath}:`, error);
              errors++;
            }
          }
        } catch (error) {
          console.warn(`Failed to clean cache directory ${dir}:`, error);
          errors++;
        }
      }
    } catch (error) {
      console.error('Failed to clean expired cache:', error);
      errors++;
    }

    return { cleaned, errors };
  }

  static async clearAllCache(): Promise<{ success: boolean; error?: string }> {
    try {
      const directories = [this.CACHE_DIR, this.THUMBNAIL_CACHE_DIR];
      
      for (const dir of directories) {
        const dirInfo = await FileSystem.getInfoAsync(dir);
        if (dirInfo.exists) {
          await FileSystem.deleteAsync(dir, { idempotent: true });
        }
      }
      
      return { success: true };
    } catch (error) {
      console.error('Failed to clear cache:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async getCacheStats(): Promise<{
    totalFiles: number;
    totalSize: number;
    photosCacheSize: number;
    thumbnailsCacheSize: number;
    oldestFile?: Date;
    newestFile?: Date;
  }> {
    let totalFiles = 0;
    let totalSize = 0;
    let photosCacheSize = 0;
    let thumbnailsCacheSize = 0;
    let oldestFile: Date | undefined;
    let newestFile: Date | undefined;

    try {
      const directories = [
        { path: this.CACHE_DIR, type: 'photos' },
        { path: this.THUMBNAIL_CACHE_DIR, type: 'thumbnails' }
      ];
      
      for (const { path: dir, type } of directories) {
        try {
          const dirInfo = await FileSystem.getInfoAsync(dir);
          if (!dirInfo.exists) continue;
          
          const files = await FileSystem.readDirectoryAsync(dir);
          
          for (const fileName of files) {
            const filePath = `${dir}${fileName}`;
            try {
              const fileInfo = await FileSystem.getInfoAsync(filePath);
              if (fileInfo.exists && typeof fileInfo.size === 'number') {
                totalFiles++;
                totalSize += fileInfo.size;
                
                if (type === 'photos') {
                  photosCacheSize += fileInfo.size;
                } else {
                  thumbnailsCacheSize += fileInfo.size;
                }
                
                const fileDate = new Date(fileInfo.modificationTime);
                if (!oldestFile || fileDate < oldestFile) {
                  oldestFile = fileDate;
                }
                if (!newestFile || fileDate > newestFile) {
                  newestFile = fileDate;
                }
              }
            } catch (error) {
              console.warn(`Failed to get info for cache file ${filePath}:`, error);
            }
          }
        } catch (error) {
          console.warn(`Failed to read cache directory ${dir}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to get cache stats:', error);
    }

    return {
      totalFiles,
      totalSize,
      photosCacheSize,
      thumbnailsCacheSize,
      oldestFile,
      newestFile
    };
  }
}