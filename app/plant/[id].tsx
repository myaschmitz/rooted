import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Plant, CareEvent, PlantPhoto } from '../../types/Plant';
import { PlantService } from '../../services/PlantService';
import { CareEventService } from '../../services/CareEventService';
import { PhotoService } from '../../services/PhotoService';

export default function PlantDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [plant, setPlant] = useState<Plant | null>(null);
  const [careEvents, setCareEvents] = useState<CareEvent[]>([]);
  const [photos, setPhotos] = useState<PlantPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (id) {
      loadPlantData();
    }
  }, [id]);

  const loadPlantData = async () => {
    try {
      if (!id) return;
      
      const [plantData, eventsData, photosData] = await Promise.all([
        PlantService.getPlantById(id),
        CareEventService.getCareEventsByPlantId(id),
        PhotoService.getPhotosByPlantId(id),
      ]);

      setPlant(plantData);
      setCareEvents(eventsData);
      setPhotos(photosData);
    } catch (error) {
      console.error('Failed to load plant data:', error);
      Alert.alert('Error', 'Failed to load plant data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPlantData();
  };

  const handleLogCare = () => {
    router.push(`/log-care?plantId=${id}`);
  };

  const handleAddPhoto = async () => {
    try {
      await PhotoService.pickAndSavePhoto(id!, 'Plant photo');
      loadPlantData(); // Refresh to show new photo
    } catch (error) {
      Alert.alert('Error', 'Failed to add photo');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getHealthStatusColor = (status?: string) => {
    switch (status) {
      case 'good': return '#4CAF50';
      case 'okay': return '#FF9800';
      case 'concerning': return '#F44336';
      default: return '#4CAF50';
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading plant details...</Text>
      </View>
    );
  }

  if (!plant) {
    return (
      <View style={styles.container}>
        <Text>Plant not found</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Plant Info Header */}
      <View style={styles.header}>
        <Text style={styles.plantName}>{plant.name || `Unnamed ${plant.type}`}</Text>
        <Text style={styles.plantType}>{plant.type}</Text>
        {plant.location && (
          <Text style={styles.location}>📍 {plant.location}</Text>
        )}
        <View style={styles.healthStatus}>
          <Text style={[styles.healthText, { color: getHealthStatusColor(plant.health_status) }]}>
            Health: {plant.health_status || 'Good'}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.actionButton} onPress={handleLogCare}>
          <Text style={styles.actionButtonText}>Log Care Event</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton} onPress={handleAddPhoto}>
          <Text style={styles.actionButtonText}>Add Photo</Text>
        </TouchableOpacity>
      </View>

      {/* Plant Notes */}
      {plant.notes && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          <Text style={styles.notesText}>{plant.notes}</Text>
        </View>
      )}

      {/* Recent Photos */}
      {photos.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Photos ({photos.length})</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {photos.slice(0, 5).map((photo, index) => (
              <View key={photo.id} style={styles.photoItem}>
                <Text style={styles.photoDate}>{formatDate(photo.taken_at)}</Text>
                {photo.caption && (
                  <Text style={styles.photoCaption}>{photo.caption}</Text>
                )}
              </View>
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
            <View key={event.id} style={styles.careEventItem}>
              <View style={styles.careEventHeader}>
                <Text style={styles.careEventType}>
                  {event.event_type.charAt(0).toUpperCase() + event.event_type.slice(1)}
                </Text>
                <Text style={styles.careEventDate}>{formatDate(event.date)}</Text>
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
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    backgroundColor: 'white',
    padding: 20,
    marginBottom: 10,
  },
  plantName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  plantType: {
    fontSize: 18,
    color: '#666',
    marginBottom: 5,
  },
  location: {
    fontSize: 16,
    color: '#888',
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
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  actionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  section: {
    backgroundColor: 'white',
    margin: 10,
    marginTop: 0,
    padding: 15,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  notesText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  photoItem: {
    marginRight: 15,
    width: 120,
  },
  photoDate: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  photoCaption: {
    fontSize: 14,
    color: '#333',
  },
  emptyCareText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
  },
  careEventItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
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
    color: '#4CAF50',
  },
  careEventDate: {
    fontSize: 14,
    color: '#666',
  },
  careEventNotes: {
    fontSize: 14,
    color: '#333',
    marginBottom: 3,
  },
  fertilizerInfo: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
  },
});
