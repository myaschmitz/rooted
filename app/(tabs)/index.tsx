import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Image, SectionList } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Settings } from 'lucide-react-native';
import { PlantService } from '../../services/PlantService';
import { PhotoService } from '../../services/PhotoService';
import { LocationService } from '../../services/LocationService';
import { Plant } from '../../types/Plant';
import { useTheme } from '../../contexts/ThemeContext';
import { createStyles } from '../../styles/MyPlantsStyles';

export default function HomeScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
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
      case 'excellent': return { text: 'Excellent', color: theme.colors.healthExcellent };
      case 'good': return { text: 'Good', color: theme.colors.healthGood };
      case 'okay': return { text: 'Okay', color: theme.colors.healthOkay };
      case 'poor': return { text: 'Poor', color: theme.colors.healthPoor };
      case 'concerning': return { text: 'Concerning', color: theme.colors.healthConcerning };
      case 'critical': return { text: 'Critical', color: theme.colors.healthCritical };
      default: return { text: 'Good', color: theme.colors.healthGood };
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
        <Text style={styles.loadingText}>Loading plants...</Text>
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
