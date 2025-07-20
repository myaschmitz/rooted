import { supabase } from './SupabaseService';

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
    try {
      const { data, error } = await supabase.rpc('get_plant_locations');
      
      if (error) {
        // Fallback to manual query if stored procedure doesn't exist
        const { data: plantsData, error: plantsError } = await supabase
          .from('plants')
          .select('location, created_at')
          .not('location', 'is', null)
          .neq('location', '');

        if (plantsError) {
          console.error('Error fetching locations:', plantsError);
          throw new Error(`Failed to fetch locations: ${plantsError.message}`);
        }

        // Group by location and count
        const locationMap = new Map<string, { count: number; created_at: string }>();
        
        plantsData?.forEach(plant => {
          if (plant.location) {
            const existing = locationMap.get(plant.location);
            if (existing) {
              existing.count++;
              // Keep the earliest created_at
              if (plant.created_at < existing.created_at) {
                existing.created_at = plant.created_at;
              }
            } else {
              locationMap.set(plant.location, {
                count: 1,
                created_at: plant.created_at
              });
            }
          }
        });

        // Convert to array and sort
        const locations = Array.from(locationMap.entries())
          .map(([name, info], index) => ({
            id: `loc_${index}`,
            name,
            created_at: info.created_at,
            plant_count: info.count
          }))
          .sort((a, b) => {
            // Sort by plant count desc, then by name asc
            if (b.plant_count !== a.plant_count) {
              return (b.plant_count || 0) - (a.plant_count || 0);
            }
            return a.name.localeCompare(b.name);
          });

        return locations;
      }

      return (data || []).map((row: any, index: number) => ({
        id: `loc_${index}`,
        name: row.name,
        created_at: row.created_at,
        plant_count: row.plant_count
      }));
    } catch (error) {
      console.error('Error fetching locations:', error);
      throw error;
    }
  }

  /**
   * Get locations that match a search query
   */
  static async searchLocations(query: string): Promise<PlantLocation[]> {
    if (!query.trim()) {
      return this.getAllLocations();
    }

    try {
      const searchTerm = `%${query.toLowerCase().trim()}%`;
      
      const { data: plantsData, error } = await supabase
        .from('plants')
        .select('location, created_at')
        .not('location', 'is', null)
        .neq('location', '')
        .ilike('location', searchTerm);

      if (error) {
        console.error('Error searching locations:', error);
        throw new Error(`Failed to search locations: ${error.message}`);
      }

      // Group by location and count
      const locationMap = new Map<string, { count: number; created_at: string }>();
      
      plantsData?.forEach(plant => {
        if (plant.location) {
          const existing = locationMap.get(plant.location);
          if (existing) {
            existing.count++;
            if (plant.created_at < existing.created_at) {
              existing.created_at = plant.created_at;
            }
          } else {
            locationMap.set(plant.location, {
              count: 1,
              created_at: plant.created_at
            });
          }
        }
      });

      const locations = Array.from(locationMap.entries())
        .map(([name, info], index) => ({
          id: `loc_${index}`,
          name,
          created_at: info.created_at,
          plant_count: info.count
        }))
        .sort((a, b) => {
          if (b.plant_count !== a.plant_count) {
            return (b.plant_count || 0) - (a.plant_count || 0);
          }
          return a.name.localeCompare(b.name);
        });

      return locations;
    } catch (error) {
      console.error('Error searching locations:', error);
      throw error;
    }
  }

  /**
   * Check if a location already exists (case-insensitive)
   */
  static async locationExists(locationName: string): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from('plants')
        .select('*', { count: 'exact', head: true })
        .ilike('location', locationName.toLowerCase().trim());

      if (error) {
        console.error('Error checking location existence:', error);
        throw new Error(`Failed to check location existence: ${error.message}`);
      }

      return (count || 0) > 0;
    } catch (error) {
      console.error('Error checking location existence:', error);
      throw error;
    }
  }

  /**
   * Get plants grouped by location
   */
  static async getPlantsGroupedByLocation(): Promise<{[location: string]: any[]}> {
    try {
      const { data: plants, error } = await supabase
        .from('plants')
        .select('*')
        .order('location', { ascending: true })
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching plants for grouping:', error);
        throw new Error(`Failed to fetch plants for grouping: ${error.message}`);
      }

      const grouped: {[location: string]: any[]} = {};
      
      plants?.forEach((plant: any) => {
        const locationKey = plant.location || 'No Location';
        if (!grouped[locationKey]) {
          grouped[locationKey] = [];
        }
        grouped[locationKey].push(plant);
      });
      
      return grouped;
    } catch (error) {
      console.error('Error grouping plants by location:', error);
      throw error;
    }
  }

  /**
   * Get location statistics
   */
  static async getLocationStats(): Promise<{
    totalLocations: number;
    mostPopularLocation: string | null;
    plantsWithoutLocation: number;
  }> {
    try {
      // Get all plants data
      const { data: plants, error } = await supabase
        .from('plants')
        .select('location');

      if (error) {
        console.error('Error fetching plants for stats:', error);
        throw new Error(`Failed to fetch location stats: ${error.message}`);
      }

      if (!plants) {
        return {
          totalLocations: 0,
          mostPopularLocation: null,
          plantsWithoutLocation: 0
        };
      }

      // Count unique locations
      const locationCounts = new Map<string, number>();
      let plantsWithoutLocation = 0;

      plants.forEach(plant => {
        if (!plant.location || plant.location.trim() === '') {
          plantsWithoutLocation++;
        } else {
          const location = plant.location;
          locationCounts.set(location, (locationCounts.get(location) || 0) + 1);
        }
      });

      // Find most popular location
      let mostPopularLocation: string | null = null;
      let maxCount = 0;
      
      for (const [location, count] of locationCounts.entries()) {
        if (count > maxCount) {
          maxCount = count;
          mostPopularLocation = location;
        }
      }

      return {
        totalLocations: locationCounts.size,
        mostPopularLocation,
        plantsWithoutLocation
      };
    } catch (error) {
      console.error('Error getting location stats:', error);
      throw error;
    }
  }
}