import { QueryClient } from '@tanstack/react-query';
import { CacheService } from './CacheService';
import { CachedPhotoService } from './CachedPhotoService';
import { queryKeys } from '../constants/queryKeys';

export type InvalidationAction = 
  | 'plant_added'
  | 'plant_updated' 
  | 'plant_deleted'
  | 'event_added'
  | 'event_updated'
  | 'event_deleted'
  | 'photo_added'
  | 'photo_updated'
  | 'photo_deleted'
  | 'thumbnail_changed'
  | 'user_action';

export interface CacheInvalidationOptions {
  queryClient?: QueryClient;
  invalidateSQLite?: boolean;
  invalidateReactQuery?: boolean;
  clearPhotoCache?: boolean;
  entityId?: string;
  additionalData?: Record<string, any>;
}

export class CacheInvalidationService {
  private static defaultQueryClient: QueryClient | null = null;

  static setDefaultQueryClient(queryClient: QueryClient): void {
    this.defaultQueryClient = queryClient;
  }

  static async invalidateOnUserAction(
    action: InvalidationAction, 
    options: CacheInvalidationOptions = {}
  ): Promise<void> {
    const {
      queryClient = this.defaultQueryClient,
      invalidateSQLite = true,
      invalidateReactQuery = true,
      clearPhotoCache = false,
      entityId,
      additionalData = {}
    } = options;

    console.log(`Cache invalidation triggered: ${action}${entityId ? ` for entity ${entityId}` : ''}`);

    try {
      // Execute all cache invalidations in parallel for better performance
      const invalidationPromises: Promise<any>[] = [];

      // React Query invalidations
      if (invalidateReactQuery && queryClient) {
        invalidationPromises.push(
          this.invalidateReactQueryCache(queryClient, action, entityId, additionalData)
        );
      }

      // SQLite cache invalidations
      if (invalidateSQLite) {
        invalidationPromises.push(
          this.invalidateSQLiteCache(action, entityId, additionalData)
        );
      }

      // Photo cache invalidations
      if (clearPhotoCache) {
        invalidationPromises.push(
          this.invalidatePhotoCache(action, entityId)
        );
      }

      await Promise.allSettled(invalidationPromises);
    } catch (error) {
      console.error(`Failed to invalidate cache for action ${action}:`, error);
    }
  }

