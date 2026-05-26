import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import { PlantService } from "../services/PlantService";
import { PhotoService } from "../services/PhotoService";
import { EventService } from "../services/EventService";
import { TagService } from "../services/TagService";
import { Plant, PlantPhoto, Event, Tag } from "../types/Plant";
import { queryKeys } from "../constants/queryKeys";
import { CACHE_TTL, CACHE_GC_TIME, BATCH_CONFIG } from "../constants/domain";
import { WATERING_EVENT_TYPES } from "../constants/careTypes";

// Re-export queryKeys for backward compatibility
export { queryKeys };

// ============================================================================
// PLANT QUERIES
// ============================================================================

export const usePlants = () => {
  return useQuery<Plant[]>({
    queryKey: queryKeys.plants,
    queryFn: PlantService.getAllPlants,
    staleTime: CACHE_TTL.PLANTS_LIST,
    gcTime: CACHE_GC_TIME.MEDIUM,
  });
};

export const usePlant = (id: string) => {
  return useQuery<Plant | null>({
    queryKey: queryKeys.plant(id),
    queryFn: () => PlantService.getPlantById(id),
    staleTime: CACHE_TTL.PLANT_SINGLE,
    gcTime: CACHE_GC_TIME.MEDIUM,
    enabled: !!id,
  });
};

export const usePlantsByLocation = (location: string) => {
  return useQuery<Plant[]>({
    queryKey: queryKeys.plantsByLocation(location),
    queryFn: () => PlantService.getPlantsByLocation(location),
    staleTime: CACHE_TTL.PLANTS_BY_LOCATION,
    gcTime: CACHE_GC_TIME.MEDIUM,
    enabled: !!location,
  });
};

// ============================================================================
// PHOTO QUERIES
// ============================================================================

export const usePlantPhotos = (plantId: string) => {
  return useQuery<PlantPhoto[]>({
    queryKey: queryKeys.plantPhotos(plantId),
    queryFn: () => PhotoService.getPhotosByPlantId(plantId),
    staleTime: CACHE_TTL.PHOTOS_LIST,
    gcTime: CACHE_GC_TIME.LONG,
    enabled: !!plantId,
  });
};

export const usePlantPhotosOldestFirst = (plantId: string) => {
  return useQuery<PlantPhoto[]>({
    queryKey: [...queryKeys.plantPhotos(plantId), "oldest-first"],
    queryFn: () => PhotoService.getPhotosByPlantIdOldestFirst(plantId),
    staleTime: CACHE_TTL.PHOTOS_LIST,
    gcTime: CACHE_GC_TIME.LONG,
    enabled: !!plantId,
  });
};

export const useAllPhotos = () => {
  return useQuery<PlantPhoto[]>({
    queryKey: queryKeys.allPhotos,
    queryFn: PhotoService.getAllPhotos,
    staleTime: CACHE_TTL.PHOTOS_ALL,
    gcTime: CACHE_GC_TIME.LONG,
  });
};

export const useThumbnailPhoto = (plantId: string) => {
  return useQuery<PlantPhoto | null>({
    queryKey: queryKeys.thumbnailPhoto(plantId),
    queryFn: () => PhotoService.getThumbnailPhoto(plantId),
    staleTime: CACHE_TTL.THUMBNAIL,
    gcTime: CACHE_GC_TIME.VERY_LONG,
    enabled: !!plantId,
  });
};

// ============================================================================
// EVENT QUERIES
// ============================================================================

export const usePlantEvents = (plantId: string) => {
  return useQuery<Event[]>({
    queryKey: queryKeys.plantEvents(plantId),
    queryFn: () => EventService.getEventsByPlantId(plantId),
    staleTime: CACHE_TTL.EVENTS_LIST,
    gcTime: CACHE_GC_TIME.MEDIUM,
    enabled: !!plantId,
  });
};

export const useRecentEvents = (limit: number = 10) => {
  return useQuery<Event[]>({
    queryKey: [...queryKeys.recentEvents, limit],
    queryFn: () => EventService.getRecentEvents(limit),
    staleTime: CACHE_TTL.EVENTS_RECENT,
    gcTime: CACHE_GC_TIME.SHORT,
  });
};

