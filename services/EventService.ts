import { Event } from '../types/Plant';
import { supabase } from './SupabaseService';
import { HouseholdService } from './HouseholdService';
import { PlantService } from './PlantService';
import type { Database } from '../types/Database';

type EventRow = Database['public']['Tables']['events']['Row'];
type EventInsert = Database['public']['Tables']['events']['Insert'];
type EventUpdate = Database['public']['Tables']['events']['Update'];

export class EventService {
  static async getEventsByPlantId(plantId: string): Promise<Event[]> {
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
      .from('events')
      .select('*')
      .eq('plant_id', plantId)
      .eq('household_id', session.household_id)
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching events:', error);
      throw new Error(`Failed to fetch events: ${error.message}`);
    }

    return (data || []) as Event[];
  }

  static async createEvent(eventData: Omit<Event, 'id' | 'created_at' | 'updated_at'>): Promise<Event> {
    // Get current household session
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error('No household session found');
    }

    const eventInsert: EventInsert = {
      ...eventData,
      household_id: session.household_id,
    };

    const { data, error } = await supabase
      .from('events')
      .insert(eventInsert)
      .select()
      .single();

    if (error) {
      console.error('Error creating event:', error);
      throw new Error(`Failed to create event: ${error.message}`);
    }

    const event = data as Event;

    // Get plant info for activity logging
    const plant = await PlantService.getPlantById(event.plant_id);
    const plantName = plant?.name || plant?.type || 'Unknown Plant';

    // Map event types to activity names
    const activityMap: { [key: string]: string } = {
      'water': 'watered',
      'fertilize': 'fertilized',
      'fertigate': 'fertigated',
      'repot': 'repotted',
      'prune': 'pruned',
      'pest_spotted': 'pest spotted',
      'insecticide_spray': 'insecticide spray',
      'other': 'other care'
    };

    const activityName = activityMap[event.event_type] || event.event_type;

    // Log activity
    await HouseholdService.logActivity(activityName as any, {
      plant_id: event.plant_id,
      event_type: event.event_type,
      notes: event.notes,
    }, plantName);

    return event;
  }

  static async updateEvent(id: string, updates: Partial<Omit<Event, 'id' | 'created_at'>>): Promise<Event | null> {
    // Get current household session for filtering
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error('No household session found');
    }

    const eventUpdate: EventUpdate = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('events')
      .update(eventUpdate)
      .eq('id', id)
      .eq('household_id', session.household_id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No rows found
      }
      console.error('Error updating event:', error);
      throw new Error(`Failed to update event: ${error.message}`);
    }

    return data as Event;
  }

  static async getEventById(id: string): Promise<Event | null> {
    // Get current household session for filtering
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error('No household session found');
    }

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .eq('household_id', session.household_id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No rows found
      }
      console.error('Error fetching event:', error);
      throw new Error(`Failed to fetch event: ${error.message}`);
    }

    return data as Event;
  }

  static async deleteEvent(id: string): Promise<boolean> {
    // Get current household session for filtering
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error('No household session found');
    }

    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', id)
      .eq('household_id', session.household_id);

    if (error) {
      console.error('Error deleting event:', error);
      throw new Error(`Failed to delete event: ${error.message}`);
    }

    return true;
  }

  static async getRecentEvents(limit: number = 10): Promise<Event[]> {
    // Get current household session for filtering
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error('No household session found');
    }

    const { data, error } = await supabase
      .from('events')
      .select('*')
      .eq('household_id', session.household_id)
      .order('date', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching recent events:', error);
      throw new Error(`Failed to fetch recent events: ${error.message}`);
    }

    return (data || []) as Event[];
  }

  static async getLastEventByType(plantId: string, eventType: string): Promise<Event | null> {
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
      .from('events')
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
      console.error('Error fetching last event by type:', error);
      throw new Error(`Failed to fetch last event by type: ${error.message}`);
    }

    return data as Event;
  }

  static async getEventStats(plantId: string): Promise<{
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
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('plant_id', plantId)
        .eq('household_id', session.household_id);

      if (countError) {
        console.error('Error getting events count:', countError);
        throw new Error(`Failed to get events count: ${countError.message}`);
      }

      const totalEvents = count || 0;

      // Get last events by type
      const lastWatered = await this.getLastEventByType(plantId, 'water');
      const lastFertilized = await this.getLastEventByType(plantId, 'fertilize');
      const lastRepotted = await this.getLastEventByType(plantId, 'repot');

      return {
        totalEvents,
        lastWatered: lastWatered?.date,
        lastFertilized: lastFertilized?.date,
        lastRepotted: lastRepotted?.date,
      };
    } catch (error) {
      console.error('Error getting event stats:', error);
      throw error;
    }
  }

  static async deleteAllEvents(): Promise<void> {
    const { error } = await supabase
      .from('events')
      .delete()
      .neq('id', ''); // Delete all rows

    if (error) {
      console.error('Error deleting all events:', error);
      throw new Error(`Failed to delete all events: ${error.message}`);
    }
  }
}