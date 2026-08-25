import { Plant } from "../types/Plant";
import dayjs from "dayjs";
import { supabase } from "./SupabaseService";
import { HouseholdService } from "./HouseholdService";
import { CacheService } from "./CacheService";
import { CacheInvalidationService } from "./CacheInvalidationService";
import type { Database } from "../types/Database";
import {
  CACHE_TTL,
  isNotFoundError,
  DB_TABLES,
  DB_COLUMNS,
} from "../constants/domain";
import { ErrorMapper } from "../errors/ErrorMapper";
import { CacheKeyBuilder } from "./CacheKeyBuilder";
import { PhotoStorageService } from "./PhotoStorageService";

type PlantRow = Database["public"]["Tables"]["plants"]["Row"];
type PlantInsert = Database["public"]["Tables"]["plants"]["Insert"];
type PlantUpdate = Database["public"]["Tables"]["plants"]["Update"];

export class PlantService {
  static async getAllPlants(): Promise<Plant[]> {
    // Get current household session for filtering
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error("No household session found");
    }

    const cacheKey = CacheKeyBuilder.plantsList(session.household_id);

    // Try to get from cache first
    const cached = await CacheService.getCachedResponse<Plant[]>(cacheKey);
    if (cached) {
      return cached;
    }

    // If not in cache, fetch from database
    const { data, error } = await supabase
      .from(DB_TABLES.PLANTS)
      .select("*")
      .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id)
      .eq("archived", false)
      .order("name", { ascending: true });

    if (error) {
      throw ErrorMapper.mapDatabaseError(error, "fetch plants");
    }

    const plants = (data || []) as Plant[];

    await CacheService.cacheApiResponse(
      cacheKey,
      plants,
      CACHE_TTL.PLANTS_LIST,
    );

    return plants;
  }

  static async getPlantById(id: string): Promise<Plant | null> {
    // Get current household session for filtering
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error("No household session found");
    }

    const cacheKey = CacheKeyBuilder.plant(id, session.household_id);

    // Try to get from cache first
    const cached = await CacheService.getCachedResponse<Plant>(cacheKey);
    if (cached) {
      return cached;
    }

    // If not in cache, fetch from database
    const { data, error } = await supabase
      .from(DB_TABLES.PLANTS)
      .select("*")
      .eq("id", id)
      .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id)
      .single();

    if (error) {
      if (isNotFoundError(error)) {
        return null;
      }
      throw ErrorMapper.mapDatabaseError(error, "fetch", "plant");
    }

    const plant = data as Plant;

    await CacheService.cacheApiResponse(
      cacheKey,
      plant,
      CACHE_TTL.PLANT_SINGLE,
    );

    return plant;
  }

  static async createPlant(
    plantData: Omit<
      Plant,
      | "id"
      | "created_at"
      | "updated_at"
      | "household_id"
      | "pinned"
      | "archived"
      | "archived_at"
    >,
  ): Promise<Plant> {
    // Get current household session
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error("No household session found");
    }

    const plantInsert: PlantInsert = {
      ...plantData,
      household_id: session.household_id,
      pinned: false,
      archived: false,
    };

    const { data, error } = await supabase
      .from(DB_TABLES.PLANTS)
      .insert(plantInsert)
      .select()
      .single();

    if (error) {
      throw ErrorMapper.mapDatabaseError(error, "create", "plant");
    }

    const plant = data as Plant;

    // Log activity
    await HouseholdService.logActivity(
      "added plant",
      {
        plant_id: plant.id,
        plant_type: plant.type,
        location: plant.location,
      },
      plant.name || plant.type,
    );

    // Invalidate relevant caches
    await CacheInvalidationService.invalidateOnUserAction("plant_added", {
      entityId: plant.id,
      additionalData: { location: plant.location },
    });

    return plant;
  }

  static async updatePlant(
    id: string,
    updates: Partial<Omit<Plant, "id" | "created_at">>,
  ): Promise<Plant | null> {
    // Get current household session for filtering
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error("No household session found");
    }

    const plantUpdate: PlantUpdate = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from(DB_TABLES.PLANTS)
      .update(plantUpdate)
      .eq("id", id)
      .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id)
      .select()
      .single();

    if (error) {
      if (isNotFoundError(error)) {
        return null;
      }
      console.error("Error updating plant:", error);
      throw ErrorMapper.mapDatabaseError(error, "update", "plant");
    }

    const plant = data as Plant;

    // Log activity for updates (but not for pin/unpin operations)
    if (!("pinned" in updates) || Object.keys(updates).length > 1) {
      await HouseholdService.logActivity(
        "updated plant",
        {
          plant_id: plant.id,
          updated_fields: Object.keys(updates),
        },
        plant.name || plant.type,
      );
    }

    // Invalidate relevant caches
    await CacheInvalidationService.invalidateOnUserAction("plant_updated", {
      entityId: plant.id,
      additionalData: {
        oldLocation: updates.location ? undefined : plant.location, // If location wasn't updated, pass current location
        newLocation: updates.location,
      },
    });

    return plant;
  }

  /**
   * Move a plant's children onto their grandparent before it is deleted, so
   * removing a cutting mid-tree doesn't orphan everything below it.
   *
   * Lives on PlantService rather than PropagationService to keep the delete
   * path free of a circular import, and is done in application code rather
   * than a database trigger: a row trigger that updates sibling rows fails
   * with "tuple to be deleted was already modified by an operation triggered
   * by the current command" whenever a delete spans multiple rows of the same
   * table. Returns the number of reparented plants.
   *
   * Pass `newParentId` when the caller already knows the grandparent, to skip
   * a redundant lookup.
   */
  static async reparentPropagationChildren(
    plantId: string,
    newParentId?: string | null,
  ): Promise<number> {
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error("No household session found");
    }

    let parentId = newParentId;
    if (parentId === undefined) {
      const plant = await this.getPlantById(plantId);
      if (!plant) return 0;
      parentId = plant.parent_plant_id ?? null;
    }

    const { data, error } = await supabase
      .from(DB_TABLES.PLANTS)
      .update({ parent_plant_id: parentId ?? null })
      .eq(DB_COLUMNS.PARENT_PLANT_ID, plantId)
      .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id)
      .select("id");

    if (error) {
      throw ErrorMapper.mapDatabaseError(error, "update", "plant");
    }

    return (data || []).length;
  }

  static async deletePlant(id: string): Promise<boolean> {
    // Get current household session for filtering
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error("No household session found");
    }

    // Get plant info before deleting for activity log
    // (getPlantById already scopes to this household, so this also acts as access check)
    const plant = await this.getPlantById(id);

    // Keep the propagation tree intact — children move up to their grandparent.
    if (plant) {
      await this.reparentPropagationChildren(id, plant.parent_plant_id ?? null);
    }

    const { data: photos, error: photosError } = await supabase
      .from(DB_TABLES.PLANT_PHOTOS)
      .select(`${DB_COLUMNS.FILE_PATH}, ${DB_COLUMNS.THUMBNAIL_PATH}`)
      .eq(DB_COLUMNS.PLANT_ID, id)
      .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id);

    if (photosError) {
      throw ErrorMapper.mapDatabaseError(photosError, "fetch", "photo");
    }
    const photoFileNames = PhotoStorageService.getFileNames(photos || []);

    const { error } = await supabase
      .from(DB_TABLES.PLANTS)
      .delete()
      .eq("id", id)
      .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id);

    if (error) {
      console.error("Error deleting plant:", error);
      throw ErrorMapper.mapDatabaseError(error, "delete", "plant");
    }

    await PhotoStorageService.removeFiles(photoFileNames);

    // Log activity
    if (plant) {
      await HouseholdService.logActivity(
        "deleted plant",
        {
          plant_id: plant.id,
          plant_type: plant.type,
          location: plant.location,
        },
        plant.name || plant.type,
      );

      // Invalidate relevant caches
      await CacheInvalidationService.invalidateOnUserAction("plant_deleted", {
        entityId: plant.id,
        additionalData: { location: plant.location },
        clearPhotoCache: true, // Also clear photo cache for deleted plants
      });
    }

    return true;
  }

  static async searchPlants(query: string): Promise<Plant[]> {
    // Get current household session for filtering
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error("No household session found");
    }

    const searchTerm = `%${query.toLowerCase()}%`;
    const cacheKey = CacheKeyBuilder.plantsSearch(session.household_id, query);

    // Try to get from cache first (shorter TTL for searches)
    const cached = await CacheService.getCachedResponse<Plant[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const { data, error } = await supabase
      .from(DB_TABLES.PLANTS)
      .select("*")
      .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id)
      .or(
        `name.ilike.${searchTerm},type.ilike.${searchTerm},location.ilike.${searchTerm}`,
      )
      .order("name", { ascending: true });

    if (error) {
      console.error("Error searching plants:", error);
      throw ErrorMapper.mapDatabaseError(error, "search", "plant");
    }

    const plants = (data || []) as Plant[];

    await CacheService.cacheApiResponse(
      cacheKey,
      plants,
      CACHE_TTL.PLANTS_SEARCH,
    );

    return plants;
  }

  static async getPlantsByLocation(location: string): Promise<Plant[]> {
    // Get current household session for filtering
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error("No household session found");
    }

    const cacheKey = CacheKeyBuilder.plantsByLocation(
      session.household_id,
      location,
    );

    // Try to get from cache first
    const cached = await CacheService.getCachedResponse<Plant[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const { data, error } = await supabase
      .from(DB_TABLES.PLANTS)
      .select("*")
      .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id)
      .eq("location", location)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching plants by location:", error);
      throw ErrorMapper.mapDatabaseError(error, "fetch", "plant");
    }

    const plants = (data || []) as Plant[];

    await CacheService.cacheApiResponse(
      cacheKey,
      plants,
      CACHE_TTL.PLANTS_BY_LOCATION,
    );

    return plants;
  }

  static async deleteAllPlants(): Promise<void> {
    // Get current household session — only delete plants for the current
    // household, never every row in the table.
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error("No household session found");
    }

    const { error } = await supabase
      .from(DB_TABLES.PLANTS)
      .delete()
      .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id);

    if (error) {
      console.error("Error deleting all plants:", error);
      throw ErrorMapper.mapDatabaseError(error, "delete", "plant");
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

  static async getPlantsWithLastWateringEvents(): Promise<
    Array<Plant & { lastWateringDate?: string | null }>
  > {
    try {
      // Get current household session for filtering
      const session = await HouseholdService.getUserSession();
      if (!session?.household_id) {
        throw new Error("No household session found");
      }

      const cacheKey = CacheKeyBuilder.plantsWithWatering(session.household_id);

      // Try to get from cache first
      const cached =
        await CacheService.getCachedResponse<
          Array<Plant & { lastWateringDate?: string | null }>
        >(cacheKey);
      if (cached) {
        return cached;
      }

      // First get all plants
      const plants = await this.getAllPlants();

      if (plants.length === 0) {
        const result: Array<Plant & { lastWateringDate?: string | null }> = [];
        await CacheService.cacheApiResponse(
          cacheKey,
          result,
          CACHE_TTL.PLANTS_WITH_WATERING,
        );
        return result;
      }

      // Get the most recent watering event for each plant in a single query
      // This uses a window function to get the latest event per plant
      const { data: lastWateringEvents, error } = await supabase
        .from(DB_TABLES.EVENTS)
        .select("plant_id, date, event_type")
        .in(
          "plant_id",
          plants.map((p) => p.id),
        )
        .in(DB_COLUMNS.EVENT_TYPE, ["water", "fertigate"]) // Both count as watering
        .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id)
        .order("date", { ascending: false });

      if (error) {
        console.error("Error fetching last watering events:", error);
        // Return plants without watering data rather than failing
        const result = plants.map((plant) => ({
          ...plant,
          lastWateringDate: null,
        }));
        await CacheService.cacheApiResponse(
          cacheKey,
          result,
          CACHE_TTL.PLANTS_WITH_WATERING,
        );
        return result;
      }

      // Create a map of plant ID to most recent watering date
      const lastWateringMap = new Map<string, string>();
      if (lastWateringEvents) {
        // Group events by plant_id and take the most recent one
        const eventsByPlant = new Map<
          string,
          { date: string; event_type: string }[]
        >();

        lastWateringEvents.forEach((event) => {
          if (!eventsByPlant.has(event.plant_id)) {
            eventsByPlant.set(event.plant_id, []);
          }
          eventsByPlant.get(event.plant_id)!.push({
            date: event.date,
            event_type: event.event_type,
          });
        });

        // For each plant, find the most recent watering event
        eventsByPlant.forEach((events, plantId) => {
          // Sort by date descending and take the first one
          const sortedEvents = events.sort(
            (a, b) => dayjs(b.date).valueOf() - dayjs(a.date).valueOf(),
          );
          if (sortedEvents.length > 0) {
            lastWateringMap.set(plantId, sortedEvents[0].date);
          }
        });
      }

      // Combine plants with their last watering dates
      const result = plants.map((plant) => ({
        ...plant,
        lastWateringDate: lastWateringMap.get(plant.id) || null,
      }));

      await CacheService.cacheApiResponse(
        cacheKey,
        result,
        CACHE_TTL.PLANTS_WITH_WATERING,
      );

      return result;
    } catch (error) {
      console.error("Error fetching plants with last watering events:", error);
      throw new Error(
        `Failed to fetch plants with watering data: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  static async archivePlant(id: string): Promise<boolean> {
    // Get current household session for filtering
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error("No household session found");
    }

    const plant = await this.getPlantById(id);

    const { error } = await supabase
      .from(DB_TABLES.PLANTS)
      .update({ archived: true, archived_at: new Date().toISOString() })
      .eq("id", id)
      .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id);

    if (error) {
      throw ErrorMapper.mapDatabaseError(error, "archive", "plant");
    }

    if (plant) {
      await HouseholdService.logActivity(
        "archived plant",
        { plant_id: plant.id, plant_type: plant.type },
        plant.name || plant.type,
      );
      await CacheInvalidationService.invalidateOnUserAction("plant_deleted", {
        entityId: plant.id,
        additionalData: { location: plant.location },
      });
    }

    return true;
  }

  static async restorePlant(id: string): Promise<boolean> {
    // Get current household session for filtering
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error("No household session found");
    }

    const { error } = await supabase
      .from(DB_TABLES.PLANTS)
      .update({ archived: false, archived_at: null })
      .eq("id", id)
      .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id);

    if (error) {
      throw ErrorMapper.mapDatabaseError(error, "restore", "plant");
    }

    await CacheInvalidationService.invalidateOnUserAction("plant_deleted", {
      entityId: id,
    });

    return true;
  }

  static async getArchivedPlants(): Promise<Plant[]> {
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error("No household session found");
    }

    const { data, error } = await supabase
      .from(DB_TABLES.PLANTS)
      .select("*")
      .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id)
      .eq("archived", true)
      .order("archived_at", { ascending: false });

    if (error) {
      throw ErrorMapper.mapDatabaseError(error, "fetch archived plants");
    }

    return (data || []) as Plant[];
  }
}
