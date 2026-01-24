import { supabase } from "./SupabaseService";
import { DB_TABLES } from "../constants/domain";

/**
 * DatabaseService - Utility service for database operations
 *
 * This service now provides utility functions for working with Supabase
 * instead of managing a local SQLite database.
 */
export class DatabaseService {
  /**
   * Test the database connection
   */
  static async testConnection(): Promise<boolean> {
    try {
      const { error } = await supabase
        .from(DB_TABLES.PLANTS)
        .select("count", { count: "exact", head: true });
      return !error;
    } catch (error) {
      console.error("Database connection test failed:", error);
      return false;
    }
  }

  /**
   * Get database health status
   */
  static async getHealthStatus(): Promise<{
    connected: boolean;
    plantsCount: number;
    eventsCount: number;
    photosCount: number;
    notesCount: number;
  }> {
    try {
      const [plantsResult, careEventsResult, photosResult, notesResult] =
        await Promise.all([
          supabase
            .from(DB_TABLES.PLANTS)
            .select("*", { count: "exact", head: true }),
          supabase
            .from(DB_TABLES.EVENTS)
            .select("*", { count: "exact", head: true }),
          supabase
            .from(DB_TABLES.PLANT_PHOTOS)
            .select("*", { count: "exact", head: true }),
          supabase
            .from(DB_TABLES.NOTES)
            .select("*", { count: "exact", head: true }),
        ]);

      return {
        connected: true,
        plantsCount: plantsResult.count || 0,
        eventsCount: careEventsResult.count || 0,
        photosCount: photosResult.count || 0,
        notesCount: notesResult.count || 0,
      };
    } catch (error) {
      console.error("Error getting database health status:", error);
      return {
        connected: false,
        plantsCount: 0,
        eventsCount: 0,
        photosCount: 0,
        notesCount: 0,
      };
    }
  }

  /**
   * Clear all data from the database (for development/testing purposes)
   * WARNING: This will delete ALL data!
   */
  static async resetDatabase(): Promise<void> {
    try {
      // Delete in order to respect foreign key constraints
      await supabase.from(DB_TABLES.NOTES).delete().neq("id", "");
      await supabase.from(DB_TABLES.PLANT_PHOTOS).delete().neq("id", "");
      await supabase.from(DB_TABLES.EVENTS).delete().neq("id", "");
      await supabase.from(DB_TABLES.PLANTS).delete().neq("id", "");

      console.log("Database reset completed successfully");
    } catch (error) {
      console.error("Error resetting database:", error);
      throw new Error(`Failed to reset database: ${error}`);
    }
  }

  /**
   * Execute a raw SQL query (for advanced use cases)
   * Use with caution - prefer using the typed service methods when possible
   */
  static async executeRawQuery(query: string, params?: any[]): Promise<any> {
    try {
      const { data, error } = await supabase.rpc("execute_sql", {
        sql_query: query,
        query_params: params || [],
      });

      if (error) {
        console.error("Error executing raw query:", error);
        throw new Error(`Query execution failed: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error("Error executing raw query:", error);
      throw error;
    }
  }

  /**
   * Get current user session information
   */
  static async getCurrentUser() {
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        console.error("Error getting current user:", error);
        return null;
      }

      return user;
    } catch (error) {
      console.error("Error getting current user:", error);
      return null;
    }
  }

  /**
   * Check if user is authenticated
   */
  static async isAuthenticated(): Promise<boolean> {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      return !!session;
    } catch (error) {
      console.error("Error checking authentication status:", error);
      return false;
    }
  }

  /**
   * Listen for authentication state changes
   */
  static onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }

  /**
   * Get Supabase client for direct access when needed
   */
  static getSupabaseClient() {
    return supabase;
  }
}
