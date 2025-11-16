import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, SectionList, ActivityIndicator, RefreshControl, Modal, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { Settings, Pin, PinOff, Check, CheckSquare, Square, Droplets, Calendar, Scissors, Bug, Sprout, MoreHorizontal, Filter, Camera, Search, X, ArrowUpDown, ArrowUp, ArrowDown, ArrowDownWideNarrow, ArrowUpNarrowWide, ChevronDown, ArrowDownUp } from 'lucide-react-native';
import dayjs from 'dayjs';
import Fuse from 'fuse.js';
import relativeTime from 'dayjs/plugin/relativeTime';
import { PlantService } from '../../services/PlantService';
import { PhotoService } from '../../services/PhotoService';
import { LocationService } from '../../services/LocationService';
import { EventService } from '../../services/EventService';
import { DateTimeService } from '../../services/DateTimeService';
import { TagService } from '../../services/TagService';
import { Plant, Tag } from '../../types/Plant';
import { useTheme } from '../../contexts/ThemeContext';
import { createStyles } from '../../styles/MyPlantsStyles';
import { useRealtimeUpdates } from '../../hooks/useRealtimeUpdates';
import { PlantThumbnail } from '../../components/PlantThumbnail';
import { useGlobalStyles, ButtonStyles, InputStyles } from '../../styles';
import { usePlants, useCreateEvent } from '../../hooks/queries';

dayjs.extend(relativeTime);

type SortType = 'name' | 'lastWatered';
type SortDirection = 'asc' | 'desc';

interface GlobalSortPreference {
  type: SortType;
  direction: SortDirection;
}

const SORT_PREFERENCES_KEY = 'global_plant_sort_preferences';
const PINNED_PLANTS_KEY = 'pinned_plants';

