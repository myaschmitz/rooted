import { File, Directory, Paths } from 'expo-file-system';
import { Image } from 'expo-image';
import { PlantPhoto } from '../types/Plant';
import { CacheService } from './CacheService';

export class CachedPhotoService {
  private static get CACHE_DIR(): Directory {
    return new Directory(Paths.cache, 'photos');
  }
  private static get THUMBNAIL_CACHE_DIR(): Directory {
    return new Directory(Paths.cache, 'thumbnails');
  }
  private static readonly CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days for full photos
  private static readonly THUMBNAIL_CACHE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days for thumbnails
  private static readonly MAX_CACHE_SIZE = 100 * 1024 * 1024; // 100MB max cache size

  // Initialize cache directories
  static async initialize(): Promise<void> {
    try {
      await Promise.all([
        this.ensureCacheDirectory(this.CACHE_DIR),
        this.ensureCacheDirectory(this.THUMBNAIL_CACHE_DIR),
      ]);
      
      // Preload expo-image cache
      Image.clearMemoryCache();
    } catch (error) {
      console.error('Failed to initialize CachedPhotoService:', error);
    }
  }

  static async getCachedPhoto(photoUrl: string, isThumbail = false): Promise<string> {
    if (!photoUrl || !photoUrl.startsWith('http')) {
      return photoUrl;
    }

    const cacheDir = isThumbail ? this.THUMBNAIL_CACHE_DIR : this.CACHE_DIR;
    const fileName = this.getFileNameFromUrl(photoUrl);
    const localFile = new File(cacheDir, fileName);
    const duration = isThumbail ? this.THUMBNAIL_CACHE_DURATION : this.CACHE_DURATION;
    const cacheKey = `photo_cache_${isThumbail ? 'thumb' : 'full'}_${fileName}`;
    
    try {
      // Check if we have metadata about this cache entry
      const cacheMetadata = await CacheService.getCachedResponse<{ localPath: string; url: string }>(cacheKey);
      
      // Check if cached version exists and is fresh
      if (localFile.exists && cacheMetadata) {
        const fileInfo = await localFile.info();
        const modTime = (fileInfo as any).modificationTime || 0;
        const isExpired = Date.now() - modTime > duration;
        if (!isExpired) {
          return localFile.uri; // Return cached version
        } else {
          // Clean up expired file and metadata
          await localFile.delete();
          await CacheService.invalidateCache(cacheKey);
        }
      }
      
      // Download and cache
      await this.ensureCacheDirectory(cacheDir);
      
      // Download with better error handling and timeout
      const downloadResult = await this.downloadWithRetry(photoUrl, localFile.uri);
      
      if (downloadResult.success) {
        // Store cache metadata
        await CacheService.cacheApiResponse(cacheKey, {
          localPath: localFile.uri,
          url: photoUrl,
          cached_at: Date.now(),
        }, duration);
        
        return localFile.uri;
      } else {
        throw new Error(downloadResult.error || 'Download failed');
      }
    } catch (error) {
      console.warn(`Failed to cache photo ${photoUrl}:`, error);
      return photoUrl; // Fallback to original URL
    }
  }

