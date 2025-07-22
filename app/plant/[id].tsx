import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Image,
  Modal,
  Dimensions,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { SquarePen, Trash2 } from 'lucide-react-native';
import { Plant, CareEvent, PlantPhoto } from '../../types/Plant';
import { PlantService } from '../../services/PlantService';
import { CareEventService } from '../../services/CareEventService';
import { PhotoService } from '../../services/PhotoService';
import { DateTimeService } from '../../services/DateTimeService';
import { useTheme } from '../../contexts/ThemeContext';
import { useRealtimeUpdates } from '../../hooks/useRealtimeUpdates';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function PlantDetailScreen() {
  const { theme } = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [plant, setPlant] = useState<Plant | null>(null);
  const [careEvents, setCareEvents] = useState<CareEvent[]>([]);
  const [photos, setPhotos] = useState<PlantPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fullScreenPhoto, setFullScreenPhoto] = useState<PlantPhoto | null>(null);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const loadPlantData = useCallback(async () => {
    if (!id) return;
    
    try {
      const [plantData, eventsData, photosData] = await Promise.all([
        PlantService.getPlantById(id),
        CareEventService.getCareEventsByPlantId(id),
        PhotoService.getPhotosByPlantId(id),
      ]);

      // If there are photos but no thumbnail is set, auto-set the oldest photo as thumbnail
      if (photosData.length > 0 && !plantData?.thumbnail_photo_id) {
        // Sort photos by taken_at ascending to get the oldest first
        const sortedPhotos = [...photosData].sort((a, b) => 
          new Date(a.taken_at).getTime() - new Date(b.taken_at).getTime()
        );
        const oldestPhoto = sortedPhotos[0];
        
        // Set the oldest photo as thumbnail
        await PhotoService.setThumbnailPhoto(id, oldestPhoto.id);
        
        // Update the plant data to reflect the new thumbnail
        const updatedPlant = await PlantService.getPlantById(id);
        setPlant(updatedPlant);
      } else {
        setPlant(plantData);
      }

      setCareEvents(eventsData);
      setPhotos(photosData);
    } catch (error) {
      console.error('Failed to load plant data:', error);
      Alert.alert('Error', 'Failed to load plant details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadPlantData();
    }, [loadPlantData])
  );

  useEffect(() => {
    if (id) {
      loadPlantData();
    }
  }, [id]);

  // Set up real-time subscriptions for automatic updates
  useRealtimeUpdates({
    onPlantsUpdate: loadPlantData,
    onCareEventsUpdate: loadPlantData,
    onPhotosUpdate: loadPlantData,
  });

  const onRefresh = () => {
    setRefreshing(true);
    loadPlantData();
  };

  const handleLogCare = () => {
    router.push(`/log-care?plantId=${id}`);
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
    try {
      const photo = await PhotoService.takePhoto();
      if (photo && id) {
        await PhotoService.savePhoto(id, photo.uri, 'Plant photo');
        loadPlantData(); // Refresh to show new photo
      }
    } catch (error) {
      console.error('Failed to take photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const handlePickPhoto = async () => {
    try {
      const photo = await PhotoService.pickPhoto();
      if (photo && id) {
        await PhotoService.savePhoto(id, photo.uri, 'Plant photo');
        loadPlantData(); // Refresh to show new photo
      }
    } catch (error) {
      console.error('Failed to pick photo:', error);
      Alert.alert('Error', 'Failed to pick photo');
    }
  };

  const handlePhotoPress = (photo: PlantPhoto) => {
    const photoIndex = photos.findIndex(p => p.id === photo.id);
    setCurrentPhotoIndex(photoIndex);
    setFullScreenPhoto(photo);
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
              
              await PhotoService.deletePhoto(photoId);
              
              // If we deleted the thumbnail photo, we need to set a new one
              if (isCurrentThumbnail && id) {
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
              
              loadPlantData(); // Refresh to remove deleted photo and update thumbnail
            } catch (error) {
              console.error('Failed to delete photo:', error);
              Alert.alert('Error', 'Failed to delete photo');
            }
          }
        },
      ]
    );
  };

  const handleSetThumbnail = async (photoId: string) => {
    try {
      await PhotoService.setThumbnailPhoto(id!, photoId);
      loadPlantData(); // Refresh to update thumbnail
      Alert.alert('Success', 'Thumbnail photo updated');
    } catch (error) {
      console.error('Failed to set thumbnail:', error);
      Alert.alert('Error', 'Failed to set thumbnail photo');
    }
  };

  const handleDeletePlant = async () => {
    if (!plant || !id) return;

    Alert.alert(
      'Delete Plant',
      `Are you sure you want to delete "${plant.name || `${plant.type}`}"? This will also delete all care events and photos associated with this plant. This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // Delete the plant (this should also cascade delete care events and photos via foreign key constraints)
              const success = await PlantService.deletePlant(id);
              
              if (success) {
                Alert.alert('Success', 'Plant deleted successfully', [
                  {
                    text: 'OK',
                    onPress: () => {
                      // Navigate back to the main plants screen
                      router.back();
                    },
                  },
                ]);
              } else {
                Alert.alert('Error', 'Failed to delete plant');
              }
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
      'Delete Care Event',
      `Are you sure you want to delete this ${eventType} event? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const success = await CareEventService.deleteCareEvent(eventId);
              
              if (success) {
                loadPlantData(); // Refresh to remove deleted care event
                Alert.alert('Success', 'Care event deleted successfully');
              } else {
                Alert.alert('Error', 'Failed to delete care event');
              }
            } catch (error) {
              console.error('Failed to delete care event:', error);
              Alert.alert('Error', 'Failed to delete care event');
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

  const formatDate = async (dateString: string) => {
    return await DateTimeService.formatDate(dateString);
  };

  const [formattedDates, setFormattedDates] = useState<{[key: string]: string}>({});

  const updateFormattedDates = useCallback(async () => {
    const dateMap: {[key: string]: string} = {};
    
    // Format care event dates
    for (const event of careEvents) {
      dateMap[event.id] = await DateTimeService.formatDate(event.date);
    }
    
    // Format photo dates
    for (const photo of photos) {
      dateMap[photo.id] = await DateTimeService.formatDate(photo.taken_at);
    }
    
    setFormattedDates(dateMap);
  }, [careEvents, photos]);

  useEffect(() => {
    updateFormattedDates();
  }, [updateFormattedDates]);

  const getHealthStatusColor = (status?: string) => {
    switch (status) {
      case 'excellent': return '#2E7D32';  // Dark green
      case 'good': return '#4CAF50';       // Green
      case 'okay': return '#FF9800';       // Orange
      case 'poor': return '#F57C00';       // Dark orange
      case 'concerning': return '#F44336'; // Red
      case 'critical': return '#B71C1C';   // Dark red
      default: return '#8d8d8dff';           // Default to green
    }
  };

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
            <View style={styles.headerContent}>
              <Text style={styles.plantName}>{plant.name || `${plant.type}`}</Text>
              <Text style={styles.plantType}>{plant.type}</Text>
              {plant.location && (
                <Text style={styles.location}>📍 {plant.location}</Text>
              )}
              <View style={styles.healthStatus}>
                <Text style={[styles.healthText, { color: getHealthStatusColor(plant.health_status) }]}>
                  Health: {plant.health_status ? plant.health_status.charAt(0).toUpperCase() + plant.health_status.slice(1) : 'Good'}
                </Text>
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
                style={styles.deleteButton} 
                onPress={handleDeletePlant}
              >
                <Trash2 size={16} color="#F44336" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={handleLogCare}>
            <Text style={styles.actionButtonText}>Log Care Event</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleAddPhoto}>
            <Text style={styles.actionButtonText}>📷 Add Photo</Text>
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
        {photos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos ({photos.length})</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {photos.slice(0, 5).map((photo, index) => (
                <TouchableOpacity 
                  key={photo.id} 
                  style={styles.photoItem}
                  onPress={() => handlePhotoPress(photo)}
                  onLongPress={() => handlePhotoOptions(photo)}
                >
                  <Image 
                    source={{ uri: photo.file_path }} 
                    style={styles.photoImage}
                    resizeMode="cover"
                  />
                  {plant?.thumbnail_photo_id === photo.id && (
                    <View style={styles.thumbnailBadge}>
                      <Text style={styles.thumbnailBadgeText}>★</Text>
                    </View>
                  )}
                  <TouchableOpacity 
                    style={styles.deletePhotoButton}
                    onPress={() => handleDeletePhoto(photo.id)}
                  >
                    <Text style={styles.deletePhotoText}>×</Text>
                  </TouchableOpacity>
                  <Text style={styles.photoDate}>{formattedDates[photo.id] || 'Loading...'}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Care History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Care History ({careEvents.length})</Text>
          {careEvents.length === 0 ? (
            <Text style={styles.emptyCareText}>No care events recorded yet</Text>
          ) : (
            careEvents.slice(0, 10).map((event) => (
              <React.Fragment key={event.id}>
                <View style={styles.careEventItem}>
                <View style={styles.careEventHeader}>
                  <View style={styles.careEventInfo}>
                    <Text style={styles.careEventType}>
                      {event.event_type === 'pest_spotted' ? 'Pest Spotted' :
                       event.event_type === 'insecticide_spray' ? 'Insecticide Spray' :
                       event.event_type.charAt(0).toUpperCase() + event.event_type.slice(1)}
                    </Text>
                    <Text style={styles.careEventDate}>{formattedDates[event.id] || 'Loading...'}</Text>
                    {event.health_status && (
                      <Text style={[styles.careEventHealth, { color: getHealthStatusColor(event.health_status) }]}>
                        Health: {event.health_status.charAt(0).toUpperCase() + event.health_status.slice(1)}
                      </Text>
                    )}
                  </View>
                  <View style={styles.careEventActions}>
                    <TouchableOpacity
                      style={styles.editCareButton}
                      onPress={() => router.push(`/edit-care-event?id=${event.id}`)}
                    >
                      <SquarePen size={12} color="#666" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteCareButton}
                      onPress={() => handleDeleteCareEvent(event.id, event.event_type)}
                    >
                      <Trash2 size={12} color="#F44336" />
                    </TouchableOpacity>
                  </View>
                </View>
                {event.notes && (
                  <Text style={styles.careEventNotes}>{event.notes}</Text>
                )}
                {event.fertilizer_concentration && (
                  <Text style={styles.fertilizerInfo}>
                    Concentration: {event.fertilizer_concentration}
                    {event.fertilizer_amount && ` • Amount: ${event.fertilizer_amount}`}
                  </Text>
                )}
                {event.pest_severity && (
                  <Text style={[styles.pestSeverityInfo, { color: getPestSeverityColor(event.pest_severity) }]}>
                    Pest Severity: {event.pest_severity}/10 {getPestSeverityLabel(event.pest_severity)}
                  </Text>
                )}
              </View>
              </React.Fragment>
            ))
          )}
        </View>
      </ScrollView>

      <Modal
        visible={!!fullScreenPhoto}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setFullScreenPhoto(null)}
      >
        <View style={styles.modalContainer}>
          {fullScreenPhoto && photos.length > 0 && (
            <>
              <FlatList
                data={photos}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                initialScrollIndex={currentPhotoIndex}
                getItemLayout={(data, index) => ({
                  length: screenWidth,
                  offset: screenWidth * index,
                  index,
                })}
                onMomentumScrollEnd={(event) => {
                  const newIndex = Math.round(event.nativeEvent.contentOffset.x / screenWidth);
                  setCurrentPhotoIndex(newIndex);
                  setFullScreenPhoto(photos[newIndex]);
                }}
                renderItem={({ item }) => (
                  <View style={styles.photoSlide}>
                    <Image
                      source={{ uri: item.file_path }}
                      style={styles.fullScreenImage}
                      resizeMode="contain"
                    />
                  </View>
                )}
                keyExtractor={(item) => item.id}
              />
              
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setFullScreenPhoto(null)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
              
              <View style={styles.photoInfo}>
                <Text style={styles.photoInfoText}>
                  {formattedDates[fullScreenPhoto.id] || 'Loading...'}
                </Text>
                {photos.length > 1 && (
                  <Text style={styles.photoCounter}>
                    {currentPhotoIndex + 1} of {photos.length}
                  </Text>
                )}
              </View>
              
              <TouchableOpacity
                style={styles.thumbnailButton}
                onPress={() => {
                  handleSetThumbnail(fullScreenPhoto.id);
                  setFullScreenPhoto(null);
                }}
              >
                <Text style={styles.thumbnailButtonText}>
                  {plant?.thumbnail_photo_id === fullScreenPhoto.id ? '★ Thumbnail' : 'Set as Thumbnail'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </Modal>
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
  healthStatus: {
    marginTop: 5,
  },
  healthText: {
    fontSize: 16,
    fontWeight: '600',
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
  notesText: {
    fontSize: 16,
    lineHeight: 24,
    color: theme.colors.text,
  },
  photoItem: {
    marginRight: 15,
    width: 120,
    alignItems: 'center',
  },
  photoImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    marginBottom: 5,
  },
  deletePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
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
  },
  photoDate: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginBottom: 2,
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
  careEventHealth: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
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
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.modalBackground,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackdrop: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: screenWidth,
    height: screenHeight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: screenWidth - 40,
    height: screenHeight - 200,
  },
  modalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  photoInfo: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 15,
    borderRadius: 8,
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
  photoSlide: {
    width: screenWidth,
    height: screenHeight,
    justifyContent: 'center',
    alignItems: 'center',
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
    position: 'absolute',
    bottom: 120,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
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
  headerContent: {
    flex: 1,
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
  deleteButton: {
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
});
