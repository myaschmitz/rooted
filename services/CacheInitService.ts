import { CacheService } from './CacheService';
import { logger } from "../utils/logger";
import { CachedPhotoService } from './CachedPhotoService';
import { CacheInvalidationService } from './CacheInvalidationService';

/**
 * Service to initialize and manage the caching system
 */
export class CacheInitService {
  private static initialized = false;
  private static cleanupInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize the entire caching system
   * Should be called once at app startup
   */
  static async initialize(): Promise<void> {
    if (this.initialized) {
      logger.debug('Cache system already initialized');
      return;
    }

    try {
      logger.debug('Initializing cache system...');
      
      // Initialize all cache services
      await Promise.all([
        CachedPhotoService.initialize(),
        CacheInvalidationService.initialize(),
        CacheService.isHealthy(), // This will initialize MMKV
      ]);

      // Set up periodic cleanup (every 30 minutes)
      this.setupPeriodicCleanup();

      this.initialized = true;
      logger.debug('Cache system initialized successfully');
      
      // Log cache health status
      this.logCacheHealth();
      
    } catch (error) {
      console.error('Failed to initialize cache system:', error);
      // Don't throw - let the app continue without caching if initialization fails
    }
  }

  /**
   * Set up periodic cache maintenance
   */
  private static setupPeriodicCleanup(): void {
    // Clean up every 30 minutes
    this.cleanupInterval = setInterval(async () => {
      try {
        await CacheInvalidationService.performPeriodicCleanup();
      } catch (error) {
        console.error('Periodic cache cleanup failed:', error);
      }
    }, 30 * 60 * 1000);
  }

  /**
   * Clean up cache system
   */
  static cleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.initialized = false;
  }

  /**
   * Get comprehensive cache statistics
   */
  static async getCacheStats(): Promise<any> {
    try {
      const [health, mmkvStats, photoStats] = await Promise.all([
        CacheInvalidationService.getCacheHealth(),
        CacheService.getCacheStats(),
        CachedPhotoService.getCacheStats(),
      ]);

      return {
        health,
        mmkv: mmkvStats,
        photos: photoStats,
        initialized: this.initialized,
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return null;
    }
  }

  /**
   * Clear all caches
   */
  static async clearAllCaches(): Promise<void> {
    try {
      logger.debug('Clearing all caches...');
      
      await Promise.all([
        CacheService.clearAllCache(),
        CachedPhotoService.clearAllCache(),
      ]);
      
      logger.debug('All caches cleared successfully');
    } catch (error) {
      console.error('Failed to clear all caches:', error);
      throw error;
    }
  }

  /**
   * Optimize all caches
   */
  static async optimizeCaches(): Promise<void> {
    try {
      logger.debug('Optimizing caches...');
      
      await Promise.all([
        CacheService.performMaintenance(),
        CachedPhotoService.optimizeCache(),
        CacheInvalidationService.performPeriodicCleanup(),
      ]);
      
      logger.debug('Cache optimization completed');
    } catch (error) {
      console.error('Failed to optimize caches:', error);
    }
  }

  /**
   * Check if the cache system is healthy
   */
  static async isHealthy(): Promise<boolean> {
    try {
      const [mmkvHealthy, photoHealthy] = await Promise.all([
        CacheService.isHealthy(),
        CachedPhotoService.isHealthy(),
      ]);

      return mmkvHealthy && photoHealthy;
    } catch (error) {
      console.error('Cache health check failed:', error);
      return false;
    }
  }

  /**
   * Log cache health status
   */
  private static async logCacheHealth(): Promise<void> {
    try {
      const health = await CacheInvalidationService.getCacheHealth();
      logger.debug(`Cache system health: ${health.overall}`);
      
      if (health.overall !== 'healthy') {
        console.warn('Cache system issues detected:', health);
      }
    } catch (error) {
      console.error('Failed to check cache health:', error);
    }
  }

  /**
   * Warm up caches with essential data
   * This can be called after user login to preload frequently accessed data
   */
  static async warmUpCaches(userId?: string): Promise<void> {
    try {
      logger.debug('Warming up caches...');
      
      // This could be extended to preload user-specific data
      // For now, we'll just let the natural app usage warm up the cache
      
      logger.debug('Cache warm-up completed');
    } catch (error) {
      console.error('Failed to warm up caches:', error);
    }
  }

  /**
   * Emergency cache reset - use with caution
   */
  static async emergencyReset(): Promise<void> {
    try {
      console.warn('Performing emergency cache reset...');
      
      // Clear all caches
      await this.clearAllCaches();
      
      // Reinitialize
      this.initialized = false;
      await this.initialize();
      
      logger.debug('Emergency cache reset completed');
    } catch (error) {
      console.error('Emergency cache reset failed:', error);
      throw error;
    }
  }

  /**
   * Get cache size information for monitoring
   */
  static async getCacheSizes(): Promise<{
    mmkv: { entries: number; sizeEstimate: string };
    photos: { files: number; size: string };
    total: string;
  }> {
    try {
      const [mmkvStats, photoStats] = await Promise.all([
        CacheService.getCacheStats(),
        CachedPhotoService.getCacheStats(),
      ]);

      const mmkvSizeEstimate = `${(mmkvStats.totalSize / 1024 / 1024).toFixed(2)} MB`;
      const photoSize = `${(photoStats.totalSize / 1024 / 1024).toFixed(2)} MB`;
      const totalSizeMB = (mmkvStats.totalSize + photoStats.totalSize) / 1024 / 1024;
      const totalSize = `${totalSizeMB.toFixed(2)} MB`;

      return {
        mmkv: {
          entries: mmkvStats.totalEntries,
          sizeEstimate: mmkvSizeEstimate,
        },
        photos: {
          files: photoStats.totalFiles,
          size: photoSize,
        },
        total: totalSize,
      };
    } catch (error) {
      console.error('Failed to get cache sizes:', error);
      return {
        mmkv: { entries: 0, sizeEstimate: '0 MB' },
        photos: { files: 0, size: '0 MB' },
        total: '0 MB',
      };
    }
  }
}