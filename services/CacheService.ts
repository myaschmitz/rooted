import * as SQLite from 'expo-sqlite';

interface CacheEntry {
  key: string;
  data: string;
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
  private static db: SQLite.SQLiteDatabase | null = null;
  private static initialized = false;
  private static initializationFailed = false;
  private static memoryCache = new Map<string, { data: any; expiry: number }>();
  private static readonly MAX_MEMORY_CACHE_SIZE = 50;

  static async init(): Promise<void> {
    if (this.initialized) return;
    if (this.initializationFailed) {
      console.warn('Cache initialization previously failed, using memory cache');
      return;
    }

    try {
      console.log('Initializing cache database...');
      this.db = await SQLite.openDatabaseAsync('cache.db');
      
      // Test basic database operations first
      await this.db.execAsync('SELECT 1');
      
      // Create cache table
      await this.db.execAsync(`
        PRAGMA journal_mode = WAL;
        
        CREATE TABLE IF NOT EXISTS api_cache (
          key TEXT PRIMARY KEY,
          data TEXT NOT NULL,
          expiry INTEGER NOT NULL,
          created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
          size INTEGER GENERATED ALWAYS AS (length(data)) STORED
        );
        
        CREATE INDEX IF NOT EXISTS idx_api_cache_expiry ON api_cache(expiry);
        CREATE INDEX IF NOT EXISTS idx_api_cache_created_at ON api_cache(created_at);
        CREATE INDEX IF NOT EXISTS idx_api_cache_size ON api_cache(size);
      `);

      // Clean up expired entries on initialization
      await this.cleanupExpiredCache();
      
      this.initialized = true;
      console.log('Cache database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize cache database:', error);
      console.warn('Falling back to memory-only cache for this session');
      this.initializationFailed = true;
      this.initialized = true; // Mark as initialized so we don't keep retrying
      // Don't throw - let the app continue with memory cache
    }
  }