export const usePlantStats = (plantId: string) => {
  return useQuery<any>({
    queryKey: queryKeys.plantStats(plantId),
    queryFn: () => EventService.getEventStats(plantId),
    staleTime: CACHE_TTL.EVENTS_STATS,
    gcTime: CACHE_GC_TIME.MEDIUM,
    enabled: !!plantId,
  });
};

export const useBatchLastEvents = (
  plantIds: string[],
  eventTypes: string[] = WATERING_EVENT_TYPES,
) => {
  return useQuery<{ [plantId: string]: { [eventType: string]: Event | null } }>(
    {
      queryKey: [
        "batch-last-events",
        [...plantIds].sort().join(","),
        [...eventTypes].sort().join(","),
      ],
      queryFn: () =>
        EventService.getLastEventsByTypeForPlants(plantIds, eventTypes),
      staleTime: CACHE_TTL.BATCH_LAST_EVENTS,
      gcTime: CACHE_GC_TIME.SHORT,
      enabled: plantIds.length > 0,
    },
  );
};

export const useBatchThumbnails = (plantIds: string[]) => {
  return useQuery<{ [plantId: string]: PlantPhoto | null }>({
    queryKey: ["batch-thumbnails", [...plantIds].sort().join(",")],
    queryFn: () => PhotoService.getBatchThumbnailPhotos(plantIds),
    staleTime: CACHE_TTL.BATCH_THUMBNAILS,
    gcTime: CACHE_GC_TIME.LONG,
    enabled: plantIds.length > 0,
  });
};

// ============================================================================
// MUTATIONS WITH CACHE INVALIDATION
// ============================================================================

export const useCreatePlant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      plantData: Omit<
        Plant,
        "id" | "created_at" | "updated_at" | "household_id" | "pinned"
      >,
    ) => PlantService.createPlant(plantData),
    onSuccess: () => {
      // Invalidate and refetch plants list
      queryClient.invalidateQueries({ queryKey: queryKeys.plants });
    },
    onError: (error) => {
      console.error("Failed to create plant:", error);
    },
  });
};

export const useUpdatePlant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Omit<Plant, "id" | "created_at">>;
    }) => PlantService.updatePlant(id, updates),
    onSuccess: (updatedPlant) => {
      if (updatedPlant) {
        // Update specific plant in cache
        queryClient.setQueryData(
          queryKeys.plant(updatedPlant.id),
          updatedPlant,
        );

        // Invalidate plants list to reflect changes
        queryClient.invalidateQueries({ queryKey: queryKeys.plants });

        // Invalidate location-based queries if location changed
        if ("location" in updatedPlant) {
          queryClient.invalidateQueries({
            queryKey: ["plants-by-location"],
            exact: false,
          });
        }
      }
    },
    onError: (error) => {
      console.error("Failed to update plant:", error);
    },
  });
};

export const useDeletePlant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => PlantService.deletePlant(id),
    onSuccess: (_, deletedId) => {
      // Remove plant from cache
      queryClient.removeQueries({ queryKey: queryKeys.plant(deletedId) });

      // Invalidate plants list
      queryClient.invalidateQueries({ queryKey: queryKeys.plants });

      // Invalidate location-based queries
      queryClient.invalidateQueries({
        queryKey: ["plants-by-location"],
        exact: false,
      });

      // Invalidate related photos and events
      queryClient.invalidateQueries({
        queryKey: queryKeys.plantPhotos(deletedId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.plantEvents(deletedId),
      });
    },
    onError: (error) => {
      console.error("Failed to delete plant:", error);
    },
  });
};

export const useCreateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (
      eventData: Omit<
        Event,
        "id" | "created_at" | "updated_at" | "household_id"
      >,
    ) => EventService.createEvent(eventData),
    onSuccess: (newEvent) => {
      // Invalidate plant events
      queryClient.invalidateQueries({
        queryKey: queryKeys.plantEvents(newEvent.plant_id),
      });

      // Invalidate recent events
      queryClient.invalidateQueries({ queryKey: queryKeys.recentEvents });

      // Invalidate plant stats
      queryClient.invalidateQueries({
        queryKey: queryKeys.plantStats(newEvent.plant_id),
      });

      // Invalidate batch last events (for home page)
      queryClient.invalidateQueries({
        queryKey: ["batch-last-events"],
        exact: false,
      });
    },
    onError: (error) => {
      console.error("Failed to create event:", error);
    },
  });
};

