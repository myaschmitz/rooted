import { Tag, PlantTag, PlantTagWithDetails } from "../types/Plant";
import { supabase } from "./SupabaseService";
import { HouseholdService } from "./HouseholdService";
import { CacheInvalidationService } from "./CacheInvalidationService";
import type { Database } from "../types/Database";
import {
  isNotFoundError,
  isDuplicateError,
  DB_TABLES,
  DB_COLUMNS,
} from "../constants/domain";
import { ErrorMapper } from "../errors/ErrorMapper";

type TagRow = Database["public"]["Tables"]["tags"]["Row"];
type TagInsert = Database["public"]["Tables"]["tags"]["Insert"];
type TagUpdate = Database["public"]["Tables"]["tags"]["Update"];
type PlantTagRow = Database["public"]["Tables"]["plant_tags"]["Row"];
type PlantTagInsert = Database["public"]["Tables"]["plant_tags"]["Insert"];

export class TagService {
  // ============================================================================
  // TAG MANAGEMENT METHODS
  // ============================================================================

  static async getAllTags(): Promise<Tag[]> {
    const householdId = await HouseholdService.requireHouseholdId();

    const { data, error } = await supabase
      .from(DB_TABLES.TAGS)
      .select("*")
      .eq(DB_COLUMNS.HOUSEHOLD_ID, householdId)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error fetching tags:", error);
      throw ErrorMapper.mapDatabaseError(error, "fetch", "tag");
    }

