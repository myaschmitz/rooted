import { QueryClient, QueryKey } from "@tanstack/react-query";
import { logger } from "../utils/logger";
import { CacheService } from "./CacheService";
import { CachedPhotoService } from "./CachedPhotoService";
import { queryKeys } from "../constants/queryKeys";

/**
 * What kind of data changed. Every write path — service methods, mutation
 * hooks and realtime events from other household members — goes through
 * `CacheInvalidationService.invalidate`, so a given change always refreshes
 * the same set of queries no matter where it came from.
 *
 * React Query is the only cache for database data. (MMKV is still used by
 * CachedPhotoService for downloaded image files, which is a separate concern.)
 */
export type InvalidationAction =
  | "plant_added"
  | "plant_updated"
  | "plant_deleted"
  | "plant_archived"
  | "plant_restored"
  | "plant_propagated"
  | "event_changed"
  | "photo_added"
  | "photo_updated"
  | "photo_deleted"
  | "thumbnail_changed"
  | "tags_changed"
  | "household_changed";

export interface InvalidationTarget {
  /** The plant the change belongs to. */
  plantId?: string;
  /** Other plants touched by the same change (e.g. propagation parents). */
  relatedPlantIds?: Array<string | null | undefined>;
  /** The event the change belongs to, for event-level queries. */
  eventId?: string;
}

export class CacheInvalidationService {
  private static defaultQueryClient: QueryClient | null = null;

  static setDefaultQueryClient(queryClient: QueryClient): void {
    this.defaultQueryClient = queryClient;
  }

  /**
   * Query keys whose data depends on this change. Keys are prefixes, so
   * `queryKeys.plants` also covers every `queryKeys.plant(id)`.
   */
  static keysFor(
    action: InvalidationAction,
    target: InvalidationTarget = {},
  ): QueryKey[] {
    const { plantId, eventId } = target;
    const plantIds = [plantId, ...(target.relatedPlantIds ?? [])].filter(
      (id): id is string => !!id,
    );
    // Per-plant keys for the plants involved. When the plant isn't known
    // (bulk deletes, or a realtime DELETE that only carries the row id), fall
    // back to the key's root so every plant's copy is refreshed.
    const perPlant = (key: (id: string) => QueryKey): QueryKey[] =>
      plantIds.length > 0 ? plantIds.map(key) : [[key("")[0]]];

    switch (action) {
      case "plant_added":
        return [
          queryKeys.plants,
          queryKeys.plantsByLocationRoot,
          queryKeys.plantLineageRoot,
        ];

      case "plant_updated":
        // Name/location/parent/thumbnail can all change on an update, and a
        // realtime UPDATE doesn't tell us which, so refresh everything that
        // renders plant fields.
        return [
          queryKeys.plants,
          queryKeys.plantsByLocationRoot,
          queryKeys.archivedPlants,
          queryKeys.plantLineageRoot,
          queryKeys.batchThumbnailsRoot,
          ...perPlant(queryKeys.thumbnailPhoto),
        ];

      case "plant_deleted":
      case "plant_archived":
      case "plant_restored":
        return [
          queryKeys.plants,
          queryKeys.plantsByLocationRoot,
          queryKeys.archivedPlants,
          // Deleting reparents propagation children onto the grandparent.
          queryKeys.plantLineageRoot,
          queryKeys.allPhotos,
          queryKeys.allEvents,
          queryKeys.recentEvents,
        ];

      case "plant_propagated":
        return [
          queryKeys.plants,
          queryKeys.plantsByLocationRoot,
          queryKeys.plantLineageRoot,
          queryKeys.recentEvents,
          queryKeys.allEvents,
          queryKeys.batchPlantTagsRoot,
          queryKeys.plantTagsRoot,
          ...perPlant(queryKeys.plantEvents),
          ...perPlant(queryKeys.plantStats),
        ];

      case "event_changed":
        return [
          queryKeys.recentEvents,
          queryKeys.allEvents,
          queryKeys.batchLastEventsRoot,
          ...perPlant(queryKeys.plantEvents),
          ...perPlant(queryKeys.plantStats),
          // Deleting an event unlinks its photos.
          ...perPlant(queryKeys.plantPhotos),
          ...(eventId
            ? [queryKeys.event(eventId), queryKeys.eventPhotos(eventId)]
            : []),
        ];

      case "photo_added":
      case "photo_deleted":
        // Saving a plant's first photo makes it the thumbnail, and deleting
        // the thumbnail photo clears it, so plant + thumbnail data change too.
        return [
          queryKeys.allPhotos,
          queryKeys.eventPhotosRoot,
          queryKeys.batchThumbnailsRoot,
          queryKeys.batchLastPhotoDatesRoot,
          ...perPlant(queryKeys.plant),
          ...perPlant(queryKeys.plantPhotos),
          ...perPlant(queryKeys.thumbnailPhoto),
        ];

      case "photo_updated":
        return [
          queryKeys.allPhotos,
          queryKeys.eventPhotosRoot,
          ...perPlant(queryKeys.plantPhotos),
        ];

      case "thumbnail_changed":
        return [
          queryKeys.plants,
          queryKeys.batchThumbnailsRoot,
          ...perPlant(queryKeys.thumbnailPhoto),
        ];

      case "tags_changed":
        // Tag data is small; refreshing every tag query is cheaper than
        // tracking which plants a renamed or deleted tag was on.
        return [
          queryKeys.allTags,
          queryKeys.plantTagsRoot,
          queryKeys.batchPlantTagsRoot,
        ];

      case "household_changed":
        return [];
    }
  }

  /**
   * Mark every query affected by `action` stale and refetch the ones on
   * screen. Runs synchronously and doesn't wait for the refetches, so callers
   * aren't slowed down by it.
   */
  static invalidate(
    action: InvalidationAction,
    target: InvalidationTarget = {},
    queryClient: QueryClient | null = this.defaultQueryClient,
  ): void {
    if (!queryClient) {
      logger.debug(`Skipping ${action} invalidation: no query client set`);
      return;
    }

    if (action === "household_changed") {
      // Query keys aren't scoped by household, so another household's data
      // must not survive a join/leave.
      queryClient.removeQueries();
      return;
    }

    for (const queryKey of this.keysFor(action, target)) {
      queryClient.invalidateQueries({ queryKey }).catch((error) => {
        console.warn(`Failed to invalidate ${String(queryKey)}:`, error);
      });
    }
  }

  // ==========================================================================
  // Image file cache (CachedPhotoService) maintenance
  // ==========================================================================

  static async performPeriodicCleanup(): Promise<void> {
    try {
      logger.debug("Performing periodic cache cleanup...");
      await Promise.all([
        CacheService.cleanupExpiredCache(),
        CachedPhotoService.cleanExpiredCache(),
        CachedPhotoService.optimizeCache(),
        CacheService.performMaintenance(),
      ]);
      logger.debug("Periodic cache cleanup completed");
    } catch (error) {
      console.error("Failed to perform periodic cache cleanup:", error);
    }
  }

  static async getCacheHealth(): Promise<{
    mmkvCache: any;
    photoCache: any;
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
      return { mmkvCache: null, photoCache: null, overall: "unhealthy" };
    }
  }

  static async initialize(): Promise<void> {
    try {
      await Promise.all([
        CachedPhotoService.initialize(),
        CacheService.isHealthy(),
      ]);
      logger.debug("Cache system initialized successfully");
    } catch (error) {
      console.error("Failed to initialize cache system:", error);
    }
  }
}
