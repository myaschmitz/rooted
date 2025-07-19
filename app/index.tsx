import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Image } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Settings } from 'lucide-react-native';
import { PlantService } from '../services/PlantService';
import { PhotoService } from '../services/PhotoService';
import { Plant } from '../types/Plant';

export default function HomeScreen() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);
  const [plantThumbnails, setPlantThumbnails] = useState<{[plantId: string]: string}>({});

  const loadPlants = useCallback(async () => {
    try {
      const allPlants = await PlantService.getAllPlants();
      setPlants(allPlants);
      
      // Load thumbnails for each plant
      const thumbnails: {[plantId: string]: string} = {};
      for (const plant of allPlants) {
        try {
          const photos = await PhotoService.getPhotosByPlantId(plant.id);
          if (photos.length > 0) {
            // Use the first photo as thumbnail for now
            thumbnails[plant.id] = photos[0].file_path;
          }
        } catch (error) {
          console.error(`Failed to load photos for plant ${plant.id}:`, error);
        }
      }
      setPlantThumbnails(thumbnails);
    } catch (error) {
      console.error('Failed to load plants:', error);
      Alert.alert('Error', 'Failed to load plants');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadPlants();
    }, [loadPlants])
  );

  useEffect(() => {
    loadPlants();
  }, []);

  const getHealthStatusDisplay = (status?: string) => {
    switch (status) {
      case 'excellent': return { text: 'Excellent', color: '#2E7D32' };
      case 'good': return { text: 'Good', color: '#4CAF50' };
      case 'okay': return { text: 'Okay', color: '#FF9800' };
      case 'poor': return { text: 'Poor', color: '#FF5722' };
      case 'concerning': return { text: 'Concerning', color: '#F44336' };
      case 'critical': return { text: 'Critical', color: '#B71C1C' };
      default: return { text: 'Good', color: '#4CAF50' };
    }
  };

  const renderPlantItem = ({ item }: { item: Plant }) => {
    const healthDisplay = getHealthStatusDisplay(item.health_status);
    const thumbnail = plantThumbnails[item.id];
    
    return (
      <TouchableOpacity
        style={styles.plantCard}
        onPress={() => router.push(`/plant/${item.id}`)}
      >
        <View style={styles.plantCardContent}>
          {thumbnail && (
            <Image 
              source={{ uri: thumbnail }} 
              style={styles.plantThumbnail}
              resizeMode="cover"
            />
          )}
          <View style={styles.plantInfo}>
            <Text style={styles.plantName}>{item.name || `Unnamed ${item.type}`}</Text>
            <Text style={styles.plantType}>{item.type}</Text>
            {item.location && <Text style={styles.plantLocation}>📍 {item.location}</Text>}
            <Text style={[styles.healthStatus, { color: healthDisplay.color }]}>
              Health: {healthDisplay.text}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading plants...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with settings button */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Plants</Text>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => router.push('/settings')}
        >
          <Settings size={24} color="#666" />
        </TouchableOpacity>
      </View>

      {plants.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No plants yet!</Text>
          <Text style={styles.emptySubtext}>Add your first plant to get started</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.navigate('/add-plant')}
          >
            <Text style={styles.addButtonText}>Add Plant</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <FlatList
            data={plants}
            renderItem={renderPlantItem}
            keyExtractor={(item) => item.id}
            style={styles.list}
          />
          <TouchableOpacity
            style={styles.fab}
            onPress={() => router.navigate('/add-plant')}
          >
            <Text style={styles.fabText}>+</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  settingsButton: {
    padding: 8,
  },
  list: {
    flex: 1,
    padding: 16,
  },
  plantCard: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  plantCardContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  plantThumbnail: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#f0f0f0',
  },
  plantInfo: {
    flex: 1,
  },
  plantName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  plantType: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  plantLocation: {
    fontSize: 12,
    color: '#888',
    marginBottom: 4,
  },
  healthStatus: {
    fontSize: 12,
    color: '#4CAF50',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  emptySubtext: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  fabText: {
    fontSize: 24,
    color: 'white',
    fontWeight: 'bold',
  },
});