    return (data || []) as Tag[];
  }

  static async getTagById(tagId: string): Promise<Tag> {
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error("No household session found");
    }

    const { data, error } = await supabase
      .from(DB_TABLES.TAGS)
      .select("*")
      .eq("id", tagId)
      .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id)
      .single();

    if (error) {
      console.error("Error fetching tag by ID:", error);
      throw ErrorMapper.mapDatabaseError(error, "fetch", "tag");
    }

    if (!data) {
      throw new Error("Tag not found");
    }

    return data as Tag;
  }

  static async createTag(name: string, color: string): Promise<Tag> {
    const householdId = await HouseholdService.requireHouseholdId();

    // Validate color format (hex color)
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
      throw new Error("Color must be a valid hex color code (e.g., #FF5733)");
    }

    // Validate tag name
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length === 0) {
      throw new Error("Tag name cannot be empty");
    }
    if (trimmedName.length > 50) {
      throw new Error("Tag name cannot exceed 50 characters");
    }

    const tagInsert: TagInsert = {
      name: trimmedName,
      color: color.toUpperCase(),
      household_id: householdId,
    };

    const { data, error } = await supabase
      .from(DB_TABLES.TAGS)
      .insert(tagInsert)
      .select()
      .single();

    if (error) {
      console.error("Error creating tag:", error);
      if (isDuplicateError(error)) {
        throw new Error(
          "A tag with this name and color already exists in your household",
        );
      }
      throw ErrorMapper.mapDatabaseError(error, "create", "tag");
    }

    const tag = data as Tag;

    // Log activity
    await HouseholdService.logActivity(
      "added tag",
      {
        tag_id: tag.id,
        tag_name: tag.name,
        tag_color: tag.color,
      },
      `"${tag.name}" tag`,
    );

    CacheInvalidationService.invalidate("tags_changed");

    return tag;
  }

  static async updateTag(
    tagId: string,
    updates: { name?: string; color?: string },
  ): Promise<Tag | null> {
    // Validate updates
    if (updates.name !== undefined) {
      const trimmedName = updates.name.trim();
      if (!trimmedName || trimmedName.length === 0) {
        throw new Error("Tag name cannot be empty");
      }
      if (trimmedName.length > 50) {
        throw new Error("Tag name cannot exceed 50 characters");
      }
      updates.name = trimmedName;
    }

    if (updates.color !== undefined) {
      if (!/^#[0-9A-Fa-f]{6}$/.test(updates.color)) {
        throw new Error("Color must be a valid hex color code (e.g., #FF5733)");
      }
      updates.color = updates.color.toUpperCase();
    }

    const tagUpdate: TagUpdate = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from(DB_TABLES.TAGS)
      .update(tagUpdate)
      .eq("id", tagId)
      .select()
      .single();

    if (error) {
      if (isNotFoundError(error)) {
        return null; // No rows found
      }
      console.error("Error updating tag:", error);
      if (isDuplicateError(error)) {
        throw new Error(
          "A tag with this name and color already exists in your household",
        );
      }
      throw ErrorMapper.mapDatabaseError(error, "update", "tag");
    }

    const tag = data as Tag;

    // Log activity
    await HouseholdService.logActivity(
      "updated tag",
      {
        tag_id: tag.id,
        updated_fields: Object.keys(updates),
      },
      `"${tag.name}" tag`,
    );

    CacheInvalidationService.invalidate("tags_changed");

    return tag;
  }

  static async deleteTag(tagId: string): Promise<boolean> {
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error("No household session found");
    }

    // Get tag info before deleting for activity log
    const { data: tag, error: fetchError } = await supabase
      .from(DB_TABLES.TAGS)
      .select("*")
      .eq("id", tagId)
      .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id)
      .single();

    if (fetchError) {
      console.error("Error fetching tag for deletion:", fetchError);
      throw ErrorMapper.mapDatabaseError(fetchError, "fetch", "tag");
    }

    // Delete the tag (this will cascade delete all plant_tags relationships)
    const { error } = await supabase
      .from(DB_TABLES.TAGS)
      .delete()
      .eq("id", tagId)
      .eq(DB_COLUMNS.HOUSEHOLD_ID, session.household_id);

    if (error) {
      console.error("Error deleting tag:", error);
      throw ErrorMapper.mapDatabaseError(error, "delete", "tag");
    }

    // Log activity
    if (tag) {
      await HouseholdService.logActivity(
        "deleted tag",
        {
          tag_id: tag.id,
          tag_name: tag.name,
          tag_color: tag.color,
        },
        `"${tag.name}" tag`,
      );
    }

    CacheInvalidationService.invalidate("tags_changed");

    return true;
  }

  static async findExistingTag(
    name: string,
    color: string,
  ): Promise<Tag | null> {
    const householdId = await HouseholdService.requireHouseholdId();

    const trimmedName = name.trim();

    // Find any tag with the same name and color in the household
    const { data, error } = await supabase
      .from(DB_TABLES.TAGS)
      .select("*")
      .eq(DB_COLUMNS.HOUSEHOLD_ID, householdId)
      .ilike("name", trimmedName) // Case-insensitive match
      .eq("color", color.toUpperCase())
      .limit(1)
      .single();

    if (error) {
      if (isNotFoundError(error)) {
        return null; // No matching tag found
      }
      console.error("Error finding existing tag:", error);
      throw ErrorMapper.mapDatabaseError(error, "fetch", "tag");
    }

    return data as Tag;
  }

  static async createOrFindTag(
    name: string,
    color: string,
  ): Promise<{ tag: Tag; isNew: boolean }> {
    // First try to find an existing tag with the same name and color
    const existingTag = await this.findExistingTag(name, color);

    if (existingTag) {
      return { tag: existingTag, isNew: false };
    } else {
      // Create a new tag
      const tag = await this.createTag(name, color);
      return { tag, isNew: true };
    }
  }

  // ============================================================================
  // PLANT-TAG RELATIONSHIP METHODS
  // ============================================================================

  static async getTagsByPlantId(plantId: string): Promise<Tag[]> {
    await HouseholdService.requireHouseholdId();

    // Join plant_tags with tags to get full tag details
    const { data, error } = await supabase
      .from(DB_TABLES.PLANT_TAGS)
      .select(
        `
        *,
        tag:tags(*)
      `,
      )
      .eq(DB_COLUMNS.PLANT_ID, plantId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching plant tags:", error);
      throw ErrorMapper.mapDatabaseError(error, "fetch", "tag");
    }

    const plantTagsWithDetails = (data || []) as (PlantTagRow & {
      tag: TagRow;
    })[];
    return plantTagsWithDetails.map((pt) => pt.tag as Tag);
  }

  /**
   * Returns tags for many plants in a single round-trip. Replaces the N+1
   * pattern of calling `getTagsByPlantId` once per plant.
   *
   * Returns an empty array for any plant with no tags.
   */
  static async getTagsByPlantIds(
    plantIds: string[],
  ): Promise<{ [plantId: string]: Tag[] }> {
    const result: { [plantId: string]: Tag[] } = {};
    plantIds.forEach((id) => {
      result[id] = [];
    });

    if (plantIds.length === 0) return result;

    try {
      await HouseholdService.requireHouseholdId();

      // Single query: join plant_tags → tags for the requested plant set.
      const { data, error } = await supabase
        .from(DB_TABLES.PLANT_TAGS)
        .select(`*, tag:tags(*)`)
        .in(DB_COLUMNS.PLANT_ID, plantIds)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching batch plant tags:", error);
        throw ErrorMapper.mapDatabaseError(error, "fetch", "tag");
      }

      const rows = (data || []) as (PlantTagRow & { tag: TagRow | null })[];
      for (const row of rows) {
        if (!row.tag) continue; // junction row with no joined tag (shouldn't happen, but safe)
        const bucket = result[row.plant_id];
        if (bucket) bucket.push(row.tag as Tag);
      }

      return result;
    } catch (error) {
      console.error("Error in getTagsByPlantIds:", error);
      return result;
    }
  }

  static async addTagToPlant(
    plantId: string,
    tagId: string,
  ): Promise<PlantTag> {
    // Check if this plant already has this tag
    const existingRelation = await supabase
      .from(DB_TABLES.PLANT_TAGS)
      .select("*")
      .eq(DB_COLUMNS.PLANT_ID, plantId)
      .eq("tag_id", tagId)
      .single();

    if (existingRelation.data) {
      throw new Error("This plant already has this tag");
    }

    // Create the relationship
    const plantTagInsert: PlantTagInsert = {
      plant_id: plantId,
      tag_id: tagId,
    };

    const { data, error } = await supabase
      .from(DB_TABLES.PLANT_TAGS)
      .insert(plantTagInsert)
      .select()
      .single();

    if (error) {
      console.error("Error adding tag to plant:", error);
      throw ErrorMapper.mapDatabaseError(error, "create", "tag");
    }

    const plantTag = data as PlantTag;

    // Get tag details for activity log
    const tag = await this.getTagById(tagId);

    // Log activity
    await HouseholdService.logActivity(
      "added tag",
      {
        plant_id: plantId,
        tag_id: tagId,
        tag_name: tag.name,
        tag_color: tag.color,
      },
      `"${tag.name}" tag`,
    );

    CacheInvalidationService.invalidate("tags_changed");

    return plantTag;
  }

  static async addMultipleTagsToPlant(
    plantId: string,
    tagIds: string[],
  ): Promise<PlantTag[]> {
    if (tagIds.length === 0) {
      return [];
    }

    // Get existing plant tags to check for duplicates
    const existingRelations = await supabase
      .from(DB_TABLES.PLANT_TAGS)
      .select("tag_id")
      .eq(DB_COLUMNS.PLANT_ID, plantId)
      .in("tag_id", tagIds);

    if (existingRelations.error) {
      console.error(
        "Error checking existing plant tags:",
        existingRelations.error,
      );
      throw new Error(
        `Failed to check existing tags: ${existingRelations.error.message}`,
      );
    }

    const existingTagIds = new Set(
      existingRelations.data?.map((pt) => pt.tag_id) || [],
    );
    const newTagIds = tagIds.filter((tagId) => !existingTagIds.has(tagId));

    if (newTagIds.length === 0) {
      throw new Error("All selected tags are already added to this plant");
    }

    // Create plant tag relationships for new tags
    const plantTagInserts: PlantTagInsert[] = newTagIds.map((tagId) => ({
      plant_id: plantId,
      tag_id: tagId,
    }));

    const { data, error } = await supabase
      .from(DB_TABLES.PLANT_TAGS)
      .insert(plantTagInserts)
      .select();

    if (error) {
      console.error("Error adding multiple tags to plant:", error);
      throw ErrorMapper.mapDatabaseError(error, "create", "tag");
    }

    const plantTags = data as PlantTag[];

    // Get tag details for activity logging
    const { data: tagDetails, error: tagError } = await supabase
      .from(DB_TABLES.TAGS)
      .select("*")
      .in("id", newTagIds);

    if (tagError) {
      console.error("Error fetching tag details for logging:", tagError);
    }

    const tags = (tagDetails || []) as Tag[];

    // Log activity for each added tag
    if (tags.length > 0) {
      const tagNames = tags.map((tag) => tag.name).join(", ");
      await HouseholdService.logActivity(
        "added multiple tags",
        {
          plant_id: plantId,
          tag_ids: newTagIds,
          tag_names: tagNames,
          tag_count: newTagIds.length,
        },
        `${newTagIds.length} tags: ${tagNames}`,
      );
    }

    CacheInvalidationService.invalidate("tags_changed");

    return plantTags;
  }

  static async removeTagFromPlant(
    plantId: string,
    tagId: string,
  ): Promise<boolean> {
    // Get tag details for activity log before deletion
    const tag = await this.getTagById(tagId);

    const { error } = await supabase
      .from(DB_TABLES.PLANT_TAGS)
      .delete()
      .eq(DB_COLUMNS.PLANT_ID, plantId)
      .eq("tag_id", tagId);

    if (error) {
      console.error("Error removing tag from plant:", error);
      throw ErrorMapper.mapDatabaseError(error, "delete", "tag");
    }

    // Log activity
    await HouseholdService.logActivity(
      "deleted tag",
      {
        plant_id: plantId,
        tag_id: tagId,
        tag_name: tag.name,
        tag_color: tag.color,
      },
      `"${tag.name}" tag`,
    );

    CacheInvalidationService.invalidate("tags_changed");

    return true;
  }

  static async removeAllTagsFromPlant(plantId: string): Promise<void> {
    await HouseholdService.requireHouseholdId();

    const { error } = await supabase
      .from(DB_TABLES.PLANT_TAGS)
      .delete()
      .eq(DB_COLUMNS.PLANT_ID, plantId);

    if (error) {
      console.error("Error removing all tags from plant:", error);
      throw ErrorMapper.mapDatabaseError(error, "delete", "tag");
    }

    CacheInvalidationService.invalidate("tags_changed");
  }

  static async getAvailableTagsForPlant(
    plantId: string,
  ): Promise<Tag[]> {
    try {
      // Get all tags in household
      const allTags = await this.getAllTags();

      // Get tags already on this plant
      const plantTags = await this.getTagsByPlantId(plantId);

      // Create a set of tag IDs already on this plant
      const existingTagIds = new Set(plantTags.map((tag) => tag.id));

      // Filter out tags that are already on this plant
      const availableTags = allTags.filter(
        (tag) => !existingTagIds.has(tag.id),
      );

      return availableTags;
    } catch (error) {
      console.error("Error in getAvailableTagsForPlant:", error);
      // Return an empty list so the user can still create a tag
      return [];
    }
  }

  static async getAllTagsWithPlantStatus(
    plantId: string,
  ): Promise<(Tag & { isAlreadyAdded: boolean })[]> {
    try {
      // Get all tags in household
      const allTags = await this.getAllTags();

      // Get tags already on this plant
      const plantTags = await this.getTagsByPlantId(plantId);

      // Create a set of tag IDs already on this plant
      const existingTagIds = new Set(plantTags.map((tag) => tag.id));

      // Add isAlreadyAdded status to each tag
      const tagsWithStatus = allTags.map((tag) => ({
        ...tag,
        isAlreadyAdded: existingTagIds.has(tag.id),
      }));

      return tagsWithStatus;
    } catch (error) {
      console.error("Error in getAllTagsWithPlantStatus:", error);
      // Return an empty list so the user can still create a tag
      return [];
    }
  }

  // ============================================================================
  // CONVENIENCE METHODS
  // ============================================================================

  static async createTagAndAddToPlant(
    plantId: string,
    name: string,
    color: string,
  ): Promise<{ tag: Tag; plantTag: PlantTag; isNew: boolean }> {
    // Create or find the tag
    const result = await this.createOrFindTag(name, color);

    // Add it to the plant
    const plantTag = await this.addTagToPlant(plantId, result.tag.id);

    return {
      tag: result.tag,
      plantTag,
      isNew: result.isNew,
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  static getDefaultTagColors(): string[] {
    return [
      "#B22222", // FireBrick
      "#DC143C", // Crimson
      "#EE5A6F", // Dark Pink
      "#FF6B6B", // Red
      "#FF9FF3", // Pink
      "#FF9F43", // Orange
      "#DAA520", // Goldenrod
      "#FECA57", // Yellow
      "#10AC84", // Dark Green
      "#00D2D3", // Cyan
      "#4ECDC4", // Teal
      "#54A0FF", // Light Blue
      "#45B7D1", // Blue
      "#96CEB4", // Green
      "#5F27CD", // Purple
      "#8A2BE2", // BlueViolet
    ];
  }

  static validateTagColor(color: string): boolean {
    return /^#[0-9A-Fa-f]{6}$/.test(color);
  }

  static validateTagName(name: string): { isValid: boolean; error?: string } {
    const trimmedName = name.trim();

    if (!trimmedName || trimmedName.length === 0) {
      return { isValid: false, error: "Tag name cannot be empty" };
    }

    if (trimmedName.length > 50) {
      return { isValid: false, error: "Tag name cannot exceed 50 characters" };
    }

    return { isValid: true };
  }
}