  private static async invalidateReactQueryCache(
    queryClient: QueryClient,
    action: InvalidationAction,
    entityId?: string,
    additionalData: Record<string, any> = {}
  ): Promise<void> {
    try {
      switch (action) {
        case 'plant_added':
          // Invalidate plants list
          await queryClient.invalidateQueries({ queryKey: queryKeys.plants });
          
          // Invalidate location-based queries if location is provided
          if (additionalData.location) {
            await queryClient.invalidateQueries({ 
              queryKey: queryKeys.plantsByLocation(additionalData.location)
            });
          }
          break;

        case 'plant_updated':
          if (entityId) {
            // Update specific plant cache
            await queryClient.invalidateQueries({ queryKey: queryKeys.plant(entityId) });
            
            // Invalidate plants list to reflect changes
            await queryClient.invalidateQueries({ queryKey: queryKeys.plants });
            
            // Invalidate thumbnail if it might have changed
            await queryClient.invalidateQueries({ queryKey: queryKeys.thumbnailPhoto(entityId) });
            
            // If location changed, invalidate location-based queries
            if (additionalData.oldLocation || additionalData.newLocation) {
              await queryClient.invalidateQueries({ 
                queryKey: ['plants-by-location'],
                exact: false 
              });
            }
          }
          break;

        case 'plant_deleted':
          if (entityId) {
            // Remove specific plant cache
            queryClient.removeQueries({ queryKey: queryKeys.plant(entityId) });
            
            // Invalidate plants list
            await queryClient.invalidateQueries({ queryKey: queryKeys.plants });
            
            // Invalidate related data
            queryClient.removeQueries({ queryKey: queryKeys.plantPhotos(entityId) });
            queryClient.removeQueries({ queryKey: queryKeys.plantEvents(entityId) });
            queryClient.removeQueries({ queryKey: queryKeys.plantStats(entityId) });
            queryClient.removeQueries({ queryKey: queryKeys.thumbnailPhoto(entityId) });
            
            // Invalidate location-based queries
            await queryClient.invalidateQueries({ 
              queryKey: ['plants-by-location'],
              exact: false 
            });
          }
          break;

        case 'event_added':
        case 'event_updated':
          if (entityId) {
            // Invalidate plant events
            await queryClient.invalidateQueries({ queryKey: queryKeys.plantEvents(entityId) });
            
            // Invalidate recent events
            await queryClient.invalidateQueries({ queryKey: queryKeys.recentEvents });
            
            // Invalidate plant stats
            await queryClient.invalidateQueries({ queryKey: queryKeys.plantStats(entityId) });
          }
          break;

        case 'event_deleted':
          if (entityId) {
            // Invalidate plant events
            await queryClient.invalidateQueries({ queryKey: queryKeys.plantEvents(entityId) });
            
            // Invalidate recent events
            await queryClient.invalidateQueries({ queryKey: queryKeys.recentEvents });
            
            // Invalidate plant stats
            await queryClient.invalidateQueries({ queryKey: queryKeys.plantStats(entityId) });
          }
          break;

        case 'photo_added':
          if (entityId) {
            // Invalidate plant photos
            await queryClient.invalidateQueries({ queryKey: queryKeys.plantPhotos(entityId) });
            
            // Invalidate all photos
            await queryClient.invalidateQueries({ queryKey: queryKeys.allPhotos });
            
            // Invalidate thumbnail if this might be the first photo
            await queryClient.invalidateQueries({ queryKey: queryKeys.thumbnailPhoto(entityId) });
          }
          break;

        case 'photo_updated':
          if (entityId) {
            // Invalidate plant photos
            await queryClient.invalidateQueries({ queryKey: queryKeys.plantPhotos(entityId) });
            
            // Invalidate all photos
            await queryClient.invalidateQueries({ queryKey: queryKeys.allPhotos });
          }
          break;

        case 'photo_deleted':
          if (entityId) {
            // Invalidate plant photos
            await queryClient.invalidateQueries({ queryKey: queryKeys.plantPhotos(entityId) });
            
            // Invalidate all photos
            await queryClient.invalidateQueries({ queryKey: queryKeys.allPhotos });
            
            // Invalidate thumbnail in case we deleted the thumbnail photo
            await queryClient.invalidateQueries({ queryKey: queryKeys.thumbnailPhoto(entityId) });
          }
          break;

        case 'thumbnail_changed':
          if (entityId) {
            // Invalidate plant data
            await queryClient.invalidateQueries({ queryKey: queryKeys.plant(entityId) });
            
            // Invalidate thumbnail photo
            await queryClient.invalidateQueries({ queryKey: queryKeys.thumbnailPhoto(entityId) });
            
            // Invalidate plants list to update thumbnail display
            await queryClient.invalidateQueries({ queryKey: queryKeys.plants });
          }
          break;

        case 'user_action':
          // General invalidation for user actions
          await queryClient.invalidateQueries({ queryKey: queryKeys.plants });
          await queryClient.invalidateQueries({ queryKey: queryKeys.recentEvents });
          break;

        default:
          console.warn(`Unknown invalidation action: ${action}`);
      }
    } catch (error) {
      console.error(`Failed to invalidate React Query cache for action ${action}:`, error);
    }
  }

