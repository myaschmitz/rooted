import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, SectionList, TouchableOpacity, Alert, Image, Modal, FlatList, StyleSheet, ActivityIndicator, RefreshControl, TextInput, ScrollView } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Check, Filter, Calendar, Droplets, Scissors, Bug, Sprout, MoreHorizontal } from 'lucide-react-native';
import { PlantService } from '../../services/PlantService';
import { PhotoService } from '../../services/PhotoService';
import { LocationService } from '../../services/LocationService';
import { CareEventService } from '../../services/CareEventService';
import { Plant } from '../../types/Plant';
import { useTheme } from '../../contexts/ThemeContext';
import { useGlobalStyles, ButtonStyles, InputStyles } from '../../styles';
import { useRealtimeUpdates } from '../../hooks/useRealtimeUpdates';
import { PlantThumbnail } from '../../components/PlantThumbnail';


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
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<string>('All');
  const [locations, setLocations] = useState<string[]>([]);
  const [selectedCareType, setSelectedCareType] = useState<'water' | 'fertilize' | 'fertigate' | 'prune' | 'pest_spotted' | 'insecticide_spray' | 'other' | null>(null);
  const [careDetails, setCareDetails] = useState({
    notes: '',
    fertilizerConcentration: '',
    fertilizerAmount: '',
    pestSeverity: 1,
    healthStatus: undefined as 'excellent' | 'good' | 'okay' | 'poor' | 'concerning' | 'critical' | undefined
  });

  const careTypes: Array<{
    type: 'water' | 'fertilize' | 'fertigate' | 'prune' | 'pest_spotted' | 'insecticide_spray' | 'other';
    label: string;
    icon: any;
    color: string;
  }> = [
    { type: 'water', label: 'Watered', icon: Droplets, color: '#2196F3' },
    { type: 'fertilize', label: 'Fertilized', icon: Calendar, color: '#4CAF50' },
    { type: 'fertigate', label: 'Fertigated', icon: Droplets, color: '#00BCD4' },
    { type: 'prune', label: 'Pruned', icon: Scissors, color: '#FF9800' },
    { type: 'pest_spotted', label: 'Pest Spotted', icon: Bug, color: '#F44336' },
    { type: 'insecticide_spray', label: 'Insecticide Spray', icon: Sprout, color: '#9C27B0' },
    { type: 'other', label: 'Other', icon: MoreHorizontal, color: '#607D8B' },
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
      
      // Load thumbnails for each plant in parallel
      const thumbnails: {[plantId: string]: string} = {};
      const thumbnailPromises = allPlants.map(async (plant) => {
        try {
          if (plant.thumbnail_photo_id) {
            const thumbnailPhoto = await PhotoService.getThumbnailPhoto(plant.id);
            if (thumbnailPhoto) {
              return { plantId: plant.id, path: thumbnailPhoto.file_path };
            }
          } else {
            const photos = await PhotoService.getPhotosByPlantId(plant.id);
            if (photos.length > 0) {
              return { plantId: plant.id, path: photos[0].file_path };
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

      // Filter plants by location first
      const filteredPlants = selectedLocation === 'All' 
        ? allPlants 
        : allPlants.filter(plant => plant.location === selectedLocation);

      // Separate pinned and non-pinned plants from filtered plants
      const pinnedPlants = filteredPlants.filter(plant => plant.pinned);
      const unpinnedPlants = filteredPlants.filter(plant => !plant.pinned);
      
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
      const locationSections = Object.entries(groupedPlants)
        .filter(([location]) => selectedLocation === 'All' || location === selectedLocation)
        .map(([location, plants]) => {
          // Filter out pinned plants from location sections and keep only unpinned
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

  const handleCareTypeSelect = (careType: 'water' | 'fertilize' | 'fertigate' | 'prune' | 'pest_spotted' | 'insecticide_spray' | 'other') => {
    if (selectedPlants.size === 0) {
      Alert.alert('No Plants Selected', 'Please select at least one plant first.');
      return;
    }

    setSelectedCareType(careType);
    setShowCareTypeModal(false);
    setShowDetailModal(true);
  };

  const handleDetailConfirm = async () => {
    if (!selectedCareType || selectedPlants.size === 0) {
      return;
    }

    try {
      const selectedPlantsList = Array.from(selectedPlants);
      const careTypeLabel = careTypes.find(ct => ct.type === selectedCareType)?.label || selectedCareType;

      // Add care events for all selected plants
      for (const plantId of selectedPlantsList) {
        const careEventData: any = {
          plant_id: plantId,
          event_type: selectedCareType,
          date: new Date().toISOString(),
          notes: careDetails.notes.trim() || `Batch care: ${careTypeLabel}`,
        };

        // Add type-specific details
        if (selectedCareType === 'fertilize' || selectedCareType === 'fertigate') {
          if (careDetails.fertilizerConcentration.trim()) {
            careEventData.fertilizer_concentration = careDetails.fertilizerConcentration.trim();
          }
          if (careDetails.fertilizerAmount.trim()) {
            careEventData.fertilizer_amount = careDetails.fertilizerAmount.trim();
          }
        } else if (selectedCareType === 'pest_spotted') {
          careEventData.pest_severity = careDetails.pestSeverity;
        }

        if (careDetails.healthStatus) {
          careEventData.health_status = careDetails.healthStatus;
        }

        await CareEventService.createCareEvent(careEventData);
      }
      
      // Reset form and close modals
      setSelectedPlants(new Set());
      setShowDetailModal(false);
      setSelectedCareType(null);
      setCareDetails({
        notes: '',
        fertilizerConcentration: '',
        fertilizerAmount: '',
        pestSeverity: 1,
        healthStatus: undefined
      });
      Alert.alert('Success', `Added ${careTypeLabel} event for ${selectedPlantsList.length} plant(s)`);
    } catch (error) {
      console.error('Failed to add care events:', error);
      Alert.alert('Error', 'Failed to add care events');
    }
  };

  const handleDetailBack = () => {
    setShowDetailModal(false);
    setSelectedCareType(null);
    setShowCareTypeModal(true);
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
          
          <View style={{ marginRight: 12 }}>
            <PlantThumbnail imageUri={thumbnail} size={40} />
          </View>
          
          <View style={styles.plantDetails}>
            <Text style={styles.plantCardName}>{item.name || `${item.type}`}</Text>
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
      animationType="none"
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

  const renderDetailModal = () => {
    if (!selectedCareType) return null;

    const careTypeInfo = careTypes.find(ct => ct.type === selectedCareType);
    const IconComponent = careTypeInfo?.icon;
    const showFertilizerOptions = selectedCareType === 'fertilize' || selectedCareType === 'fertigate';
    const showPestSeverity = selectedCareType === 'pest_spotted';

    return (
      <Modal
        visible={showDetailModal}
        transparent
        animationType="none"
        onRequestClose={handleDetailBack}
      >
        <View style={globalStyles.modalOverlay}>
          <View style={[globalStyles.modalContent, { maxHeight: '90%' }]}>
            <View style={globalStyles.modalHeader}>
              <View style={globalStyles.flexRowCenter}>
                {IconComponent && <IconComponent size={24} color={careTypeInfo.color} />}
                <Text style={[globalStyles.modalTitle, { marginLeft: 8 }]}>{careTypeInfo?.label} Details</Text>
              </View>
            </View>
            
            <ScrollView style={{ maxHeight: 400 }} keyboardShouldPersistTaps="handled">
              <Text style={[globalStyles.bodySmall, { marginBottom: 16 }]}>
                {selectedPlants.size} plant{selectedPlants.size !== 1 ? 's' : ''} selected
              </Text>

              {/* Fertilizer Options (only show for fertilize) */}
              {showFertilizerOptions && (
                <>
                  <View style={globalStyles.inputGroup}>
                    <Text style={globalStyles.label}>Fertilizer Concentration</Text>
                    <TextInput
                      style={globalStyles.input}
                      value={careDetails.fertilizerConcentration}
                      onChangeText={(text) => setCareDetails(prev => ({ ...prev, fertilizerConcentration: text }))}
                      placeholder="e.g., 1/4 strength, 20-20-20"
                    />
                  </View>

                  <View style={globalStyles.inputGroup}>
                    <Text style={globalStyles.label}>Amount Used</Text>
                    <TextInput
                      style={globalStyles.input}
                      value={careDetails.fertilizerAmount}
                      onChangeText={(text) => setCareDetails(prev => ({ ...prev, fertilizerAmount: text }))}
                      placeholder="e.g., 1 cup, 500ml"
                    />
                  </View>
                </>
              )}

              {/* Pest Severity (only show for pest_spotted) */}
              {showPestSeverity && (
                <View style={globalStyles.inputGroup}>
                  <Text style={globalStyles.label}>Pest Severity (1-10 scale)</Text>
                  <Text style={globalStyles.sublabel}>1 = Minor issue, 10 = Severe infestation</Text>
                  <View style={styles.severityContainer}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((severity) => (
                      <TouchableOpacity
                        key={severity}
                        style={[
                          styles.severityButton,
                          careDetails.pestSeverity === severity && styles.severityButtonSelected,
                          careDetails.pestSeverity === severity 
                            ? (severity <= 3 && styles.severityLowSelected) ||
                              (severity >= 4 && severity <= 6 && styles.severityMediumSelected) ||
                              (severity >= 7 && styles.severityHighSelected)
                            : (severity <= 3 && styles.severityLow) ||
                              (severity >= 4 && severity <= 6 && styles.severityMedium) ||
                              (severity >= 7 && styles.severityHigh),
                        ]}
                        onPress={() => setCareDetails(prev => ({ ...prev, pestSeverity: severity }))}
                      >
                        <Text
                          style={[
                            styles.severityText,
                            careDetails.pestSeverity === severity && styles.severityTextSelected,
                          ]}
                        >
                          {severity}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}

              {/* Notes */}
              <View style={globalStyles.inputGroup}>
                <Text style={globalStyles.label}>Notes</Text>
                <TextInput
                  style={globalStyles.inputTextArea}
                  value={careDetails.notes}
                  onChangeText={(text) => setCareDetails(prev => ({ ...prev, notes: text }))}
                  placeholder="Additional notes about this care event..."
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>

              {/* Health Status */}
              <View style={globalStyles.inputGroup}>
                <Text style={globalStyles.label}>Plant Health Status (Optional)</Text>
                <View style={styles.healthStatusContainer}>
                  {([{value: undefined, label: 'No Change'}, {value: 'excellent' as const, label: 'Excellent'}, {value: 'good' as const, label: 'Good'}, {value: 'okay' as const, label: 'Okay'}, {value: 'poor' as const, label: 'Poor'}, {value: 'concerning' as const, label: 'Concerning'}, {value: 'critical' as const, label: 'Critical'}] as const).map((status) => (
                    <TouchableOpacity
                      key={status.label}
                      style={[
                        styles.healthStatusOption,
                        careDetails.healthStatus === status.value && styles.healthStatusOptionSelected,
                      ]}
                      onPress={() => setCareDetails(prev => ({ ...prev, healthStatus: status.value }))}
                    >
                      <Text
                        style={[
                          styles.healthStatusText,
                          careDetails.healthStatus === status.value && styles.healthStatusTextSelected,
                        ]}
                      >
                        {status.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
            
            <View style={[globalStyles.flexRow, { marginTop: 16 }]}>
              <TouchableOpacity
                style={[globalStyles.buttonSecondary, { flex: 1, marginRight: 8 }]}
                onPress={handleDetailBack}
              >
                <Text style={[globalStyles.buttonTextSecondary, { color: theme.colors.textPrimary }]}>Back</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[globalStyles.button, { flex: 1, marginLeft: 8 }]}
                onPress={handleDetailConfirm}
              >
                <Text style={globalStyles.buttonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

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
          style={[
            globalStyles.flexRowCenter,
            { margin: 16 }
          ]}
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
      {renderDetailModal()}
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
  severityContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  severityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  severityLow: { backgroundColor: '#4CAF50' },
  severityMedium: { backgroundColor: '#ffcb2eff' },
  severityHigh: { backgroundColor: '#F44336' },
  severityButtonSelected: {
    transform: [{ scale: 1.1 }],
    shadowColor: theme.colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 6,
  },
  severityLowSelected: { backgroundColor: '#2E7D32' },
  severityMediumSelected: { backgroundColor: '#e6ad00ff' },
  severityHighSelected: { backgroundColor: '#C62828' },
  severityText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  severityTextSelected: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  healthStatusContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  healthStatusOption: {
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 8,
    minWidth: '30%',
    alignItems: 'center',
  },
  healthStatusOptionSelected: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary,
  },
  healthStatusText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  healthStatusTextSelected: {
    color: theme.colors.primary,
    fontWeight: 'bold',
  },
});
