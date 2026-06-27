import { QueryClient } from "@tanstack/react-query";
import { logger } from "../utils/logger";
import { CacheService } from "./CacheService";
import { CachedPhotoService } from "./CachedPhotoService";
import { queryKeys } from "../constants/queryKeys";

export type InvalidationAction =
  | "plant_added"
  | "plant_updated"
  | "plant_deleted"
  | "event_added"
  | "event_updated"
  | "event_deleted"
  | "photo_added"
  | "photo_updated"
  | "photo_deleted"
  | "thumbnail_changed"
  | "tag_added"
  | "tag_updated"
  | "tag_deleted"
  | "all_tags_deleted"
  | "user_action"
  | "household_changed";

export interface CacheInvalidationOptions {
  queryClient?: QueryClient;
  invalidateMMKV?: boolean;
  invalidateReactQuery?: boolean;
  clearPhotoCache?: boolean;
  entityId?: string;
  additionalData?: Record<string, any>;
  immediate?: boolean; // Whether to execute immediately or batch
}

export class CacheInvalidationService {
  private static defaultQueryClient: QueryClient | null = null;
  private static pendingInvalidations: Array<{
    action: InvalidationAction;
    options: CacheInvalidationOptions;
    timestamp: number;
  }> = [];
  private static batchTimeout: NodeJS.Timeout | null = null;
  private static readonly BATCH_DELAY = 100; // ms to wait before processing batch

  static setDefaultQueryClient(queryClient: QueryClient): void {
    this.defaultQueryClient = queryClient;
  }

  static async invalidateOnUserAction(
    action: InvalidationAction,
    options: CacheInvalidationOptions = {},
  ): Promise<void> {
    const { immediate = false, ...restOptions } = options;

    if (immediate) {
      await this.executeInvalidation(action, restOptions);
    } else {
      // Add to batch for better performance
      this.addToBatch(action, restOptions);
    }
  }

  private static addToBatch(
    action: InvalidationAction,
    options: CacheInvalidationOptions,
  ): void {
    this.pendingInvalidations.push({
      action,
      options,
      timestamp: Date.now(),
    });

    // Clear existing timeout
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }

