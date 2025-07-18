import { DatabaseService } from '../services/DatabaseService';

export class AppInitializer {
  static async initialize(): Promise<void> {
    try {
      // Initialize database
      await DatabaseService.getDatabase();
      console.log('Database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize app:', error);
      throw error;
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
}
