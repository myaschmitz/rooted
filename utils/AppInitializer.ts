import { DatabaseService } from '../services/DatabaseService';
import { CacheService } from '../services/CacheService';

export class AppInitializer {
  static async initialize(): Promise<void> {
    try {
      // Initialize local cache first (always works)
      try {
        await CacheService.init();
        console.log('Local cache initialized successfully');
      } catch (cacheError) {
        console.error('Failed to initialize local cache:', cacheError);
        // Don't throw - app can work without cache, just less efficiently
      }

      // Test Supabase connection
      const isConnected = await DatabaseService.testConnection();
      if (isConnected) {
        console.log('Supabase connection successful');
      } else {
        console.warn('Supabase connection failed - app will work in offline mode with cache');
      }
    } catch (error) {
      console.error('Failed to initialize app:', error);
      // Don't throw error - allow app to continue in offline mode
      console.warn('App initialized in offline mode');
    }
  }

  static async resetApp(): Promise<void> {
    try {
      // Clear cache first
      await CacheService.clearAllCache();
      
      // Reset Supabase database
      await DatabaseService.resetDatabase();
      
      console.log('App data reset successfully (including cache)');
    } catch (error) {
      console.error('Failed to reset app:', error);
      throw error;
    }
  }

  static async performCacheMaintenance(): Promise<void> {
    try {
      await CacheService.performMaintenance();
      console.log('Cache maintenance completed');
    } catch (error) {
      console.error('Failed to perform cache maintenance:', error);
    }
  }

  static async getCacheStats() {
    try {
      return await CacheService.getCacheStats();
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return {
        totalEntries: 0,
        totalSize: 0,
        expiredEntries: 0,
      };
    }
  }

  static async getAppStatus(): Promise<{
    connected: boolean;
    authenticated: boolean;
    healthStatus: any;
  }> {
    try {
      const [connected, authenticated, healthStatus] = await Promise.all([
        DatabaseService.testConnection(),
        DatabaseService.isAuthenticated(),
        DatabaseService.getHealthStatus()
      ]);

      return {
        connected,
        authenticated,
        healthStatus
      };
    } catch (error) {
      console.error('Failed to get app status:', error);
      return {
        connected: false,
        authenticated: false,
        healthStatus: {
          connected: false,
          plantsCount: 0,
          careEventsCount: 0,
          photosCount: 0,
          notesCount: 0,
        }
      };
    }
  }
}