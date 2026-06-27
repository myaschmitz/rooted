import { logger } from "../utils/logger";
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

const CACHE_PREFIX = 'app-cache:';

export class CacheService {
  private static memoryCache = new Map<string, CacheEntry>();
  private static readonly MAX_MEMORY_CACHE_SIZE = 100;
  private static readonly DEFAULT_TTL = 300000; // 5 minutes default

  private static cleanMemoryCache(): void {
    if (this.memoryCache.size > this.MAX_MEMORY_CACHE_SIZE) {
      const now = Date.now();
      for (const [key, entry] of this.memoryCache) {
        if (entry.expiry < now) {
          this.memoryCache.delete(key);
        }
      }

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

      try {
        localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(cacheEntry));
      } catch (error) {
        console.warn('Failed to write to localStorage, using memory cache:', error);
      }

      this.cleanMemoryCache();
      this.memoryCache.set(key, cacheEntry);
    } catch (error) {
      console.error(`Failed to cache data for key ${key}:`, error);
    }
  }

  static async getCachedResponse<T = any>(key: string): Promise<T | null> {
    try {
      const now = Date.now();

      const memoryEntry = this.memoryCache.get(key);
      if (memoryEntry) {
        if (memoryEntry.expiry > now) {
          return memoryEntry.data as T;
        } else {
          this.memoryCache.delete(key);
        }
      }

      try {
        const cachedData = localStorage.getItem(CACHE_PREFIX + key);
        if (cachedData) {
          try {
            const cacheEntry: CacheEntry = JSON.parse(cachedData);
            if (cacheEntry.expiry > now) {
              this.cleanMemoryCache();
              this.memoryCache.set(key, cacheEntry);
              return cacheEntry.data as T;
            } else {
              localStorage.removeItem(CACHE_PREFIX + key);
            }
          } catch (parseError) {
            console.error(`Failed to parse cached data for key ${key}:`, parseError);
            localStorage.removeItem(CACHE_PREFIX + key);
          }
        }
      } catch (error) {
        console.warn('Failed to read from localStorage:', error);
      }

      return null;
    } catch (error) {
      console.error(`Failed to get cached data for key ${key}:`, error);
      return null;
    }
  }

  static async invalidateCache(key: string): Promise<void> {
    try {
      try {
        localStorage.removeItem(CACHE_PREFIX + key);
      } catch (error) {
        console.warn('Failed to delete from localStorage:', error);
      }
      this.memoryCache.delete(key);
    } catch (error) {
      console.error(`Failed to invalidate cache for key ${key}:`, error);
    }
  }

  static async invalidateCachePattern(pattern: string): Promise<number> {
    try {
      let removed = 0;

      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const storageKey = localStorage.key(i);
          if (storageKey && storageKey.startsWith(CACHE_PREFIX) && storageKey.includes(pattern)) {
            keysToRemove.push(storageKey);
            removed++;
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
      } catch (error) {
        console.warn('Failed to invalidate localStorage pattern:', error);
      }

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

      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const storageKey = localStorage.key(i);
          if (storageKey && storageKey.startsWith(CACHE_PREFIX)) {
            try {
              const cachedData = localStorage.getItem(storageKey);
              if (cachedData) {
                const cacheEntry: CacheEntry = JSON.parse(cachedData);
                if (cacheEntry.expiry < now) {
                  keysToRemove.push(storageKey);
                  cleaned++;
                }
              }
            } catch (error) {
              keysToRemove.push(storageKey);
              cleaned++;
            }
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
      } catch (error) {
        console.warn('Failed to cleanup localStorage cache:', error);
      }

      for (const [key, entry] of this.memoryCache) {
        if (entry.expiry < now) {
          this.memoryCache.delete(key);
          cleaned++;
        }
      }

      if (cleaned > 0) {
        logger.debug(`Cleaned up ${cleaned} expired cache entries`);
      }

      return { cleaned, errors: 0 };
    } catch (error) {
      console.error('Failed to cleanup expired cache:', error);
      return { cleaned: 0, errors: 1 };
    }
  }

  static async clearAllCache(): Promise<{ success: boolean; error?: string }> {
    try {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const storageKey = localStorage.key(i);
          if (storageKey && storageKey.startsWith(CACHE_PREFIX)) {
            keysToRemove.push(storageKey);
          }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
      } catch (error) {
        console.warn('Failed to clear localStorage cache:', error);
      }
      this.memoryCache.clear();
      logger.debug('All cache cleared successfully');
      return { success: true };
    } catch (error) {
      console.error('Failed to clear all cache:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  static async getCacheStats(): Promise<CacheStats> {
    try {
      const now = Date.now();
      let totalEntries = 0;
      let totalSize = 0;
      let expiredEntries = 0;
      let oldestEntry: Date | undefined;
      let newestEntry: Date | undefined;

      for (let i = 0; i < localStorage.length; i++) {
        const storageKey = localStorage.key(i);
        if (storageKey && storageKey.startsWith(CACHE_PREFIX)) {
          try {
            const cachedData = localStorage.getItem(storageKey);
            if (cachedData) {
              totalEntries++;
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
            // Skip corrupted entries
          }
        }
      }

      return {
        totalEntries: totalEntries + this.memoryCache.size,
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
      const keys: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const storageKey = localStorage.key(i);
        if (storageKey && storageKey.startsWith(CACHE_PREFIX)) {
          const key = storageKey.slice(CACHE_PREFIX.length);
          if (!pattern || key.includes(pattern)) {
            keys.push(key);
          }
        }
      }
      return keys;
    } catch (error) {
      console.error('Failed to get cache keys:', error);
      return [];
    }
  }

  static async cacheMultiple(entries: Array<{ key: string; data: any; ttl?: number }>): Promise<void> {
    try {
      const now = Date.now();
      entries.forEach(entry => {
        const expiry = now + (entry.ttl || this.DEFAULT_TTL);
        const cacheEntry: CacheEntry = {
          data: entry.data,
          expiry,
          created_at: now,
        };

        try {
          localStorage.setItem(CACHE_PREFIX + entry.key, JSON.stringify(cacheEntry));
        } catch (error) {
          console.warn(`Failed to cache entry ${entry.key} in localStorage:`, error);
        }

        this.cleanMemoryCache();
        this.memoryCache.set(entry.key, cacheEntry);
      });

      logger.debug(`Successfully cached ${entries.length} entries`);
    } catch (error) {
      console.error('Failed to cache multiple entries:', error);
    }
  }

  static async getCachedMultiple<T = any>(keys: string[]): Promise<Record<string, T | null>> {
    const cached: Record<string, T | null> = {};
    keys.forEach(key => {
      cached[key] = null;
    });

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

  static async performMaintenance(): Promise<void> {
    try {
      await this.cleanupExpiredCache();
      logger.debug('Cache maintenance completed');
    } catch (error) {
      console.error('Cache maintenance failed:', error);
    }
  }

  static async isHealthy(): Promise<boolean> {
    try {
      const testKey = 'health-check';
      const testValue = { test: true };
      await this.cacheApiResponse(testKey, testValue, 1000);
      const result = await this.getCachedResponse(testKey);
      await this.invalidateCache(testKey);
      return result !== null && (result as any).test === true;
    } catch (error) {
      console.error('Cache health check failed:', error);
      return false;
    }
  }

  static async warmUpCache(entries: Array<{ key: string; loader: () => Promise<any>; ttl?: number }>): Promise<void> {
    const promises = entries.map(async entry => {
      try {
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