export const useUpdateEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Omit<Event, "id" | "created_at">>;
    }) => EventService.updateEvent(id, updates),
    onSuccess: (updatedEvent) => {
      if (updatedEvent) {
        // Invalidate plant events
        queryClient.invalidateQueries({
          queryKey: queryKeys.plantEvents(updatedEvent.plant_id),
        });

        // Invalidate recent events
        queryClient.invalidateQueries({ queryKey: queryKeys.recentEvents });

        // Invalidate plant stats
        queryClient.invalidateQueries({
          queryKey: queryKeys.plantStats(updatedEvent.plant_id),
        });

        // Invalidate batch last events (for home page)
        queryClient.invalidateQueries({
          queryKey: ["batch-last-events"],
          exact: false,
        });
      }
    },
    onError: (error) => {
      console.error("Failed to update event:", error);
    },
  });
};

export const useDeleteEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, plantId }: { id: string; plantId: string }) =>
      EventService.deleteEvent(id),
    onSuccess: (_, { plantId }) => {
      // Invalidate plant events
      queryClient.invalidateQueries({
        queryKey: queryKeys.plantEvents(plantId),
      });

      // Invalidate recent events
      queryClient.invalidateQueries({ queryKey: queryKeys.recentEvents });

      // Invalidate plant stats
      queryClient.invalidateQueries({
        queryKey: queryKeys.plantStats(plantId),
      });

      // Invalidate batch last events (for home page)
      queryClient.invalidateQueries({
        queryKey: ["batch-last-events"],
        exact: false,
      });
    },
    onError: (error) => {
      console.error("Failed to delete event:", error);
    },
  });
};

export const useSavePhoto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      plantId,
      sourceUri,
      caption,
    }: {
      plantId: string;
      sourceUri: string;
      caption?: string;
    }) => PhotoService.savePhoto(plantId, sourceUri, caption),
    onSuccess: (newPhoto) => {
      // Invalidate plant photos
      queryClient.invalidateQueries({
        queryKey: queryKeys.plantPhotos(newPhoto.plant_id),
      });

      // Invalidate all photos
      queryClient.invalidateQueries({ queryKey: queryKeys.allPhotos });

      // Invalidate thumbnail if this might be the first photo
      queryClient.invalidateQueries({
        queryKey: queryKeys.thumbnailPhoto(newPhoto.plant_id),
      });

      // Pre-cache the new photo's thumbnail
    },
    onError: (error) => {
      console.error("Failed to save photo:", error);
    },
  });
};

// ============================================================================
// TAG QUERIES
// ============================================================================

export const useAllTags = () => {
  return useQuery<Tag[]>({
    queryKey: ["all-tags"],
    queryFn: () => TagService.getAllTags(),
    staleTime: CACHE_TTL.TAGS_ALL,
    gcTime: CACHE_GC_TIME.MEDIUM,
  });
};

export const usePlantTags = (plantId: string) => {
  return useQuery<Tag[]>({
    queryKey: ["plant-tags", plantId],
    queryFn: () => TagService.getTagsByPlantId(plantId),
    staleTime: CACHE_TTL.TAGS_BY_PLANT,
    gcTime: CACHE_GC_TIME.MEDIUM,
    enabled: !!plantId,
  });
};

export const useBatchPlantTags = (plantIds: string[]) => {
  return useQuery<{ [plantId: string]: Tag[] }>({
    queryKey: ["batch-plant-tags", [...plantIds].sort().join(",")],
    queryFn: async () => {
      if (plantIds.length === 0) return {};

      const result: { [plantId: string]: Tag[] } = {};

      // Batch the requests to reduce API overhead
      const batchSize = BATCH_CONFIG.TAGS_BATCH_SIZE;
      for (let i = 0; i < plantIds.length; i += batchSize) {
        const batch = plantIds.slice(i, i + batchSize);

        const tagPromises = batch.map(async (plantId) => {
          try {
            const tags = await TagService.getTagsByPlantId(plantId);
            return { plantId, tags };
          } catch (error) {
            console.error(`Failed to load tags for plant ${plantId}:`, error);
            return { plantId, tags: [] };
          }
        });

        const batchResults = await Promise.all(tagPromises);
        batchResults.forEach(({ plantId, tags }) => {
          result[plantId] = tags;
        });
      }

      return result;
    },
    staleTime: CACHE_TTL.TAGS_BY_PLANT,
    gcTime: CACHE_GC_TIME.MEDIUM,
    enabled: plantIds.length > 0,
  });
};

