import { Plant } from '../types/Plant';
import { supabase } from './SupabaseService';
import { HouseholdService } from './HouseholdService';
import { CacheService } from './CacheService';
import { CacheInvalidationService } from './CacheInvalidationService';
import type { Database } from '../types/Database';

type PlantRow = Database['public']['Tables']['plants']['Row'];
type PlantInsert = Database['public']['Tables']['plants']['Insert'];
type PlantUpdate = Database['public']['Tables']['plants']['Update'];

export class PlantService {
  static async getAllPlants(): Promise<Plant[]> {
    // Get current household session for filtering
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error('No household session found');
    }

    const cacheKey = `plants-list-${session.household_id}`;
    
    // Try to get from cache first
    const cached = await CacheService.getCachedResponse<Plant[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // If not in cache, fetch from database
    const { data, error } = await supabase
      .from('plants')
      .select('*')
      .eq('household_id', session.household_id)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching plants:', error);
      throw new Error(`Failed to fetch plants: ${error.message}`);
    }

    const plants = (data || []) as Plant[];
    
    // Cache the result for 5 minutes
    await CacheService.cacheApiResponse(cacheKey, plants, 5 * 60 * 1000);

    return plants;
  }

  static async getPlantById(id: string): Promise<Plant | null> {
    // Get current household session for filtering
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error('No household session found');
    }

    const cacheKey = `plant-${id}-${session.household_id}`;
    
    // Try to get from cache first
    const cached = await CacheService.getCachedResponse<Plant>(cacheKey);
    if (cached) {
      return cached;
    }

    // If not in cache, fetch from database
    const { data, error } = await supabase
      .from('plants')
      .select('*')
      .eq('id', id)
      .eq('household_id', session.household_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No rows found
      }
      console.error('Error fetching plant:', error);
      throw new Error(`Failed to fetch plant: ${error.message}`);
    }

    const plant = data as Plant;
    
    // Cache the result for 10 minutes
    await CacheService.cacheApiResponse(cacheKey, plant, 10 * 60 * 1000);

    return plant;
  }

  static async createPlant(plantData: Omit<Plant, 'id' | 'created_at' | 'updated_at' | 'household_id' | 'pinned'>): Promise<Plant> {
    // Get current household session
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error('No household session found');
    }

    const plantInsert: PlantInsert = {
      ...plantData,
      household_id: session.household_id,
      pinned: false,
    };

    const { data, error } = await supabase
      .from('plants')
      .insert(plantInsert)
      .select()
      .single();

    if (error) {
      console.error('Error creating plant:', error);
      throw new Error(`Failed to create plant: ${error.message}`);
    }

    const plant = data as Plant;

    // Log activity
    await HouseholdService.logActivity('added plant', {
      plant_id: plant.id,
      plant_type: plant.type,
      location: plant.location,
    }, plant.name || plant.type);

    // Invalidate relevant caches
    await CacheInvalidationService.invalidateOnUserAction('plant_added', {
      entityId: plant.id,
      additionalData: { location: plant.location }
    });

    return plant;
  }

  static async updatePlant(id: string, updates: Partial<Omit<Plant, 'id' | 'created_at'>>): Promise<Plant | null> {
    const plantUpdate: PlantUpdate = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('plants')
      .update(plantUpdate)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No rows found
      }
      console.error('Error updating plant:', error);
      throw new Error(`Failed to update plant: ${error.message}`);
    }

    const plant = data as Plant;

    // Log activity for updates (but not for pin/unpin operations)
    if (!('pinned' in updates) || Object.keys(updates).length > 1) {
      await HouseholdService.logActivity('updated plant', {
        plant_id: plant.id,
        updated_fields: Object.keys(updates),
      }, plant.name || plant.type);
    }

    // Invalidate relevant caches
    await CacheInvalidationService.invalidateOnUserAction('plant_updated', {
      entityId: plant.id,
      additionalData: {
        oldLocation: updates.location ? undefined : plant.location, // If location wasn't updated, pass current location
        newLocation: updates.location,
      }
    });

    return plant;
  }

  static async deletePlant(id: string): Promise<boolean> {
    // Get plant info before deleting for activity log
    const plant = await this.getPlantById(id);
    
    const { error } = await supabase
      .from('plants')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting plant:', error);
      throw new Error(`Failed to delete plant: ${error.message}`);
    }

    // Log activity
    if (plant) {
      await HouseholdService.logActivity('deleted plant', {
        plant_id: plant.id,
        plant_type: plant.type,
        location: plant.location,
      }, plant.name || plant.type);

      // Invalidate relevant caches
      await CacheInvalidationService.invalidateOnUserAction('plant_deleted', {
        entityId: plant.id,
        additionalData: { location: plant.location },
        clearPhotoCache: true // Also clear photo cache for deleted plants
      });
    }

    return true;
  }

  static async searchPlants(query: string): Promise<Plant[]> {
    // Get current household session for filtering
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error('No household session found');
    }

    const searchTerm = `%${query.toLowerCase()}%`;
    const cacheKey = `plants-search-${session.household_id}-${query.toLowerCase()}`;
    
    // Try to get from cache first (shorter TTL for searches)
    const cached = await CacheService.getCachedResponse<Plant[]>(cacheKey);
    if (cached) {
      return cached;
    }
    
    const { data, error } = await supabase
      .from('plants')
      .select('*')
      .eq('household_id', session.household_id)
      .or(`name.ilike.${searchTerm},type.ilike.${searchTerm},location.ilike.${searchTerm}`)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error searching plants:', error);
      throw new Error(`Failed to search plants: ${error.message}`);
    }

    const plants = (data || []) as Plant[];
    
    // Cache search results for 2 minutes
    await CacheService.cacheApiResponse(cacheKey, plants, 2 * 60 * 1000);

    return plants;
  }

  static async getPlantsByLocation(location: string): Promise<Plant[]> {
    // Get current household session for filtering
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error('No household session found');
    }

    const cacheKey = `plants-location-${session.household_id}-${location}`;
    
    // Try to get from cache first
    const cached = await CacheService.getCachedResponse<Plant[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const { data, error } = await supabase
      .from('plants')
      .select('*')
      .eq('household_id', session.household_id)
      .eq('location', location)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching plants by location:', error);
      throw new Error(`Failed to fetch plants by location: ${error.message}`);
    }

    const plants = (data || []) as Plant[];
    
    // Cache the result for 5 minutes
    await CacheService.cacheApiResponse(cacheKey, plants, 5 * 60 * 1000);

    return plants;
  }


  static async deleteAllPlants(): Promise<void> {
    const { error } = await supabase
      .from('plants')
      .delete()
      .neq('id', ''); // Delete all rows

    if (error) {
      console.error('Error deleting all plants:', error);
      throw new Error(`Failed to delete all plants: ${error.message}`);
    }
  }

  static async pinPlant(id: string): Promise<Plant | null> {
    return this.updatePlant(id, { pinned: true });
  }

  static async unpinPlant(id: string): Promise<Plant | null> {
    return this.updatePlant(id, { pinned: false });
  }

  static async togglePinPlant(id: string): Promise<Plant | null> {
    const plant = await this.getPlantById(id);
    if (!plant) return null;
    
    return this.updatePlant(id, { pinned: !plant.pinned });
  }

  static async getPlantsWithLastWateringEvents(): Promise<Array<Plant & { lastWateringDate?: string | null }>> {
    try {
      // Get current household session for filtering
      const session = await HouseholdService.getUserSession();
      if (!session?.household_id) {
        throw new Error('No household session found');
      }

      const cacheKey = `plants-with-watering-${session.household_id}`;
      
      // Try to get from cache first
      const cached = await CacheService.getCachedResponse<Array<Plant & { lastWateringDate?: string | null }>>(cacheKey);
      if (cached) {
        return cached;
      }

      // First get all plants
      const plants = await this.getAllPlants();
      
      if (plants.length === 0) {
        const result: Array<Plant & { lastWateringDate?: string | null }> = [];
        await CacheService.cacheApiResponse(cacheKey, result, 5 * 60 * 1000);
        return result;
      }

      // Get the most recent watering event for each plant in a single query
      // This uses a window function to get the latest event per plant
      const { data: lastWateringEvents, error } = await supabase
        .from('events')
        .select('plant_id, date, event_type')
        .in('plant_id', plants.map(p => p.id))
        .in('event_type', ['water', 'fertigate']) // Both count as watering
        .eq('household_id', session.household_id)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching last watering events:', error);
        // Return plants without watering data rather than failing
        const result = plants.map(plant => ({ ...plant, lastWateringDate: null }));
        await CacheService.cacheApiResponse(cacheKey, result, 5 * 60 * 1000);
        return result;
      }

      // Create a map of plant ID to most recent watering date
      const lastWateringMap = new Map<string, string>();
      if (lastWateringEvents) {
        // Group events by plant_id and take the most recent one
        const eventsByPlant = new Map<string, { date: string; event_type: string }[]>();
        
        lastWateringEvents.forEach(event => {
          if (!eventsByPlant.has(event.plant_id)) {
            eventsByPlant.set(event.plant_id, []);
          }
          eventsByPlant.get(event.plant_id)!.push({
            date: event.date,
            event_type: event.event_type
          });
        });

        // For each plant, find the most recent watering event
        eventsByPlant.forEach((events, plantId) => {
          // Sort by date descending and take the first one
          const sortedEvents = events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          if (sortedEvents.length > 0) {
            lastWateringMap.set(plantId, sortedEvents[0].date);
          }
        });
      }

      // Combine plants with their last watering dates
      const result = plants.map(plant => ({
        ...plant,
        lastWateringDate: lastWateringMap.get(plant.id) || null
      }));

      // Cache the result for 5 minutes
      await CacheService.cacheApiResponse(cacheKey, result, 5 * 60 * 1000);

      return result;
    } catch (error) {
      console.error('Error fetching plants with last watering events:', error);
      throw new Error(`Failed to fetch plants with watering data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}