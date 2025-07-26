import { Plant } from '../types/Plant';
import { supabase } from './SupabaseService';
import type { Database } from '../types/Database';

type PlantRow = Database['public']['Tables']['plants']['Row'];
type PlantInsert = Database['public']['Tables']['plants']['Insert'];
type PlantUpdate = Database['public']['Tables']['plants']['Update'];

export class PlantService {
  static async getAllPlants(): Promise<Plant[]> {
    const { data, error } = await supabase
      .from('plants')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching plants:', error);
      throw new Error(`Failed to fetch plants: ${error.message}`);
    }

    return (data || []) as Plant[];
  }

  static async getPlantById(id: string): Promise<Plant | null> {
    const { data, error } = await supabase
      .from('plants')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No rows found
      }
      console.error('Error fetching plant:', error);
      throw new Error(`Failed to fetch plant: ${error.message}`);
    }

    return data as Plant;
  }

  static async createPlant(plantData: Omit<Plant, 'id' | 'created_at' | 'updated_at'>): Promise<Plant> {
    const plantInsert: PlantInsert = {
      ...plantData,
      health_status: plantData.health_status || 'good'
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

    return data as Plant;
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

    return data as Plant;
  }

  static async deletePlant(id: string): Promise<boolean> {
    const { error } = await supabase
      .from('plants')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting plant:', error);
      throw new Error(`Failed to delete plant: ${error.message}`);
    }

    return true;
  }

  static async searchPlants(query: string): Promise<Plant[]> {
    const searchTerm = `%${query.toLowerCase()}%`;
    
    const { data, error } = await supabase
      .from('plants')
      .select('*')
      .or(`name.ilike.${searchTerm},type.ilike.${searchTerm},location.ilike.${searchTerm}`)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error searching plants:', error);
      throw new Error(`Failed to search plants: ${error.message}`);
    }

    return (data || []) as Plant[];
  }

  static async getPlantsByLocation(location: string): Promise<Plant[]> {
    const { data, error } = await supabase
      .from('plants')
      .select('*')
      .eq('location', location)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching plants by location:', error);
      throw new Error(`Failed to fetch plants by location: ${error.message}`);
    }

    return (data || []) as Plant[];
  }

  static async getPlantsByHealthStatus(status: string): Promise<Plant[]> {
    const { data, error } = await supabase
      .from('plants')
      .select('*')
      .eq('health_status', status)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching plants by health status:', error);
      throw new Error(`Failed to fetch plants by health status: ${error.message}`);
    }

    return (data || []) as Plant[];
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
}