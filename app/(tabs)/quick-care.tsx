import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, SectionList, TouchableOpacity, Alert, Image, Modal, FlatList } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Check, Filter, Calendar, Droplets, Scissors, Bug, Sprout } from 'lucide-react-native';
import { PlantService } from '../../services/PlantService';
import { PhotoService } from '../../services/PhotoService';
import { LocationService } from '../../services/LocationService';
import { CareEventService } from '../../services/CareEventService';
import { Plant } from '../../types/Plant';
import { GlobalStyles, CareStyles, Colors } from '../../styles';

export default function QuickCareScreen() {
  const [plants, setPlants] = useState<Plant[]>([]);
  const [plantsGrouped, setPlantsGrouped] = useState<{title: string, data: Plant[]}[]>([]);
  const [selectedPlants, setSelectedPlants] = useState<Set<string>>(new Set());
  const [plantThumbnails, setPlantThumbnails] = useState<{[plantId: string]: string}>({});
  const [loading, setLoading] = useState(true);
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

  useFocusEffect(
    useCallback(() => {
      loadPlants();
    }, [loadPlants])
  );

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
        style={[CareStyles.plantCard, isSelected && CareStyles.plantCardSelected]}
        onPress={() => togglePlantSelection(item.id)}
      >
        <View style={GlobalStyles.flexRowCenter}>
          <View style={[CareStyles.checkbox, isSelected && CareStyles.checkboxSelected]}>
            {isSelected && <Check size={16} color="white" />}
          </View>
          
          {thumbnail && (
            <Image 
              source={{ uri: thumbnail }} 
              style={{ width: 50, height: 50, borderRadius: 8, marginRight: 12 }}
              resizeMode="cover"
            />
          )}
          
          <View style={CareStyles.plantDetails}>
            <Text style={CareStyles.plantCardName}>{item.name || `Unnamed ${item.type}`}</Text>
            <Text style={CareStyles.plantCardType}>{item.type}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: { section: { title: string, data: Plant[] } }) => {
    const allSelected = section.data.every(plant => selectedPlants.has(plant.id));
    const someSelected = section.data.some(plant => selectedPlants.has(plant.id));
    
    return (
      <View style={CareStyles.locationHeader}>
        <TouchableOpacity
          style={GlobalStyles.flexRowBetween}
          onPress={() => selectAllInLocation(section.data)}
        >
          <View style={GlobalStyles.flexRowCenter}>
            <View style={[
              CareStyles.checkbox, 
              allSelected && CareStyles.checkboxSelected,
              someSelected && !allSelected && { backgroundColor: Colors.gray400 }
            ]}>
              {allSelected && <Check size={16} color="white" />}
              {someSelected && !allSelected && <Text style={CareStyles.checkboxText}>−</Text>}
            </View>
            <Text style={[CareStyles.locationTitle, { marginLeft: 12 }]}>{section.title}</Text>
          </View>
          <Text style={CareStyles.selectAllText}>
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
      <View style={GlobalStyles.modalOverlay}>
        <View style={GlobalStyles.modalContent}>
          <Text style={GlobalStyles.modalTitle}>Filter by Location</Text>
          
          <FlatList
            data={locations}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  GlobalStyles.listItem,
                  selectedLocation === item && GlobalStyles.listItemSelected
                ]}
                onPress={() => {
                  setSelectedLocation(item);
                  setShowLocationModal(false);
                }}
              >
                <Text style={[
                  GlobalStyles.body,
                  selectedLocation === item && { color: Colors.primary }
                ]}>
                  {item}
                </Text>
                {selectedLocation === item && <Check size={20} color={Colors.primary} />}
              </TouchableOpacity>
            )}
          />
          
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setShowLocationModal(false)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
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
      <View style={styles.modalOverlay}>
        <View style={styles.careTypeModal}>
          <Text style={styles.modalTitle}>Select Care Type</Text>
          <Text style={styles.modalSubtitle}>
            {selectedPlants.size} plant{selectedPlants.size !== 1 ? 's' : ''} selected
          </Text>
          
          {careTypes.map((careType) => {
            const IconComponent = careType.icon;
            return (
              <TouchableOpacity
                key={careType.type}
                style={styles.careTypeButton}
                onPress={() => handleCareTypeSelect(careType.type)}
              >
                <IconComponent size={24} color={careType.color} />
                <Text style={styles.careTypeText}>{careType.label}</Text>
              </TouchableOpacity>
            );
          })}
          
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setShowCareTypeModal(false)}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading plants...</Text>
      </View>
    );
  }

  return (
    <View style={GlobalStyles.container}>
      {/* Header with location filter */}
      <View style={GlobalStyles.flexRowBetween}>
        <TouchableOpacity 
          style={[GlobalStyles.flexRowCenter, GlobalStyles.buttonSecondary]}
          onPress={() => setShowLocationModal(true)}
        >
          <Filter size={20} color={Colors.textSecondary} />
          <Text style={[GlobalStyles.buttonTextSecondary, { marginLeft: 8 }]}>{selectedLocation}</Text>
        </TouchableOpacity>
        
        {selectedPlants.size > 0 && (
          <Text style={GlobalStyles.bodySmall}>
            {selectedPlants.size} selected
          </Text>
        )}
      </View>

      {plants.length === 0 ? (
        <View style={GlobalStyles.emptyState}>
          <Text style={GlobalStyles.emptyStateText}>No plants yet!</Text>
          <Text style={[GlobalStyles.bodySmall, GlobalStyles.textCenter]}>Add some plants first to use Quick Care</Text>
        </View>
      ) : (
        <>
          <SectionList
            sections={plantsGrouped}
            renderItem={renderPlantItem}
            renderSectionHeader={renderSectionHeader}
            keyExtractor={(item) => item.id}
            style={styles.list}
            contentContainerStyle={selectedPlants.size > 0 ? styles.listWithButton : undefined}
            stickySectionHeadersEnabled={false}
          />
          
          {selectedPlants.size > 0 && (
            <TouchableOpacity
              style={styles.careButton}
              onPress={() => setShowCareTypeModal(true)}
            >
              <Text style={styles.careButtonText}>
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
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
  },
  filterText: {
    fontSize: 14,
    color: '#666',
  },
  selectedCount: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  list: {
    flex: 1,
    padding: 16,
  },
  listWithButton: {
    paddingBottom: 100, // Add space for the floating button
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
  selectedPlantCard: {
    borderWidth: 2,
    borderColor: '#4CAF50',
    backgroundColor: '#f8fff8',
  },
  plantCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#ddd',
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkedCheckbox: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  indeterminateCheckbox: {
    backgroundColor: '#FF9800',
    borderColor: '#FF9800',
  },
  indeterminateText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  plantThumbnail: {
    width: 50,
    height: 50,
    borderRadius: 6,
    marginRight: 12,
    backgroundColor: '#f0f0f0',
  },
  plantInfo: {
    flex: 1,
  },
  plantName: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  plantType: {
    fontSize: 14,
    color: '#666',
  },
  sectionHeader: {
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  careButton: {
    position: 'absolute',
    bottom: 24,
    left: 24,
    right: 24,
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  careButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  careTypeModal: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    textAlign: 'center',
  },
  careTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 12,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    gap: 12,
  },
  careTypeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  cancelButton: {
    marginTop: 12,
    paddingVertical: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#666',
  },
  locationModal: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '60%',
  },
  locationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  selectedLocationItem: {
    backgroundColor: '#f8fff8',
  },
  locationText: {
    fontSize: 16,
    color: '#333',
  },
  selectedLocationText: {
    color: '#4CAF50',
    fontWeight: '600',
  },
});
