import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { PlantService } from "../services/PlantService";
import { PhotoService } from "../services/PhotoService";
import { EventService } from "../services/EventService";
import { TagService } from "../services/TagService";
import { PropagationService } from "../services/PropagationService";
import type { PropagateInput } from "../services/PropagationService";
import { Plant, PlantPhoto, Event, Tag, PlantLineage } from "../types/Plant";
import { queryKeys } from "../constants/queryKeys";
import { CACHE_TTL, CACHE_GC_TIME, BATCH_CONFIG } from "../constants/domain";
import { WATERING_EVENT_TYPES } from "../constants/careTypes";
import type { PropagationMethod } from "../constants/propagation";

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

export const useAllEvents = () => {
  return useQuery<Event[]>({
    queryKey: queryKeys.allEvents,
    queryFn: EventService.getAllEvents,
    staleTime: CACHE_TTL.EVENTS_ALL,
    gcTime: CACHE_GC_TIME.MEDIUM,
  });
};

export const useEvent = (id: string) => {
  return useQuery<Event | null>({
    queryKey: queryKeys.event(id),
    queryFn: () => EventService.getEventById(id),
    staleTime: CACHE_TTL.EVENTS_LIST,
    gcTime: CACHE_GC_TIME.MEDIUM,
    enabled: !!id,
  });
};

export const useEventPhotos = (eventId: string) => {
  return useQuery<PlantPhoto[]>({
    queryKey: queryKeys.eventPhotos(eventId),
    queryFn: () => PhotoService.getPhotosByEventId(eventId),
    staleTime: CACHE_TTL.PHOTOS_LIST,
    gcTime: CACHE_GC_TIME.LONG,
    enabled: !!eventId,
  });
};

export const usePlantStats = (plantId: string) => {
  return useQuery<any>({
    queryKey: queryKeys.plantStats(plantId),
    enabled: !!plantId,
    queryFn: () => EventService.getEventStats(plantId),
    staleTime: CACHE_TTL.EVENTS_STATS,
    gcTime: CACHE_GC_TIME.MEDIUM,
  });
};

export const useBatchLastEvents = (
  plantIds: string[],
  eventTypes: string[] = WATERING_EVENT_TYPES,
) => {
  return useQuery<{ [plantId: string]: { [eventType: string]: Event | null } }>(
    {
      queryKey: queryKeys.batchLastEvents(plantIds, eventTypes),
      queryFn: () =>
        EventService.getLastEventsByTypeForPlants(plantIds, eventTypes),
      staleTime: CACHE_TTL.BATCH_LAST_EVENTS,
      gcTime: CACHE_GC_TIME.SHORT,
      enabled: plantIds.length > 0,
      placeholderData: keepPreviousData,
    },
  );
};

export const useBatchThumbnails = (plantIds: string[]) => {
  return useQuery<{ [plantId: string]: PlantPhoto | null }>({
    queryKey: queryKeys.batchThumbnails(plantIds),
    queryFn: () => PhotoService.getBatchThumbnailPhotos(plantIds),
    staleTime: CACHE_TTL.BATCH_THUMBNAILS,
    gcTime: CACHE_GC_TIME.LONG,
    enabled: plantIds.length > 0,
    placeholderData: keepPreviousData,
  });
};

export const useBatchLastPhotoDates = (plantIds: string[]) => {
  return useQuery<{ [plantId: string]: string | null }>({
    queryKey: queryKeys.batchLastPhotoDates(plantIds),
    queryFn: () => PhotoService.getLastPhotoDatesByPlantIds(plantIds),
    staleTime: CACHE_TTL.PHOTOS_LIST,
    gcTime: CACHE_GC_TIME.LONG,
    enabled: plantIds.length > 0,
    placeholderData: keepPreviousData,
  });
};

// ============================================================================
// MUTATIONS
//
// Cache invalidation lives in the services (see CacheInvalidationService), so
// a change refreshes the same queries whether it came from one of these hooks,
// a direct service call, or a realtime event from another household member.
// The hooks below only seed or drop cache entries they already know about.
// ============================================================================

export const useCreatePlant = () => {
  return useMutation({
    mutationFn: (
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
    ) => PlantService.createPlant(plantData),
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
        queryClient.setQueryData(
          queryKeys.plant(updatedPlant.id),
          updatedPlant,
        );
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
      for (const queryKey of [
        queryKeys.plant(deletedId),
        queryKeys.plantPhotos(deletedId),
        queryKeys.plantEvents(deletedId),
        queryKeys.plantStats(deletedId),
        queryKeys.plantTags(deletedId),
        queryKeys.thumbnailPhoto(deletedId),
      ]) {
        queryClient.removeQueries({ queryKey });
      }
    },
    onError: (error) => {
      console.error("Failed to delete plant:", error);
    },
  });
};

export const useCreateEvent = () => {
  return useMutation({
    mutationFn: (
      eventData: Omit<
        Event,
        "id" | "created_at" | "updated_at" | "household_id"
      >,
    ) => EventService.createEvent(eventData),
    onError: (error) => {
      console.error("Failed to create event:", error);
    },
  });
};

export const useUpdateEvent = () => {
  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Omit<Event, "id" | "created_at">>;
    }) => EventService.updateEvent(id, updates),
    onError: (error) => {
      console.error("Failed to update event:", error);
    },
  });
};

export const useDeleteEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id }: { id: string; plantId: string }) =>
      EventService.deleteEvent(id),
    onSuccess: (_, { id }) => {
      queryClient.removeQueries({ queryKey: queryKeys.event(id) });
    },
    onError: (error) => {
      console.error("Failed to delete event:", error);
    },
  });
};