export const useAddTagToPlant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ plantId, tagId }: { plantId: string; tagId: string }) => {
      return TagService.addTagToPlant(plantId, tagId);
    },
    onSuccess: (result, { plantId, tagId }) => {
      // Invalidate plant tags
      queryClient.invalidateQueries({ queryKey: ["plant-tags", plantId] });

      // Invalidate batch plant tags
      queryClient.invalidateQueries({
        queryKey: ["batch-plant-tags"],
        exact: false,
      });

      // Invalidate all tags (in case a new tag was created)
      queryClient.invalidateQueries({ queryKey: ["all-tags"] });

      // Invalidate plant data to reflect tags
      queryClient.invalidateQueries({ queryKey: queryKeys.plant(plantId) });

      // Invalidate plants list to ensure filtering works
      queryClient.invalidateQueries({ queryKey: queryKeys.plants });
    },
    onError: (error) => {
      console.error("Failed to add tag to plant:", error);
    },
  });
};

export const useRemoveTagFromPlant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ plantId, tagId }: { plantId: string; tagId: string }) =>
      TagService.removeTagFromPlant(plantId, tagId),
    onSuccess: (_, { plantId, tagId }) => {
      // Invalidate plant tags
      queryClient.invalidateQueries({ queryKey: ["plant-tags", plantId] });

      // Invalidate batch plant tags
      queryClient.invalidateQueries({
        queryKey: ["batch-plant-tags"],
        exact: false,
      });

      // Invalidate plant data to reflect tags
      queryClient.invalidateQueries({ queryKey: queryKeys.plant(plantId) });

      // Invalidate plants list to ensure filtering works
      queryClient.invalidateQueries({ queryKey: queryKeys.plants });
    },
    onError: (error) => {
      console.error("Failed to remove tag from plant:", error);
    },
  });
};

export const useCreateTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ name, color }: { name: string; color: string }) =>
      TagService.createTag(name, color),
    onSuccess: () => {
      // Invalidate all tags
      queryClient.invalidateQueries({ queryKey: ["all-tags"] });
    },
    onError: (error) => {
      console.error("Failed to create tag:", error);
    },
  });
};

export const useUpdateTag = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: { name?: string; color?: string };
    }) => TagService.updateTag(id, updates),
    onSuccess: () => {
      // Invalidate all tags
      queryClient.invalidateQueries({ queryKey: ["all-tags"] });

      // Invalidate batch plant tags to reflect name/color changes
      queryClient.invalidateQueries({
        queryKey: ["batch-plant-tags"],
        exact: false,
      });

      // Invalidate plants list to ensure filtering works with updated tag name
      queryClient.invalidateQueries({ queryKey: queryKeys.plants });
    },
    onError: (error) => {
      console.error("Failed to update tag:", error);
    },
  });
};

export const useCreateTagAndAddToPlant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      plantId,
      name,
      color,
    }: {
      plantId: string;
      name: string;
      color: string;
    }) => {
      return TagService.createTagAndAddToPlant(plantId, name, color);
    },
    onSuccess: (result, { plantId }) => {
      // Invalidate plant tags
      queryClient.invalidateQueries({ queryKey: ["plant-tags", plantId] });

      // Invalidate batch plant tags
      queryClient.invalidateQueries({
        queryKey: ["batch-plant-tags"],
        exact: false,
      });

      // Invalidate all tags (new tag was created)
      queryClient.invalidateQueries({ queryKey: ["all-tags"] });

      // Invalidate plant data to reflect tags
      queryClient.invalidateQueries({ queryKey: queryKeys.plant(plantId) });

      // Invalidate plants list to ensure filtering works
      queryClient.invalidateQueries({ queryKey: queryKeys.plants });
    },
    onError: (error) => {
      console.error("Failed to create tag and add to plant:", error);
    },
  });
};

