import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { PlantService } from '../services/PlantService';
import { PhotoService } from '../services/PhotoService';
import { EventService } from '../services/EventService';
import { CachedPhotoService } from '../services/CachedPhotoService';
import { Plant, PlantPhoto, Event } from '../types/Plant';
import { queryKeys } from '../constants/queryKeys';

// Re-export queryKeys for backward compatibility
export { queryKeys };

// ============================================================================
// PLANT QUERIES
// ============================================================================

export const usePlants = () => {
  return useQuery({
    queryKey: queryKeys.plants,
    queryFn: PlantService.getAllPlants,
    staleTime: 5 * 60 * 1000, // 5 minutes - plants don't change frequently
    cacheTime: 30 * 60 * 1000, // 30 minutes
  });
};

export const usePlant = (id: string) => {
  return useQuery({
    queryKey: queryKeys.plant(id),
    queryFn: () => PlantService.getPlantById(id),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    enabled: !!id,
  });
};

export const usePlantsByLocation = (location: string) => {
  return useQuery({
    queryKey: queryKeys.plantsByLocation(location),
    queryFn: () => PlantService.getPlantsByLocation(location),
    staleTime: 10 * 60 * 1000, // 10 minutes - location-based queries are fairly stable
    cacheTime: 30 * 60 * 1000,
    enabled: !!location,
  });
};

// ============================================================================
// PHOTO QUERIES
// ============================================================================

export const usePlantPhotos = (plantId: string) => {
  return useQuery({
    queryKey: queryKeys.plantPhotos(plantId),
    queryFn: () => PhotoService.getPhotosByPlantId(plantId),
    staleTime: 10 * 60 * 1000, // 10 minutes - photos don't change very frequently
    cacheTime: 60 * 60 * 1000, // 1 hour - photos are valuable to cache longer
    enabled: !!plantId,
    // Pre-cache thumbnails when photos are loaded
    onSuccess: (photos: PlantPhoto[]) => {
      if (photos?.length > 0) {
        CachedPhotoService.preloadThumbnails(photos);
      }
    },
  });
};

export const usePlantPhotosOldestFirst = (plantId: string) => {
  return useQuery({
    queryKey: [...queryKeys.plantPhotos(plantId), 'oldest-first'],
    queryFn: () => PhotoService.getPhotosByPlantIdOldestFirst(plantId),
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 60 * 60 * 1000, // 1 hour
    enabled: !!plantId,
    onSuccess: (photos: PlantPhoto[]) => {
      if (photos?.length > 0) {
        CachedPhotoService.preloadThumbnails(photos);
      }
    },
  });
};

export const useAllPhotos = () => {
  return useQuery({
    queryKey: queryKeys.allPhotos,
    queryFn: PhotoService.getAllPhotos,
    staleTime: 15 * 60 * 1000, // 15 minutes - all photos is expensive to fetch
    cacheTime: 60 * 60 * 1000, // 1 hour
    onSuccess: (photos: PlantPhoto[]) => {
      if (photos?.length > 0) {
        // Pre-cache only first 20 thumbnails to avoid overwhelming the system
        CachedPhotoService.preloadThumbnails(photos.slice(0, 20));
      }
    },
  });
};

export const useThumbnailPhoto = (plantId: string) => {
  return useQuery({
    queryKey: queryKeys.thumbnailPhoto(plantId),
    queryFn: () => PhotoService.getThumbnailPhoto(plantId),
    staleTime: 30 * 60 * 1000, // 30 minutes - thumbnails rarely change
    cacheTime: 2 * 60 * 60 * 1000, // 2 hours - thumbnails are very cacheable
    enabled: !!plantId,
    onSuccess: (photo: PlantPhoto | null) => {
      if (photo?.thumbnail_path) {
        // Pre-cache the thumbnail immediately
        CachedPhotoService.getCachedPhoto(photo.thumbnail_path, true).catch(() => {});
      }
    },
  });
};

// ============================================================================
// EVENT QUERIES
// ============================================================================

export const usePlantEvents = (plantId: string) => {
  return useQuery({
    queryKey: queryKeys.plantEvents(plantId),
    queryFn: () => EventService.getEventsByPlantId(plantId),
    staleTime: 5 * 60 * 1000, // 5 minutes - events change more frequently
    cacheTime: 30 * 60 * 1000, // 30 minutes
    enabled: !!plantId,
  });
};

export const useRecentEvents = (limit: number = 10) => {
  return useQuery({
    queryKey: [...queryKeys.recentEvents, limit],
    queryFn: () => EventService.getRecentEvents(limit),
    staleTime: 2 * 60 * 1000, // 2 minutes - recent events should be relatively fresh
    cacheTime: 15 * 60 * 1000, // 15 minutes
  });
};

export const usePlantStats = (plantId: string) => {
  return useQuery({
    queryKey: queryKeys.plantStats(plantId),
    queryFn: () => EventService.getEventStats(plantId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 30 * 60 * 1000, // 30 minutes
    enabled: !!plantId,
  });
};

// ============================================================================
// MUTATIONS WITH CACHE INVALIDATION
// ============================================================================

export const useCreatePlant = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (plantData: Omit<Plant, 'id' | 'created_at' | 'updated_at'>) => 
      PlantService.createPlant(plantData),
    onSuccess: () => {
      // Invalidate and refetch plants list
      queryClient.invalidateQueries({ queryKey: queryKeys.plants });
    },
    onError: (error) => {
      console.error('Failed to create plant:', error);
    },
  });
};