export const useSavePhoto = () => {
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
    onError: (error) => {
      console.error("Failed to save photo:", error);
    },
  });
};

export const useDeletePhoto = () => {
  return useMutation({
    mutationFn: async ({ photoId }: { photoId: string; plantId: string }) => {
      // deletePhoto reports failure by returning false; turn that into an
      // error so callers don't treat a failed delete as done.
      const deleted = await PhotoService.deletePhoto(photoId);
      if (!deleted) {
        throw new Error("Failed to delete photo");
      }
      return deleted;
    },
    onError: (error) => {
      console.error("Failed to delete photo:", error);
    },
  });
};

export const useSetThumbnailPhoto = () => {
  return useMutation({
    mutationFn: ({ plantId, photoId }: { plantId: string; photoId: string }) =>
      PhotoService.setThumbnailPhoto(plantId, photoId),
    onError: (error) => {
      console.error("Failed to set thumbnail photo:", error);
    },
  });
};

export const useClearThumbnailPhoto = () => {
  return useMutation({
    mutationFn: (plantId: string) => PhotoService.clearThumbnailPhoto(plantId),
    onError: (error) => {
      console.error("Failed to clear thumbnail photo:", error);
    },
  });
};

// ============================================================================
// TAG QUERIES
// ============================================================================

export const useAllTags = () => {
  return useQuery<Tag[]>({
    queryKey: queryKeys.allTags,
    queryFn: () => TagService.getAllTags(),
    staleTime: CACHE_TTL.TAGS_ALL,
    gcTime: CACHE_GC_TIME.MEDIUM,
  });
};

export const usePlantTags = (plantId: string) => {
  return useQuery<Tag[]>({
    queryKey: queryKeys.plantTags(plantId),
    queryFn: () => TagService.getTagsByPlantId(plantId),
    staleTime: CACHE_TTL.TAGS_BY_PLANT,
    gcTime: CACHE_GC_TIME.MEDIUM,
    enabled: !!plantId,
  });
};

export const useBatchPlantTags = (plantIds: string[]) => {
  return useQuery<{ [plantId: string]: Tag[] }>({
    queryKey: queryKeys.batchPlantTags(plantIds),
    queryFn: () => TagService.getTagsByPlantIds(plantIds),
    staleTime: CACHE_TTL.TAGS_BY_PLANT,
    gcTime: CACHE_GC_TIME.MEDIUM,
    enabled: plantIds.length > 0,
    placeholderData: keepPreviousData,
  });
};

export const useAddTagToPlant = () => {
  return useMutation({
    mutationFn: ({ plantId, tagId }: { plantId: string; tagId: string }) =>
      TagService.addTagToPlant(plantId, tagId),
    onError: (error) => {
      console.error("Failed to add tag to plant:", error);
    },
  });
};

export const useRemoveTagFromPlant = () => {
  return useMutation({
    mutationFn: ({ plantId, tagId }: { plantId: string; tagId: string }) =>
      TagService.removeTagFromPlant(plantId, tagId),
    onError: (error) => {
      console.error("Failed to remove tag from plant:", error);
    },
  });
};

export const useCreateTag = () => {
  return useMutation({
    mutationFn: ({ name, color }: { name: string; color: string }) =>
      TagService.createTag(name, color),
    onError: (error) => {
      console.error("Failed to create tag:", error);
    },
  });
};

export const useUpdateTag = () => {
  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: string;
      updates: { name?: string; color?: string };
    }) => TagService.updateTag(id, updates),
    onError: (error) => {
      console.error("Failed to update tag:", error);
    },
  });
};

export const useCreateTagAndAddToPlant = () => {
  return useMutation({
    mutationFn: ({
      plantId,
      name,
      color,
    }: {
      plantId: string;
      name: string;
      color: string;
    }) => TagService.createTagAndAddToPlant(plantId, name, color),
    onError: (error) => {
      console.error("Failed to create tag and add to plant:", error);
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
    queryKey: queryKeys.archivedPlants,
    queryFn: () => PlantService.getArchivedPlants(),
  });
};

export const useArchivePlant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => PlantService.archivePlant(id),
    onSuccess: (_, archivedId) => {
      queryClient.removeQueries({ queryKey: queryKeys.plant(archivedId) });
    },
  });
};

export const useRestorePlant = () => {
  return useMutation({
    mutationFn: (id: string) => PlantService.restorePlant(id),
  });
};

// ============================================================================
// PROPAGATION
// ============================================================================

export const usePlantLineage = (plantId: string) => {
  return useQuery<PlantLineage | null>({
    queryKey: queryKeys.plantLineage(plantId),
    queryFn: () => PropagationService.getLineage(plantId),
    staleTime: CACHE_TTL.PLANT_LINEAGE,
    gcTime: CACHE_GC_TIME.MEDIUM,
    enabled: !!plantId,
  });
};

export const usePropagatePlant = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: PropagateInput) =>
      PropagationService.propagateFrom(input),
    onSuccess: (child) => {
      queryClient.setQueryData(queryKeys.plant(child.id), child);
    },
    onError: (error) => {
      console.error("Failed to propagate plant:", error);
    },
  });
};

export const useSetPlantParent = () => {
  return useMutation({
    mutationFn: ({
      plantId,
      parentPlantId,
      method,
      propagatedAt,
    }: {
      plantId: string;
      parentPlantId: string | null;
      method?: PropagationMethod;
      propagatedAt?: string;
    }) =>
      PropagationService.setParent(plantId, parentPlantId, {
        method,
        propagatedAt,
      }),
    onError: (error) => {
      console.error("Failed to update plant lineage:", error);
    },
  });
};
