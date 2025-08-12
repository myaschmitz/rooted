import { MMKV } from 'react-native-mmkv';

interface CacheEntry {
  data: any;
  expiry: number;
  created_at: number;
}

interface CacheStats {
  totalEntries: number;
  totalSize: number;
  oldestEntry?: Date;
  newestEntry?: Date;
  expiredEntries: number;
}

export class CacheService {
  private static storage: MMKV | null = null;
  private static initializationFailed = false;
  private static memoryCache = new Map<string, CacheEntry>();
  private static readonly MAX_MEMORY_CACHE_SIZE = 100;
  private static readonly DEFAULT_TTL = 300000; // 5 minutes default

  // Lazy initialization of MMKV storage
  private static async getStorage(): Promise<MMKV | null> {
    if (this.storage) return this.storage;
    if (this.initializationFailed) return null;

    try {
      this.storage = new MMKV({
        id: 'app-cache',
      });
      return this.storage;
    } catch (error) {
      console.warn('Failed to initialize MMKV, falling back to memory cache:', error);
      this.initializationFailed = true;
      return null;
    }
  }

  private static cleanMemoryCache(): void {
    if (this.memoryCache.size > this.MAX_MEMORY_CACHE_SIZE) {
      // Remove expired entries first
      const now = Date.now();
      for (const [key, entry] of this.memoryCache) {
        if (entry.expiry < now) {
          this.memoryCache.delete(key);
        }
      }
      
      // If still too many, remove oldest entries
      if (this.memoryCache.size > this.MAX_MEMORY_CACHE_SIZE) {
        const entries = Array.from(this.memoryCache.entries());
        const toRemove = Math.floor(entries.length * 0.25);
        const sorted = entries.sort((a, b) => a[1].created_at - b[1].created_at);
        for (let i = 0; i < toRemove; i++) {
          this.memoryCache.delete(sorted[i][0]);
        }
      }
    }
  }

  static async cacheApiResponse(key: string, data: any, ttl: number = this.DEFAULT_TTL): Promise<void> {
    try {
      const expiry = Date.now() + ttl;
      const cacheEntry: CacheEntry = {
        data,
        expiry,
        created_at: Date.now(),
      };

      // Try to store in MMKV (persistent)
      const storage = await this.getStorage();
      if (storage) {
        try {
          storage.set(key, JSON.stringify(cacheEntry));
        } catch (error) {
          console.warn('Failed to write to MMKV, using memory cache:', error);
        }
      }
      
      // Always store in memory cache for faster access (with cleanup)
      this.cleanMemoryCache();
      this.memoryCache.set(key, cacheEntry);
    } catch (error) {
      console.error(`Failed to cache data for key ${key}:`, error);
      // Don't throw - caching failures shouldn't break the app
    }
  }

