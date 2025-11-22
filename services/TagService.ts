import { Tag, PlantTag, PlantTagWithDetails } from '../types/Plant';
import { supabase } from './SupabaseService';
import { HouseholdService } from './HouseholdService';
import { CacheService } from './CacheService';
import { CacheInvalidationService } from './CacheInvalidationService';
import type { Database } from '../types/Database';

type TagRow = Database['public']['Tables']['tags']['Row'];
type TagInsert = Database['public']['Tables']['tags']['Insert'];
type TagUpdate = Database['public']['Tables']['tags']['Update'];
type PlantTagRow = Database['public']['Tables']['plant_tags']['Row'];
type PlantTagInsert = Database['public']['Tables']['plant_tags']['Insert'];

export class TagService {
  // ============================================================================
  // TAG MANAGEMENT METHODS
  // ============================================================================

  static async getAllTags(bypassCache = false): Promise<Tag[]> {
    // Get current household session for filtering
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error('No household session found');
    }

    const cacheKey = `all-tags-${session.household_id}`;
    
    // Try to get from cache first (unless bypassing cache)
    if (!bypassCache) {
      const cached = await CacheService.getCachedResponse<Tag[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('household_id', session.household_id)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching tags:', error);
      throw new Error(`Failed to fetch tags: ${error.message}`);
    }

    const tags = (data || []) as Tag[];
        
    // Cache the result for 10 minutes
    await CacheService.cacheApiResponse(cacheKey, tags, 10 * 60 * 1000);

    return tags;
  }

  static async getTagById(tagId: string): Promise<Tag> {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('id', tagId)
      .single();

    if (error) {
      console.error('Error fetching tag by ID:', error);
      throw new Error(`Failed to fetch tag: ${error.message}`);
    }

    if (!data) {
      throw new Error('Tag not found');
    }

    return data as Tag;
  }

  static async createTag(name: string, color: string): Promise<Tag> {
    // Get current household session
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error('No household session found');
    }

