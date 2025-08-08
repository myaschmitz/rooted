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

  static async init(): Promise<void> {
    if (this.initialized) return;

    try {
      console.log('Initializing cache database...');
      this.db = await SQLite.openDatabaseAsync('cache.db');
      
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
      throw new Error(`Cache initialization failed: ${error}`);
    }
  }

  private static async ensureInitialized(): Promise<void> {
    if (!this.initialized || !this.db) {
      await this.init();
    }
  }

  static async cacheApiResponse(key: string, data: any, ttl: number = 300000): Promise<void> {
    await this.ensureInitialized();
    if (!this.db) throw new Error('Cache database not initialized');

    try {
      const expiry = Date.now() + ttl;
      const serializedData = JSON.stringify(data);
      
      await this.db.runAsync(
        'INSERT OR REPLACE INTO api_cache (key, data, expiry) VALUES (?, ?, ?)',
        [key, serializedData, expiry]
      );
    } catch (error) {
      console.error(`Failed to cache data for key ${key}:`, error);
      throw error;
    }
  }

  static async getCachedResponse<T = any>(key: string): Promise<T | null> {
    await this.ensureInitialized();
    if (!this.db) return null;

    try {
      const result = await this.db.getFirstAsync<{ data: string; expiry: number }>(
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
    if (!this.db) return;

    try {
      await this.db.runAsync('DELETE FROM api_cache WHERE key = ?', [key]);
    } catch (error) {
      console.error(`Failed to invalidate cache for key ${key}:`, error);
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
    if (!this.db) return { cleaned: 0, errors: 1 };

    try {
      const result = await this.db.runAsync(
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
    if (!this.db) return { success: false, error: 'Database not initialized' };

    try {
      await this.db.runAsync('DELETE FROM api_cache');
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