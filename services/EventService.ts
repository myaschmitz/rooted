import { Event } from "../types/Plant";
import dayjs from "dayjs";
import { supabase } from "./SupabaseService";
import { HouseholdService } from "./HouseholdService";
import { PlantService } from "./PlantService";
import type { Database } from "../types/Database";
import { isNotFoundError, DB_TABLES, DB_COLUMNS } from "../constants/domain";
import { ErrorMapper } from "../errors/ErrorMapper";
import { CacheKeyBuilder } from "./CacheKeyBuilder";
import type { ActivityAction } from "../types/Household";
import type { CareEventType } from "../constants/careTypes";

type EventRow = Database["public"]["Tables"]["events"]["Row"];
type EventInsert = Database["public"]["Tables"]["events"]["Insert"];
type EventUpdate = Database["public"]["Tables"]["events"]["Update"];

// Maps an event type to its activity-log verb; unmapped types log as "other care".
const EVENT_ACTIVITY_ACTIONS: Partial<Record<CareEventType, ActivityAction>> = {
  water: "watered",
  fertilize: "fertilized",
  fertigate: "fertigated",
  repot: "repotted",
  prune: "pruned",
  pest_spotted: "pest spotted",
  insecticide_spray: "insecticide spray",
};

export class EventService {
  static async getEventsByPlantId(plantId: string): Promise<Event[]> {
    // Get current household session for filtering
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error("No household session found");
    }

    // Verify plant belongs to current household
    const plant = await PlantService.getPlantById(plantId);
    if (!plant) {
      throw new Error("Plant not found or not accessible");
    }

