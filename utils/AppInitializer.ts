import { DatabaseService } from '../services/DatabaseService';

export class AppInitializer {
  static async initialize(): Promise<void> {
    try {
      // Test Supabase connection
      const isConnected = await DatabaseService.testConnection();
      if (isConnected) {
        console.log('Supabase connection successful');
      } else {
        console.warn('Supabase connection failed - app will work in offline mode');
      }
    } catch (error) {
      console.error('Failed to initialize app:', error);
      // Don't throw error - allow app to continue in offline mode
      console.warn('App initialized in offline mode');
    }
  }

  static async resetApp(): Promise<void> {
    try {
      await DatabaseService.resetDatabase();
      console.log('App data reset successfully');
    } catch (error) {
      console.error('Failed to reset app:', error);
      throw error;
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