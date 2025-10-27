import { PlantTag } from '../types/Plant';
import { supabase } from './SupabaseService';
import { HouseholdService } from './HouseholdService';
import { CacheService } from './CacheService';
import { CacheInvalidationService } from './CacheInvalidationService';
import type { Database } from '../types/Database';

type PlantTagRow = Database['public']['Tables']['plant_tags']['Row'];
type PlantTagInsert = Database['public']['Tables']['plant_tags']['Insert'];
type PlantTagUpdate = Database['public']['Tables']['plant_tags']['Update'];

export class TagService {
  static async getTagsByPlantId(plantId: string, bypassCache = false): Promise<PlantTag[]> {
    // Get current household session for filtering
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error('No household session found');
    }

    const cacheKey = `plant-tags-${plantId}-${session.household_id}`;
    
    // Try to get from cache first (unless bypassing cache)
    if (!bypassCache) {
      const cached = await CacheService.getCachedResponse<PlantTag[]>(cacheKey);
      if (cached) {
        return cached;
      }
    }

    // If not in cache, fetch from database
    const { data, error } = await supabase
      .from('plant_tags')
      .select('*')
      .eq('plant_id', plantId)
      .eq('household_id', session.household_id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching plant tags:', error);
      throw new Error(`Failed to fetch plant tags: ${error.message}`);
    }

    const tags = (data || []) as PlantTag[];
    
    // Cache the result for 10 minutes
    await CacheService.cacheApiResponse(cacheKey, tags, 10 * 60 * 1000);

    return tags;
  }

  static async createTag(plantId: string, name: string, color: string): Promise<PlantTag> {
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

    const tagInsert: PlantTagInsert = {
      plant_id: plantId,
      name: trimmedName,
      color: color.toUpperCase(),
      household_id: session.household_id,
    };

    const { data, error } = await supabase
      .from('plant_tags')
      .insert(tagInsert)
      .select()
      .single();

    if (error) {
      console.error('Error creating plant tag:', error);
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('A tag with this name already exists for this plant');
      }
      throw new Error(`Failed to create plant tag: ${error.message}`);
    }

    const tag = data as PlantTag;

    // Log activity
    await HouseholdService.logActivity('added tag', {
      plant_id: plantId,
      tag_name: tag.name,
      tag_color: tag.color,
    }, `"${tag.name}" tag`);

    // Invalidate relevant caches
    await CacheInvalidationService.invalidateOnUserAction('tag_added', {
      entityId: tag.id,
      additionalData: { plant_id: plantId }
    });

    return tag;
  }

  static async updateTag(tagId: string, updates: { name?: string; color?: string }): Promise<PlantTag | null> {
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

    const tagUpdate: PlantTagUpdate = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('plant_tags')
      .update(tagUpdate)
      .eq('id', tagId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No rows found
      }
      console.error('Error updating plant tag:', error);
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('A tag with this name already exists for this plant');
      }
      throw new Error(`Failed to update plant tag: ${error.message}`);
    }

    const tag = data as PlantTag;

    // Log activity
    await HouseholdService.logActivity('updated tag', {
      tag_id: tag.id,
      plant_id: tag.plant_id,
      updated_fields: Object.keys(updates),
    }, `"${tag.name}" tag`);

    // Invalidate relevant caches
    await CacheInvalidationService.invalidateOnUserAction('tag_updated', {
      entityId: tag.id,
      additionalData: { plant_id: tag.plant_id }
    });

    return tag;
  }

  static async deleteTag(tagId: string): Promise<boolean> {
    // Get tag info before deleting for activity log
    const { data: tag, error: fetchError } = await supabase
      .from('plant_tags')
      .select('*')
      .eq('id', tagId)
      .single();

    if (fetchError) {
      console.error('Error fetching tag for deletion:', fetchError);
      throw new Error(`Failed to fetch tag: ${fetchError.message}`);
    }

    const { error } = await supabase
      .from('plant_tags')
      .delete()
      .eq('id', tagId);

    if (error) {
      console.error('Error deleting plant tag:', error);
      throw new Error(`Failed to delete plant tag: ${error.message}`);
    }

    // Log activity
    if (tag) {
      await HouseholdService.logActivity('deleted tag', {
        tag_id: tag.id,
        plant_id: tag.plant_id,
        tag_name: tag.name,
        tag_color: tag.color,
      }, `"${tag.name}" tag`);

      // Invalidate relevant caches
      await CacheInvalidationService.invalidateOnUserAction('tag_deleted', {
        entityId: tag.id,
        additionalData: { plant_id: tag.plant_id }
      });
    }

    return true;
  }

  static async deleteAllTagsForPlant(plantId: string): Promise<void> {
    // Get current household session for filtering
    const session = await HouseholdService.getUserSession();
    if (!session?.household_id) {
      throw new Error('No household session found');
    }

    const { error } = await supabase
      .from('plant_tags')
      .delete()
      .eq('plant_id', plantId)
      .eq('household_id', session.household_id);

    if (error) {
      console.error('Error deleting all plant tags:', error);
      throw new Error(`Failed to delete all plant tags: ${error.message}`);
    }

    // Invalidate relevant caches
    await CacheInvalidationService.invalidateOnUserAction('all_tags_deleted', {
      entityId: plantId,
      additionalData: { plant_id: plantId }
    });
  }

  // Default color palette for tags
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