    // Set new timeout
    this.batchTimeout = setTimeout(() => {
      this.processBatch();
    }, this.BATCH_DELAY);
  }

  private static async processBatch(): Promise<void> {
    if (this.pendingInvalidations.length === 0) return;

    const batch = [...this.pendingInvalidations];
    this.pendingInvalidations = [];
    this.batchTimeout = null;

    logger.debug(`Processing cache invalidation batch: ${batch.length} actions`);

    // Group by action type for optimization
    const grouped = batch.reduce(
      (acc, item) => {
        if (!acc[item.action]) {
          acc[item.action] = [];
        }
        acc[item.action].push(item.options);
        return acc;
      },
      {} as Record<InvalidationAction, CacheInvalidationOptions[]>,
    );

    // Process each action type
    const promises = Object.entries(grouped).map(([action, optionsList]) =>
      this.executeBatchedInvalidation(
        action as InvalidationAction,
        optionsList,
      ),
    );

    await Promise.allSettled(promises);
  }

  private static async executeBatchedInvalidation(
    action: InvalidationAction,
    optionsList: CacheInvalidationOptions[],
  ): Promise<void> {
    try {
      // Merge options and deduplicate entity IDs
      const mergedOptions: CacheInvalidationOptions = {
        queryClient: this.defaultQueryClient,
        invalidateMMKV: true,
        invalidateReactQuery: true,
        clearPhotoCache: false,
        ...optionsList[0], // Use first options as base
      };

      const entityIds = new Set<string>();
      const additionalData: Record<string, any> = {};

      optionsList.forEach((options) => {
        if (options.entityId) {
          entityIds.add(options.entityId);
        }
        if (options.additionalData) {
          Object.assign(additionalData, options.additionalData);
        }
      });

      // Execute for each unique entity
      if (entityIds.size > 0) {
        const promises = Array.from(entityIds).map((entityId) =>
          this.executeInvalidation(action, {
            ...mergedOptions,
            entityId,
            additionalData,
          }),
        );
        await Promise.allSettled(promises);
      } else {
        await this.executeInvalidation(action, {
          ...mergedOptions,
          additionalData,
        });
      }
    } catch (error) {
      console.error(
        `Failed to execute batched invalidation for ${action}:`,
        error,
      );
    }
  }

  private static async executeInvalidation(
    action: InvalidationAction,
    options: CacheInvalidationOptions = {},
  ): Promise<void> {
    const {
      queryClient = this.defaultQueryClient,
      invalidateMMKV = true,
      invalidateReactQuery = true,
      clearPhotoCache = false,
      entityId,
      additionalData = {},
    } = options;

    try {
      // Execute all cache invalidations in parallel for better performance
      const invalidationPromises: Promise<any>[] = [];

      // React Query invalidations
      if (invalidateReactQuery && queryClient) {
        invalidationPromises.push(
          this.invalidateReactQueryCache(
            queryClient,
            action,
            entityId,
            additionalData,
          ),
        );
      }

      // MMKV cache invalidations
      if (invalidateMMKV) {
        invalidationPromises.push(
          this.invalidateMMKVCache(action, entityId, additionalData),
        );
      }

      // Photo cache invalidations
      if (clearPhotoCache) {
        invalidationPromises.push(this.invalidatePhotoCache(action, entityId));
      }

      const results = await Promise.allSettled(invalidationPromises);

      // Log any failures
      results.forEach((result, index) => {
        if (result.status === "rejected") {
          const type =
            index === 0 ? "React Query" : index === 1 ? "MMKV" : "Photo";
          console.warn(
            `${type} cache invalidation failed for ${action}:`,
            result.reason,
          );
        }
      });
    } catch (error) {
      console.error(`Failed to invalidate cache for action ${action}:`, error);
    }
  }

  private static async invalidateReactQueryCache(
    queryClient: QueryClient,
    action: InvalidationAction,
    entityId?: string,
    additionalData: Record<string, any> = {},
  ): Promise<void> {
    try {
      switch (action) {
        case "plant_added":
          // Invalidate plants list
          await queryClient.invalidateQueries({ queryKey: queryKeys.plants });

          // Invalidate location-based queries if location is provided
          if (additionalData.location) {
            await queryClient.invalidateQueries({
              queryKey: queryKeys.plantsByLocation(additionalData.location),
            });
          }
          break;

        case "plant_updated":
          if (entityId) {
            // Update specific plant cache
            await queryClient.invalidateQueries({
              queryKey: queryKeys.plant(entityId),
            });

            // Invalidate plants list to reflect changes
            await queryClient.invalidateQueries({ queryKey: queryKeys.plants });

            // Invalidate thumbnail if it might have changed
            await queryClient.invalidateQueries({
              queryKey: queryKeys.thumbnailPhoto(entityId),
            });

            // If location changed, invalidate location-based queries
            if (additionalData.oldLocation || additionalData.newLocation) {
              const locations = [
                additionalData.oldLocation,
                additionalData.newLocation,
              ].filter(Boolean);
              await Promise.all(
                locations.map((location) =>
                  queryClient.invalidateQueries({
                    queryKey: queryKeys.plantsByLocation(location),
                  }),
                ),
              );
            }
          }
          break;

        case "plant_deleted":
          if (entityId) {
            // Remove specific plant cache
            queryClient.removeQueries({ queryKey: queryKeys.plant(entityId) });

            // Invalidate plants list
            await queryClient.invalidateQueries({ queryKey: queryKeys.plants });

            // Invalidate related data
            queryClient.removeQueries({
              queryKey: queryKeys.plantPhotos(entityId),
            });
            queryClient.removeQueries({
              queryKey: queryKeys.plantEvents(entityId),
            });
            queryClient.removeQueries({
              queryKey: queryKeys.plantStats(entityId),
            });
            queryClient.removeQueries({
              queryKey: queryKeys.thumbnailPhoto(entityId),
            });

            // Invalidate location-based queries
            if (additionalData.location) {
              await queryClient.invalidateQueries({
                queryKey: queryKeys.plantsByLocation(additionalData.location),
              });
            }
          }
          break;

        case "event_added":
        case "event_updated":
          if (entityId) {
            // Invalidate plant events
            await queryClient.invalidateQueries({
              queryKey: queryKeys.plantEvents(entityId),
            });

            // Invalidate recent events
            await queryClient.invalidateQueries({
              queryKey: queryKeys.recentEvents,
            });

            // Invalidate plant stats
            await queryClient.invalidateQueries({
              queryKey: queryKeys.plantStats(entityId),
            });

            // If this event might affect plant display, invalidate plant data too
            if (additionalData.affectsPlant) {
              await queryClient.invalidateQueries({
                queryKey: queryKeys.plant(entityId),
              });
            }
          }
          break;

        case "event_deleted":
          if (entityId) {
            // Invalidate plant events
            await queryClient.invalidateQueries({
              queryKey: queryKeys.plantEvents(entityId),
            });

            // Invalidate recent events
            await queryClient.invalidateQueries({
              queryKey: queryKeys.recentEvents,
            });

            // Invalidate plant stats
            await queryClient.invalidateQueries({
              queryKey: queryKeys.plantStats(entityId),
            });
          }
          break;

        case "photo_added":
          if (entityId) {
            // Invalidate plant photos
            await queryClient.invalidateQueries({
              queryKey: queryKeys.plantPhotos(entityId),
            });

            // Invalidate all photos
            await queryClient.invalidateQueries({
              queryKey: queryKeys.allPhotos,
            });

            // Invalidate thumbnail if this might be the first photo
            await queryClient.invalidateQueries({
              queryKey: queryKeys.thumbnailPhoto(entityId),
            });
          }
          break;

        case "photo_updated":
          if (entityId) {
            // Invalidate plant photos
            await queryClient.invalidateQueries({
              queryKey: queryKeys.plantPhotos(entityId),
            });

            // Invalidate all photos
            await queryClient.invalidateQueries({
              queryKey: queryKeys.allPhotos,
            });
          }
          break;

        case "photo_deleted":
          if (entityId) {
            // Invalidate plant photos
            await queryClient.invalidateQueries({
              queryKey: queryKeys.plantPhotos(entityId),
            });

            // Invalidate all photos
            await queryClient.invalidateQueries({
              queryKey: queryKeys.allPhotos,
            });

            // Invalidate thumbnail in case we deleted the thumbnail photo
            await queryClient.invalidateQueries({
              queryKey: queryKeys.thumbnailPhoto(entityId),
            });
          }
          break;

        case "thumbnail_changed":
          if (entityId) {
            // Invalidate plant data
            await queryClient.invalidateQueries({
              queryKey: queryKeys.plant(entityId),
            });

            // Invalidate thumbnail photo
            await queryClient.invalidateQueries({
              queryKey: queryKeys.thumbnailPhoto(entityId),
            });

            // Invalidate plants list to update thumbnail display
            await queryClient.invalidateQueries({ queryKey: queryKeys.plants });
          }
          break;

        case "tag_added":
        case "tag_updated":
        case "tag_deleted":
        case "all_tags_deleted":
          // Invalidate all tags queries
          await queryClient.invalidateQueries({ queryKey: ["all-tags"] });

          if (additionalData.plant_id) {
            // Invalidate plant-specific tag queries
            await queryClient.invalidateQueries({
              queryKey: ["plant-tags", additionalData.plant_id],
            });

            // Invalidate batch plant tags queries
            await queryClient.invalidateQueries({
              queryKey: ["batch-plant-tags"],
              exact: false,
            });

            // Invalidate plant data as tags are part of plant display
            await queryClient.invalidateQueries({
              queryKey: queryKeys.plant(additionalData.plant_id),
            });

            // Invalidate plants list to ensure filtering works with fresh data
            await queryClient.invalidateQueries({ queryKey: queryKeys.plants });
          } else {
            // If no specific plant_id, invalidate all batch queries
            await queryClient.invalidateQueries({
              queryKey: ["batch-plant-tags"],
              exact: false,
            });

            // Invalidate plants list to ensure filtering works with fresh data
            await queryClient.invalidateQueries({ queryKey: queryKeys.plants });
          }
          break;

        case "household_changed":
          // Nuclear option - invalidate everything for household changes
          await queryClient.invalidateQueries();
          break;

        case "user_action":
          // General invalidation for user actions
          await queryClient.invalidateQueries({ queryKey: queryKeys.plants });
          await queryClient.invalidateQueries({
            queryKey: queryKeys.recentEvents,
          });
          break;

        default:
          console.warn(`Unknown React Query invalidation action: ${action}`);
      }
    } catch (error) {
      console.error(
        `Failed to invalidate React Query cache for action ${action}:`,
        error,
      );
    }
  }

  private static async invalidateMMKVCache(
    action: InvalidationAction,
    entityId?: string,
    additionalData: Record<string, any> = {},
  ): Promise<void> {
    try {
      const patterns: string[] = [];

      switch (action) {
        case "plant_added":
        case "plant_updated":
        case "plant_deleted":
          patterns.push("plants:household");
          if (entityId) {
            patterns.push(`plant:${entityId}`);
          }
          if (additionalData.location) {
            patterns.push(`plants:location:`, additionalData.location);
          }
          if (additionalData.oldLocation) {
            patterns.push(`plants:location:`, additionalData.oldLocation);
          }
          if (additionalData.newLocation) {
            patterns.push(`plants:location:`, additionalData.newLocation);
          }
          break;

        case "event_added":
        case "event_updated":
        case "event_deleted":
          patterns.push("events:recent");
          if (entityId) {
            patterns.push(`events:plant:${entityId}`);
          }
          break;

        case "photo_added":
        case "photo_updated":
        case "photo_deleted":
          patterns.push("photos:all");
          // Invalidate batched last-photo-date cache used by the plants list to drive the "needs photo" camera icon
          patterns.push("photos:last-dates");
          if (entityId) {
            patterns.push(
              `photos:plant:${entityId}`,
              `photos:oldest:plant:${entityId}`,
            );
          }
          break;

        case "thumbnail_changed":
          if (entityId) {
            patterns.push(
              `plant:${entityId}`,
              `thumbnails:batch`,
              "plants:household",
            );
          }
          break;

        case "tag_added":
        case "tag_updated":
        case "tag_deleted":
        case "all_tags_deleted":
          if (additionalData.plant_id && additionalData.household_id) {
            patterns.push(
              `tags:plant:${additionalData.plant_id}`,
              `plant:${additionalData.plant_id}`,
            );
          }
          // Also invalidate global tags cache to ensure getAllTags() returns fresh data
          if (additionalData.household_id) {
            patterns.push(`tags:all:household:${additionalData.household_id}`);
          }
          // Invalidate plants list to ensure filtering works with fresh data
          patterns.push("plants:household");
          break;

        case "household_changed":
          // Clear all cache for household changes
          await CacheService.clearAllCache();
          return;

        case "user_action":
          patterns.push("plants:household", "events:recent");
          break;
      }

      // Invalidate cache patterns in parallel
      if (patterns.length > 0) {
        const invalidationPromises = patterns.map((pattern) =>
          CacheService.invalidateCachePattern(pattern),
        );

        const results = await Promise.allSettled(invalidationPromises);
        const totalInvalidated = results.reduce((sum, result) => {
          return sum + (result.status === "fulfilled" ? result.value : 0);
        }, 0);

        if (totalInvalidated > 0) {
          logger.debug(
            `MMKV cache invalidation: ${totalInvalidated} entries removed for ${action}`,
          );
        }
      }
    } catch (error) {
      console.error(
        `Failed to invalidate MMKV cache for action ${action}:`,
        error,
      );
    }
  }

  private static async invalidatePhotoCache(
    action: InvalidationAction,
    entityId?: string,
  ): Promise<void> {
    try {
      switch (action) {
        case "photo_deleted":
        case "plant_deleted":
          // For deleted photos/plants, clean up the cache
          await CachedPhotoService.cleanExpiredCache();
          break;

        case "thumbnail_changed":
          // Could clear specific thumbnail cache if needed
          break;

        case "household_changed":
          // Clear all photo cache for household changes
          await CachedPhotoService.clearAllCache();
          break;

        default:
          // Most photo cache is handled by expiration
          break;
      }
    } catch (error) {
      console.error(
        `Failed to invalidate photo cache for action ${action}:`,
        error,
      );
    }
  }

  // Smart invalidation based on data dependencies
  static async smartInvalidate(
    changedData: {
      plants?: string[];
      events?: string[];
      photos?: string[];
      locations?: string[];
    },
    queryClient?: QueryClient,
  ): Promise<void> {
    const actions: Array<{
      action: InvalidationAction;
      options: CacheInvalidationOptions;
    }> = [];

    // Add plant invalidations
    changedData.plants?.forEach((plantId) => {
      actions.push({
        action: "plant_updated",
        options: { queryClient, entityId: plantId },
      });
    });

    // Add event invalidations
    changedData.events?.forEach((plantId) => {
      actions.push({
        action: "event_updated",
        options: { queryClient, entityId: plantId },
      });
    });

    // Add photo invalidations
    changedData.photos?.forEach((plantId) => {
      actions.push({
        action: "photo_updated",
        options: { queryClient, entityId: plantId },
      });
    });

    await this.batchInvalidate(actions);
  }

  // Batch invalidation for multiple actions
  static async batchInvalidate(
    actions: Array<{
      action: InvalidationAction;
      options?: CacheInvalidationOptions;
    }>,
  ): Promise<void> {
    logger.debug(
      `Manual batch cache invalidation for ${actions.length} actions`,
    );

    const invalidationPromises = actions.map(({ action, options = {} }) =>
      this.executeInvalidation(action, { ...options, immediate: true }),
    );

    await Promise.allSettled(invalidationPromises);
  }

  // Periodic cache optimization
  static async performPeriodicCleanup(): Promise<void> {
    try {
      logger.debug("Performing periodic cache cleanup...");

      await Promise.all([
        // Clean up expired MMKV cache
        CacheService.cleanupExpiredCache(),

        // Clean up expired photo cache
        CachedPhotoService.cleanExpiredCache(),

        // Optimize photo cache
        CachedPhotoService.optimizeCache(),

        // Perform MMKV maintenance
        CacheService.performMaintenance(),
      ]);

      logger.debug("Periodic cache cleanup completed");
    } catch (error) {
      console.error("Failed to perform periodic cache cleanup:", error);
    }
  }

  // Get cache health status
  static async getCacheHealth(): Promise<{
    mmkvCache: any;
    photoCache: any;
    reactQueryCache?: any;
    overall: "healthy" | "degraded" | "unhealthy";
  }> {
    try {
      const [mmkvStats, photoStats, mmkvHealthy, photoHealthy] =
        await Promise.all([
          CacheService.getCacheStats(),
          CachedPhotoService.getCacheStats(),
          CacheService.isHealthy(),
          CachedPhotoService.isHealthy(),
        ]);

      const overall =
        mmkvHealthy && photoHealthy
          ? "healthy"
          : mmkvHealthy || photoHealthy
            ? "degraded"
            : "unhealthy";

      return {
        mmkvCache: { ...mmkvStats, healthy: mmkvHealthy },
        photoCache: { ...photoStats, healthy: photoHealthy },
        overall,
      };
    } catch (error) {
      console.error("Failed to get cache health:", error);
      return {
        mmkvCache: null,
        photoCache: null,
        overall: "unhealthy",
      };
    }
  }

  // Flush all pending invalidations immediately
  static async flush(): Promise<void> {
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }
    await this.processBatch();
  }

  // Initialize cache system
  static async initialize(): Promise<void> {
    try {
      await Promise.all([
        CachedPhotoService.initialize(),
        CacheService.isHealthy(), // This initializes MMKV if needed
      ]);
      logger.debug("Cache system initialized successfully");
    } catch (error) {
      console.error("Failed to initialize cache system:", error);
    }
  }
}