export const useUpdatePlant = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Omit<Plant, 'id' | 'created_at'>> }) => 
      PlantService.updatePlant(id, updates),
    onSuccess: (updatedPlant) => {
      if (updatedPlant) {
        // Update specific plant in cache
        queryClient.setQueryData(queryKeys.plant(updatedPlant.id), updatedPlant);
        
        // Invalidate plants list to reflect changes
        queryClient.invalidateQueries({ queryKey: queryKeys.plants });
        
        // Invalidate location-based queries if location changed
        if ('location' in updatedPlant) {
          queryClient.invalidateQueries({ 
            queryKey: ['plants-by-location'],
            exact: false 
          });
        }
      }
    },
    onError: (error) => {
      console.error('Failed to update plant:', error);
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
        queryKey: ['plants-by-location'],
        exact: false 
      });
      
      // Invalidate related photos and events
      queryClient.invalidateQueries({ queryKey: queryKeys.plantPhotos(deletedId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.plantEvents(deletedId) });
    },
    onError: (error) => {
      console.error('Failed to delete plant:', error);
    },
  });
};

export const useCreateEvent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (eventData: Omit<Event, 'id' | 'created_at' | 'updated_at'>) => 
      EventService.createEvent(eventData),
    onSuccess: (newEvent) => {
      // Invalidate plant events
      queryClient.invalidateQueries({ queryKey: queryKeys.plantEvents(newEvent.plant_id) });
      
      // Invalidate recent events
      queryClient.invalidateQueries({ queryKey: queryKeys.recentEvents });
      
      // Invalidate plant stats
      queryClient.invalidateQueries({ queryKey: queryKeys.plantStats(newEvent.plant_id) });
    },
    onError: (error) => {
      console.error('Failed to create event:', error);
    },
  });
};

export const useUpdateEvent = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Omit<Event, 'id' | 'created_at'>> }) => 
      EventService.updateEvent(id, updates),
    onSuccess: (updatedEvent) => {
      if (updatedEvent) {
        // Invalidate plant events
        queryClient.invalidateQueries({ queryKey: queryKeys.plantEvents(updatedEvent.plant_id) });
        
        // Invalidate recent events
        queryClient.invalidateQueries({ queryKey: queryKeys.recentEvents });
        
        // Invalidate plant stats
        queryClient.invalidateQueries({ queryKey: queryKeys.plantStats(updatedEvent.plant_id) });
      }
    },
    onError: (error) => {
      console.error('Failed to update event:', error);
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
      queryClient.invalidateQueries({ queryKey: queryKeys.plantEvents(plantId) });
      
      // Invalidate recent events
      queryClient.invalidateQueries({ queryKey: queryKeys.recentEvents });
      
      // Invalidate plant stats
      queryClient.invalidateQueries({ queryKey: queryKeys.plantStats(plantId) });
    },
    onError: (error) => {
      console.error('Failed to delete event:', error);
    },
  });
};

export const useSavePhoto = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ plantId, sourceUri, caption }: { plantId: string; sourceUri: string; caption?: string }) => 
      PhotoService.savePhoto(plantId, sourceUri, caption),
    onSuccess: (newPhoto) => {
      // Invalidate plant photos
      queryClient.invalidateQueries({ queryKey: queryKeys.plantPhotos(newPhoto.plant_id) });
      
      // Invalidate all photos
      queryClient.invalidateQueries({ queryKey: queryKeys.allPhotos });
      
      // Invalidate thumbnail if this might be the first photo
      queryClient.invalidateQueries({ queryKey: queryKeys.thumbnailPhoto(newPhoto.plant_id) });
      
      // Pre-cache the new photo's thumbnail
      if (newPhoto.thumbnail_path) {
        CachedPhotoService.getCachedPhoto(newPhoto.thumbnail_path, true).catch(() => {});
      }
    },
    onError: (error) => {
      console.error('Failed to save photo:', error);
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
      queryClient.invalidateQueries({ queryKey: queryKeys.plantPhotos(plantId) });
      
      // Invalidate all photos
      queryClient.invalidateQueries({ queryKey: queryKeys.allPhotos });
      
      // Invalidate thumbnail in case we deleted the thumbnail photo
      queryClient.invalidateQueries({ queryKey: queryKeys.thumbnailPhoto(plantId) });
    },
    onError: (error) => {
      console.error('Failed to delete photo:', error);
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
      queryClient.invalidateQueries({ queryKey: queryKeys.thumbnailPhoto(plantId) });
      
      // Invalidate plants list to update thumbnail display
      queryClient.invalidateQueries({ queryKey: queryKeys.plants });
    },
    onError: (error) => {
      console.error('Failed to set thumbnail photo:', error);
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
        staleTime: 5 * 60 * 1000,
      });
    },
    
    prefetchPlantPhotos: (plantId: string) => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.plantPhotos(plantId),
        queryFn: () => PhotoService.getPhotosByPlantId(plantId),
        staleTime: 10 * 60 * 1000,
      });
    },
    
    prefetchPlantEvents: (plantId: string) => {
      queryClient.prefetchQuery({
        queryKey: queryKeys.plantEvents(plantId),
        queryFn: () => EventService.getEventsByPlantId(plantId),
        staleTime: 5 * 60 * 1000,
      });
    },
  };
};