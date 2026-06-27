import { PlantNote } from "../types/Plant";
import { supabase } from "./SupabaseService";
import { HouseholdService } from "./HouseholdService";
import { PlantService } from "./PlantService";
import type { Database } from "../types/Database";
import { isNotFoundError, DB_TABLES, DB_COLUMNS } from "../constants/domain";
import { ErrorMapper } from "../errors/ErrorMapper";
import { CacheKeyBuilder } from "./CacheKeyBuilder";

type PlantNoteRow = Database["public"]["Tables"]["plant_notes"]["Row"];
type PlantNoteInsert = Database["public"]["Tables"]["plant_notes"]["Insert"];
type PlantNoteUpdate = Database["public"]["Tables"]["plant_notes"]["Update"];

export class NotesService {
  static async getNotesByPlantId(plantId: string): Promise<PlantNote[]> {
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
      .from(DB_TABLES.NOTES)
      .select("*")
      .eq(DB_COLUMNS.PLANT_ID, plantId)
      .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching notes:", error);
      throw ErrorMapper.mapDatabaseError(error, "fetch", "note");
    }

    return (data || []) as PlantNote[];
  }

  static async createNote(
    plantId: string,
    content: string,
  ): Promise<PlantNote> {
    // Get current household session
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error("No household session found");
    }

    // Verify plant belongs to current household
    const plant = await PlantService.getPlantById(plantId);
    if (!plant) {
      throw new Error("Plant not found or not accessible");
    }

    const noteInsert: PlantNoteInsert = {
      plant_id: plantId,
      content,
      household_id: session.household_id,
    };

    const { data, error } = await supabase
      .from(DB_TABLES.NOTES)
      .insert(noteInsert)
      .select()
      .single();

    if (error) {
      console.error("Error creating note:", error);
      throw ErrorMapper.mapDatabaseError(error, "create", "note");
    }

    return data as PlantNote;
  }

  static async updateNote(
    id: string,
    content: string,
  ): Promise<PlantNote | null> {
    // Get current household session for filtering
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error("No household session found");
    }

    const noteUpdate: PlantNoteUpdate = {
      content,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from(DB_TABLES.NOTES)
      .update(noteUpdate)
      .eq("id", id)
      .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id)
      .select()
      .single();

    if (error) {
      if (isNotFoundError(error)) {
        return null; // No rows found
      }
      console.error("Error updating note:", error);
      throw ErrorMapper.mapDatabaseError(error, "update", "note");
    }

    return data as PlantNote;
  }

  static async getNoteById(id: string): Promise<PlantNote | null> {
    // Get current household session for filtering
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error("No household session found");
    }

    const { data, error } = await supabase
      .from(DB_TABLES.NOTES)
      .select("*")
      .eq("id", id)
      .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id)
      .single();

    if (error) {
      if (isNotFoundError(error)) {
        return null; // No rows found
      }
      console.error("Error fetching note:", error);
      throw ErrorMapper.mapDatabaseError(error, "fetch", "note");
    }

    return data as PlantNote;
  }

  static async deleteNote(id: string): Promise<boolean> {
    // Get current household session for filtering
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error("No household session found");
    }

    const { error } = await supabase
      .from(DB_TABLES.NOTES)
      .delete()
      .eq("id", id)
      .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id);

    if (error) {
      console.error("Error deleting note:", error);
      throw ErrorMapper.mapDatabaseError(error, "delete", "note");
    }

    return true;
  }

  static async searchNotes(query: string): Promise<PlantNote[]> {
    // Get current household session for filtering
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error("No household session found");
    }

    const searchTerm = `%${query.toLowerCase()}%`;

    const { data, error } = await supabase
      .from(DB_TABLES.NOTES)
      .select("*")
      .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id)
      .ilike("content", searchTerm)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error searching notes:", error);
      throw ErrorMapper.mapDatabaseError(error, "search", "note");
    }

    return (data || []) as PlantNote[];
  }

  static async getAllNotes(): Promise<PlantNote[]> {
    // Get current household session for filtering
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error("No household session found");
    }

    const { data, error } = await supabase
      .from(DB_TABLES.NOTES)
      .select("*")
      .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching all notes:", error);
      throw ErrorMapper.mapDatabaseError(error, "fetch", "note");
    }

    return (data || []) as PlantNote[];
  }

  static async deleteAllNotes(): Promise<void> {
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error("No household session found");
    }

    const { error } = await supabase
      .from(DB_TABLES.NOTES)
      .delete()
      .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id);

    if (error) {
      console.error("Error deleting all notes:", error);
      throw ErrorMapper.mapDatabaseError(error, "delete", "note");
    }
  }
}