    const { data, error } = await supabase
      .from(DB_TABLES.EVENTS)
      .select("*")
      .eq(DB_COLUMNS.PLANT_ID, plantId)
      .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id)
      .order("date", { ascending: false });

    if (error) {
      console.error("Error fetching events:", error);
      throw ErrorMapper.mapDatabaseError(error, "fetch", "event");
    }

    return (data || []) as Event[];
  }

  static async createEvent(
    eventData: Omit<Event, "id" | "created_at" | "updated_at" | "household_id">,
  ): Promise<Event> {
    // Get current household session
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error("No household session found");
    }

    const eventInsert: EventInsert = {
      ...eventData,
      household_id: session.household_id,
    };

    const { data, error } = await supabase
      .from(DB_TABLES.EVENTS)
      .insert(eventInsert)
      .select()
      .single();

    if (error) {
      console.error("Error creating event:", error);
      throw ErrorMapper.mapDatabaseError(error, "create", "event");
    }

    const event = data as Event;

    // Log activity for the care event
    const plant = await PlantService.getPlantById(event.plant_id);
    const action = EVENT_ACTIVITY_ACTIONS[event.event_type] ?? "other care";
    await HouseholdService.logActivity(
      action,
      {
        plant_id: event.plant_id,
        event_type: event.event_type,
        notes: event.notes,
      },
      plant?.name || plant?.type,
    );

    return event;
  }

  static async updateEvent(
    id: string,
    updates: Partial<Omit<Event, "id" | "created_at">>,
  ): Promise<Event | null> {
    // Get current household session for filtering
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error("No household session found");
    }

    const eventUpdate: EventUpdate = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from(DB_TABLES.EVENTS)
      .update(eventUpdate)
      .eq("id", id)
      .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id)
      .select()
      .single();

    if (error) {
      if (isNotFoundError(error)) {
        return null;
      }
      console.error("Error updating event:", error);
      throw ErrorMapper.mapDatabaseError(error, "update", "event");
    }

    return data as Event;
  }

  static async getEventById(id: string): Promise<Event | null> {
    // Get current household session for filtering
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error("No household session found");
    }

    const { data, error } = await supabase
      .from(DB_TABLES.EVENTS)
      .select("*")
      .eq("id", id)
      .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id)
      .single();

    if (error) {
      if (isNotFoundError(error)) {
        return null;
      }
      console.error("Error fetching event:", error);
      throw ErrorMapper.mapDatabaseError(error, "fetch", "event");
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
      throw new Error("No household session found");
    }

    const { error } = await supabase
      .from(DB_TABLES.EVENTS)
      .delete()
      .eq("id", id)
      .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id);

    if (error) {
      console.error("Error deleting event:", error);
      throw ErrorMapper.mapDatabaseError(error, "delete", "event");
    }

    return true;
  }

  static async getAllEvents(): Promise<Event[]> {
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error("No household session found");
    }

    const { data, error } = await supabase
      .from(DB_TABLES.EVENTS)
      .select("*")
      .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id)
      .order("date", { ascending: false });

    if (error) {
      console.error("Error fetching all events:", error);
      throw ErrorMapper.mapDatabaseError(error, "fetch", "event");
    }

    return (data || []) as Event[];
  }

  static async getRecentEvents(limit: number = 10): Promise<Event[]> {
    // Get current household session for filtering
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error("No household session found");
    }

    const { data, error } = await supabase
      .from(DB_TABLES.EVENTS)
      .select("*")
      .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id)
      .order("date", { ascending: false })
      .limit(limit);

    if (error) {
      console.error("Error fetching recent events:", error);
      throw ErrorMapper.mapDatabaseError(error, "fetch", "event");
    }

    return (data || []) as Event[];
  }

  static async getLastEventByType(
    plantId: string,
    eventType: string,
  ): Promise<Event | null> {
    // Get current household session for filtering
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error("No household session found");
    }

    // Verify plant belongs to current household
    const plant = await PlantService.getPlantById(plantId);
    if (!plant) {
      throw new Error("Plant not found or not accessible");
    }

    const { data, error } = await supabase
      .from(DB_TABLES.EVENTS)
      .select("*")
      .eq(DB_COLUMNS.PLANT_ID, plantId)
      .eq(DB_COLUMNS.EVENT_TYPE, eventType)
      .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id)
      .order("date", { ascending: false })
      .limit(1);

    if (error) {
      console.error("Error fetching last event by type:", error);
      throw ErrorMapper.mapDatabaseError(error, "fetch", "event");
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
        throw new Error("No household session found");
      }

      // Verify plant belongs to current household
      const plant = await PlantService.getPlantById(plantId);
      if (!plant) {
        throw new Error("Plant not found or not accessible");
      }

      // Get total events count
      const { count, error: countError } = await supabase
        .from(DB_TABLES.EVENTS)
        .select("*", { count: "exact", head: true })
        .eq(DB_COLUMNS.PLANT_ID, plantId)
        .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id);

      if (countError) {
        console.error("Error getting events count:", countError);
        throw new Error(`Failed to get events count: ${countError.message}`);
      }

      const totalEvents = count || 0;

      // Get last events by type
      const lastWatered = await this.getLastEventByType(plantId, "water");
      const lastFertilized = await this.getLastEventByType(
        plantId,
        "fertilize",
      );
      const lastRepotted = await this.getLastEventByType(plantId, "repot");

      return {
        totalEvents,
        lastWatered: lastWatered?.date,
        lastFertilized: lastFertilized?.date,
        lastRepotted: lastRepotted?.date,
      };
    } catch (error) {
      console.error("Error getting event stats:", error);
      throw error;
    }
  }

  static async deleteAllEvents(): Promise<void> {
    // Get current household session — only delete events for the current
    // household, never every row in the table.
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error("No household session found");
    }

    const { error } = await supabase
      .from(DB_TABLES.EVENTS)
      .delete()
      .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id);

    if (error) {
      console.error("Error deleting all events:", error);
      throw ErrorMapper.mapDatabaseError(error, "delete", "event");
    }
  }

  static async getLastEventsByTypeForPlants(
    plantIds: string[],
    eventTypes: string[],
  ): Promise<{ [plantId: string]: { [eventType: string]: Event | null } }> {
    // Get current household session for filtering
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error("No household session found");
    }

    if (plantIds.length === 0) {
      return {};
    }

    try {
      // Fetch all relevant events in one query
      const { data, error } = await supabase
        .from(DB_TABLES.EVENTS)
        .select("*")
        .in("plant_id", plantIds)
        .in("event_type", eventTypes)
        .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id)
        .order("date", { ascending: false });

      if (error) {
        console.error("Error fetching last events by type for plants:", error);
        throw ErrorMapper.mapDatabaseError(error, "fetch", "event");
      }

      // Group events by plant and type, keeping only the most recent for each combination
      const result: {
        [plantId: string]: { [eventType: string]: Event | null };
      } = {};

      // Initialize result structure
      plantIds.forEach((plantId) => {
        result[plantId] = {};
        eventTypes.forEach((eventType) => {
          result[plantId][eventType] = null;
        });
      });

      // Process events to find the most recent for each plant/type combination
      if (data) {
        const eventsByPlantAndType = new Map<string, Event>();

        data.forEach((event: any) => {
          const key = `${event.plant_id}-${event.event_type}`;
          const existingEvent = eventsByPlantAndType.get(key);

          if (
            !existingEvent ||
            dayjs(event.date).isAfter(dayjs(existingEvent.date))
          ) {
            eventsByPlantAndType.set(key, event as Event);
          }
        });

        // Populate result with the most recent events
        eventsByPlantAndType.forEach((event, key) => {
          const lastDashIndex = key.lastIndexOf("-");
          const plantId = key.substring(0, lastDashIndex);
          const eventType = key.substring(lastDashIndex + 1);

          if (result[plantId]) {
            result[plantId][eventType] = event;
          }
        });
      }

      return result;
    } catch (error) {
      console.error("Error in getLastEventsByTypeForPlants:", error);
      throw error;
    }
  }
}
