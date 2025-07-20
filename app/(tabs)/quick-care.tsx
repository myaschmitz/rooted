import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, SectionList, TouchableOpacity, Alert, Image, Modal, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Check, Filter, Calendar, Droplets, Scissors, Bug, Sprout } from 'lucide-react-native';
import { PlantService } from '../../services/PlantService';
import { PhotoService } from '../../services/PhotoService';
import { LocationService } from '../../services/LocationService';
import { CareEventService } from '../../services/CareEventService';
import { Plant } from '../../types/Plant';
import { useTheme } from '../../contexts/ThemeContext';
import { useGlobalStyles, ButtonStyles, InputStyles } from '../../styles';
import { useRealtimeUpdates } from '../../hooks/useRealtimeUpdates';


export default function QuickCareScreen() {
  const { theme } = useTheme();
  const globalStyles = useGlobalStyles();
  const styles = createStyles(theme);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [plantsGrouped, setPlantsGrouped] = useState<{title: string, data: Plant[]}[]>([]);
  const [selectedPlants, setSelectedPlants] = useState<Set<string>>(new Set());
  const [plantThumbnails, setPlantThumbnails] = useState<{[plantId: string]: string}>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCareTypeModal, setShowCareTypeModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>('All');
  const [locations, setLocations] = useState<string[]>([]);

  const careTypes: Array<{
    type: 'water' | 'fertilize' | 'prune' | 'pest_spotted' | 'insecticide_spray';
    label: string;
    icon: any;
    color: string;
  }> = [
    { type: 'water', label: 'Watered', icon: Droplets, color: '#2196F3' },
    { type: 'fertilize', label: 'Fertilized', icon: Calendar, color: '#4CAF50' },
    { type: 'prune', label: 'Pruned', icon: Scissors, color: '#FF9800' },
    { type: 'pest_spotted', label: 'Pest Spotted', icon: Bug, color: '#F44336' },
    { type: 'insecticide_spray', label: 'Insecticide Spray', icon: Sprout, color: '#9C27B0' },
  ];

  const loadPlants = useCallback(async () => {
    try {
      const allPlants = await PlantService.getAllPlants();
      setPlants(allPlants);
      
      // Get unique locations
      const uniqueLocations = [...new Set(allPlants
        .map(plant => plant.location)
        .filter(location => location && location.trim() !== '')
      )].sort();
      setLocations(['All', ...uniqueLocations]);
      
      // Load thumbnails for each plant
      const thumbnails: {[plantId: string]: string} = {};
      for (const plant of allPlants) {
        try {
          if (plant.thumbnail_photo_id) {
            const thumbnailPhoto = await PhotoService.getThumbnailPhoto(plant.id);
            if (thumbnailPhoto) {
              thumbnails[plant.id] = thumbnailPhoto.file_path;
            }
          } else {
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

      // Filter and group plants
      const filteredPlants = selectedLocation === 'All' 
        ? allPlants 
        : allPlants.filter(plant => plant.location === selectedLocation);

      const groupedPlants = await LocationService.getPlantsGroupedByLocation();
      const sections = Object.entries(groupedPlants)
        .filter(([location]) => selectedLocation === 'All' || location === selectedLocation)
        .map(([location, plants]) => ({
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
    } catch (error) {
      console.error('Failed to load plants:', error);
      Alert.alert('Error', 'Failed to load plants');
    } finally {
      setLoading(false);
    }
  }, [selectedLocation]);

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

  // Set up real-time subscriptions for automatic updates
  useRealtimeUpdates({
    onPlantsUpdate: loadPlants,
    onCareEventsUpdate: loadPlants, // Care events don't directly affect this page, but keeping for consistency
    onPhotosUpdate: loadPlants, // Photos affect thumbnails, so reload plants
  });

  const togglePlantSelection = (plantId: string) => {
    const newSelected = new Set(selectedPlants);
    if (newSelected.has(plantId)) {
      newSelected.delete(plantId);
    } else {
      newSelected.add(plantId);
    }
    setSelectedPlants(newSelected);
  };

  const selectAllInLocation = (plants: Plant[]) => {
    const newSelected = new Set(selectedPlants);
    const allSelected = plants.every(plant => newSelected.has(plant.id));
    
    if (allSelected) {
      // Deselect all in this location
      plants.forEach(plant => newSelected.delete(plant.id));
    } else {
      // Select all in this location
      plants.forEach(plant => newSelected.add(plant.id));
    }
    setSelectedPlants(newSelected);
  };

  const handleCareTypeSelect = async (careType: 'water' | 'fertilize' | 'prune' | 'pest_spotted' | 'insecticide_spray') => {
    if (selectedPlants.size === 0) {
      Alert.alert('No Plants Selected', 'Please select at least one plant first.');
      return;
    }

    try {
      const selectedPlantsList = Array.from(selectedPlants);
      const plantNames = selectedPlantsList
        .map(plantId => {
          const plant = plants.find(p => p.id === plantId);
          return plant?.name || `Unnamed ${plant?.type}`;
        })
        .join(', ');

      const careTypeLabel = careTypes.find(ct => ct.type === careType)?.label || careType;

      Alert.alert(
        'Confirm Care Event',
        `Add "${careTypeLabel}" for ${selectedPlantsList.length} plant(s):\n${plantNames}`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm',
            onPress: async () => {
              // Add care events for all selected plants
              for (const plantId of selectedPlantsList) {
                await CareEventService.createCareEvent({
                  plant_id: plantId,
                  event_type: careType,
                  date: new Date().toISOString(),
                  notes: `Batch care: ${careTypeLabel}`,
                });
              }
              
              setSelectedPlants(new Set());
              setShowCareTypeModal(false);
              Alert.alert('Success', `Added ${careTypeLabel} event for ${selectedPlantsList.length} plant(s)`);
            }
          }
        ]
      );
    } catch (error) {
      console.error('Failed to add care events:', error);
      Alert.alert('Error', 'Failed to add care events');
    }
  };

  const renderPlantItem = ({ item }: { item: Plant }) => {
    const isSelected = selectedPlants.has(item.id);
    const thumbnail = plantThumbnails[item.id];
    
    return (
      <TouchableOpacity
        style={[styles.plantCard, isSelected && styles.plantCardSelected]}
        onPress={() => togglePlantSelection(item.id)}
      >
        <View style={globalStyles.flexRowCenter}>
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && <Check size={16} color={theme.colors.textOnPrimary} />}
          </View>
          
          {thumbnail && (
            <Image 
              source={{ uri: thumbnail }} 
              style={{ width: 50, height: 50, borderRadius: 8, marginRight: 12 }}
              resizeMode="cover"
            />
          )}
          
          <View style={styles.plantDetails}>
            <Text style={styles.plantCardName}>{item.name || `Unnamed ${item.type}`}</Text>
            <Text style={styles.plantCardType}>{item.type}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: { section: { title: string, data: Plant[] } }) => {
    const allSelected = section.data.every(plant => selectedPlants.has(plant.id));
    const someSelected = section.data.some(plant => selectedPlants.has(plant.id));
    
    return (
      <View style={styles.locationHeader}>
        <TouchableOpacity
          style={globalStyles.flexRowBetween}
          onPress={() => selectAllInLocation(section.data)}
        >
          <View style={globalStyles.flexRowCenter}>
            <View style={[
              styles.checkbox, 
              allSelected && styles.checkboxSelected,
              someSelected && !allSelected && { backgroundColor: theme.colors.border }
            ]}>
              {allSelected && <Check size={16} color={theme.colors.textOnPrimary} />}
              {someSelected && !allSelected && <Text style={styles.checkboxText}>−</Text>}
            </View>
            <Text style={[styles.locationTitle, { marginLeft: 12 }]}>{section.title}</Text>
          </View>
          <Text style={styles.selectAllText}>
            {section.data.length} plant{section.data.length !== 1 ? 's' : ''}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderLocationModal = () => (
    <Modal
      visible={showLocationModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowLocationModal(false)}
    >
      <View style={globalStyles.modalOverlay}>
        <View style={globalStyles.modalContent}>
          <Text style={globalStyles.modalTitle}>Filter by Location</Text>
          
          <FlatList
            data={locations}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  globalStyles.listItem,
                  selectedLocation === item && globalStyles.listItemSelected
                ]}
                onPress={() => {
                  setSelectedLocation(item);
                  setShowLocationModal(false);
                }}
              >
                <Text style={[
                  globalStyles.body,
                  { color: selectedLocation === item ? theme.colors.primary : theme.colors.textPrimary }
                ]}>
                  {item}
                </Text>
                {selectedLocation === item && <Check size={20} color={theme.colors.primary} />}
              </TouchableOpacity>
            )}
          />
          
          <TouchableOpacity
            style={globalStyles.buttonSecondary}
            onPress={() => setShowLocationModal(false)}
          >
            <Text style={[globalStyles.buttonTextSecondary, { color: theme.colors.textPrimary }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const renderCareTypeModal = () => (
    <Modal
      visible={showCareTypeModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowCareTypeModal(false)}
    >
      <View style={globalStyles.modalOverlay}>
        <View style={globalStyles.modalContent}>
          <Text style={globalStyles.modalTitle}>Select Care Type</Text>
          <Text style={globalStyles.bodySmall}>
            {selectedPlants.size} plant{selectedPlants.size !== 1 ? 's' : ''} selected
          </Text>
          
          {careTypes.map((careType) => {
            const IconComponent = careType.icon;
            return (
              <TouchableOpacity
                key={careType.type}
                style={[globalStyles.listItem, { flexDirection: 'row', alignItems: 'center' }]}
                onPress={() => handleCareTypeSelect(careType.type)}
              >
                <IconComponent size={24} color={careType.color} />
                <Text style={[globalStyles.body, { marginLeft: 12, color: theme.colors.textPrimary }]}>{careType.label}</Text>
              </TouchableOpacity>
            );
          })}
          
          <TouchableOpacity
            style={globalStyles.buttonSecondary}
            onPress={() => setShowCareTypeModal(false)}
          >
            <Text style={[globalStyles.buttonTextSecondary, { color: theme.colors.textPrimary }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={[globalStyles.container, globalStyles.flexCenter]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={globalStyles.container}>
      {/* Header with location filter */}
      <View style={globalStyles.flexRowBetween}>
        <TouchableOpacity 
          style={[globalStyles.flexRowCenter, globalStyles.buttonSecondary]}
          onPress={() => setShowLocationModal(true)}
        >
          <Filter size={20} color={theme.colors.textSecondary} />
          <Text style={[globalStyles.buttonTextSecondary, { marginLeft: 8, color: theme.colors.textPrimary }]}>{selectedLocation}</Text>
        </TouchableOpacity>
        
        {selectedPlants.size > 0 && (
          <Text style={globalStyles.bodySmall}>
            {selectedPlants.size} selected
          </Text>
        )}
      </View>

      {plants.length === 0 ? (
        <View style={globalStyles.emptyState}>
          <Text style={globalStyles.emptyStateText}>No plants yet!</Text>
          <Text style={[globalStyles.bodySmall, globalStyles.textCenter]}>Add some plants first to use Quick Care</Text>
        </View>
      ) : (
        <>
          <SectionList
            sections={plantsGrouped}
            renderItem={renderPlantItem}
            renderSectionHeader={renderSectionHeader}
            keyExtractor={(item) => item.id}
            style={globalStyles.list}
            contentContainerStyle={selectedPlants.size > 0 ? globalStyles.listContent : undefined}
            stickySectionHeadersEnabled={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.colors.primary}
                colors={[theme.colors.primary]}
              />
            }
          />
          
          {selectedPlants.size > 0 && (
            <TouchableOpacity
              style={globalStyles.fab}
              onPress={() => setShowCareTypeModal(true)}
            >
              <Text style={[globalStyles.buttonText, { fontSize: 12, textAlign: 'center' }]}>
                Add Care Event ({selectedPlants.size})
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}
      
      {renderLocationModal()}
      {renderCareTypeModal()}
    </View>
  );
}

const createStyles = (theme) => StyleSheet.create({
  plantCard: {
    backgroundColor: theme.colors.surface,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  plantCardSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.surfaceSecondary,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  checkboxSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  plantDetails: {
    flex: 1,
  },
  plantCardName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  plantCardType: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  locationHeader: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    marginBottom: 8,
  },
  locationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  selectAllText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  checkboxText: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
});
