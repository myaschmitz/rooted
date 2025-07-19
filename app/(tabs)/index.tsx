import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Image, SectionList } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Settings } from 'lucide-react-native';
import { PlantService } from '../../services/PlantService';
import { PhotoService } from '../../services/PhotoService';
import { LocationService } from '../../services/LocationService';
import { Plant } from '../../types/Plant';
import { useTheme } from '../../contexts/ThemeContext';

export default function HomeScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme.colors);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [plantsGrouped, setPlantsGrouped] = useState<{title: string, data: Plant[]}[]>([]);
  const [loading, setLoading] = useState(true);
  const [plantThumbnails, setPlantThumbnails] = useState<{[plantId: string]: string}>({});
  const [groupByLocation, setGroupByLocation] = useState(true);

  const loadPlants = useCallback(async () => {
    try {
      const allPlants = await PlantService.getAllPlants();
      setPlants(allPlants);
      
      // Load thumbnails for each plant
      const thumbnails: {[plantId: string]: string} = {};
      for (const plant of allPlants) {
        try {
          if (plant.thumbnail_photo_id) {
            // Use the designated thumbnail photo
            const thumbnailPhoto = await PhotoService.getThumbnailPhoto(plant.id);
            if (thumbnailPhoto) {
              thumbnails[plant.id] = thumbnailPhoto.file_path;
            }
          } else {
            // Fall back to first photo if no thumbnail is set
            const photos = await PhotoService.getPhotosByPlantId(plant.id);
            if (photos.length > 0) {
              thumbnails[plant.id] = photos[0].file_path;
            }
          }
        } catch (error) {
          console.error(`Failed to load photos for plant ${plant.id}:`, error);
        }
      }
      setPlantThumbnails(thumbnails);

      // Group plants by location if enabled
      if (groupByLocation) {
        const groupedPlants = await LocationService.getPlantsGroupedByLocation();
        const sections = Object.entries(groupedPlants).map(([location, plants]) => ({
          title: location,
          data: plants as Plant[]
        }));
        
        // Sort sections: "No Location" last, others alphabetically
        sections.sort((a, b) => {
          if (a.title === 'No Location') return 1;
          if (b.title === 'No Location') return -1;
          return a.title.localeCompare(b.title);
        });
        
        setPlantsGrouped(sections);
      } else {
        // Single section with all plants
        setPlantsGrouped([{ title: 'All Plants', data: allPlants }]);
      }
    } catch (error) {
      console.error('Failed to load plants:', error);
      Alert.alert('Error', 'Failed to load plants');
    } finally {
      setLoading(false);
    }
  }, [groupByLocation]);

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
            {!groupByLocation && item.location && (
              <Text style={styles.plantLocation}>📍 {item.location}</Text>
            )}
            <Text style={[styles.healthStatus, { color: healthDisplay.color }]}>
              Health: {healthDisplay.text}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: { section: { title: string, data: Plant[] } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{section.title}</Text>
      <Text style={styles.sectionCount}>
        {section.data.length} plant{section.data.length !== 1 ? 's' : ''}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading plants...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with toggle button */}
      <View style={styles.header}>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={styles.toggleButton}
            onPress={() => setGroupByLocation(!groupByLocation)}
          >
            <Text style={styles.toggleButtonText}>
              {groupByLocation ? '📍' : '📋'}
            </Text>
          </TouchableOpacity>
        </View>
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
          <SectionList
            sections={plantsGrouped}
            renderItem={renderPlantItem}
            renderSectionHeader={groupByLocation ? renderSectionHeader : undefined}
            keyExtractor={(item) => item.id}
            style={styles.list}
            stickySectionHeadersEnabled={false}
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

const createStyles = (theme: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: theme.surface,
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  list: {
    flex: 1,
    padding: 16,
  },
  plantCard: {
    backgroundColor: theme.surface,
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
    color: theme.text,
  },
  emptySubtext: {
    fontSize: 16,
    color: theme.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
  },
  addButton: {
    backgroundColor: theme.primary,
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
  sectionHeader: {
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  sectionCount: {
    fontSize: 14,
    color: '#666',
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#f0f0f0',
  },
  toggleButtonText: {
    fontSize: 18,
  },
});
