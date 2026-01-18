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

  static async createEvent(eventData: Omit<Event, 'id' | 'created_at' | 'updated_at' | 'household_id'>): Promise<Event> {
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

    return data as Event;
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
    // Get event info before deleting for cache invalidation
    const event = await this.getEventById(id);
    if (!event) {
      return false; // Event not found or not accessible
    }

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
      .limit(1);

    if (error) {
      console.error('Error fetching last event by type:', error);
      throw new Error(`Failed to fetch last event by type: ${error.message}`);
    }

    // Return the first result if any, otherwise null
    return data && data.length > 0 ? (data[0] as Event) : null;
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

  static async getLastEventsByTypeForPlants(
    plantIds: string[], 
    eventTypes: string[]
  ): Promise<{ [plantId: string]: { [eventType: string]: Event | null } }> {
    // Get current household session for filtering
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error('No household session found');
    }

    if (plantIds.length === 0) {
      return {};
    }

    try {
      // Fetch all relevant events in one query
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .in('plant_id', plantIds)
        .in('event_type', eventTypes)
        .eq('household_id', session.household_id)
        .order('date', { ascending: false });

      if (error) {
        console.error('Error fetching last events by type for plants:', error);
        throw new Error(`Failed to fetch last events: ${error.message}`);
      }

      // Group events by plant and type, keeping only the most recent for each combination
      const result: { [plantId: string]: { [eventType: string]: Event | null } } = {};
      
      // Initialize result structure
      plantIds.forEach(plantId => {
        result[plantId] = {};
        eventTypes.forEach(eventType => {
          result[plantId][eventType] = null;
        });
      });

      // Process events to find the most recent for each plant/type combination
      if (data) {
        const eventsByPlantAndType = new Map<string, Event>();
        
        data.forEach((event: any) => {
          const key = `${event.plant_id}-${event.event_type}`;
          const existingEvent = eventsByPlantAndType.get(key);
          
          if (!existingEvent || new Date(event.date) > new Date(existingEvent.date)) {
            eventsByPlantAndType.set(key, event as Event);
          }
        });

        // Populate result with the most recent events
        eventsByPlantAndType.forEach((event, key) => {
          const lastDashIndex = key.lastIndexOf('-');
          const plantId = key.substring(0, lastDashIndex);
          const eventType = key.substring(lastDashIndex + 1);
          
          if (result[plantId]) {
            result[plantId][eventType] = event;
          }
        });
      }

      return result;
    } catch (error) {
      console.error('Error in getLastEventsByTypeForPlants:', error);
      throw error;
    }
  }
}