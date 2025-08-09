import { DatabaseService } from '../services/DatabaseService';

export class AppInitializer {
  static async initialize(): Promise<void> {
    console.log('=== STEP 1: Starting AppInitializer ===');
    console.log('Starting app initialization...');
    
    try {

      // Test Supabase connection
      try {
        console.log('=== STEP 4: About to test Supabase connection ===');
        const isConnected = await DatabaseService.testConnection();
        console.log('=== STEP 5: Supabase test completed ===', isConnected);
        if (isConnected) {
          console.log('Supabase connection successful');
        } else {
          console.warn('Supabase connection failed - app will work in offline mode');
        }
      } catch (dbError) {
        console.error('Database connection test failed:', dbError);
        console.warn('App will work in offline mode');
      }
      
      console.log('App initialization completed');
    } catch (error) {
      console.error('App initialization failed:', error);
      // Even if everything fails, let the app continue
      console.warn('App starting in minimal mode - some features may be limited');
    }
  }

  static async resetApp(): Promise<void> {
    try {
      
      // Reset Supabase database
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