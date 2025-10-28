import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import ImageViewing from 'react-native-image-viewing';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { SquarePen, Trash2, X, Download } from 'lucide-react-native';
import { Plant, Event, PlantPhoto } from '../../types/Plant';
import { PlantService } from '../../services/PlantService';
import { EventService } from '../../services/EventService';
import { PhotoService } from '../../services/PhotoService';
import { DateTimeService } from '../../services/DateTimeService';
import { useTheme } from '../../contexts/ThemeContext';
import { useRealtimeUpdates } from '../../hooks/useRealtimeUpdates';
import TagsList from '../../components/TagsList';
import { 
  usePlant, 
  usePlantEvents, 
  usePlantPhotos, 
  useThumbnailPhoto,
  useSetThumbnailPhoto,
  useDeletePlant,
  useSavePhoto,
  useDeletePhoto,
  useDeleteEvent
} from '../../hooks/queries';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Stable empty arrays to prevent unnecessary re-renders
const EMPTY_EVENTS: Event[] = [];
const EMPTY_PHOTOS: PlantPhoto[] = [];

export default function PlantDetailScreen() {
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  
  // React Query hooks - these handle caching automatically
  const { data: plant, isLoading: plantLoading, refetch: refetchPlant } = usePlant(id!);
  const { data: events, isLoading: eventsLoading, refetch: refetchEvents } = usePlantEvents(id!);
  const { data: photos, isLoading: photosLoading, refetch: refetchPhotos } = usePlantPhotos(id!);
  
  // Explicit typing to ensure TypeScript knows these are arrays
  const typedEvents: Event[] = useMemo(() => events || EMPTY_EVENTS, [events]);
  const typedPhotos: PlantPhoto[] = useMemo(() => photos || EMPTY_PHOTOS, [photos]);
  const { data: thumbnailPhoto, isLoading: thumbnailLoading } = useThumbnailPhoto(id!);
  
  // Mutations
  const setThumbnailMutation = useSetThumbnailPhoto();
  const deletePlantMutation = useDeletePlant();
  const savePhotoMutation = useSavePhoto();
  const deletePhotoMutation = useDeletePhoto();
  const deleteEventMutation = useDeleteEvent();
  
  // Loading state derived from queries
  const loading = plantLoading || eventsLoading || photosLoading || thumbnailLoading;
  const [refreshing, setRefreshing] = useState(false);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [thumbnailViewerVisible, setThumbnailViewerVisible] = useState(false);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
  const [eventPhotos, setEventPhotos] = useState<{[eventId: string]: PlantPhoto[]}>({});
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [tagRefreshTrigger, setTagRefreshTrigger] = useState(0);
  
  // Derived current thumbnail ID from plant data
  const currentThumbnailId = plant?.thumbnail_photo_id || null;
  
  // Combine regular photos and event photos for the image viewer
  const allPhotos = useMemo(() => {
    const combinedPhotos = [...typedPhotos];
    Object.values(eventPhotos).forEach(eventPhotoArray => {
      eventPhotoArray.forEach(photo => {
        // Only add if not already in the array (avoid duplicates)
        if (!combinedPhotos.find(p => p.id === photo.id)) {
          combinedPhotos.push(photo);
        }
      });
    });
    return combinedPhotos;
  }, [typedPhotos, eventPhotos]);
  
  // Auto-set thumbnail for plants without one
  useEffect(() => {
    if (typedPhotos.length > 0 && !plant?.thumbnail_photo_id && plant?.id) {
      // Sort photos by taken_at ascending to get the oldest first
      const sortedPhotos = [...typedPhotos].sort((a, b) => 
        new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime()
      );
      const oldestPhoto = sortedPhotos[0];
      
      // Set the oldest photo as thumbnail
      setThumbnailMutation.mutate({ plantId: plant.id, photoId: oldestPhoto.id });
    }
  }, [typedPhotos, plant?.thumbnail_photo_id, plant?.id, setThumbnailMutation]);
  
  // Load event photos when events change
  useEffect(() => {
    if (typedEvents.length === 0) {
      setEventPhotos({});
      return;
    }
    
    const loadEventPhotos = async () => {
      const eventPhotoMap: {[eventId: string]: PlantPhoto[]} = {};
      // Load photos for events in batches to avoid overwhelming the API
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

  // Set up real-time subscriptions - React Query will handle invalidation
  useRealtimeUpdates({});

  // Refresh tags when screen comes back into focus (e.g., after adding a tag)
  useFocusEffect(
    useCallback(() => {
      setTagRefreshTrigger(prev => prev + 1);
    }, [])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchPlant(),
        refetchEvents(), 
        refetchPhotos()
      ]);
    } finally {
      setRefreshing(false);
    }
  }, [refetchPlant, refetchEvents, refetchPhotos]);

  const handleLogCare = () => {
    router.push(`/log-care?plantId=${id}`);
  };

  const handleAddTag = () => {
    router.push(`/add-tag?plantId=${id}`);
  };

  const handleAddPhoto = () => {
    Alert.alert(
      'Add Photo',
      'Choose how to add a photo',
      [
        { text: 'Take Photo', onPress: handleTakePhoto },
        { text: 'Photo Library', onPress: handlePickPhoto },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleTakePhoto = async () => {
    setUploadingPhoto(true);
    try {
      const photo = await PhotoService.takePhoto();
      if (photo && id) {
        // Use React Query mutation - this will handle cache invalidation
        await savePhotoMutation.mutateAsync({
          plantId: id,
          sourceUri: photo.uri,
          caption: 'Plant photo'
        });
        console.log('Photo saved successfully');
      }
    } catch (error) {
      console.error('Failed to take photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePickPhoto = async () => {
    setUploadingPhoto(true);
    try {
      const photo = await PhotoService.pickPhoto();
      if (photo && id) {
        // Use React Query mutation - this will handle cache invalidation
        await savePhotoMutation.mutateAsync({
          plantId: id,
          sourceUri: photo.uri,
          caption: 'Plant photo'
        });
        console.log('Photo saved successfully');
      }
    } catch (error) {
      console.error('Failed to pick photo:', error);
      Alert.alert('Error', 'Failed to pick photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handlePhotoPress = (photo: PlantPhoto) => {
    const photoIndex = allPhotos.findIndex(p => p.id === photo.id);
    if (photoIndex === -1 || !allPhotos[photoIndex]) {
      console.warn('Photo not found in allPhotos array:', photo.id);
      return;
    }
    setCurrentPhotoIndex(photoIndex);
    setImageViewerVisible(true);
  };

  const handleThumbnailPress = () => {
    setThumbnailViewerVisible(true);
  };

  const handleDeletePhoto = async (photoId: string) => {
    Alert.alert(
      'Delete Photo',
      'Are you sure you want to delete this photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Check if we're deleting the current thumbnail
              const isCurrentThumbnail = plant?.thumbnail_photo_id === photoId;
              
              await deletePhotoMutation.mutateAsync({ photoId, plantId: id! });
              
              // If we deleted the thumbnail photo, we need to set a new one
              if (isCurrentThumbnail && id) {
                // React Query will refetch photos, so we can access updated photos
                await refetchPhotos();
                
                if (typedPhotos.length > 1) {
                  // Get the remaining photos (excluding the one we just deleted)
                  const remainingPhotos = typedPhotos.filter(p => p.id !== photoId);
                  if (remainingPhotos.length > 0) {
                    // Sort photos by taken_at ascending to get the oldest first
                    const sortedPhotos = [...remainingPhotos].sort((a, b) => 
                      new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime()
                    );
                    const newThumbnail = sortedPhotos[0];
                    
                    // Set the oldest remaining photo as the new thumbnail
                    await PhotoService.setThumbnailPhoto(id, newThumbnail.id);
                  }
                } else {
                  // No photos left, clear the thumbnail
                  await PhotoService.clearThumbnailPhoto(id);
                }
              }
              
              // React Query mutations handle cache invalidation automatically
            } catch (error) {
              console.error('Failed to delete photo:', error);
              Alert.alert('Error', 'Failed to delete photo');
            }
          }
        },
      ]
    );
  };

  const handleSetThumbnail = (photoId: string) => {
    setThumbnailMutation.mutate(
      { plantId: id!, photoId },
      {
        onSuccess: () => {
          // React Query automatically updates the cache
        },
        onError: (error) => {
          console.error('Failed to set thumbnail:', error);
          Alert.alert('Error', 'Failed to set thumbnail photo');
        },
      }
    );
  };

  const handleDeleteSelectedPhotos = async () => {
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
              
              // Check if we're deleting the current thumbnail
              if (plant?.thumbnail_photo_id && selectedPhotos.has(plant.thumbnail_photo_id)) {
                wasThumbnailDeleted = true;
              }

              // Delete all selected photos
              await Promise.all(
                selectedPhotoIds.map(photoId => PhotoService.deletePhoto(photoId))
              );

              // If we deleted the thumbnail photo, we need to set a new one
              if (wasThumbnailDeleted && id) {
                // Get remaining photos
                const remainingPhotos = await PhotoService.getPhotosByPlantId(id);
                
                if (remainingPhotos.length > 0) {
                  // Sort photos by taken_at ascending to get the oldest first
                  const sortedPhotos = [...remainingPhotos].sort((a, b) => 
                    new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime()
                  );
                  const newThumbnail = sortedPhotos[0];
                  
                  // Set the oldest remaining photo as the new thumbnail
                  await PhotoService.setThumbnailPhoto(id, newThumbnail.id);
                } else {
                  // No photos left, clear the thumbnail
                  await PhotoService.clearThumbnailPhoto(id);
                }
              }

              // Reset multiselect mode - React Query mutations handle cache invalidation automatically
              setIsMultiSelectMode(false);
              setSelectedPhotos(new Set());
            } catch (error) {
              console.error('Failed to delete photos:', error);
              Alert.alert('Error', 'Failed to delete photos');
            }
          }
        },
      ]
    );
  };

  const handleDeletePlant = async () => {
    if (!plant || !id) return;

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
              // Delete the plant using React Query mutation
              await deletePlantMutation.mutateAsync(id);
              
              // Navigate back to the main plants screen
              router.back();
            } catch (error) {
              console.error('Failed to delete plant:', error);
              Alert.alert('Error', 'Failed to delete plant');
            }
          },
        },
      ]
    );
  };


  const handleDeleteCareEvent = async (eventId: string, eventType: string) => {
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
              await deleteEventMutation.mutateAsync({ id: eventId, plantId: id! });
            } catch (error) {
              console.error('Failed to delete event:', error);
              Alert.alert('Error', 'Failed to delete event');
            }
          },
        },
      ]
    );
  };

  const handlePhotoOptions = (photo: PlantPhoto) => {
    Alert.alert(
      'Photo Options',
      'Choose an action',
      [
        { text: 'Set as Thumbnail', onPress: () => handleSetThumbnail(photo.id) },
        { text: 'Delete Photo', onPress: () => handleDeletePhoto(photo.id), style: 'destructive' },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleDownloadPhoto = async (photo: PlantPhoto) => {
    try {
      const photoUrl = PhotoService.getImageUrl(photo, false); // Get full-size image
      const filename = `${plant?.name || plant?.type}_${new Date(photo.taken_at).toISOString().split('T')[0]}.jpg`;
      
      const result = await PhotoService.downloadPhotoToDevice(photoUrl, filename);
      
      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to download photo');
      }
    } catch (error) {
      console.error('Error downloading photo:', error);
      Alert.alert('Error', 'Failed to download photo');
    }
  };

  const formatDate = async (dateString: string) => {
    return await DateTimeService.formatDate(dateString);
  };

  const [formattedDates, setFormattedDates] = useState<{[key: string]: {date: string, timeAgo: string}}>({});

  useEffect(() => {
    const updateFormattedDates = async () => {
      const dateMap: {[key: string]: {date: string, timeAgo: string}} = {};
      
      // Format event dates
      for (const event of typedEvents) {
        const formattedDate = await DateTimeService.formatDate(event.date);
        const timeAgo = DateTimeService.formatTimeAgo(event.date);
        dateMap[event.id] = { date: formattedDate, timeAgo };
      }
      
      // Format photo dates
      for (const photo of typedPhotos) {
        const formattedDate = await DateTimeService.formatDate(photo.taken_at);
        const timeAgo = DateTimeService.formatTimeAgo(photo.taken_at);
        dateMap[photo.id] = { date: formattedDate, timeAgo };
      }
      
      setFormattedDates(dateMap);
    };

    updateFormattedDates();
  }, [typedEvents, typedPhotos]);


  const getPestSeverityColor = (severity: number) => {
    if (severity <= 3) return '#4CAF50';    // Green for low
    if (severity <= 6) return '#FF9800';    // Orange for medium
    return '#F44336';                       // Red for high
  };

  const getPestSeverityLabel = (severity: number) => {
    if (severity <= 3) return '(Minor)';
    if (severity <= 6) return '(Moderate)';
    return '(Severe)';
  };

  const formatEventTypeTitle = (eventType: string) => {
    return eventType
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const styles = createStyles(theme);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!plant) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <Text style={{ color: theme.colors.text }}>Plant not found</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Plant Info Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerLeft}>
              {thumbnailPhoto && (
                <TouchableOpacity onPress={handleThumbnailPress}>
                  <Image 
                    source={{ uri: PhotoService.getImageUrl(thumbnailPhoto, true) }} 
                    style={styles.thumbnailImage}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={200}
                  />
                </TouchableOpacity>
              )}
              <View style={[styles.headerContent, thumbnailPhoto && styles.headerContentWithThumbnail]}>
                <Text style={styles.plantName}>{plant.name || `${plant.type}`}</Text>
                <Text style={styles.plantType}>{plant.type}</Text>
                {plant.location && (
                  <Text style={styles.location}>📍 {plant.location}</Text>
                )}
              </View>
            </View>
            <View style={styles.headerButtons}>
              <TouchableOpacity 
                style={styles.editButton} 
                onPress={() => router.push(`/edit-plant?id=${id}`)}
              >
                <SquarePen size={16} color="#666" />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.headerDeleteButton} 
                onPress={handleDeletePlant}
              >
                <Trash2 size={16} color="#F44336" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Plant Tags */}
        <View style={styles.tagSection}>
          <TagsList
            plantId={id!}
            onAddTagPress={handleAddTag}
            refreshTrigger={tagRefreshTrigger}
          />
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={handleLogCare}>
            <Text style={styles.actionButtonText}>Log Event</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, uploadingPhoto && styles.actionButtonDisabled]} 
            onPress={handleAddPhoto}
            disabled={uploadingPhoto}
          >
            {uploadingPhoto ? (
              <View style={styles.buttonLoadingContainer}>
                <ActivityIndicator size="small" color={theme.colors.textOnPrimary} />
                <Text style={styles.actionButtonText}>Uploading...</Text>
              </View>
            ) : (
              <Text style={styles.actionButtonText}>📷 Add Photo</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Plant Notes */}
        {plant.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notesText}>{plant.notes}</Text>
          </View>
        )}

        {/* Photos */}
        {typedPhotos.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Photos ({typedPhotos.length})</Text>
              <View style={styles.multiSelectButtonsContainer}>
                {isMultiSelectMode && selectedPhotos.size > 0 && (
                  <TouchableOpacity 
                    style={[styles.multiSelectButton, styles.deleteButton]} 
                    onPress={() => handleDeleteSelectedPhotos()}
                  >
                    <Text style={styles.deleteButtonText}>
                      Delete ({selectedPhotos.size})
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity 
                  style={[
                    styles.multiSelectButton,
                    !isMultiSelectMode && styles.deletePhotosButton,
                    isMultiSelectMode && styles.cancelButton
                  ]} 
                  onPress={() => {
                    setIsMultiSelectMode(!isMultiSelectMode);
                    setSelectedPhotos(new Set());
                  }}
                >
                  <Text style={[
                    styles.multiSelectButtonText,
                    isMultiSelectMode && styles.cancelButtonText
                  ]}>
                    {isMultiSelectMode ? 'Cancel' : 'Delete Photos'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {typedPhotos.map((photo, index) => (
                <TouchableOpacity 
                  key={photo.id} 
                  style={styles.photoItem}
                  onPress={() => {
                    if (isMultiSelectMode) {
                      const newSelected = new Set(selectedPhotos);
                      if (newSelected.has(photo.id)) {
                        newSelected.delete(photo.id);
                      } else {
                        newSelected.add(photo.id);
                      }
                      setSelectedPhotos(newSelected);
                    } else {
                      handlePhotoPress(photo);
                    }
                  }}
                  onLongPress={() => !isMultiSelectMode && handlePhotoOptions(photo)}
                >
                  <Image 
                    source={{ uri: PhotoService.getImageUrl(photo, true) }} 
                    style={[
                      styles.photoImage,
                      plant?.thumbnail_photo_id === photo.id && styles.thumbnailPhotoImage,
                      selectedPhotos.has(photo.id) && styles.selectedPhotoImage
                    ]}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={200}
                  />
                  {isMultiSelectMode && (
                    <View style={styles.selectionOverlay}>
                      <View style={[
                        styles.selectionCheckbox,
                        selectedPhotos.has(photo.id) && styles.selectedCheckbox
                      ]}>
                        {selectedPhotos.has(photo.id) && (
                          <Text style={styles.checkmark}>✓</Text>
                        )}
                      </View>
                    </View>
                  )}
                  <Text style={styles.photoDate}>
                    {formattedDates[photo.id] ? `${formattedDates[photo.id].date} (${formattedDates[photo.id].timeAgo})` : 'Loading...'}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Event History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Event History ({typedEvents.length})</Text>
          {typedEvents.length === 0 ? (
            <Text style={styles.emptyCareText}>No events recorded yet</Text>
          ) : (
            typedEvents.slice(0, 10).map((event) => (
              <React.Fragment key={event.id}>
                <View style={styles.careEventItem}>
                <View style={styles.careEventHeader}>
                  <View style={styles.careEventInfo}>
                    <Text style={styles.careEventType}>
                      {formatEventTypeTitle(event.event_type)}
                    </Text>
                    <Text style={styles.careEventDate}>
                      {formattedDates[event.id] ? `${formattedDates[event.id].date} (${formattedDates[event.id].timeAgo})` : 'Loading...'}
                    </Text>
                  </View>
                  <View style={styles.careEventActions}>
                    <TouchableOpacity
                      style={styles.editCareButton}
                      onPress={() => router.push(`/edit-care-event?id=${event.id}`)}
                    >
                      <SquarePen size={16} color="#666" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteCareButton}
                      onPress={() => handleDeleteCareEvent(event.id, event.event_type)}
                    >
                      <Trash2 size={16} color="#F44336" />
                    </TouchableOpacity>
                  </View>
                </View>
                {event.notes && (
                  <Text style={styles.careEventNotes}>{event.notes}</Text>
                )}
                {event.fertilizer_concentration && (
                  <Text style={styles.fertilizerInfo}>
                    Strength: {event.fertilizer_concentration}
                  </Text>
                )}
                {event.pest_severity && (
                  <Text style={[styles.pestSeverityInfo, { color: getPestSeverityColor(event.pest_severity) }]}>
                    Pest Severity: {event.pest_severity}/10 {getPestSeverityLabel(event.pest_severity)}
                  </Text>
                )}
                {eventPhotos[event.id] && eventPhotos[event.id].length > 0 && (
                  <View style={styles.eventPhotosContainer}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {eventPhotos[event.id].map((photo) => (
                        <TouchableOpacity 
                          key={photo.id} 
                          style={styles.eventPhotoItem}
                          onPress={() => handlePhotoPress(photo)}
                        >
                          <Image 
                            source={{ uri: PhotoService.getImageUrl(photo, true) }} 
                            style={styles.eventPhotoImage}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                            transition={200}
                          />
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
              </React.Fragment>
            ))
          )}
        </View>
      </ScrollView>

      <ImageViewing
        images={allPhotos.map(photo => ({ uri: PhotoService.getImageUrl(photo, false) }))}
        imageIndex={Math.max(0, currentPhotoIndex)}
        visible={imageViewerVisible && allPhotos.length > 0 && currentPhotoIndex >= 0}
        onRequestClose={() => setImageViewerVisible(false)}
        swipeToCloseEnabled={false}
        HeaderComponent={({ imageIndex }) => {
          const currentPhoto = allPhotos[imageIndex];
          if (!currentPhoto) {
            return (
              <View style={styles.imageViewerHeader}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setImageViewerVisible(false)}
                >
                  <X size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            );
          }
          return (
            <View style={styles.imageViewerHeader}>
              <TouchableOpacity
                style={styles.downloadButton}
                onPress={() => handleDownloadPhoto(currentPhoto)}
              >
                <Download size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setImageViewerVisible(false)}
              >
                <X size={24} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          );
        }}
        FooterComponent={({ imageIndex }) => {
          const currentPhoto = allPhotos[imageIndex];
          if (!currentPhoto) {
            return (
              <View style={styles.imageViewerFooter}>
                <View style={styles.photoInfo}>
                  <Text style={styles.photoInfoText}>Loading...</Text>
                  {allPhotos.length > 1 && (
                    <Text style={styles.photoCounter}>
                      {imageIndex + 1} of {allPhotos.length}
                    </Text>
                  )}
                </View>
              </View>
            );
          }
          return (
            <View style={styles.imageViewerFooter}>
              <View style={styles.photoInfo}>
                <Text style={styles.photoInfoText}>
                  {formattedDates[currentPhoto.id] ? `${formattedDates[currentPhoto.id].date} (${formattedDates[currentPhoto.id].timeAgo})` : 'Loading...'}
                </Text>
                {allPhotos.length > 1 && (
                  <Text style={styles.photoCounter}>
                    {imageIndex + 1} of {allPhotos.length}
                  </Text>
                )}
              </View>
              
              <TouchableOpacity
                style={styles.thumbnailButton}
                onPress={() => {
                  handleSetThumbnail(currentPhoto.id);
                }}
              >
                <Text style={styles.thumbnailButtonText}>
                  {currentThumbnailId === currentPhoto.id ? '★ Thumbnail' : 'Set as Thumbnail'}
                </Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />

      <ImageViewing
        images={thumbnailPhoto ? [{ uri: PhotoService.getImageUrl(thumbnailPhoto, false) }] : []}
        imageIndex={0}
        visible={thumbnailViewerVisible}
        onRequestClose={() => setThumbnailViewerVisible(false)}
        swipeToCloseEnabled={true}
        doubleTapToZoomEnabled={true}
        presentationStyle="overFullScreen"
        HeaderComponent={() => (
          <View style={styles.thumbnailViewerHeader}>
            <TouchableOpacity
              style={styles.thumbnailCloseButton}
              onPress={() => setThumbnailViewerVisible(false)}
            >
              <X size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    backgroundColor: theme.colors.surface,
    padding: 20,
    marginBottom: 10,
  },
  plantName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
    color: theme.colors.text,
  },
  plantType: {
    fontSize: 18,
    color: theme.colors.textSecondary,
    marginBottom: 5,
  },
  location: {
    fontSize: 16,
    color: theme.colors.textTertiary,
    marginBottom: 10,
  },
  tagSection: {
    backgroundColor: theme.colors.surface,
    marginHorizontal: 10,
    marginTop: 0,
    marginBottom: 10,
    padding: 15,
    borderRadius: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    padding: 10,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: theme.colors.textOnPrimary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  buttonLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  section: {
    backgroundColor: theme.colors.surface,
    margin: 10,
    marginTop: 0,
    padding: 15,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: theme.colors.text,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  multiSelectButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  multiSelectButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: theme.colors.primary,
    borderRadius: 6,
  },
  deleteButton: {
    backgroundColor: '#DC3545',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deletePhotosButton: {
    backgroundColor: '#DC3545',
  },
  multiSelectButtonText: {
    color: theme.colors.textOnPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: '#999999',
  },
  cancelButtonText: {
    color: '#999999',
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  notesText: {
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.text,
  },
  photoItem: {
    marginRight: 15,
    width: 80,
    alignItems: 'center',
  },
  photoImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginBottom: 5,
  },
  thumbnailPhotoImage: {
    borderWidth: 3,
    borderColor: '#FFD700',
  },
  selectedPhotoImage: {
    borderWidth: 3,
    borderColor: theme.colors.primary,
    opacity: 0.8,
  },
  selectionOverlay: {
    position: 'absolute',
    top: 5,
    right: 5,
  },
  selectionCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: theme.colors.textOnPrimary,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedCheckbox: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  checkmark: {
    color: theme.colors.textOnPrimary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  deletePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(205, 1, 1, 1)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deletePhotoText: {
    color: theme.colors.textOnPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  photoDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 2,
    textAlign: 'center',
  },
  photoCaption: {
    fontSize: 14,
    color: theme.colors.text,
  },
  emptyCareText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  careEventItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  careEventHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  careEventType: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  careEventDate: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  careEventNotes: {
    fontSize: 14,
    color: theme.colors.text,
    marginBottom: 3,
  },
  fertilizerInfo: {
    fontSize: 12,
    color: theme.colors.textTertiary,
    fontStyle: 'italic',
  },
  pestSeverityInfo: {
    fontSize: 12,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  imageViewerHeader: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    zIndex: 1000,
  },
  downloadButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageViewerFooter: {
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  photoInfo: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  photoInfoText: {
    color: theme.colors.textOnPrimary,
    fontSize: 16,
    textAlign: 'center',
  },
  photoCounter: {
    color: theme.colors.textOnPrimary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 5,
    opacity: 0.8,
  },
  thumbnailBadge: {
    position: 'absolute',
    top: 5,
    left: 5,
    backgroundColor: '#FFD700',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailBadgeText: {
    color: theme.colors.textOnPrimary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  thumbnailButton: {
    backgroundColor: theme.colors.surface,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  thumbnailButtonText: {
    color: theme.colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  photoInfoCaption: {
    color: theme.colors.textOnPrimary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 5,
    fontStyle: 'italic',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerContent: {
    flex: 1,
  },
  headerContentWithThumbnail: {
    marginLeft: 15,
  },
  thumbnailImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: theme.colors.surface,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerDeleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  careEventInfo: {
    flex: 1,
  },
  editCareButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  careEventActions: {
    flexDirection: 'row',
    gap: 8,
  },
  deleteCareButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
  thumbnailViewerHeader: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1000,
  },
  thumbnailCloseButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventPhotosContainer: {
    marginTop: 8,
  },
  eventPhotoItem: {
    marginRight: 8,
  },
  eventPhotoImage: {
    width: 40,
    height: 40,
    borderRadius: 6,
  },
});
