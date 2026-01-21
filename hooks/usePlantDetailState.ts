import { useState, useCallback, useMemo, useEffect } from 'react';
import { Alert } from 'react-native';
import { router } from 'expo-router';
import { Event, PlantPhoto } from '../types/Plant';
import { PhotoService } from '../services/PhotoService';
import { DateTimeService } from '../services/DateTimeService';
import {
  usePlant,
  usePlantEvents,
  usePlantPhotos,
  useThumbnailPhoto,
  useSetThumbnailPhoto,
  useClearThumbnailPhoto,
  useDeletePlant,
  useSavePhoto,
  useDeletePhoto,
  useDeleteEvent,
} from './queries';

// Stable empty arrays to prevent unnecessary re-renders
const EMPTY_EVENTS: Event[] = [];
const EMPTY_PHOTOS: PlantPhoto[] = [];

interface FormattedDate {
  date: string;
  timeAgo: string;
}

export function usePlantDetailState(plantId: string) {
  // React Query hooks
  const { data: plant, isLoading: plantLoading, refetch: refetchPlant } = usePlant(plantId);
  const { data: events, isLoading: eventsLoading, refetch: refetchEvents } = usePlantEvents(plantId);
  const { data: photos, isLoading: photosLoading, refetch: refetchPhotos } = usePlantPhotos(plantId);
  const { data: thumbnailPhoto, isLoading: thumbnailLoading } = useThumbnailPhoto(plantId);

  // Mutations
  const setThumbnailMutation = useSetThumbnailPhoto();
  const clearThumbnailMutation = useClearThumbnailPhoto();
  const deletePlantMutation = useDeletePlant();
  const savePhotoMutation = useSavePhoto();
  const deletePhotoMutation = useDeletePhoto();
  const deleteEventMutation = useDeleteEvent();

  // Typed arrays with stable references
  const typedEvents: Event[] = useMemo(() => events || EMPTY_EVENTS, [events]);
  const typedPhotos: PlantPhoto[] = useMemo(() => photos || EMPTY_PHOTOS, [photos]);

  // Loading state
  const loading = plantLoading || eventsLoading || photosLoading || thumbnailLoading;

  // Local UI state
  const [refreshing, setRefreshing] = useState(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [thumbnailViewerVisible, setThumbnailViewerVisible] = useState(false);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [eventPhotos, setEventPhotos] = useState<{ [eventId: string]: PlantPhoto[] }>({});
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [formattedDates, setFormattedDates] = useState<{ [key: string]: FormattedDate }>({});

  // Derived state
  const currentThumbnailId = plant?.thumbnail_photo_id || null;

  // Combine regular photos and event photos for the image viewer
  const allPhotos = useMemo(() => {
    const combinedPhotos = [...typedPhotos];
    Object.values(eventPhotos).forEach((eventPhotoArray) => {
      eventPhotoArray.forEach((photo) => {
        if (!combinedPhotos.find((p) => p.id === photo.id)) {
          combinedPhotos.push(photo);
        }
      });
    });
    return combinedPhotos;
  }, [typedPhotos, eventPhotos]);

  // Load event photos when events change
  useEffect(() => {
    if (typedEvents.length === 0) {
      setEventPhotos({});
      return;
    }

    const loadEventPhotos = async () => {
      const eventPhotoMap: { [eventId: string]: PlantPhoto[] } = {};
      const batchSize = 5;
      for (let i = 0; i < typedEvents.length; i += batchSize) {
        const batch = typedEvents.slice(i, i + batchSize);
        const batchPromises = batch.map(async (event) => {
          try {
            const eventPhotosData = await PhotoService.getPhotosByEventId(event.id);
            return { eventId: event.id, photos: eventPhotosData };
          } catch (error) {
            console.error(`Failed to load photos for event ${event.id}:`, error);
            return { eventId: event.id, photos: [] };
          }
        });

        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach(({ eventId, photos: eventPhotoData }) => {
          eventPhotoMap[eventId] = eventPhotoData;
        });
      }
      setEventPhotos(eventPhotoMap);
    };

    loadEventPhotos();
  }, [typedEvents]);

  // Format dates when events or photos change
  useEffect(() => {
    const updateFormattedDates = async () => {
      const dateMap: { [key: string]: FormattedDate } = {};

      for (const event of typedEvents) {
        const formattedDate = await DateTimeService.formatDate(event.date);
        const timeAgo = DateTimeService.formatTimeAgo(event.date);
        dateMap[event.id] = { date: formattedDate, timeAgo };
      }

      for (const photo of typedPhotos) {
        const formattedDate = await DateTimeService.formatDate(photo.taken_at);
        const timeAgo = DateTimeService.formatTimeAgo(photo.taken_at);
        dateMap[photo.id] = { date: formattedDate, timeAgo };
      }

      setFormattedDates(dateMap);
    };

    updateFormattedDates();
  }, [typedEvents, typedPhotos]);

  // Auto-set thumbnail for plants without one
  useEffect(() => {
    if (typedPhotos.length > 0 && !plant?.thumbnail_photo_id && plant?.id) {
      const sortedPhotos = [...typedPhotos].sort(
        (a, b) => new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime()
      );
      const oldestPhoto = sortedPhotos[0];
      setThumbnailMutation.mutate({ plantId: plant.id, photoId: oldestPhoto.id });
    }
  }, [typedPhotos, plant?.thumbnail_photo_id, plant?.id, setThumbnailMutation]);

  // Handlers
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchPlant(), refetchEvents(), refetchPhotos()]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchPlant, refetchEvents, refetchPhotos]);

  const handleLogCare = useCallback(() => {
    router.push(`/log-care?plantId=${plantId}`);
  }, [plantId]);

  const handleAddTag = useCallback(() => {
    router.push(`/add-tag?plantId=${plantId}`);
  }, [plantId]);

  const handleAddPhoto = useCallback(() => {
    Alert.alert('Add Photo', 'Choose how to add a photo', [
      {
        text: 'Take Photo',
        onPress: async () => {
          setUploadingPhoto(true);
          try {
            const photo = await PhotoService.takePhoto();
            if (photo && plantId) {
              await savePhotoMutation.mutateAsync({
                plantId,
                sourceUri: photo.uri,
                caption: 'Plant photo',
              });
            }
          } catch (error) {
            console.error('Failed to take photo:', error);
            Alert.alert('Error', 'Failed to take photo');
          } finally {
            setUploadingPhoto(false);
          }
        },
      },
      {
        text: 'Photo Library',
        onPress: async () => {
          setUploadingPhoto(true);
          try {
            const photo = await PhotoService.pickPhoto();
            if (photo && plantId) {
              await savePhotoMutation.mutateAsync({
                plantId,
                sourceUri: photo.uri,
                caption: 'Plant photo',
              });
            }
          } catch (error) {
            console.error('Failed to pick photo:', error);
            Alert.alert('Error', 'Failed to pick photo');
          } finally {
            setUploadingPhoto(false);
          }
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  }, [plantId, savePhotoMutation]);

  const handlePhotoPress = useCallback(
    (photo: PlantPhoto) => {
      const photoIndex = allPhotos.findIndex((p) => p.id === photo.id);
      if (photoIndex === -1 || !allPhotos[photoIndex]) {
        console.warn('Photo not found in allPhotos array:', photo.id);
        return;
      }
      setCurrentPhotoIndex(photoIndex);
      setImageViewerVisible(true);
    },
    [allPhotos]
  );

  const handleThumbnailPress = useCallback(() => {
    setThumbnailViewerVisible(true);
  }, []);

  const handleSetThumbnail = useCallback(
    (photoId: string) => {
      setThumbnailMutation.mutate(
        { plantId, photoId },
        {
          onError: (error) => {
            console.error('Failed to set thumbnail:', error);
            Alert.alert('Error', 'Failed to set thumbnail photo');
          },
        }
      );
    },
    [plantId, setThumbnailMutation]
  );

  const handleDeletePhoto = useCallback(
    (photoId: string) => {
      Alert.alert('Delete Photo', 'Are you sure you want to delete this photo?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const isCurrentThumbnail = plant?.thumbnail_photo_id === photoId;
              await deletePhotoMutation.mutateAsync({ photoId, plantId });

              if (isCurrentThumbnail) {
                await refetchPhotos();
                if (typedPhotos.length > 1) {
                  const remainingPhotos = typedPhotos.filter((p) => p.id !== photoId);
                  if (remainingPhotos.length > 0) {
                    const sortedPhotos = [...remainingPhotos].sort(
                      (a, b) => new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime()
                    );
                    const newThumbnail = sortedPhotos[0];
                    await PhotoService.setThumbnailPhoto(plantId, newThumbnail.id);
                  }
                } else {
                  await PhotoService.clearThumbnailPhoto(plantId);
                }
              }
            } catch (error) {
              console.error('Failed to delete photo:', error);
              Alert.alert('Error', 'Failed to delete photo');
            }
          },
        },
      ]);
    },
    [plant, plantId, typedPhotos, deletePhotoMutation, refetchPhotos]
  );

  const handlePhotoOptions = useCallback(
    (photo: PlantPhoto) => {
      Alert.alert('Photo Options', 'Choose an action', [
        { text: 'Set as Thumbnail', onPress: () => handleSetThumbnail(photo.id) },
        { text: 'Delete Photo', onPress: () => handleDeletePhoto(photo.id), style: 'destructive' },
        { text: 'Cancel', style: 'cancel' },
      ]);
    },
    [handleSetThumbnail, handleDeletePhoto]
  );

  const handleDeleteSelectedPhotos = useCallback(async () => {
    const selectedCount = selectedPhotos.size;
    if (selectedCount === 0) return;

    Alert.alert(
      'Delete Photos',
      `Are you sure you want to delete ${selectedCount} photo${selectedCount > 1 ? 's' : ''}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const selectedPhotoIds = Array.from(selectedPhotos);
              let wasThumbnailDeleted = false;

              if (plant?.thumbnail_photo_id && selectedPhotos.has(plant.thumbnail_photo_id)) {
                wasThumbnailDeleted = true;
              }

              await Promise.all(
                selectedPhotoIds.map((photoId) =>
                  deletePhotoMutation.mutateAsync({ photoId, plantId })
                )
              );

              if (wasThumbnailDeleted) {
                const remainingPhotos = typedPhotos.filter(
                  (photo) => !selectedPhotoIds.includes(photo.id)
                );

                if (remainingPhotos.length > 0) {
                  const sortedPhotos = [...remainingPhotos].sort(
                    (a, b) => new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime()
                  );
                  const newThumbnail = sortedPhotos[0];
                  await setThumbnailMutation.mutateAsync({ plantId, photoId: newThumbnail.id });
                } else {
                  await clearThumbnailMutation.mutateAsync(plantId);
                }
              }

              setIsMultiSelectMode(false);
              setSelectedPhotos(new Set());
            } catch (error) {
              console.error('Failed to delete photos:', error);
              Alert.alert('Error', 'Failed to delete photos');
            }
          },
        },
      ]
    );
  }, [
    selectedPhotos,
    plant,
    plantId,
    typedPhotos,
    deletePhotoMutation,
    setThumbnailMutation,
    clearThumbnailMutation,
  ]);

  const handleDeletePlant = useCallback(async () => {
    if (!plant) return;

    Alert.alert(
      'Delete Plant',
      `Are you sure you want to delete "${plant.name || `${plant.type}`}"? This will also delete all events and photos associated with this plant. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deletePlantMutation.mutateAsync(plantId);
              router.back();
            } catch (error) {
              console.error('Failed to delete plant:', error);
              Alert.alert('Error', 'Failed to delete plant');
            }
          },
        },
      ]
    );
  }, [plant, plantId, deletePlantMutation]);

  const handleDeleteCareEvent = useCallback(
    (eventId: string, eventType: string) => {
      Alert.alert(
        'Delete Event',
        `Are you sure you want to delete this ${eventType} event? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                await deleteEventMutation.mutateAsync({ id: eventId, plantId });
              } catch (error) {
                console.error('Failed to delete event:', error);
                Alert.alert('Error', 'Failed to delete event');
              }
            },
          },
        ]
      );
    },
    [plantId, deleteEventMutation]
  );

  const handleDownloadPhoto = useCallback(
    async (photo: PlantPhoto) => {
      try {
        const photoUrl = PhotoService.getImageUrl(photo, false);
        const filename = `${plant?.name || plant?.type}_${new Date(photo.taken_at).toISOString().split('T')[0]}.jpg`;

        const result = await PhotoService.downloadPhotoToDevice(photoUrl, filename);

        if (!result.success) {
          Alert.alert('Error', result.error || 'Failed to download photo');
        }
      } catch (error) {
        console.error('Error downloading photo:', error);
        Alert.alert('Error', 'Failed to download photo');
      }
    },
    [plant]
  );

  const toggleMultiSelect = useCallback(() => {
    setIsMultiSelectMode((prev) => !prev);
    setSelectedPhotos(new Set());
  }, []);

  const togglePhotoSelection = useCallback((photoId: string) => {
    setSelectedPhotos((prev) => {
      const newSelected = new Set(prev);
      if (newSelected.has(photoId)) {
        newSelected.delete(photoId);
      } else {
        newSelected.add(photoId);
      }
      return newSelected;
    });
  }, []);

  const closeImageViewer = useCallback(() => {
    setImageViewerVisible(false);
  }, []);

  const closeThumbnailViewer = useCallback(() => {
    setThumbnailViewerVisible(false);
  }, []);

  return {
    // Data
    plant,
    typedEvents,
    typedPhotos,
    allPhotos,
    thumbnailPhoto,
    eventPhotos,
    formattedDates,
    currentThumbnailId,

    // Loading states
    loading,
    refreshing,
    uploadingPhoto,

    // UI state
    imageViewerVisible,
    currentPhotoIndex,
    thumbnailViewerVisible,
    isMultiSelectMode,
    selectedPhotos,

    // Handlers
    onRefresh,
    handleLogCare,
    handleAddTag,
    handleAddPhoto,
    handlePhotoPress,
    handleThumbnailPress,
    handleSetThumbnail,
    handleDeletePhoto,
    handlePhotoOptions,
    handleDeleteSelectedPhotos,
    handleDeletePlant,
    handleDeleteCareEvent,
    handleDownloadPhoto,
    toggleMultiSelect,
    togglePhotoSelection,
    closeImageViewer,
    closeThumbnailViewer,
  };
}