    // Validate color format (hex color)
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
      throw new Error('Color must be a valid hex color code (e.g., #FF5733)');
    }

    // Validate tag name
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length === 0) {
      throw new Error('Tag name cannot be empty');
    }
    if (trimmedName.length > 50) {
      throw new Error('Tag name cannot exceed 50 characters');
    }

    const tagInsert: TagInsert = {
      name: trimmedName,
      color: color.toUpperCase(),
      household_id: session.household_id,
    };

    const { data, error } = await supabase
      .from('tags')
      .insert(tagInsert)
      .select()
      .single();

    if (error) {
      console.error('Error creating tag:', error);
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('A tag with this name and color already exists in your household');
      }
      throw new Error(`Failed to create tag: ${error.message}`);
    }

    const tag = data as Tag;

    // Log activity
    await HouseholdService.logActivity('added tag', {
      tag_id: tag.id,
      tag_name: tag.name,
      tag_color: tag.color,
    }, `"${tag.name}" tag`);

    // Invalidate relevant caches
    await CacheInvalidationService.invalidateOnUserAction('tag_added', {
      entityId: tag.id,
    });

    return tag;
  }

  static async updateTag(tagId: string, updates: { name?: string; color?: string }): Promise<Tag | null> {
    // Validate updates
    if (updates.name !== undefined) {
      const trimmedName = updates.name.trim();
      if (!trimmedName || trimmedName.length === 0) {
        throw new Error('Tag name cannot be empty');
      }
      if (trimmedName.length > 50) {
        throw new Error('Tag name cannot exceed 50 characters');
      }
      updates.name = trimmedName;
    }

    if (updates.color !== undefined) {
      if (!/^#[0-9A-Fa-f]{6}$/.test(updates.color)) {
        throw new Error('Color must be a valid hex color code (e.g., #FF5733)');
      }
      updates.color = updates.color.toUpperCase();
    }

    const tagUpdate: TagUpdate = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('tags')
      .update(tagUpdate)
      .eq('id', tagId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No rows found
      }
      console.error('Error updating tag:', error);
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('A tag with this name and color already exists in your household');
      }
      throw new Error(`Failed to update tag: ${error.message}`);
    }

    const tag = data as Tag;

    // Log activity
    await HouseholdService.logActivity('updated tag', {
      tag_id: tag.id,
      updated_fields: Object.keys(updates),
    }, `"${tag.name}" tag`);

    // Invalidate relevant caches
    await CacheInvalidationService.invalidateOnUserAction('tag_updated', {
      entityId: tag.id,
    });

    return tag;
  }

  static async deleteTag(tagId: string): Promise<boolean> {
    // Get tag info before deleting for activity log
    const { data: tag, error: fetchError } = await supabase
      .from('tags')
      .select('*')
      .eq('id', tagId)
      .single();

    if (fetchError) {
      console.error('Error fetching tag for deletion:', fetchError);
      throw new Error(`Failed to fetch tag: ${fetchError.message}`);
    }

    // Delete the tag (this will cascade delete all plant_tags relationships)
    const { error } = await supabase
      .from('tags')
      .delete()
      .eq('id', tagId);

    if (error) {
      console.error('Error deleting tag:', error);
      throw new Error(`Failed to delete tag: ${error.message}`);
    }

    // Log activity
    if (tag) {
      await HouseholdService.logActivity('deleted tag', {
        tag_id: tag.id,
        tag_name: tag.name,
        tag_color: tag.color,
      }, `"${tag.name}" tag`);

      // Invalidate relevant caches
      await CacheInvalidationService.invalidateOnUserAction('tag_deleted', {
        entityId: tag.id,
      });
    }

    return true;
  }

  static async findExistingTag(name: string, color: string): Promise<Tag | null> {
    // Get current household session for filtering
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error('No household session found');
    }

    const trimmedName = name.trim();
    
    // Find any tag with the same name and color in the household
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .eq('household_id', session.household_id)
      .ilike('name', trimmedName) // Case-insensitive match
      .eq('color', color.toUpperCase())
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No matching tag found
      }
      console.error('Error finding existing tag:', error);
      throw new Error(`Failed to find existing tag: ${error.message}`);
    }

    return data as Tag;
  }

  static async createOrFindTag(name: string, color: string): Promise<{ tag: Tag; isNew: boolean }> {
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

  static async getTagsByPlantId(plantId: string, bypassCache = false): Promise<Tag[]> {
    // Get current household session for filtering
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error('No household session found');
    }

    const cacheKey = `plant-tags-${plantId}-${session.household_id}`;
    
    // Try to get from cache first (unless bypassing cache)
    if (!bypassCache) {
      const cached = await CacheService.getCachedResponse<Tag[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // Join plant_tags with tags to get full tag details
    const { data, error } = await supabase
      .from('plant_tags')
      .select(`
        *,
        tag:tags(*)
      `)
      .eq('plant_id', plantId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching plant tags:', error);
      throw new Error(`Failed to fetch plant tags: ${error.message}`);
    }

    const plantTagsWithDetails = (data || []) as (PlantTagRow & { tag: TagRow })[];
    const tags = plantTagsWithDetails.map(pt => pt.tag as Tag);
        
    // Cache the result for 10 minutes
    await CacheService.cacheApiResponse(cacheKey, tags, 10 * 60 * 1000);

    return tags;
  }

  static async addTagToPlant(plantId: string, tagId: string): Promise<PlantTag> {
    // Check if this plant already has this tag
    const existingRelation = await supabase
      .from('plant_tags')
      .select('*')
      .eq('plant_id', plantId)
      .eq('tag_id', tagId)
      .single();

    if (existingRelation.data) {
      throw new Error('This plant already has this tag');
    }

    // Create the relationship
    const plantTagInsert: PlantTagInsert = {
      plant_id: plantId,
      tag_id: tagId,
    };

    const { data, error } = await supabase
      .from('plant_tags')
      .insert(plantTagInsert)
      .select()
      .single();

    if (error) {
      console.error('Error adding tag to plant:', error);
      throw new Error(`Failed to add tag to plant: ${error.message}`);
    }

    const plantTag = data as PlantTag;

    // Get tag details for activity log
    const tag = await this.getTagById(tagId);

    // Log activity
    await HouseholdService.logActivity('added tag', {
      plant_id: plantId,
      tag_id: tagId,
      tag_name: tag.name,
      tag_color: tag.color,
    }, `"${tag.name}" tag`);

    // Get household_id for cache invalidation
    const session = await HouseholdService.getUserSession();
    
    // Invalidate relevant caches immediately for better UX
    await CacheInvalidationService.invalidateOnUserAction('tag_added', {
      entityId: plantTag.id,
      additionalData: { plant_id: plantId, tag_id: tagId, household_id: session?.household_id },
      immediate: true
    });

    return plantTag;
  }

  static async addMultipleTagsToPlant(plantId: string, tagIds: string[]): Promise<PlantTag[]> {
    if (tagIds.length === 0) {
      return [];
    }

    // Get existing plant tags to check for duplicates
    const existingRelations = await supabase
      .from('plant_tags')
      .select('tag_id')
      .eq('plant_id', plantId)
      .in('tag_id', tagIds);

    if (existingRelations.error) {
      console.error('Error checking existing plant tags:', existingRelations.error);
      throw new Error(`Failed to check existing tags: ${existingRelations.error.message}`);
    }

    const existingTagIds = new Set(existingRelations.data?.map(pt => pt.tag_id) || []);
    const newTagIds = tagIds.filter(tagId => !existingTagIds.has(tagId));

    if (newTagIds.length === 0) {
      throw new Error('All selected tags are already added to this plant');
    }

    // Create plant tag relationships for new tags
    const plantTagInserts: PlantTagInsert[] = newTagIds.map(tagId => ({
      plant_id: plantId,
      tag_id: tagId,
    }));

    const { data, error } = await supabase
      .from('plant_tags')
      .insert(plantTagInserts)
      .select();

    if (error) {
      console.error('Error adding multiple tags to plant:', error);
      throw new Error(`Failed to add tags to plant: ${error.message}`);
    }

    const plantTags = data as PlantTag[];

    // Get tag details for activity logging
    const { data: tagDetails, error: tagError } = await supabase
      .from('tags')
      .select('*')
      .in('id', newTagIds);

    if (tagError) {
      console.error('Error fetching tag details for logging:', tagError);
    }

    const tags = (tagDetails || []) as Tag[];

    // Log activity for each added tag
    if (tags.length > 0) {
      const tagNames = tags.map(tag => tag.name).join(', ');
      await HouseholdService.logActivity('added multiple tags', {
        plant_id: plantId,
        tag_ids: newTagIds,
        tag_names: tagNames,
        tag_count: newTagIds.length,
      }, `${newTagIds.length} tags: ${tagNames}`);
    }

    // Get household_id for cache invalidation
    const session = await HouseholdService.getUserSession();
    
    // Invalidate relevant caches immediately for better UX
    await CacheInvalidationService.invalidateOnUserAction('tag_added', {
      entityId: `${plantId}-multiple`,
      additionalData: { plant_id: plantId, tag_ids: newTagIds, household_id: session?.household_id },
      immediate: true
    });

    return plantTags;
  }

  static async removeTagFromPlant(plantId: string, tagId: string): Promise<boolean> {
    // Get tag details for activity log before deletion
    const tag = await this.getTagById(tagId);

    const { error } = await supabase
      .from('plant_tags')
      .delete()
      .eq('plant_id', plantId)
      .eq('tag_id', tagId);

    if (error) {
      console.error('Error removing tag from plant:', error);
      throw new Error(`Failed to remove tag from plant: ${error.message}`);
    }

    // Log activity
    await HouseholdService.logActivity('deleted tag', {
      plant_id: plantId,
      tag_id: tagId,
      tag_name: tag.name,
      tag_color: tag.color,
    }, `"${tag.name}" tag`);

    // Get household_id for cache invalidation
    const session = await HouseholdService.getUserSession();
    
    // Invalidate relevant caches immediately for better UX
    await CacheInvalidationService.invalidateOnUserAction('tag_deleted', {
      entityId: `${plantId}-${tagId}`,
      additionalData: { plant_id: plantId, tag_id: tagId, household_id: session?.household_id },
      immediate: true
    });

    return true;
  }

  static async removeAllTagsFromPlant(plantId: string): Promise<void> {
    // Get current household session for filtering
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error('No household session found');
    }

    const { error } = await supabase
      .from('plant_tags')
      .delete()
      .eq('plant_id', plantId);

    if (error) {
      console.error('Error removing all tags from plant:', error);
      throw new Error(`Failed to remove all tags from plant: ${error.message}`);
    }

    // Invalidate relevant caches
    await CacheInvalidationService.invalidateOnUserAction('tag_deleted', {
      entityId: plantId,
      additionalData: { plant_id: plantId }
    });
  }

  static async getAvailableTagsForPlant(plantId: string, bypassCache = false): Promise<Tag[]> {
    try {
      // Get all tags in household
      const allTags = await this.getAllTags(bypassCache);
      
      // Get tags already on this plant
      const plantTags = await this.getTagsByPlantId(plantId, bypassCache);
      
      // Create a set of tag IDs already on this plant
      const existingTagIds = new Set(plantTags.map(tag => tag.id));
      
      // Filter out tags that are already on this plant
      const availableTags = allTags.filter(tag => !existingTagIds.has(tag.id));
            
      return availableTags;
    } catch (error) {
      console.error('Error in getAvailableTagsForPlant:', error);
      // If there's an error with cached data, try without cache
      if (!bypassCache) {
        console.log('[TagService] Retrying getAvailableTagsForPlant without cache');
        return this.getAvailableTagsForPlant(plantId, true);
      }
      // If still failing, return empty array to allow tag creation
      console.log('[TagService] Falling back to empty available tags array');
      return [];
    }
  }

  static async getAllTagsWithPlantStatus(plantId: string, bypassCache = false): Promise<(Tag & { isAlreadyAdded: boolean })[]> {
    try {
      // Get all tags in household
      const allTags = await this.getAllTags(bypassCache);
      
      // Get tags already on this plant
      const plantTags = await this.getTagsByPlantId(plantId, bypassCache);
      
      // Create a set of tag IDs already on this plant
      const existingTagIds = new Set(plantTags.map(tag => tag.id));
      
      // Add isAlreadyAdded status to each tag
      const tagsWithStatus = allTags.map(tag => ({
        ...tag,
        isAlreadyAdded: existingTagIds.has(tag.id)
      }));
            
      return tagsWithStatus;
    } catch (error) {
      console.error('Error in getAllTagsWithPlantStatus:', error);
      // If there's an error with cached data, try without cache
      if (!bypassCache) {
        console.log('[TagService] Retrying getAllTagsWithPlantStatus without cache');
        return this.getAllTagsWithPlantStatus(plantId, true);
      }
      // If still failing, return empty array to allow tag creation
      console.log('[TagService] Falling back to empty tags array');
      return [];
    }
  }

  // ============================================================================
  // CONVENIENCE METHODS
  // ============================================================================

  static async createTagAndAddToPlant(plantId: string, name: string, color: string): Promise<{ tag: Tag; plantTag: PlantTag; isNew: boolean }> {
    // Create or find the tag
    const result = await this.createOrFindTag(name, color);
    
    // Add it to the plant
    const plantTag = await this.addTagToPlant(plantId, result.tag.id);
    
    return {
      tag: result.tag,
      plantTag,
      isNew: result.isNew
    };
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  static getDefaultTagColors(): string[] {
    return [
      '#B22222', // FireBrick
      '#DC143C', // Crimson
      '#EE5A6F', // Dark Pink
      '#FF6B6B', // Red
      '#FF9FF3', // Pink
      '#FF9F43', // Orange
      '#DAA520', // Goldenrod
      '#FECA57', // Yellow
      '#10AC84', // Dark Green
      '#00D2D3', // Cyan
      '#4ECDC4', // Teal
      '#54A0FF', // Light Blue
      '#45B7D1', // Blue
      '#96CEB4', // Green
      '#5F27CD', // Purple
      '#8A2BE2', // BlueViolet
    ];
  }

  static validateTagColor(color: string): boolean {
    return /^#[0-9A-Fa-f]{6}$/.test(color);
  }

  static validateTagName(name: string): { isValid: boolean; error?: string } {
    const trimmedName = name.trim();
    
    if (!trimmedName || trimmedName.length === 0) {
      return { isValid: false, error: 'Tag name cannot be empty' };
    }
    
    if (trimmedName.length > 50) {
      return { isValid: false, error: 'Tag name cannot exceed 50 characters' };
    }
    
    return { isValid: true };
  }
}