export default function HomeScreen() {
  const { theme } = useTheme();
  const globalStyles = useGlobalStyles();
  const styles = createStyles(theme);
  
  // React Query hooks - these handle caching automatically
  const { data: plants = [], isLoading: plantsLoading, refetch: refetchPlants } = usePlants();
  const createEventMutation = useCreateEvent();
  
  // State declarations (must come before useMemo that depends on them)
  const [globalSortPreference, setGlobalSortPreference] = useState<GlobalSortPreference>({ type: 'name', direction: 'asc' });
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [pinnedPlantIds, setPinnedPlantIds] = useState<Set<string>>(new Set());
  
  // Filtering state
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [selectedTagsForFilter, setSelectedTagsForFilter] = useState<Set<string>>(new Set()); // Stores tag IDs
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  
  // Derived state
  const loading = plantsLoading;
  const [refreshing, setRefreshing] = useState(false);
  const [plantThumbnails, setPlantThumbnails] = useState<{[plantId: string]: string}>({});
  const [plantWateringData, setPlantWateringData] = useState<{[plantId: string]: string | null}>({});
  const [plantLastPhotoData, setPlantLastPhotoData] = useState<{[plantId: string]: string | null}>({});
  const [plantTagsData, setPlantTagsData] = useState<{[plantId: string]: Tag[]}>({});
  
  // Helper function to sort plants based on global preferences (must come before useMemo)
  const sortPlants = useCallback((plants: Plant[]): Plant[] => {
    return [...plants].sort((a, b) => {
      let comparison = 0;
      
      if (globalSortPreference.type === 'name') {
        const nameA = (a.name || a.type).toLowerCase();
        const nameB = (b.name || b.type).toLowerCase();
        comparison = nameA.localeCompare(nameB);
      } else if (globalSortPreference.type === 'lastWatered') {
        const lastWateredA = plantWateringData[a.id];
        const lastWateredB = plantWateringData[b.id];
        
        // Handle null values (never watered) - they should come last in ascending, first in descending
        if (!lastWateredA && !lastWateredB) {
          comparison = 0;
        } else if (!lastWateredA) {
          comparison = globalSortPreference.direction === 'asc' ? 1 : -1;
        } else if (!lastWateredB) {
          comparison = globalSortPreference.direction === 'asc' ? -1 : 1;
        } else {
          // Compare dates - more recent should come first in desc, last in asc
          comparison = dayjs(lastWateredA).isBefore(dayjs(lastWateredB)) ? -1 : 1;
        }
      }
      
      return globalSortPreference.direction === 'desc' ? -comparison : comparison;
    });
  }, [globalSortPreference, plantWateringData]);
  
  // Load all available tags for filtering using global tags service
  const loadAvailableTags = useCallback(async () => {
    try {
      const allTags = await TagService.getAllTags(true);
      setAvailableTags(allTags);
    } catch (error) {
      console.error('Failed to load tags for filtering:', error);
      // Fallback: create tags from current plant data
      const allTags: Tag[] = [];
      const seenTagIds = new Set<string>();
      
      Object.values(plantTagsData).forEach(plantTags => {
        plantTags.forEach(tag => {
          if (!seenTagIds.has(tag.id)) {
            seenTagIds.add(tag.id);
            allTags.push(tag);
          }
        });
      });
      
      allTags.sort((a, b) => a.name.localeCompare(b.name));
      setAvailableTags(allTags);
    }
  }, [plantTagsData]);

  // Filter plants based on selected tags (using tag IDs with OR logic)
  const filterPlantsByTags = useCallback((plants: Plant[]): Plant[] => {
    if (selectedTagsForFilter.size === 0) {
      return plants;
    }
    
    return plants.filter(plant => {
      const plantTags = plantTagsData[plant.id] || [];
      
      // Create set of plant's tag IDs
      const plantTagIds = new Set(plantTags.map(tag => tag.id));
      
      // Check if plant has ANY of the selected tag IDs (OR logic)
      const selectedTagIds = Array.from(selectedTagsForFilter);
      return selectedTagIds.some(tagId => plantTagIds.has(tagId));
    });
  }, [selectedTagsForFilter, plantTagsData]);
  
  // Grouped plants derived from plants data
  const plantsGrouped = useMemo(() => {
    if (!plants.length) return [];
    
    // Apply tag filtering first
    const filteredPlants = filterPlantsByTags(plants);
    
    // Separate pinned and non-pinned plants
    const pinnedPlants = filteredPlants.filter(plant => pinnedPlantIds.has(plant.id));
    const unpinnedPlants = filteredPlants.filter(plant => !pinnedPlantIds.has(plant.id));
    
    // Create sections array
    const sections: {title: string, data: Plant[]}[] = [];
    
    // Add Pinned Plants section if there are any pinned plants
    if (pinnedPlants.length > 0) {
      const sortedPinnedPlants = sortPlants(pinnedPlants);
      sections.push({
        title: 'Pinned Plants',
        data: sortedPinnedPlants
      });
    }
    
    // Group unpinned plants by location
    const groupedUnpinnedPlants = unpinnedPlants.reduce((acc, plant) => {
      const location = plant.location || 'No Location';
      if (!acc[location]) {
        acc[location] = [];
      }
      acc[location].push(plant);
      return acc;
    }, {} as {[location: string]: Plant[]});
    
    const locationSections = Object.entries(groupedUnpinnedPlants).map(([location, locationPlants]) => {
      // Sort plants using global preferences
      const sortedPlants = sortPlants(locationPlants);
      
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
    
    return sections;
  }, [plants, pinnedPlantIds, sortPlants, filterPlantsByTags]);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  
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
    { type: 'insecticide_spray', label: 'Insecticide', icon: Sprout, color: '#9C27B0' },
    { type: 'repot', label: 'Repotted', icon: Sprout, color: '#795548' },
    { type: 'other', label: 'Other', icon: MoreHorizontal, color: '#607D8B' },
  ];

  // Fuse.js configuration for fuzzy search
  const fuseOptions = {
    keys: [
      { name: 'name', weight: 0.7 },
      { name: 'type', weight: 0.5 },
      { name: 'location', weight: 0.3 }
    ],
    threshold: 0.4, // Lower = more strict, higher = more fuzzy
    includeScore: true,
    minMatchCharLength: 1,
  };

  // Create Fuse instance with plants data
  const fuse = useMemo(() => {
    return new Fuse(plants, fuseOptions);
  }, [plants]);

  // Search functionality
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) {
      return [];
    }
    return fuse.search(searchQuery.trim()).map(result => result.item);
  }, [fuse, searchQuery]);

  // Handle search input changes
  const handleSearchChange = useCallback((text: string) => {
    setSearchQuery(text);
    setIsSearching(text.trim().length > 0);
  }, []);

  // Clear search
  const clearSearch = useCallback(() => {
    setSearchQuery('');
    setIsSearching(false);
  }, []);

  // AsyncStorage operations for global sorting preferences
  const saveGlobalSortPreference = useCallback(async (preference: GlobalSortPreference) => {
    try {
      await AsyncStorage.setItem(SORT_PREFERENCES_KEY, JSON.stringify(preference));
    } catch (error) {
      console.error('Failed to save sort preference:', error);
    }
  }, []);

  const loadGlobalSortPreference = useCallback(async (): Promise<GlobalSortPreference> => {
    try {
      const stored = await AsyncStorage.getItem(SORT_PREFERENCES_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load sort preference:', error);
    }
    return { type: 'name', direction: 'asc' };
  }, []);

  const updateGlobalSortPreference = useCallback(async (type: SortType, direction: SortDirection) => {
    const newPreference = { type, direction };
    setGlobalSortPreference(newPreference);
    await saveGlobalSortPreference(newPreference);
  }, [saveGlobalSortPreference]);

  // AsyncStorage operations for pinned plants
  const savePinnedPlants = useCallback(async (pinnedIds: Set<string>) => {
    try {
      await AsyncStorage.setItem(PINNED_PLANTS_KEY, JSON.stringify(Array.from(pinnedIds)));
    } catch (error) {
      console.error('Failed to save pinned plants:', error);
    }
  }, []);

  const loadPinnedPlants = useCallback(async (): Promise<Set<string>> => {
    try {
      const stored = await AsyncStorage.getItem(PINNED_PLANTS_KEY);
      if (stored) {
        return new Set(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Failed to load pinned plants:', error);
    }
    return new Set();
  }, []);

  const updatePinnedPlants = useCallback(async (plantId: string) => {
    const newPinnedIds = new Set(pinnedPlantIds);
    if (newPinnedIds.has(plantId)) {
      newPinnedIds.delete(plantId);
    } else {
      newPinnedIds.add(plantId);
    }
    setPinnedPlantIds(newPinnedIds);
    await savePinnedPlants(newPinnedIds);
  }, [pinnedPlantIds, savePinnedPlants]);


  // Load auxiliary data for plants more efficiently
  const loadPlantAuxiliaryData = useCallback(async () => {
    if (!plants.length) return;
    
    // Load thumbnails efficiently using batch method
    const loadThumbnails = async () => {
      try {
        const plantIds = plants.map(p => p.id);
        const batchThumbnails = await PhotoService.getBatchThumbnailPhotos(plantIds);
        
        const thumbnails: {[plantId: string]: string} = {};
        Object.entries(batchThumbnails).forEach(([plantId, photo]) => {
          if (photo) {
            thumbnails[plantId] = PhotoService.getImageUrl(photo, true);
          }
        });
        
        // For plants without designated thumbnails, fall back to first photo
        const plantsWithoutThumbnails = plants.filter(p => !thumbnails[p.id]);
        if (plantsWithoutThumbnails.length > 0) {
          // Process these in smaller batches to avoid overwhelming the API
          const batchSize = 5;
          for (let i = 0; i < plantsWithoutThumbnails.length; i += batchSize) {
            const batch = plantsWithoutThumbnails.slice(i, i + batchSize);
            const fallbackPromises = batch.map(async (plant) => {
              try {
                const photos = await PhotoService.getPhotosByPlantId(plant.id);
                if (photos.length > 0) {
                  return { plantId: plant.id, path: PhotoService.getImageUrl(photos[0], true) };
                }
              } catch (error) {
                console.error(`Failed to load fallback thumbnail for plant ${plant.id}:`, error);
              }
              return null;
            });
            
            const batchResults = await Promise.allSettled(fallbackPromises);
            batchResults.forEach((result) => {
              if (result.status === 'fulfilled' && result.value) {
                thumbnails[result.value.plantId] = result.value.path;
              }
            });
          }
        }
        
        setPlantThumbnails(thumbnails);
      } catch (error) {
        console.error('Failed to load thumbnails:', error);
        setPlantThumbnails({});
      }
    };
    
    // Load watering and photo data more efficiently
    const loadAdditionalData = async () => {
      const wateringData: {[plantId: string]: string | null} = {};
      const lastPhotoData: {[plantId: string]: string | null} = {};
      const tagsData: {[plantId: string]: Tag[]} = {};
      
      try {
        // Batch load all event data in a single query - this reduces API calls dramatically
        const plantIds = plants.map(p => p.id);
        const [eventsData, photoPromises, tagPromises] = await Promise.all([
          EventService.getLastEventsByTypeForPlants(plantIds, ['water', 'fertigate']),
          Promise.all(plants.map(plant => PhotoService.getPhotosByPlantId(plant.id))),
          Promise.all(plants.map(plant => TagService.getTagsByPlantId(plant.id)))
        ]);
        
        // Process the batched data
        plants.forEach((plant, index) => {
          try {
            // Get the last watering events for this plant
            const plantEvents = eventsData[plant.id] || {};
            const lastWatering = plantEvents['water'];
            const lastFertigate = plantEvents['fertigate'];
            
            // Find the most recent watering
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
            
            // Get photo and tag data from the parallel promises
            const photos = photoPromises[index] || [];
            const tags = tagPromises[index] || [];
            const lastPhoto = photos.length > 0 ? photos[0] : null;
            
            wateringData[plant.id] = mostRecentWatering?.date || null;
            lastPhotoData[plant.id] = lastPhoto?.taken_at || null;
            tagsData[plant.id] = tags;
          } catch (error) {
            console.error(`Failed to process data for plant ${plant.id}:`, error);
            wateringData[plant.id] = null;
            lastPhotoData[plant.id] = null;
            tagsData[plant.id] = [];
          }
        });
        
      } catch (error) {
        console.error('Failed to load additional plant data:', error);
        // Initialize empty data on error
        plants.forEach(plant => {
          wateringData[plant.id] = null;
          lastPhotoData[plant.id] = null;
          tagsData[plant.id] = [];
        });
      }
      
      setPlantWateringData(wateringData);
      setPlantLastPhotoData(lastPhotoData);
      setPlantTagsData(tagsData);
    };
    
    // Load thumbnails first (more important for UI), then additional data
    await loadThumbnails();
    await loadAdditionalData();
  }, [plants]);
  
  // Load auxiliary data when plants change
  useEffect(() => {
    if (plants.length > 0) {
      loadPlantAuxiliaryData();
    }
  }, [plants, loadPlantAuxiliaryData]);

  // Load available tags when plant tags data changes
  useEffect(() => {
    loadAvailableTags().catch(error => {
      console.error('Error loading available tags:', error);
    });
  }, [loadAvailableTags]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // Use React Query refetch instead of manual loading
      await refetchPlants();
      // Auxiliary data will be reloaded by the useEffect when plants change
    } finally {
      setRefreshing(false);
    }
  }, [refetchPlants]);

  // Load global sorting preference on app initialization
  useEffect(() => {
    const initializeGlobalSortPreference = async () => {
      const preference = await loadGlobalSortPreference();
      setGlobalSortPreference(preference);
    };
    initializeGlobalSortPreference();
  }, [loadGlobalSortPreference]);

  // Load pinned plants on app initialization
  useEffect(() => {
    const initializePinnedPlants = async () => {
      const pinnedIds = await loadPinnedPlants();
      setPinnedPlantIds(pinnedIds);
    };
    initializePinnedPlants();
  }, [loadPinnedPlants]);

  // Set up real-time subscriptions - React Query will handle invalidation
  useRealtimeUpdates({});

  // Reload auxiliary data when screen comes into focus (handles tag updates)
  useFocusEffect(
    useCallback(() => {
      if (plants.length > 0) {
        loadPlantAuxiliaryData();
      }
    }, [plants.length, loadPlantAuxiliaryData])
  );


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

  const needsPhoto = (lastPhotoDate?: string | null) => {
    if (!lastPhotoDate) {
      return true; // Never had a photo
    }

    const now = dayjs();
    const photoDate = dayjs(lastPhotoDate);
    const daysSince = now.diff(photoDate, 'day');

    return daysSince >= 30; // 30 days = approximately 1 month
  };

  const handleTogglePin = useCallback(async (plantId: string, event: any) => {
    event.stopPropagation();
    try {
      await updatePinnedPlants(plantId);
    } catch (error) {
      console.error('Failed to toggle pin:', error);
      Alert.alert('Error', 'Failed to update pin status');
    }
  }, [updatePinnedPlants]);

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

      // Add events for all selected plants using React Query mutations
      const eventPromises = selectedPlantsList.map(async (plantId) => {
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

        return createEventMutation.mutateAsync(careEventData);
      });
      
      await Promise.all(eventPromises);
      
      // Reset form and close modals
      setSelectedPlants(new Set());
      setShowDetailModal(false);
      setSelectedCareType(null);
      setCareDetails({
        notes: '',
        fertilizerStrength: '1x' as '1/4' | '1/2' | '1x' | '1.5x' | '2x',
        pestSeverity: 1,
      });
      // React Query mutations handle cache invalidation automatically
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
    const lastPhotoDate = plantLastPhotoData[item.id];
    const showCameraIcon = needsPhoto(lastPhotoDate);
    
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
                <Text style={[styles.wateringStatus, { color: wateringColor }]}>
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
              <Text style={[styles.wateringStatus, { color: wateringColor }]}>
                Last watered: {wateringDisplay.timeAgo}
              </Text>
            </View>
          </View>
          <View style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 32 }}>
            <TouchableOpacity
              style={[styles.pinButton]}
              onPress={(event) => handleTogglePin(item.id, event)}
            >
              {pinnedPlantIds.has(item.id) ? (
                <PinOff size={16} color={theme.colors.primary} />
              ) : (
                <Pin size={16} color={theme.colors.textSecondary} />
              )}
            </TouchableOpacity>
            {showCameraIcon && (
              <View style={{ padding: 8 }}>
                <Camera size={14} color={theme.colors.warning} />
              </View>
            )}
          </View>
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
      {/* Header with batch mode toggle and sorting controls */}
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
          
          <View style={globalStyles.flexRowCenter}>
            {batchModeEnabled && selectedPlants.size > 0 ? (
              <Text style={[globalStyles.bodySmall, { marginRight: 16 }]}>
                {selectedPlants.size} selected
              </Text>
            ) : (
              <View style={[globalStyles.flexRowCenter, { marginRight: 16 }]}>
                <TouchableOpacity
                  style={[styles.sortDropdownButton, { marginRight: 8 }]}
                  onPress={() => setShowFilterDropdown(!showFilterDropdown)}
                >
                  <Filter size={18} color={selectedTagsForFilter.size > 0 ? theme.colors.primary : theme.colors.textSecondary} />
                  {selectedTagsForFilter.size > 0 && (
                    <View style={styles.filterBadge}>
                      <Text style={styles.filterBadgeText}>{selectedTagsForFilter.size}</Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sortDropdownButton, { marginRight: 8 }]}
                  onPress={() => setShowSortDropdown(!showSortDropdown)}
                >
                  <ArrowDownUp size={18} color={theme.colors.textSecondary} />
                  <Text style={[styles.sortButtonText, { marginLeft: 6, marginRight: 4 }]}>
                    {globalSortPreference.type === 'name' ? 'Name' : 'Last Watered'}
                  </Text>
                  <ChevronDown size={16} color={theme.colors.textSecondary} />
                </TouchableOpacity>
                {showSortDropdown && (
                  <>
                    <TouchableOpacity 
                      style={styles.dropdownOverlay}
                      onPress={() => setShowSortDropdown(false)}
                      activeOpacity={1}
                    />
                    <View style={styles.sortDropdown}>
                      <TouchableOpacity
                        style={[
                          styles.sortDropdownItem, 
                          styles.sortDropdownItemWithBorder,
                          globalSortPreference.type === 'name' && styles.sortDropdownItemSelected
                        ]}
                        onPress={() => {
                          updateGlobalSortPreference('name', globalSortPreference.direction);
                          setShowSortDropdown(false);
                        }}
                      >
                        <Text style={[styles.sortDropdownText, globalSortPreference.type === 'name' && styles.sortDropdownTextSelected]}>
                          Name
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.sortDropdownItem, globalSortPreference.type === 'lastWatered' && styles.sortDropdownItemSelected]}
                        onPress={() => {
                          updateGlobalSortPreference('lastWatered', globalSortPreference.direction);
                          setShowSortDropdown(false);
                        }}
                      >
                        <Text style={[styles.sortDropdownText, globalSortPreference.type === 'lastWatered' && styles.sortDropdownTextSelected]}>
                          Last Watered
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
                {showFilterDropdown && (
                  <>
                    <TouchableOpacity 
                      style={styles.dropdownOverlay}
                      onPress={() => setShowFilterDropdown(false)}
                      activeOpacity={1}
                    />
                    <View style={[styles.sortDropdown, { width: 200 }]}>
                      <Text style={[styles.filterDropdownTitle, { padding: 12, fontWeight: 'bold' }]}>
                        Filter by Tags
                      </Text>
                      {availableTags.length === 0 ? (
                        <Text style={[styles.sortDropdownText, { padding: 12, fontStyle: 'italic' }]}>
                          No tags available
                        </Text>
                      ) : (
                        availableTags.map((tag) => {
                          const isSelected = selectedTagsForFilter.has(tag.id);
                          return (
                            <TouchableOpacity
                              key={tag.id}
                              style={[
                                styles.sortDropdownItem,
                                isSelected && styles.sortDropdownItemSelected
                              ]}
                              onPress={() => {
                                const newSelected = new Set(selectedTagsForFilter);
                                if (isSelected) {
                                  newSelected.delete(tag.id);
                                } else {
                                  newSelected.add(tag.id);
                                }
                                setSelectedTagsForFilter(newSelected);
                              }}
                            >
                              <View style={[styles.tagColorDot, { backgroundColor: tag.color }]} />
                              <Text style={[styles.sortDropdownText, isSelected && styles.sortDropdownTextSelected]}>
                                {tag.name}
                              </Text>
                              {isSelected && <Check size={16} color={theme.colors.primary} />}
                            </TouchableOpacity>
                          );
                        })
                      )}
                      {selectedTagsForFilter.size > 0 && (
                        <TouchableOpacity
                          style={[styles.sortDropdownItem, { borderTopWidth: 1, borderTopColor: theme.colors.border }]}
                          onPress={() => setSelectedTagsForFilter(new Set())}
                        >
                          <Text style={[styles.sortDropdownText, { color: theme.colors.error }]}>
                            Clear All Filters
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </>
                )}
                <TouchableOpacity
                  style={styles.sortButton}
                  onPress={() => {
                    const newDirection = globalSortPreference.direction === 'asc' ? 'desc' : 'asc';
                    updateGlobalSortPreference(globalSortPreference.type, newDirection);
                  }}
                >
                  {globalSortPreference.direction === 'asc' ? (
                    <ArrowUpNarrowWide size={20} color={theme.colors.textSecondary} />
                  ) : (
                    <ArrowDownWideNarrow size={20} color={theme.colors.textSecondary} />
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Search Bar */}
      {plants.length > 0 && (
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          marginHorizontal: 16,
          marginBottom: 12,
          paddingHorizontal: 12,
          paddingVertical: 8,
          backgroundColor: theme.colors.surface,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: isSearching ? theme.colors.primary : theme.colors.border,
        }}>
          <Search size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={{
              flex: 1,
              marginLeft: 8,
              fontSize: 16,
              color: theme.colors.textPrimary,
            }}
            placeholder="Search plants..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={handleSearchChange}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity
              onPress={clearSearch}
              style={{ padding: 4 }}
            >
              <X size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
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
          {/* Conditional rendering: Search results or sectioned list */}
          {isSearching ? (
            searchResults.length === 0 ? (
              <View style={styles.emptyState}>
                <Search size={48} color={theme.colors.textSecondary} />
                <Text style={styles.emptyText}>No plants found</Text>
                <Text style={styles.emptySubtext}>Try a different search term</Text>
              </View>
            ) : (
              <FlatList
                data={searchResults}
                renderItem={renderPlantItem}
                keyExtractor={(item) => item.id}
                style={styles.list}
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
            )
          ) : (
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
          )}
          
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