  // Download with retry logic
  private static async downloadWithRetry(
    url: string, 
    localPath: string, 
    maxRetries: number = 2
  ): Promise<{ success: boolean; error?: string }> {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const downloadedFile = await File.downloadFileAsync(url, new File(localPath));
        if (downloadedFile) {
          return { success: true };
        } else {
          throw new Error('Download failed');
        }
      } catch (error) {
        if (attempt === maxRetries) {
          return { 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          };
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
      }
    }
    return { success: false, error: 'Max retries exceeded' };
  }

  static async getCachedPhotoUrl(photo: PlantPhoto, useThumbnail = false): Promise<string> {
    const imageUrl = useThumbnail && photo.thumbnail_path ? photo.thumbnail_path : photo.file_path;
    return this.getCachedPhoto(imageUrl, useThumbnail);
  }

  private static getFileNameFromUrl(url: string): string {
    try {
      // Extract filename from URL, handle query parameters and special characters
      const urlParts = url.split('?')[0].split('/');
      let filename = urlParts.pop() || '';
      
      // Clean filename of invalid characters
      filename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
      
      // Ensure we have a valid filename
      if (!filename || filename === '_') {
        filename = `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
      }
      
      // Ensure proper file extension
      if (!filename.match(/\.(jpg|jpeg|png|webp)$/i)) {
        filename += '.jpg';
      }
      
      return filename;
    } catch (error) {
      return `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
    }
  }

  private static async ensureCacheDirectory(dir: Directory): Promise<void> {
    try {
      if (!dir.exists) {
        await dir.create();
      }
    } catch (error) {
      console.error(`Failed to create cache directory ${dir.uri}:`, error);
      throw error;
    }
  }

  // Batch cache photos with improved performance and error handling
  static async batchCachePhotos(
    photos: PlantPhoto[], 
    prioritizeThumbnails = true, 
    maxConcurrent = 3
  ): Promise<{ cached: number; failed: number }> {
    const results = { cached: 0, failed: 0 };
    const promises: Promise<void>[] = [];
    
    // Process photos in batches to avoid overwhelming the system
    const batchSize = maxConcurrent;
    for (let i = 0; i < photos.length; i += batchSize) {
      const batch = photos.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (photo) => {
        try {
          if (prioritizeThumbnails && photo.thumbnail_path) {
            await this.getCachedPhoto(photo.thumbnail_path, true);
          } else {
            await this.getCachedPhoto(photo.file_path, false);
          }
          results.cached++;
        } catch (error) {
          console.warn(`Failed to cache photo for plant ${photo.plant_id}:`, error);
          results.failed++;
        }
      });

      await Promise.allSettled(batchPromises);
      
      // Small delay between batches to be nice to the system
      if (i + batchSize < photos.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`Batch caching completed: ${results.cached} cached, ${results.failed} failed`);
    return results;
  }

  // Preload critical images in background with priority system
  static async preloadThumbnails(
    photos: PlantPhoto[], 
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<void> {
    const maxPreload = priority === 'high' ? 20 : priority === 'medium' ? 10 : 5;
    const photosToPreload = photos.slice(0, maxPreload);
    
    // Fire and forget for background loading
    photosToPreload.forEach(photo => {
      if (photo.thumbnail_path) {
        this.getCachedPhoto(photo.thumbnail_path, true)
          .catch(() => {}); // Ignore errors for background preloading
      }
    });
  }

  // Smart cache cleanup that considers cache size limits
  static async cleanExpiredCache(): Promise<{ cleaned: number; errors: number; sizeFreed: number }> {
    let cleaned = 0;
    let errors = 0;
    let sizeFreed = 0;

    try {
      const directories = [
        { dir: this.CACHE_DIR, duration: this.CACHE_DURATION },
        { dir: this.THUMBNAIL_CACHE_DIR, duration: this.THUMBNAIL_CACHE_DURATION }
      ];
      
      for (const { dir, duration } of directories) {
        try {
          if (!dir.exists) continue;
          
          const files = await dir.list();
          
          // Get file info for all files
          const fileInfos = await Promise.all(
            files.map(async fileName => {
              const file = new File(dir, fileName);
              try {
                const info = await file.info();
                return { fileName, file, info };
              } catch (error) {
                return { fileName, file, info: null };
              }
            })
          );

          // Sort by modification time (oldest first) for smart cleanup
          const validFiles = fileInfos
            .filter(f => f.info?.exists)
            .sort((a, b) => ((a.info as any)?.modificationTime || 0) - ((b.info as any)?.modificationTime || 0));

          let currentDirSize = validFiles.reduce((sum, f) => sum + ((f.info as any)?.size || 0), 0);

          for (const { fileName, file, info } of validFiles) {
            try {
              if (!info?.exists) continue;
              
              const isExpired = Date.now() - ((info as any).modificationTime || 0) > duration;
              const shouldCleanForSpace = currentDirSize > this.MAX_CACHE_SIZE;
              
              if (isExpired || shouldCleanForSpace) {
                const fileSize = (info as any).size || 0;
                await file.delete();
                
                // Also remove cache metadata
                const cacheKey = `photo_cache_${dir.uri.includes('thumbnails') ? 'thumb' : 'full'}_${fileName}`;
                await CacheService.invalidateCache(cacheKey);
                
                cleaned++;
                sizeFreed += fileSize;
                currentDirSize -= fileSize;
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
      
      if (cleaned > 0) {
        console.log(`Cache cleanup: ${cleaned} files removed, ${(sizeFreed / 1024 / 1024).toFixed(2)}MB freed`);
      }
    } catch (error) {
      console.error('Failed to clean expired cache:', error);
      errors++;
    }

    return { cleaned, errors, sizeFreed };
  }

  static async clearAllCache(): Promise<{ success: boolean; error?: string }> {
    try {
      const directories = [this.CACHE_DIR, this.THUMBNAIL_CACHE_DIR];
      
      await Promise.all([
        // Clear file cache
        ...directories.map(async dir => {
          if (dir.exists) {
            await dir.delete();
          }
        }),
        // Clear expo-image memory cache
        Image.clearMemoryCache(),
        // Clear cache metadata
        CacheService.invalidateCachePattern('photo_cache_'),
      ]);
      
      return { success: true };
    } catch (error) {
      console.error('Failed to clear photo cache:', error);
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
    hitRate?: number;
  }> {
    let totalFiles = 0;
    let totalSize = 0;
    let photosCacheSize = 0;
    let thumbnailsCacheSize = 0;
    let oldestFile: Date | undefined;
    let newestFile: Date | undefined;

    try {
      const directories = [
        { dir: this.CACHE_DIR, type: 'photos' },
        { dir: this.THUMBNAIL_CACHE_DIR, type: 'thumbnails' }
      ];
      
      for (const { dir, type } of directories) {
        try {
          if (!dir.exists) continue;
          
          const files = await dir.list();
          
          for (const fileName of files) {
            const file = new File(dir, fileName);
            try {
              const fileInfo = await file.info();
              if (file.exists && typeof (fileInfo as any).size === 'number') {
                totalFiles++;
                totalSize += (fileInfo as any).size;
                
                if (type === 'photos') {
                  photosCacheSize += (fileInfo as any).size;
                } else {
                  thumbnailsCacheSize += (fileInfo as any).size;
                }
                
                const fileDate = new Date((fileInfo as any).modificationTime || 0);
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
      console.error('Failed to get photo cache stats:', error);
    }

    return {
      totalFiles,
      totalSize,
      photosCacheSize,
      thumbnailsCacheSize,
      oldestFile,
      newestFile,
    };
  }

  // Optimize cache by removing least recently used files when approaching size limit
  static async optimizeCache(): Promise<void> {
    try {
      const stats = await this.getCacheStats();
      
      if (stats.totalSize > this.MAX_CACHE_SIZE * 0.8) { // 80% threshold
        console.log('Cache optimization needed, current size:', (stats.totalSize / 1024 / 1024).toFixed(2), 'MB');
        await this.cleanExpiredCache();
      }
    } catch (error) {
      console.error('Failed to optimize cache:', error);
    }
  }

  // Prefetch photos for a specific plant
  static async prefetchPlantPhotos(plantId: string, photos: PlantPhoto[]): Promise<void> {
    const plantPhotos = photos.filter(p => p.plant_id === plantId);
    
    // Prioritize thumbnails for faster loading
    await this.preloadThumbnails(plantPhotos, 'high');
    
    // Background prefetch of full-size images (first few only)
    plantPhotos.slice(0, 3).forEach(photo => {
      this.getCachedPhoto(photo.file_path, false).catch(() => {});
    });
  }

  // Health check for cache system
  static async isHealthy(): Promise<boolean> {
    try {
      // Check if directories are accessible
      await Promise.all([
        this.ensureCacheDirectory(this.CACHE_DIR),
        this.ensureCacheDirectory(this.THUMBNAIL_CACHE_DIR),
      ]);
      
      return true;
    } catch (error) {
      console.error('Photo cache health check failed:', error);
      return false;
    }
  }
}