  private static async invalidateSQLiteCache(
    action: InvalidationAction,
    entityId?: string,
    additionalData: Record<string, any> = {}
  ): Promise<void> {
    try {
      const patterns: string[] = [];

      switch (action) {
        case 'plant_added':
        case 'plant_updated':
        case 'plant_deleted':
          patterns.push('plants-list');
          patterns.push('plants-all');
          if (entityId) {
            patterns.push(`plant-${entityId}`);
          }
          if (additionalData.location) {
            patterns.push(`plants-location-${additionalData.location}`);
          }
          break;

        case 'event_added':
        case 'event_updated':
        case 'event_deleted':
          patterns.push('events-recent');
          if (entityId) {
            patterns.push(`plant-events-${entityId}`);
            patterns.push(`plant-stats-${entityId}`);
          }
          break;

        case 'photo_added':
        case 'photo_updated':
        case 'photo_deleted':
          patterns.push('photos-all');
          if (entityId) {
            patterns.push(`plant-photos-${entityId}`);
            patterns.push(`thumbnail-${entityId}`);
          }
          break;

        case 'thumbnail_changed':
          if (entityId) {
            patterns.push(`plant-${entityId}`);
            patterns.push(`thumbnail-${entityId}`);
            patterns.push('plants-list');
          }
          break;

        case 'user_action':
          patterns.push('plants-list');
          patterns.push('events-recent');
          break;
      }

      // Invalidate cache patterns in parallel
      const invalidationPromises = patterns.map(pattern => 
        CacheService.invalidateCachePattern(pattern)
      );

      await Promise.allSettled(invalidationPromises);
    } catch (error) {
      console.error(`Failed to invalidate SQLite cache for action ${action}:`, error);
    }
  }

  private static async invalidatePhotoCache(
    action: InvalidationAction,
    entityId?: string
  ): Promise<void> {
    try {
      switch (action) {
        case 'photo_deleted':
        case 'plant_deleted':
          // For deleted photos/plants, we could clean up specific cache entries
          // For now, we'll let the normal cache expiration handle it
          break;

        case 'thumbnail_changed':
          // Could clear specific thumbnail cache if needed
          break;

        default:
          // Most photo cache is handled by expiration
          break;
      }
    } catch (error) {
      console.error(`Failed to invalidate photo cache for action ${action}:`, error);
    }
  }

  // Batch invalidation for multiple actions
  static async batchInvalidate(
    actions: Array<{ action: InvalidationAction; options?: CacheInvalidationOptions }>
  ): Promise<void> {
    console.log(`Batch cache invalidation for ${actions.length} actions`);

    const invalidationPromises = actions.map(({ action, options = {} }) =>
      this.invalidateOnUserAction(action, options)
    );

    await Promise.allSettled(invalidationPromises);
  }

  // Smart invalidation based on data dependencies
  static async smartInvalidate(
    changedData: {
      plants?: string[];
      events?: string[];
      photos?: string[];
      locations?: string[];
    },
    queryClient?: QueryClient
  ): Promise<void> {
    const actions: Array<{ action: InvalidationAction; options: CacheInvalidationOptions }> = [];

    // Add plant invalidations
    changedData.plants?.forEach(plantId => {
      actions.push({
        action: 'plant_updated',
        options: { queryClient, entityId: plantId }
      });
    });

    // Add event invalidations
    changedData.events?.forEach(plantId => {
      actions.push({
        action: 'event_updated',
        options: { queryClient, entityId: plantId }
      });
    });

    // Add photo invalidations
    changedData.photos?.forEach(plantId => {
      actions.push({
        action: 'photo_updated',
        options: { queryClient, entityId: plantId }
      });
    });

    await this.batchInvalidate(actions);
  }

  // Periodic cache optimization
  static async performPeriodicCleanup(): Promise<void> {
    try {
      console.log('Performing periodic cache cleanup...');
      
      // Clean up expired SQLite cache
      await CacheService.cleanupExpiredCache();
      
      // Clean up expired photo cache
      await CachedPhotoService.cleanExpiredCache();
      
      console.log('Periodic cache cleanup completed');
    } catch (error) {
      console.error('Failed to perform periodic cache cleanup:', error);
    }
  }

  // Get cache health status
  static async getCacheHealth(): Promise<{
    sqliteCache: any;
    photoCache: any;
    reactQueryCache?: any;
  }> {
    try {
      const [sqliteStats, photoStats] = await Promise.all([
        CacheService.getCacheStats(),
        CachedPhotoService.getCacheStats()
      ]);

      return {
        sqliteCache: sqliteStats,
        photoCache: photoStats,
      };
    } catch (error) {
      console.error('Failed to get cache health:', error);
      return {
        sqliteCache: null,
        photoCache: null,
      };
    }
  }
}