  static async getCachedResponse<T = any>(key: string): Promise<T | null> {
    try {
      const now = Date.now();
      
      // Check memory cache first (fastest)
      const memoryEntry = this.memoryCache.get(key);
      if (memoryEntry) {
        if (memoryEntry.expiry > now) {
          return memoryEntry.data as T;
        } else {
          this.memoryCache.delete(key);
        }
      }

      // Check MMKV storage
      const storage = await this.getStorage();
      if (storage) {
        try {
          const cachedData = storage.getString(key);
          if (cachedData) {
            try {
              const cacheEntry: CacheEntry = JSON.parse(cachedData);
              
              if (cacheEntry.expiry > now) {
                // Update memory cache with valid entry
                this.cleanMemoryCache();
                this.memoryCache.set(key, cacheEntry);
                return cacheEntry.data as T;
              } else {
                // Remove expired entry
                storage.delete(key);
              }
            } catch (parseError) {
              console.error(`Failed to parse cached data for key ${key}:`, parseError);
              storage.delete(key);
            }
          }
        } catch (error) {
          console.warn('Failed to read from MMKV:', error);
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Failed to get cached data for key ${key}:`, error);
      return null;
    }
  }

  static async invalidateCache(key: string): Promise<void> {
    try {
      const storage = await this.getStorage();
      if (storage) {
        try {
          storage.delete(key);
        } catch (error) {
          console.warn('Failed to delete from MMKV:', error);
        }
      }
      this.memoryCache.delete(key);
    } catch (error) {
      console.error(`Failed to invalidate cache for key ${key}:`, error);
    }
  }

  static async invalidateCachePattern(pattern: string): Promise<number> {
    try {
      let removed = 0;
      
      // Remove from MMKV
      const storage = await this.getStorage();
      if (storage) {
        try {
          const keys = storage.getAllKeys();
          keys.forEach(key => {
            if (key.includes(pattern)) {
              storage.delete(key);
              removed++;
            }
          });
        } catch (error) {
          console.warn('Failed to invalidate MMKV pattern:', error);
        }
      }

      // Remove from memory cache
      for (const key of this.memoryCache.keys()) {
        if (key.includes(pattern)) {
          this.memoryCache.delete(key);
        }
      }

      return removed;
    } catch (error) {
      console.error(`Failed to invalidate cache pattern ${pattern}:`, error);
      return 0;
    }
  }

  static async cleanupExpiredCache(): Promise<{ cleaned: number; errors: number }> {
    try {
      let cleaned = 0;
      const now = Date.now();
      
      // Clean MMKV storage
      const storage = await this.getStorage();
      if (storage) {
        try {
          const keys = storage.getAllKeys();
          keys.forEach(key => {
            try {
              const cachedData = storage.getString(key);
              if (cachedData) {
                const cacheEntry: CacheEntry = JSON.parse(cachedData);
                if (cacheEntry.expiry < now) {
                  storage.delete(key);
                  cleaned++;
                }
              }
            } catch (error) {
              // Remove corrupted entries
              storage.delete(key);
              cleaned++;
            }
          });
        } catch (error) {
          console.warn('Failed to cleanup MMKV cache:', error);
        }
      }

      // Clean memory cache
      for (const [key, entry] of this.memoryCache) {
        if (entry.expiry < now) {
          this.memoryCache.delete(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        console.log(`Cleaned up ${cleaned} expired cache entries`);
      }
      
      return { cleaned, errors: 0 };
    } catch (error) {
      console.error('Failed to cleanup expired cache:', error);
      return { cleaned: 0, errors: 1 };
    }
  }

  static async clearAllCache(): Promise<{ success: boolean; error?: string }> {
    try {
      const storage = await this.getStorage();
      if (storage) {
        try {
          storage.clearAll();
        } catch (error) {
          console.warn('Failed to clear MMKV cache:', error);
        }
      }
      this.memoryCache.clear();
      console.log('All cache cleared successfully');
      return { success: true };
    } catch (error) {
      console.error('Failed to clear all cache:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async getCacheStats(): Promise<CacheStats> {
    try {
      const storage = await this.getStorage();
      if (!storage) {
        return {
          totalEntries: this.memoryCache.size,
          totalSize: 0,
          expiredEntries: 0,
        };
      }

      const keys = storage.getAllKeys();
      const now = Date.now();
      let totalSize = 0;
      let expiredEntries = 0;
      let oldestEntry: Date | undefined;
      let newestEntry: Date | undefined;
      
      keys.forEach(key => {
        try {
          const cachedData = storage.getString(key);
          if (cachedData) {
            totalSize += cachedData.length;
            const cacheEntry: CacheEntry = JSON.parse(cachedData);
            
            if (cacheEntry.expiry < now) {
              expiredEntries++;
            }
            
            const entryDate = new Date(cacheEntry.created_at);
            if (!oldestEntry || entryDate < oldestEntry) {
              oldestEntry = entryDate;
            }
            if (!newestEntry || entryDate > newestEntry) {
              newestEntry = entryDate;
            }
          }
        } catch (error) {
          // Skip corrupted entries in stats
        }
      });

      return {
        totalEntries: keys.length + this.memoryCache.size,
        totalSize,
        expiredEntries,
        oldestEntry,
        newestEntry,
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return {
        totalEntries: this.memoryCache.size,
        totalSize: 0,
        expiredEntries: 0,
      };
    }
  }

  static async getCacheKeys(pattern?: string): Promise<string[]> {
    try {
      const storage = await this.getStorage();
      if (!storage) return [];

      const keys = storage.getAllKeys();
      
      if (pattern) {
        return keys.filter(key => key.includes(pattern));
      }
      
      return keys;
    } catch (error) {
      console.error('Failed to get cache keys:', error);
      return [];
    }
  }

  // Batch operations for better performance
  static async cacheMultiple(entries: Array<{ key: string; data: any; ttl?: number }>): Promise<void> {
    try {
      const now = Date.now();
      const storage = await this.getStorage();
      
      entries.forEach(entry => {
        const expiry = now + (entry.ttl || this.DEFAULT_TTL);
        const cacheEntry: CacheEntry = {
          data: entry.data,
          expiry,
          created_at: now,
        };
        
        if (storage) {
          try {
            storage.set(entry.key, JSON.stringify(cacheEntry));
          } catch (error) {
            console.warn(`Failed to cache entry ${entry.key} in MMKV:`, error);
          }
        }
        
        // Also add to memory cache
        this.cleanMemoryCache();
        this.memoryCache.set(entry.key, cacheEntry);
      });
      
      console.log(`Successfully cached ${entries.length} entries`);
    } catch (error) {
      console.error('Failed to cache multiple entries:', error);
    }
  }

  // Get multiple cached entries
  static async getCachedMultiple<T = any>(keys: string[]): Promise<Record<string, T | null>> {
    const cached: Record<string, T | null> = {};
    
    // Initialize all keys to null
    keys.forEach(key => {
      cached[key] = null;
    });
    
    // Fill in cached values
    await Promise.all(
      keys.map(async key => {
        try {
          cached[key] = await this.getCachedResponse<T>(key);
        } catch (error) {
          console.error(`Failed to get cached data for key ${key}:`, error);
          cached[key] = null;
        }
      })
    );
    
    return cached;
  }

  // Periodic maintenance
  static async performMaintenance(): Promise<void> {
    try {
      // Clean up expired entries
      await this.cleanupExpiredCache();
      
      console.log('Cache maintenance completed');
    } catch (error) {
      console.error('Cache maintenance failed:', error);
    }
  }

  // Check if cache is healthy
  static async isHealthy(): Promise<boolean> {
    try {
      const testKey = 'health-check';
      const testValue = { test: true };
      
      // Test write
      await this.cacheApiResponse(testKey, testValue, 1000);
      
      // Test read
      const result = await this.getCachedResponse(testKey);
      
      // Cleanup test data
      await this.invalidateCache(testKey);
      
      return result !== null && result.test === true;
    } catch (error) {
      console.error('Cache health check failed:', error);
      return false;
    }
  }

  // Advanced cache management
  static async warmUpCache(entries: Array<{ key: string; loader: () => Promise<any>; ttl?: number }>): Promise<void> {
    const promises = entries.map(async entry => {
      try {
        // Only load if not already cached
        const cached = await this.getCachedResponse(entry.key);
        if (cached === null) {
          const data = await entry.loader();
          await this.cacheApiResponse(entry.key, data, entry.ttl);
        }
      } catch (error) {
        console.error(`Failed to warm up cache for key ${entry.key}:`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  // Get cache utilization info
  static async getCacheUtilization(): Promise<{
    memoryUsage: number;
    storageUsage: number;
    hitRate?: number;
  }> {
    try {
      const stats = await this.getCacheStats();
      
      return {
        memoryUsage: this.memoryCache.size,
        storageUsage: stats.totalEntries - this.memoryCache.size,
      };
    } catch (error) {
      console.error('Failed to get cache utilization:', error);
      return {
        memoryUsage: 0,
        storageUsage: 0,
      };
    }
  }
}