export const useDeletePhoto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ photoId, plantId }: { photoId: string; plantId: string }) =>
      PhotoService.deletePhoto(photoId),
    onSuccess: (_, { plantId }) => {
      // Invalidate plant photos
      queryClient.invalidateQueries({
        queryKey: queryKeys.plantPhotos(plantId),
      });

      // Invalidate all photos
      queryClient.invalidateQueries({ queryKey: queryKeys.allPhotos });

      // Invalidate thumbnail in case we deleted the thumbnail photo
      queryClient.invalidateQueries({
        queryKey: queryKeys.thumbnailPhoto(plantId),
      });
    },
    onError: (error) => {
      console.error("Failed to delete photo:", error);
    },
  });
};

export const useSetThumbnailPhoto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ plantId, photoId }: { plantId: string; photoId: string }) =>
      PhotoService.setThumbnailPhoto(plantId, photoId),
    onSuccess: (_, { plantId }) => {
      // Invalidate plant data to reflect new thumbnail
      queryClient.invalidateQueries({ queryKey: queryKeys.plant(plantId) });

      // Invalidate thumbnail photo
      queryClient.invalidateQueries({
        queryKey: queryKeys.thumbnailPhoto(plantId),
      });

      // Invalidate plants list to update thumbnail display
      queryClient.invalidateQueries({ queryKey: queryKeys.plants });
    },
    onError: (error) => {
      console.error("Failed to set thumbnail photo:", error);
    },
  });
};

export const useClearThumbnailPhoto = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (plantId: string) => PhotoService.clearThumbnailPhoto(plantId),
    onSuccess: (_, plantId) => {
      // Invalidate plant data to reflect cleared thumbnail
      queryClient.invalidateQueries({ queryKey: queryKeys.plant(plantId) });

      // Invalidate thumbnail photo
      queryClient.invalidateQueries({
        queryKey: queryKeys.thumbnailPhoto(plantId),
      });

      // Invalidate plants list to update thumbnail display
      queryClient.invalidateQueries({ queryKey: queryKeys.plants });
    },
    onError: (error) => {
      console.error("Failed to clear thumbnail photo:", error);
    },
  });
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Prefetch related data for a plant (useful for navigation)
export const usePrefetchPlantData = () => {
  const queryClient = useQueryClient();

  return {
    prefetchPlant: (plantId: string) => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.plant(plantId),
        queryFn: () => PlantService.getPlantById(plantId),
        staleTime: CACHE_TTL.PLANT_SINGLE,
      });
    },

    prefetchPlantPhotos: (plantId: string) => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.plantPhotos(plantId),
        queryFn: () => PhotoService.getPhotosByPlantId(plantId),
        staleTime: CACHE_TTL.PHOTOS_LIST,
      });
    },

    prefetchPlantEvents: (plantId: string) => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.plantEvents(plantId),
        queryFn: () => EventService.getEventsByPlantId(plantId),
        staleTime: CACHE_TTL.EVENTS_LIST,
      });
    },
  };
};

// Archive hooks
export const useArchivedPlants = () => {
  return useQuery({
    queryKey: ["archived-plants"] as const,
    queryFn: () => PlantService.getArchivedPlants(),
  });
};

export const useArchivePlant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => PlantService.archivePlant(id),
    onSuccess: (_, archivedId) => {
      queryClient.removeQueries({ queryKey: queryKeys.plant(archivedId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.plants });
      queryClient.invalidateQueries({ queryKey: ["archived-plants"] });
      queryClient.invalidateQueries({
        queryKey: ["plants-by-location"],
        exact: false,
      });
    },
  });
};

export const useRestorePlant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => PlantService.restorePlant(id),
    onSuccess: (_, restoredId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.plants });
      queryClient.invalidateQueries({ queryKey: ["archived-plants"] });
      queryClient.invalidateQueries({
        queryKey: ["plants-by-location"],
        exact: false,
      });
    },
  });
};
