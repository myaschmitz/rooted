import { DatabaseService } from './DatabaseService';

export interface PlantLocation {
  id: string;
  name: string;
  created_at: string;
  plant_count?: number;
}

export class LocationService {
  /**
   * Get all unique locations from plants, ordered by usage frequency
   */
  static async getAllLocations(): Promise<PlantLocation[]> {
    const db = await DatabaseService.getDatabase();
    const result = await db.getAllAsync(`
      SELECT 
        location as name,
        COUNT(*) as plant_count,
        MIN(created_at) as created_at
      FROM plants 
      WHERE location IS NOT NULL AND location != ''
      GROUP BY location 
      ORDER BY plant_count DESC, name ASC
    `);
    
    return result.map((row: any, index) => ({
      id: `loc_${index}`,
      name: row.name,
      created_at: row.created_at,
      plant_count: row.plant_count
    }));
  }

  /**
   * Get locations that match a search query
   */
  static async searchLocations(query: string): Promise<PlantLocation[]> {
    if (!query.trim()) {
      return this.getAllLocations();
    }

    const db = await DatabaseService.getDatabase();
    const searchTerm = `%${query.toLowerCase().trim()}%`;
    
    const result = await db.getAllAsync(`
      SELECT 
        location as name,
        COUNT(*) as plant_count,
        MIN(created_at) as created_at
      FROM plants 
      WHERE location IS NOT NULL 
        AND location != ''
        AND LOWER(location) LIKE ?
      GROUP BY location 
      ORDER BY plant_count DESC, name ASC
    `, [searchTerm]);
    
    return result.map((row: any, index) => ({
      id: `loc_${index}`,
      name: row.name,
      created_at: row.created_at,
      plant_count: row.plant_count
    }));
  }

  /**
   * Check if a location already exists (case-insensitive)
   */
  static async locationExists(locationName: string): Promise<boolean> {
    const db = await DatabaseService.getDatabase();
    const result = await db.getFirstAsync(`
      SELECT COUNT(*) as count 
      FROM plants 
      WHERE LOWER(location) = ?
    `, [locationName.toLowerCase().trim()]);
    
    return (result as any)?.count > 0;
  }

  /**
   * Get plants grouped by location
   */
  static async getPlantsGroupedByLocation(): Promise<{[location: string]: any[]}> {
    const db = await DatabaseService.getDatabase();
    const plants = await db.getAllAsync(`
      SELECT * FROM plants 
      ORDER BY 
        CASE 
          WHEN location IS NULL OR location = '' THEN 1 
          ELSE 0 
        END,
        location ASC,
        name ASC
    `);
    
    const grouped: {[location: string]: any[]} = {};
    
    plants.forEach((plant: any) => {
      const locationKey = plant.location || 'No Location';
      if (!grouped[locationKey]) {
        grouped[locationKey] = [];
      }
      grouped[locationKey].push({
        ...plant,
        synced: Boolean(plant.synced)
      });
    });
    
    return grouped;
  }

  /**
   * Get location statistics
   */
  static async getLocationStats(): Promise<{
    totalLocations: number;
    mostPopularLocation: string | null;
    plantsWithoutLocation: number;
  }> {
    const db = await DatabaseService.getDatabase();
    
    // Get total unique locations
    const locationsResult = await db.getFirstAsync(`
      SELECT COUNT(DISTINCT location) as count 
      FROM plants 
      WHERE location IS NOT NULL AND location != ''
    `);
    
    // Get most popular location
    const popularResult = await db.getFirstAsync(`
      SELECT location, COUNT(*) as count 
      FROM plants 
      WHERE location IS NOT NULL AND location != ''
      GROUP BY location 
      ORDER BY count DESC 
      LIMIT 1
    `);
    
    // Get plants without location
    const noLocationResult = await db.getFirstAsync(`
      SELECT COUNT(*) as count 
      FROM plants 
      WHERE location IS NULL OR location = ''
    `);
    
    return {
      totalLocations: (locationsResult as any)?.count || 0,
      mostPopularLocation: (popularResult as any)?.location || null,
      plantsWithoutLocation: (noLocationResult as any)?.count || 0
    };
  }
}
