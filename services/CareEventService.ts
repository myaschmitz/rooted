import { CareEvent } from '../types/Plant';
import { supabase } from './SupabaseService';
import { HouseholdService } from './HouseholdService';
import { PlantService } from './PlantService';
import type { Database } from '../types/Database';

type CareEventRow = Database['public']['Tables']['care_events']['Row'];
type CareEventInsert = Database['public']['Tables']['care_events']['Insert'];
type CareEventUpdate = Database['public']['Tables']['care_events']['Update'];

export class CareEventService {
  static async getCareEventsByPlantId(plantId: string): Promise<CareEvent[]> {
    // Get current household session for filtering
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error('No household session found');
    }

    // Verify plant belongs to current household
    const plant = await PlantService.getPlantById(plantId);
    if (!plant) {
      throw new Error('Plant not found or not accessible');
    }

    const { data, error } = await supabase
      .from('care_events')
      .select('*')
      .eq('plant_id', plantId)
      .eq('household_id', session.household_id)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching care events:', error);
      throw new Error(`Failed to fetch care events: ${error.message}`);
    }

    return (data || []) as CareEvent[];
  }

  static async createCareEvent(eventData: Omit<CareEvent, 'id' | 'created_at' | 'updated_at'>): Promise<CareEvent> {
    // Get current household session
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error('No household session found');
    }

    const careEventInsert: CareEventInsert = {
      ...eventData,
      household_id: session.household_id,
    };

    const { data, error } = await supabase
      .from('care_events')
      .insert(careEventInsert)
      .select()
      .single();

    if (error) {
      console.error('Error creating care event:', error);
      throw new Error(`Failed to create care event: ${error.message}`);
    }

    const careEvent = data as CareEvent;

    // Get plant info for activity logging
    const plant = await PlantService.getPlantById(careEvent.plant_id);
    const plantName = plant?.name || plant?.type || 'Unknown Plant';

    // Map event types to activity names
    const activityMap: { [key: string]: string } = {
      'water': 'watered',
      'fertilize': 'fertilized', 
      'repot': 'repotted',
      'prune': 'pruned',
      'pest_spotted': 'pest spotted',
      'insecticide_spray': 'insecticide spray',
      'other': 'other care'
    };

    const activityName = activityMap[careEvent.event_type] || careEvent.event_type;

    // Log activity
    await HouseholdService.logActivity(activityName as any, {
      plant_id: careEvent.plant_id,
      event_type: careEvent.event_type,
      notes: careEvent.notes,
      health_status: careEvent.health_status,
    }, plantName);

    return careEvent;
  }

  static async updateCareEvent(id: string, updates: Partial<Omit<CareEvent, 'id' | 'created_at'>>): Promise<CareEvent | null> {
    // Get current household session for filtering
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error('No household session found');
    }

    const careEventUpdate: CareEventUpdate = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('care_events')
      .update(careEventUpdate)
      .eq('id', id)
      .eq('household_id', session.household_id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No rows found
      }
      console.error('Error updating care event:', error);
      throw new Error(`Failed to update care event: ${error.message}`);
    }

    return data as CareEvent;
  }

  static async getCareEventById(id: string): Promise<CareEvent | null> {
    // Get current household session for filtering
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error('No household session found');
    }

    const { data, error } = await supabase
      .from('care_events')
      .select('*')
      .eq('id', id)
      .eq('household_id', session.household_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No rows found
      }
      console.error('Error fetching care event:', error);
      throw new Error(`Failed to fetch care event: ${error.message}`);
    }

    return data as CareEvent;
  }

  static async deleteCareEvent(id: string): Promise<boolean> {
    // Get current household session for filtering
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error('No household session found');
    }

    const { error } = await supabase
      .from('care_events')
      .delete()
      .eq('id', id)
      .eq('household_id', session.household_id);

    if (error) {
      console.error('Error deleting care event:', error);
      throw new Error(`Failed to delete care event: ${error.message}`);
    }

    return true;
  }

  static async getRecentCareEvents(limit: number = 10): Promise<CareEvent[]> {
    // Get current household session for filtering
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error('No household session found');
    }

    const { data, error } = await supabase
      .from('care_events')
      .select('*')
      .eq('household_id', session.household_id)
      .order('date', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent care events:', error);
      throw new Error(`Failed to fetch recent care events: ${error.message}`);
    }

    return (data || []) as CareEvent[];
  }

  static async getLastCareEventByType(plantId: string, eventType: string): Promise<CareEvent | null> {
    // Get current household session for filtering
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error('No household session found');
    }

    // Verify plant belongs to current household
    const plant = await PlantService.getPlantById(plantId);
    if (!plant) {
      throw new Error('Plant not found or not accessible');
    }

    const { data, error } = await supabase
      .from('care_events')
      .select('*')
      .eq('plant_id', plantId)
      .eq('event_type', eventType)
      .eq('household_id', session.household_id)
      .order('date', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No rows found
      }
      console.error('Error fetching last care event by type:', error);
      throw new Error(`Failed to fetch last care event by type: ${error.message}`);
    }

    return data as CareEvent;
  }

  static async getCareEventStats(plantId: string): Promise<{
    totalEvents: number;
    lastWatered?: string;
    lastFertilized?: string;
    lastRepotted?: string;
  }> {
    try {
      // Get current household session for filtering
      const session = await HouseholdService.getUserSession();
      if (!session?.household_id) {
        throw new Error('No household session found');
      }

      // Verify plant belongs to current household
      const plant = await PlantService.getPlantById(plantId);
      if (!plant) {
        throw new Error('Plant not found or not accessible');
      }

      // Get total events count
      const { count, error: countError } = await supabase
        .from('care_events')
        .select('*', { count: 'exact', head: true })
        .eq('plant_id', plantId)
        .eq('household_id', session.household_id);

      if (countError) {
        console.error('Error getting care events count:', countError);
        throw new Error(`Failed to get care events count: ${countError.message}`);
      }

      const totalEvents = count || 0;

      // Get last events by type
      const lastWatered = await this.getLastCareEventByType(plantId, 'water');
      const lastFertilized = await this.getLastCareEventByType(plantId, 'fertilize');
      const lastRepotted = await this.getLastCareEventByType(plantId, 'repot');

      return {
        totalEvents,
        lastWatered: lastWatered?.date,
        lastFertilized: lastFertilized?.date,
        lastRepotted: lastRepotted?.date,
      };
    } catch (error) {
      console.error('Error getting care event stats:', error);
      throw error;
    }
  }

  static async deleteAllCareEvents(): Promise<void> {
    const { error } = await supabase
      .from('care_events')
      .delete()
      .neq('id', ''); // Delete all rows

    if (error) {
      console.error('Error deleting all care events:', error);
      throw new Error(`Failed to delete all care events: ${error.message}`);
    }
  }
}