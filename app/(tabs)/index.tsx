import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, SectionList, ActivityIndicator, RefreshControl, Modal, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { Settings, Pin, PinOff, Check, CheckSquare, Square, Droplets, Calendar, Scissors, Bug, Sprout, MoreHorizontal, Filter } from 'lucide-react-native';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { PlantService } from '../../services/PlantService';
import { PhotoService } from '../../services/PhotoService';
import { LocationService } from '../../services/LocationService';
import { EventService } from '../../services/EventService';
import { DateTimeService } from '../../services/DateTimeService';
import { Plant } from '../../types/Plant';
import { useTheme } from '../../contexts/ThemeContext';
import { createStyles } from '../../styles/MyPlantsStyles';
import { useRealtimeUpdates } from '../../hooks/useRealtimeUpdates';
import { PlantThumbnail } from '../../components/PlantThumbnail';
import { useGlobalStyles, ButtonStyles, InputStyles } from '../../styles';

dayjs.extend(relativeTime);

export default function HomeScreen() {
  const { theme } = useTheme();
  const globalStyles = useGlobalStyles();
  const styles = createStyles(theme);
  const [plants, setPlants] = useState<Plant[]>([]);
  const [plantsGrouped, setPlantsGrouped] = useState<{title: string, data: Plant[]}[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [plantThumbnails, setPlantThumbnails] = useState<{[plantId: string]: string}>({});
  const [plantWateringData, setPlantWateringData] = useState<{[plantId: string]: string | null}>({});
  
  // Batch care mode state
  const [batchModeEnabled, setBatchModeEnabled] = useState(false);
  const [selectedPlants, setSelectedPlants] = useState<Set<string>>(new Set());
  const [showCareTypeModal, setShowCareTypeModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCareType, setSelectedCareType] = useState<'water' | 'fertilize' | 'fertigate' | 'prune' | 'pest_spotted' | 'insecticide_spray' | 'repot' | 'other' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [careDetails, setCareDetails] = useState({
    notes: '',
    fertilizerStrength: '1x' as '1/4' | '1/2' | '1x' | '1.5x' | '2x',
    pestSeverity: 1,
  });

  const careTypes: Array<{
    type: 'water' | 'fertilize' | 'fertigate' | 'prune' | 'pest_spotted' | 'insecticide_spray' | 'repot' | 'other';
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
    { type: 'repot', label: 'Repotted', icon: Sprout, color: '#795548' },
    { type: 'other', label: 'Other', icon: MoreHorizontal, color: '#607D8B' },
  ];

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
    const timeAgo = DateTimeService.formatTimeAgo(lastWateredDate);
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

  // Batch care handling functions
  const toggleBatchMode = () => {
    setBatchModeEnabled(!batchModeEnabled);
    setSelectedPlants(new Set()); // Clear selected plants when toggling mode
  };

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

  const handleCareTypeSelect = (careType: 'water' | 'fertilize' | 'fertigate' | 'prune' | 'pest_spotted' | 'insecticide_spray' | 'repot' | 'other') => {
    if (selectedPlants.size === 0) {
      Alert.alert('No Plants Selected', 'Please select at least one plant first.');
      return;
    }

    setSelectedCareType(careType);
    setShowCareTypeModal(false);
    setShowDetailModal(true);
  };

  const handleDetailConfirm = async () => {
    if (!selectedCareType || selectedPlants.size === 0 || submitting) {
      return;
    }

    setSubmitting(true);
    try {
      const selectedPlantsList = Array.from(selectedPlants);
      const careTypeLabel = careTypes.find(ct => ct.type === selectedCareType)?.label || selectedCareType;

      // Add events for all selected plants
      for (const plantId of selectedPlantsList) {
        const careEventData: any = {
          plant_id: plantId,
          event_type: selectedCareType,
          date: new Date().toISOString(),
          notes: careDetails.notes.trim() || `Batch care: ${careTypeLabel}`,
        };

        // Add type-specific details
        if (selectedCareType === 'fertilize' || selectedCareType === 'fertigate') {
          careEventData.fertilizer_concentration = careDetails.fertilizerStrength;
        } else if (selectedCareType === 'pest_spotted') {
          careEventData.pest_severity = careDetails.pestSeverity;
        }

        await EventService.createEvent(careEventData);
      }
      
      // Reset form and close modals
      setSelectedPlants(new Set());
      setShowDetailModal(false);
      setSelectedCareType(null);
      setCareDetails({
        notes: '',
        fertilizerStrength: '1x' as '1/4' | '1/2' | '1x' | '1.5x' | '2x',
        pestSeverity: 1,
      });
      await loadPlants(); // Refresh plant data
      Alert.alert('Success', `Added ${careTypeLabel} event for ${selectedPlantsList.length} plant(s)`);
    } catch (error) {
      console.error('Failed to add events:', error);
      Alert.alert('Error', 'Failed to add events');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDetailBack = () => {
    setShowDetailModal(false);
    setSelectedCareType(null);
    setShowCareTypeModal(true);
  };

  const renderPlantItem = ({ item }: { item: Plant }) => {
    const thumbnail = plantThumbnails[item.id];
    const lastWatered = plantWateringData[item.id];
    const wateringDisplay = formatTimeSinceWatering(lastWatered);
    const wateringColor = getWateringStatusColor(lastWatered);
    const isSelected = selectedPlants.has(item.id);
    
    if (batchModeEnabled) {
      return (
        <TouchableOpacity
          style={[styles.plantCard, isSelected && styles.plantCardSelected]}
          onPress={() => togglePlantSelection(item.id)}
        >
          <View style={styles.plantCardContent}>
            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
              {isSelected && <Check size={16} color={theme.colors.textOnPrimary} />}
            </View>
            
            <View style={{ marginRight: 12 }}>
              <PlantThumbnail imageUri={thumbnail} size={40} />
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
          </View>
        </TouchableOpacity>
      );
    }

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

  const renderSectionHeader = ({ section }: { section: { title: string, data: Plant[] } }) => {
    if (batchModeEnabled) {
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
    }

    return (
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{section.title}</Text>
        <Text style={styles.sectionCount}>
          {section.data.length} plant{section.data.length !== 1 ? 's' : ''}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with batch mode toggle */}
      {plants.length > 0 && (
        <View style={globalStyles.flexRowBetween}>
          <TouchableOpacity 
            style={[
              globalStyles.flexRowCenter,
              { margin: 16, padding: 8, borderRadius: 8, backgroundColor: batchModeEnabled ? theme.colors.primary : theme.colors.surface }
            ]}
            onPress={toggleBatchMode}
          >
            {batchModeEnabled ? <CheckSquare size={20} color={theme.colors.textOnPrimary} /> : <Square size={20} color={theme.colors.textSecondary} />}
            <Text style={[globalStyles.buttonTextSecondary, { 
              marginLeft: 8, 
              color: batchModeEnabled ? theme.colors.textOnPrimary : theme.colors.textPrimary 
            }]}>
              Batch Mode
            </Text>
          </TouchableOpacity>
          
          {batchModeEnabled && selectedPlants.size > 0 && (
            <Text style={[globalStyles.bodySmall, { marginRight: 16 }]}>
              {selectedPlants.size} selected
            </Text>
          )}
        </View>
      )}

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
            contentContainerStyle={batchModeEnabled && selectedPlants.size > 0 ? globalStyles.listContent : undefined}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.colors.primary}
                colors={[theme.colors.primary]}
              />
            }
          />
          
          {/* FAB for adding plants or batch care */}
          {batchModeEnabled && selectedPlants.size > 0 ? (
            <TouchableOpacity
              style={globalStyles.fab}
              onPress={() => setShowCareTypeModal(true)}
            >
              <Text style={[globalStyles.buttonText, { fontSize: 12, textAlign: 'center' }]}>
                Add Event ({selectedPlants.size})
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.fab}
              onPress={() => router.navigate('/add-plant')}
            >
              <Text style={styles.fabText}>+</Text>
            </TouchableOpacity>
          )}
        </>
      )}
      
      {/* Modals */}
      {renderCareTypeModal()}
      {renderDetailModal()}
    </View>
  );

  // Modal render functions
  function renderCareTypeModal() {
    return (
      <Modal
        visible={showCareTypeModal}
        transparent
        animationType="none"
        onRequestClose={() => setShowCareTypeModal(false)}
      >
        <View style={globalStyles.modalOverlay}>
          <View style={globalStyles.modalContent}>
            <Text style={globalStyles.modalTitle}>Select Event Type</Text>
            <Text style={globalStyles.bodySmall}>
              {selectedPlants.size} plant{selectedPlants.size !== 1 ? 's' : ''} selected
            </Text>
            
            <ScrollView style={{ maxHeight: 400 }}>
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
            </ScrollView>
            
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
  }

  function renderDetailModal() {
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
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            <View style={[globalStyles.modalContent, { maxHeight: '80%', minHeight: 300 }]}>
              <View style={globalStyles.modalHeader}>
                <View style={globalStyles.flexRowCenter}>
                  {IconComponent && <IconComponent size={24} color={careTypeInfo.color} />}
                  <Text style={[globalStyles.modalTitle, { marginLeft: 8 }]}>{careTypeInfo?.label} Details</Text>
                </View>
              </View>
            
            <ScrollView 
              style={{ maxHeight: 400 }} 
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
                <Text style={[globalStyles.bodySmall, { marginBottom: 16 }]}>
                  {selectedPlants.size} plant{selectedPlants.size !== 1 ? 's' : ''} selected
                </Text>

                {/* Fertilizer Options (only show for fertilize) */}
                {showFertilizerOptions && (
                  <View style={globalStyles.inputGroup}>
                    <Text style={globalStyles.label}>Fertilizer Strength</Text>
                    <View style={styles.strengthContainer}>
                      {['1/4', '1/2', '1x', '1.5x', '2x'].map((strength) => (
                        <TouchableOpacity
                          key={strength}
                          style={[
                            styles.strengthOption,
                            careDetails.fertilizerStrength === strength && styles.strengthOptionSelected,
                          ]}
                          onPress={() => setCareDetails(prev => ({ ...prev, fertilizerStrength: strength as '1/4' | '1/2' | '1x' | '1.5x' | '2x' }))}
                        >
                          <Text
                            style={[
                              styles.strengthText,
                              careDetails.fertilizerStrength === strength && styles.strengthTextSelected,
                            ]}
                          >
                            {strength}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
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
                    placeholder="Additional notes about this event..."
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
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
                style={[globalStyles.button, { flex: 1, marginLeft: 8, opacity: submitting ? 0.6 : 1 }]}
                onPress={handleDetailConfirm}
                disabled={submitting}
              >
                {submitting ? (
                  <View style={globalStyles.flexRowCenter}>
                    <ActivityIndicator size="small" color={theme.colors.textOnPrimary} style={{ marginRight: 8 }} />
                    <Text style={globalStyles.buttonText}>Submitting...</Text>
                  </View>
                ) : (
                  <Text style={globalStyles.buttonText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    );
  }
}
