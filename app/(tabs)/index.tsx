import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Image, SectionList, ActivityIndicator, RefreshControl } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Settings, Pin, PinOff } from 'lucide-react-native';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { PlantService } from '../../services/PlantService';
import { PhotoService } from '../../services/PhotoService';
import { LocationService } from '../../services/LocationService';
import { EventService } from '../../services/EventService';
import { Plant } from '../../types/Plant';
import { useTheme } from '../../contexts/ThemeContext';
import { createStyles } from '../../styles/MyPlantsStyles';
import { useRealtimeUpdates } from '../../hooks/useRealtimeUpdates';
import { PlantThumbnail } from '../../components/PlantThumbnail';

dayjs.extend(relativeTime);

export default function HomeScreen() {
  const { theme } = useTheme();
  const styles = createStyles(theme);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [plantsGrouped, setPlantsGrouped] = useState<{title: string, data: Plant[]}[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [plantThumbnails, setPlantThumbnails] = useState<{[plantId: string]: string}>({});
  const [plantWateringData, setPlantWateringData] = useState<{[plantId: string]: string | null}>({});

  const loadPlants = useCallback(async () => {
    try {
      const allPlants = await PlantService.getAllPlants();
      setPlants(allPlants);
      
      // Load thumbnails for each plant in parallel
      const thumbnails: {[plantId: string]: string} = {};
      const thumbnailPromises = allPlants.map(async (plant) => {
        try {
          if (plant.thumbnail_photo_id) {
            // Use the designated thumbnail photo
            const thumbnailPhoto = await PhotoService.getThumbnailPhoto(plant.id);
            if (thumbnailPhoto) {
              return { plantId: plant.id, path: PhotoService.getImageUrl(thumbnailPhoto, true) };
            }
          } else {
            // Fall back to first photo if no thumbnail is set
            const photos = await PhotoService.getPhotosByPlantId(plant.id);
            if (photos.length > 0) {
              return { plantId: plant.id, path: PhotoService.getImageUrl(photos[0], true) };
            }
          }
        } catch (error) {
          console.error(`Failed to load photos for plant ${plant.id}:`, error);
        }
        return null;
      });

      const thumbnailResults = await Promise.allSettled(thumbnailPromises);
      thumbnailResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          thumbnails[result.value.plantId] = result.value.path;
        }
      });
      setPlantThumbnails(thumbnails);

      // Load last watering data for each plant in parallel (includes both water and fertigate)
      const wateringData: {[plantId: string]: string | null} = {};
      const wateringPromises = allPlants.map(async (plant) => {
        try {
          // Get both water and fertigate events (fertigate is water + fertilizer)
          const [lastWatering, lastFertigate] = await Promise.all([
            EventService.getLastEventByType(plant.id, 'water'),
            EventService.getLastEventByType(plant.id, 'fertigate')
          ]);

          // Find the most recent between water and fertigate
          let mostRecentWatering = null;
          if (lastWatering && lastFertigate) {
            mostRecentWatering = dayjs(lastWatering.date).isAfter(dayjs(lastFertigate.date)) 
              ? lastWatering 
              : lastFertigate;
          } else if (lastWatering) {
            mostRecentWatering = lastWatering;
          } else if (lastFertigate) {
            mostRecentWatering = lastFertigate;
          }

          return { plantId: plant.id, lastWatered: mostRecentWatering?.date || null };
        } catch (error) {
          console.error(`Failed to load watering data for plant ${plant.id}:`, error);
          return { plantId: plant.id, lastWatered: null };
        }
      });

      const wateringResults = await Promise.allSettled(wateringPromises);
      wateringResults.forEach((result) => {
        if (result.status === 'fulfilled' && result.value) {
          wateringData[result.value.plantId] = result.value.lastWatered;
        }
      });
      setPlantWateringData(wateringData);

      // Separate pinned and non-pinned plants
      const pinnedPlants = allPlants.filter(plant => plant.pinned);
      const unpinnedPlants = allPlants.filter(plant => !plant.pinned);
      
      // Create sections array
      const sections: {title: string, data: Plant[]}[] = [];
      
      // Add Pinned Plants section if there are any pinned plants
      if (pinnedPlants.length > 0) {
        const sortedPinnedPlants = pinnedPlants.sort((a, b) => 
          (a.name || a.type).localeCompare(b.name || b.type)
        );
        sections.push({
          title: 'Pinned Plants',
          data: sortedPinnedPlants
        });
      }
      
      // Group unpinned plants by location
      const groupedPlants = await LocationService.getPlantsGroupedByLocation();
      const locationSections = Object.entries(groupedPlants).map(([location, plants]) => {
        // Filter out pinned plants from location sections
        const unpinnedLocationPlants = (plants as Plant[]).filter(plant => !plant.pinned);
        
        // Sort unpinned plants by name
        const sortedPlants = unpinnedLocationPlants.sort((a, b) => 
          (a.name || a.type).localeCompare(b.name || b.type)
        );
        
        return {
          title: location,
          data: sortedPlants
        };
      }).filter(section => section.data.length > 0); // Only include sections with plants
      
      // Sort location sections: "No Location" last, others alphabetically
      locationSections.sort((a, b) => {
        if (a.title === 'No Location') return 1;
        if (b.title === 'No Location') return -1;
        return a.title.localeCompare(b.title);
      });
      
      // Add location sections after pinned section
      sections.push(...locationSections);
      
      setPlantsGrouped(sections);
    } catch (error) {
      console.error('Failed to load plants:', error);
      Alert.alert('Error', 'Failed to load plants');
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadPlants();
    } finally {
      setRefreshing(false);
    }
  }, [loadPlants]);

  useFocusEffect(
    useCallback(() => {
      loadPlants();
    }, [loadPlants])
  );

  useEffect(() => {
    loadPlants();
  }, []);

  // Set up real-time subscriptions for automatic updates
  useRealtimeUpdates({
    onPlantsUpdate: loadPlants,
    onPhotosUpdate: loadPlants, // Photos affect thumbnails, so reload plants
  });

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

  const formatTimeSinceWatering = (lastWateredDate?: string | null) => {
    if (!lastWateredDate) {
      return { timeAgo: 'Never watered', date: null };
    }

    const wateredDate = dayjs(lastWateredDate);
    const timeAgo = wateredDate.fromNow();
    const formattedDate = wateredDate.format('MMM D, YYYY');
    
    return { timeAgo, date: formattedDate };
  };

  const getWateringStatusColor = (lastWateredDate?: string | null) => {
    if (!lastWateredDate) {
      return theme.colors.textSecondary; // Grey for never watered
    }

    const now = dayjs();
    const wateredDate = dayjs(lastWateredDate);
    const daysSince = now.diff(wateredDate, 'day');

    if (daysSince <= 7) {
      return '#4CAF50'; // Green - recently watered
    } else if (daysSince <= 14) {
      return '#FFC107'; // Yellow - should water soon
    } else if (daysSince <= 17) {
      return '#FF9800'; // Orange - getting concerning
    } else {
      return '#F44336'; // Red - urgent watering needed
    }
  };

  const handleTogglePin = useCallback(async (plantId: string, event: any) => {
    event.stopPropagation();
    try {
      await PlantService.togglePinPlant(plantId);
      await loadPlants();
    } catch (error) {
      console.error('Failed to toggle pin:', error);
      Alert.alert('Error', 'Failed to update pin status');
    }
  }, [loadPlants]);

  const renderPlantItem = ({ item }: { item: Plant }) => {
    const thumbnail = plantThumbnails[item.id];
    const lastWatered = plantWateringData[item.id];
    const wateringDisplay = formatTimeSinceWatering(lastWatered);
    const wateringColor = getWateringStatusColor(lastWatered);
    
    return (
      <TouchableOpacity
        style={styles.plantCard}
        onPress={() => router.push(`/plant/${item.id}`)}
      >
        <View style={styles.plantCardContent}>
          <View style={styles.plantThumbnail}>
            <PlantThumbnail imageUri={thumbnail} size={65} />
          </View>
          <View style={styles.plantInfo}>
            <Text style={styles.plantName}>{item.name || `${item.type}`}</Text>
            <Text style={styles.plantType}>{item.type}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
              <Text style={[styles.healthStatus, { color: wateringColor }]}>
                Last watered: {wateringDisplay.timeAgo}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.pinButton}
            onPress={(event) => handleTogglePin(item.id, event)}
          >
            {item.pinned ? (
              <PinOff size={16} color={theme.colors.primary} />
            ) : (
              <Pin size={16} color={theme.colors.textSecondary} />
            )}
          </TouchableOpacity>
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>

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
            renderSectionHeader={renderSectionHeader}
            keyExtractor={(item) => item.id}
            style={styles.list}
            stickySectionHeadersEnabled={true}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.colors.primary}
                colors={[theme.colors.primary]}
              />
            }
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