  private static async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }
  }

  private static isUsingMemoryCache(): boolean {
    return this.initializationFailed || !this.db;
  }

  private static cleanMemoryCache(): void {
    if (this.memoryCache.size > this.MAX_MEMORY_CACHE_SIZE) {
      const entries = Array.from(this.memoryCache.entries());
      // Remove oldest 25% of entries
      const toRemove = Math.floor(entries.length * 0.25);
      const sorted = entries.sort((a, b) => a[1].expiry - b[1].expiry);
      for (let i = 0; i < toRemove; i++) {
        this.memoryCache.delete(sorted[i][0]);
      }
    }
  }

  static async cacheApiResponse(key: string, data: any, ttl: number = 300000): Promise<void> {
    await this.ensureInitialized();
    
    const expiry = Date.now() + ttl;
    
    if (this.isUsingMemoryCache()) {
      // Use memory cache as fallback
      this.cleanMemoryCache();
      this.memoryCache.set(key, { data, expiry });
      return;
    }

    try {
      const serializedData = JSON.stringify(data);
      
      await this.db!.runAsync(
        'INSERT OR REPLACE INTO api_cache (key, data, expiry) VALUES (?, ?, ?)',
        [key, serializedData, expiry]
      );
    } catch (error) {
      console.error(`Failed to cache data for key ${key}, falling back to memory:`, error);
      // Fallback to memory cache on error
      this.cleanMemoryCache();
      this.memoryCache.set(key, { data, expiry });
    }
  }

  static async getCachedResponse<T = any>(key: string): Promise<T | null> {
    await this.ensureInitialized();
    
    if (this.isUsingMemoryCache()) {
      // Use memory cache as fallback
      const cached = this.memoryCache.get(key);
      if (cached && cached.expiry > Date.now()) {
        return cached.data as T;
      }
      if (cached) {
        this.memoryCache.delete(key); // Remove expired
      }
      return null;
    }

    try {
      const result = await this.db!.getFirstAsync<{ data: string; expiry: number }>(
        'SELECT data, expiry FROM api_cache WHERE key = ? AND expiry > ?',
        [key, Date.now()]
      );
      
      if (result?.data) {
        try {
          return JSON.parse(result.data) as T;
        } catch (parseError) {
          console.error(`Failed to parse cached data for key ${key}:`, parseError);
          // Remove corrupted cache entry
          await this.invalidateCache(key);
          return null;
        }
      }
      
      return null;
    } catch (error) {
      console.error(`Failed to get cached data for key ${key}:`, error);
      return null;
    }
  }

  static async invalidateCache(key: string): Promise<void> {
    await this.ensureInitialized();
    
    if (this.isUsingMemoryCache()) {
      this.memoryCache.delete(key);
      return;
    }

    try {
      await this.db!.runAsync('DELETE FROM api_cache WHERE key = ?', [key]);
    } catch (error) {
      console.error(`Failed to invalidate cache for key ${key}:`, error);
      // Also try to remove from memory cache as fallback
      this.memoryCache.delete(key);
    }
  }

  static async invalidateCachePattern(pattern: string): Promise<number> {
    await this.ensureInitialized();
    if (!this.db) return 0;

    try {
      const result = await this.db.runAsync(
        'DELETE FROM api_cache WHERE key LIKE ?', 
        [`%${pattern}%`]
      );
      return result.changes || 0;
    } catch (error) {
      console.error(`Failed to invalidate cache pattern ${pattern}:`, error);
      return 0;
    }
  }

  static async cleanupExpiredCache(): Promise<{ cleaned: number; errors: number }> {
    await this.ensureInitialized();
    
    if (this.isUsingMemoryCache()) {
      // Clean memory cache
      let cleaned = 0;
      const now = Date.now();
      for (const [key, entry] of this.memoryCache) {
        if (entry.expiry < now) {
          this.memoryCache.delete(key);
          cleaned++;
        }
      }
      if (cleaned > 0) {
        console.log(`Cleaned up ${cleaned} expired memory cache entries`);
      }
      return { cleaned, errors: 0 };
    }

    try {
      const result = await this.db!.runAsync(
        'DELETE FROM api_cache WHERE expiry < ?', 
        [Date.now()]
      );
      
      const cleaned = result.changes || 0;
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
    await this.ensureInitialized();
    
    if (this.isUsingMemoryCache()) {
      this.memoryCache.clear();
      console.log('Memory cache cleared successfully');
      return { success: true };
    }

    try {
      await this.db!.runAsync('DELETE FROM api_cache');
      this.memoryCache.clear(); // Also clear memory cache
      console.log('All cache cleared successfully');
      return { success: true };
    } catch (error) {
      console.error('Failed to clear all cache:', error);
      // At least clear memory cache
      this.memoryCache.clear();
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  static async getCacheStats(): Promise<CacheStats> {
    await this.ensureInitialized();
    if (!this.db) {
      return {
        totalEntries: 0,
        totalSize: 0,
        expiredEntries: 0,
      };
    }

    try {
      const [countResult, sizeResult, expiredResult, dateResult] = await Promise.all([
        this.db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM api_cache'),
        this.db.getFirstAsync<{ total_size: number }>('SELECT SUM(size) as total_size FROM api_cache'),
        this.db.getFirstAsync<{ expired: number }>('SELECT COUNT(*) as expired FROM api_cache WHERE expiry < ?', [Date.now()]),
        this.db.getFirstAsync<{ oldest: number; newest: number }>('SELECT MIN(created_at) as oldest, MAX(created_at) as newest FROM api_cache')
      ]);

      return {
        totalEntries: countResult?.count || 0,
        totalSize: sizeResult?.total_size || 0,
        expiredEntries: expiredResult?.expired || 0,
        oldestEntry: dateResult?.oldest ? new Date(dateResult.oldest) : undefined,
        newestEntry: dateResult?.newest ? new Date(dateResult.newest) : undefined,
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return {
        totalEntries: 0,
        totalSize: 0,
        expiredEntries: 0,
      };
    }
  }

  static async getCacheKeys(pattern?: string): Promise<string[]> {
    await this.ensureInitialized();
    if (!this.db) return [];

    try {
      let query = 'SELECT key FROM api_cache';
      let params: any[] = [];
      
      if (pattern) {
        query += ' WHERE key LIKE ?';
        params = [`%${pattern}%`];
      }
      
      query += ' ORDER BY created_at DESC';
      
      const results = await this.db.getAllAsync<{ key: string }>(query, params);
      return results.map(row => row.key);
    } catch (error) {
      console.error('Failed to get cache keys:', error);
      return [];
    }
  }

  // Batch operations for better performance
  static async cacheMultiple(entries: Array<{ key: string; data: any; ttl?: number }>): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Cache database not initialized');

    try {
      await this.db.execAsync('BEGIN TRANSACTION');
      
      for (const entry of entries) {
        const expiry = Date.now() + (entry.ttl || 300000);
        const serializedData = JSON.stringify(entry.data);
        
        await this.db.runAsync(
          'INSERT OR REPLACE INTO api_cache (key, data, expiry) VALUES (?, ?, ?)',
          [entry.key, serializedData, expiry]
        );
      }
      
      await this.db.execAsync('COMMIT');
      console.log(`Successfully cached ${entries.length} entries`);
    } catch (error) {
      await this.db.execAsync('ROLLBACK');
      console.error('Failed to cache multiple entries:', error);
      throw error;
    }
  }

  // Get multiple cached entries
  static async getCachedMultiple<T = any>(keys: string[]): Promise<Record<string, T | null>> {
    await this.ensureInitialized();
    if (!this.db) return {};

    try {
      const placeholders = keys.map(() => '?').join(',');
      const results = await this.db.getAllAsync<{ key: string; data: string }>(
        `SELECT key, data FROM api_cache WHERE key IN (${placeholders}) AND expiry > ?`,
        [...keys, Date.now()]
      );
      
      const cached: Record<string, T | null> = {};
      
      // Initialize all keys to null
      keys.forEach(key => {
        cached[key] = null;
      });
      
      // Fill in cached values
      results.forEach(row => {
        try {
          cached[row.key] = JSON.parse(row.data) as T;
        } catch (parseError) {
          console.error(`Failed to parse cached data for key ${row.key}:`, parseError);
          cached[row.key] = null;
        }
      });
      
      return cached;
    } catch (error) {
      console.error('Failed to get multiple cached entries:', error);
      const result: Record<string, T | null> = {};
      keys.forEach(key => {
        result[key] = null;
      });
      return result;
    }
  }

  // Cache with compression for large data
  static async cacheCompressed(key: string, data: any, ttl: number = 300000): Promise<void> {
    // For now, just use regular caching. In the future, we could add compression
    // using libraries like pako or lz-string for large payloads
    return this.cacheApiResponse(key, data, ttl);
  }

  // Periodic maintenance - should be called periodically
  static async performMaintenance(): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) return;

    try {
      // Clean up expired entries
      await this.cleanupExpiredCache();
      
      // Optimize database
      await this.db.execAsync('VACUUM');
      await this.db.execAsync('ANALYZE');
      
      console.log('Cache maintenance completed');
    } catch (error) {
      console.error('Cache maintenance failed:', error);
    }
  }

  // Close database connection (useful for testing)
  static async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
      this.initialized = false;
    }
  }
}