import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  SectionList,
  RefreshControl,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import WebContainer from '../../components/WebContainer';
import {
  CheckSquare,
  Square,
  Filter,
  Search,
  X,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  ChevronDown,
  ArrowDownUp,
  Check,
} from 'lucide-react-native';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import { PhotoService } from '../../services/PhotoService';
import { Plant, Tag } from '../../types/Plant';
import { useTheme } from '../../contexts/ThemeContext';
import { createStyles } from '../../styles/MyPlantsStyles';
import { useRealtimeUpdates } from '../../hooks/useRealtimeUpdates';
import { useGlobalStyles } from '../../styles';
import {
  usePlants,
  useCreateEvent,
  useBatchThumbnails,
  useBatchLastEvents,
  useAllTags,
  useBatchPlantTags,
} from '../../hooks/queries';
import { TextSkeleton, PlantCardSkeleton } from '../../components/Skeleton';

// Custom hooks
import { usePinnedPlants } from '../../hooks/usePinnedPlants';
import { usePlantSorting } from '../../hooks/usePlantSorting';
import { usePlantFiltering } from '../../hooks/usePlantFiltering';
import { usePlantSearch } from '../../hooks/usePlantSearch';

// Components
import PlantListItem from '../../components/PlantListItem';
import PlantSectionHeader from '../../components/PlantSectionHeader';
import BatchCareModal, { CareDetails } from '../../components/BatchCareModal';

// Constants
import { CareEventType, getCareTypeByType } from '../../constants/careTypes';

dayjs.extend(relativeTime);

export default function HomeScreen() {
  const { theme } = useTheme();
  const globalStyles = useGlobalStyles();
  const styles = createStyles(theme);

  // React Query hooks
  const { data: plants = [], isLoading: plantsLoading, refetch: refetchPlants } = usePlants();
  const createEventMutation = useCreateEvent();

  // Batch queries for plant data
  const plantIds = useMemo(() => plants.map((p) => p.id), [plants]);
  const { data: batchThumbnailData = {} } = useBatchThumbnails(plantIds);
  const { data: batchTagsData = {} } = useBatchPlantTags(plantIds);
  const { data: availableTags = [] } = useAllTags();
  const { data: rawEventData, isLoading: eventsLoading } = useBatchLastEvents(plantIds, [
    'water',
    'fertigate',
  ]);

  // Custom hooks for state management
  const { pinnedPlantIds, togglePin } = usePinnedPlants();
  const { sortPreference, updateSortPreference, toggleSortDirection, sortPlants } =
    usePlantSorting();
  const {
    selectedTagIds: selectedTagsForFilter,
    toggleTagFilter,
    clearAllFilters,
    filterPlants,
    hasActiveFilters,
  } = usePlantFiltering();
  const { searchQuery, isSearching, searchResults, handleSearchChange, clearSearch } =
    usePlantSearch(plants);

  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [plantLastPhotoData, setPlantLastPhotoData] = useState<Record<string, string | null>>({});

  // Batch care mode state
  const [batchModeEnabled, setBatchModeEnabled] = useState(false);
  const [selectedPlants, setSelectedPlants] = useState<Set<string>>(new Set());
  const [showCareModal, setShowCareModal] = useState(false);

  // Derived data
  const loading = plantsLoading;

  // Extract watering data from event data
  const plantWateringData = useMemo(() => {
    const result: Record<string, string | null> = {};

    if (eventsLoading || !rawEventData) {
      plantIds.forEach((plantId) => {
        result[plantId] = null;
      });
      return result;
    }

    Object.entries(rawEventData).forEach(([plantId, events]) => {
      const lastWatering = events['water'];
      const lastFertigate = events['fertigate'];

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

      result[plantId] = mostRecentWatering?.date || null;
    });

    plantIds.forEach((plantId) => {
      if (!(plantId in result)) {
        result[plantId] = null;
      }
    });

    return result;
  }, [rawEventData, eventsLoading, plantIds]);

  // Extract thumbnail URLs from batch query
  const plantThumbnails = useMemo(() => {
    const result: Record<string, string> = {};
    Object.entries(batchThumbnailData).forEach(([plantId, photo]) => {
      if (photo) {
        result[plantId] = PhotoService.getImageUrl(photo, true);
      }
    });
    return result;
  }, [batchThumbnailData]);

  // Grouped and sorted plants
  const plantsGrouped = useMemo(() => {
    if (!plants.length) return [];

    const filteredPlants = filterPlants(plants, batchTagsData);
    const pinnedPlants = filteredPlants.filter((plant) => pinnedPlantIds.has(plant.id));
    const unpinnedPlants = filteredPlants.filter((plant) => !pinnedPlantIds.has(plant.id));

    const sections: { title: string; data: Plant[] }[] = [];

    if (pinnedPlants.length > 0) {
      sections.push({
        title: 'Pinned Plants',
        data: sortPlants(pinnedPlants, plantWateringData),
      });
    }

    const groupedUnpinnedPlants = unpinnedPlants.reduce((acc, plant) => {
      const location = plant.location || 'No Location';
      if (!acc[location]) {
        acc[location] = [];
      }
      acc[location].push(plant);
      return acc;
    }, {} as Record<string, Plant[]>);

    const locationSections = Object.entries(groupedUnpinnedPlants)
      .map(([location, locationPlants]) => ({
        title: location,
        data: sortPlants(locationPlants, plantWateringData),
      }))
      .filter((section) => section.data.length > 0);

    locationSections.sort((a, b) => {
      if (a.title === 'No Location') return 1;
      if (b.title === 'No Location') return -1;
      return a.title.localeCompare(b.title);
    });

    sections.push(...locationSections);
    return sections;
  }, [plants, pinnedPlantIds, sortPlants, filterPlants, batchTagsData, plantWateringData]);

  // Load auxiliary photo data
  const loadPlantAuxiliaryData = useCallback(async () => {
    if (!plants.length) return;

    try {
      const lastPhotoData: Record<string, string | null> = {};
      const batchSize = 20;

      for (let i = 0; i < plants.length; i += batchSize) {
        const batch = plants.slice(i, i + batchSize);

        const photoPromises = await Promise.all(
          batch.map(async (plant) => {
            try {
              const photos = await PhotoService.getPhotosByPlantId(plant.id);
              return photos.length > 0 ? photos[0] : null;
            } catch (error) {
              console.error(`Failed to load photos for plant ${plant.id}:`, error);
              return null;
            }
          })
        );

        batch.forEach((plant, index) => {
          const firstPhoto = photoPromises[index];
          lastPhotoData[plant.id] = firstPhoto?.taken_at || null;
        });

        if (i + batchSize < plants.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      setPlantLastPhotoData(lastPhotoData);
    } catch (error) {
      console.error('Failed to load plant auxiliary data:', error);
      setPlantLastPhotoData({});
    }
  }, [plants]);

  useEffect(() => {
    if (plants.length > 0) {
      loadPlantAuxiliaryData();
    }
  }, [plants.length]);

  // Set up real-time subscriptions
  useRealtimeUpdates({});

  // Reload data on screen focus (throttled)
  const lastFocusTime = useRef<number>(0);
  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      if (plants.length > 0 && now - lastFocusTime.current > 2 * 60 * 1000) {
        lastFocusTime.current = now;
        loadPlantAuxiliaryData();
      }
    }, [plants.length, loadPlantAuxiliaryData])
  );

  // Handlers
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetchPlants();
    } finally {
      setRefreshing(false);
    }
  }, [refetchPlants]);

  const handleTogglePin = useCallback(
    async (plantId: string, event: any) => {
      event.stopPropagation();
      try {
        await togglePin(plantId);
      } catch (error) {
        console.error('Failed to toggle pin:', error);
        Alert.alert('Error', 'Failed to update pin status');
      }
    },
    [togglePin]
  );

  const toggleBatchMode = () => {
    setBatchModeEnabled(!batchModeEnabled);
    setSelectedPlants(new Set());
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
    const allSelected = plants.every((plant) => newSelected.has(plant.id));

    if (allSelected) {
      plants.forEach((plant) => newSelected.delete(plant.id));
    } else {
      plants.forEach((plant) => newSelected.add(plant.id));
    }
    setSelectedPlants(newSelected);
  };

  const handleBatchCareSubmit = async (careType: CareEventType, details: CareDetails) => {
    if (selectedPlants.size === 0) return;

    const selectedPlantsList = Array.from(selectedPlants);
    const careTypeInfo = getCareTypeByType(careType);
    const careTypeLabel = careTypeInfo?.label || careType;

    const eventPromises = selectedPlantsList.map(async (plantId) => {
      const careEventData: any = {
        plant_id: plantId,
        event_type: careType,
        date: new Date().toISOString(),
        notes: details.notes.trim() || `Batch care: ${careTypeLabel}`,
      };

      if (careType === 'fertilize' || careType === 'fertigate') {
        careEventData.fertilizer_concentration = details.fertilizerStrength;
      } else if (careType === 'pest_spotted') {
        careEventData.pest_severity = details.pestSeverity;
      }

      return createEventMutation.mutateAsync(careEventData);
    });

    await Promise.all(eventPromises);
    setSelectedPlants(new Set());
    setShowCareModal(false);
  };

  // Render functions
  const renderPlantItem = ({ item }: { item: Plant }) => (
    <PlantListItem
      plant={item}
      thumbnail={plantThumbnails[item.id]}
      lastWateredDate={plantWateringData[item.id]}
      lastPhotoDate={plantLastPhotoData[item.id]}
      tags={batchTagsData[item.id] || []}
      isPinned={pinnedPlantIds.has(item.id)}
      isEventsLoading={eventsLoading}
      batchModeEnabled={batchModeEnabled}
      isSelected={selectedPlants.has(item.id)}
      onToggleSelection={togglePlantSelection}
      onTogglePin={handleTogglePin}
    />
  );

  const renderSectionHeader = ({ section }: { section: { title: string; data: Plant[] } }) => (
    <PlantSectionHeader
      title={section.title}
      plantCount={section.data.length}
      batchModeEnabled={batchModeEnabled}
      plants={section.data}
      selectedPlantIds={selectedPlants}
      onSelectAll={selectAllInLocation}
    />
  );

  // Loading state
  if (loading) {
    return (
      <WebContainer>
      <View style={styles.container}>
        <View style={globalStyles.flexRowBetween}>
          <View
            style={[
              globalStyles.flexRowCenter,
              { margin: 16, padding: 8, borderRadius: 8, backgroundColor: theme.colors.surface },
            ]}
          >
            <Square size={20} color={theme.colors.textSecondary} />
            <Text
              style={[globalStyles.buttonTextSecondary, { marginLeft: 8, color: theme.colors.textPrimary }]}
            >
              Batch Mode
            </Text>
          </View>

          <View style={[globalStyles.flexRowCenter, { marginRight: 16 }]}>
            <TextSkeleton width={32} style={{ marginRight: 8 }} />
            <TextSkeleton width={80} style={{ marginRight: 8 }} />
            <TextSkeleton width={20} />
          </View>
        </View>

        <View style={styles.searchBarContainer}>
          <Search size={20} color={theme.colors.textSecondary} />
          <TextSkeleton width="60%" style={{ marginLeft: 8 }} />
        </View>

        <ScrollView style={styles.list}>
          <View style={styles.sectionHeader}>
            <TextSkeleton width={120} height={20} />
            <TextSkeleton width={60} height={16} />
          </View>
          {Array.from({ length: 6 }).map((_, index) => (
            <PlantCardSkeleton key={index} />
          ))}
        </ScrollView>
      </View>
      </WebContainer>
    );
  }

  return (
    <WebContainer>
    <View style={styles.container}>
      {/* Header with batch mode toggle and sorting controls */}
      {plants.length > 0 && (
        <View style={globalStyles.flexRowBetween}>
          <TouchableOpacity
            style={[
              globalStyles.flexRowCenter,
              {
                margin: 16,
                padding: 8,
                borderRadius: 8,
                backgroundColor: batchModeEnabled ? theme.colors.primary : theme.colors.surface,
              },
            ]}
            onPress={toggleBatchMode}
          >
            {batchModeEnabled ? (
              <CheckSquare size={20} color={theme.colors.textOnPrimary} />
            ) : (
              <Square size={20} color={theme.colors.textSecondary} />
            )}
            <Text
              style={[
                globalStyles.buttonTextSecondary,
                {
                  marginLeft: 8,
                  color: batchModeEnabled ? theme.colors.textOnPrimary : theme.colors.textPrimary,
                },
              ]}
            >
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
                {/* Filter Button */}
                <TouchableOpacity
                  style={[styles.sortDropdownButton, { marginRight: 8 }]}
                  onPress={() => setShowFilterDropdown(!showFilterDropdown)}
                >
                  <Filter
                    size={18}
                    color={hasActiveFilters ? theme.colors.primary : theme.colors.textSecondary}
                  />
                  {hasActiveFilters && (
                    <View style={styles.filterBadge}>
                      <Text style={styles.filterBadgeText}>{selectedTagsForFilter.size}</Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* Sort Dropdown Button */}
                <TouchableOpacity
                  style={[styles.sortDropdownButton, { marginRight: 8 }]}
                  onPress={() => setShowSortDropdown(!showSortDropdown)}
                >
                  <ArrowDownUp size={18} color={theme.colors.textSecondary} />
                  <Text style={[styles.sortButtonText, { marginLeft: 6, marginRight: 4 }]}>
                    {sortPreference.type === 'name' ? 'Name' : 'Last Watered'}
                  </Text>
                  <ChevronDown size={16} color={theme.colors.textSecondary} />
                </TouchableOpacity>

                {/* Sort Dropdown */}
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
                          sortPreference.type === 'name' && styles.sortDropdownItemSelected,
                        ]}
                        onPress={() => {
                          updateSortPreference('name', sortPreference.direction);
                          setShowSortDropdown(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.sortDropdownText,
                            sortPreference.type === 'name' && styles.sortDropdownTextSelected,
                          ]}
                        >
                          Name
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.sortDropdownItem,
                          sortPreference.type === 'lastWatered' && styles.sortDropdownItemSelected,
                        ]}
                        onPress={() => {
                          updateSortPreference('lastWatered', sortPreference.direction);
                          setShowSortDropdown(false);
                        }}
                      >
                        <Text
                          style={[
                            styles.sortDropdownText,
                            sortPreference.type === 'lastWatered' && styles.sortDropdownTextSelected,
                          ]}
                        >
                          Last Watered
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}

                {/* Filter Dropdown */}
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
                        <Text
                          style={[styles.sortDropdownText, { padding: 12, fontStyle: 'italic' }]}
                        >
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
                                isSelected && styles.sortDropdownItemSelected,
                              ]}
                              onPress={() => toggleTagFilter(tag.id)}
                            >
                              <View style={[styles.tagColorDot, { backgroundColor: tag.color }]} />
                              <Text
                                style={[
                                  styles.sortDropdownText,
                                  isSelected && styles.sortDropdownTextSelected,
                                ]}
                              >
                                {tag.name}
                              </Text>
                              {isSelected && <Check size={16} color={theme.colors.primary} />}
                            </TouchableOpacity>
                          );
                        })
                      )}
                      {hasActiveFilters && (
                        <TouchableOpacity
                          style={[
                            styles.sortDropdownItem,
                            { borderTopWidth: 1, borderTopColor: theme.colors.border },
                          ]}
                          onPress={clearAllFilters}
                        >
                          <Text style={[styles.sortDropdownText, { color: theme.colors.error }]}>
                            Clear All Filters
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </>
                )}

                {/* Sort Direction Toggle */}
                <TouchableOpacity style={styles.sortButton} onPress={toggleSortDirection}>
                  {sortPreference.direction === 'asc' ? (
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
        <View style={[styles.searchBarContainer, isSearching && styles.searchBarActive]}>
          <Search size={20} color={theme.colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search plants..."
            placeholderTextColor={theme.colors.textSecondary}
            value={searchQuery}
            onChangeText={handleSearchChange}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={clearSearch} style={{ padding: 4 }}>
              <X size={20} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Content */}
      {plants.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No plants yet!</Text>
          <Text style={styles.emptySubtext}>Add your first plant to get started</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => router.navigate('/add-plant')}>
            <Text style={styles.addButtonText}>Add Plant</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
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
                contentContainerStyle={
                  batchModeEnabled && selectedPlants.size > 0 ? globalStyles.listContent : undefined
                }
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
              contentContainerStyle={
                batchModeEnabled && selectedPlants.size > 0 ? globalStyles.listContent : undefined
              }
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
            <TouchableOpacity style={globalStyles.fab} onPress={() => setShowCareModal(true)}>
              <Text style={[globalStyles.buttonText, { fontSize: 12, textAlign: 'center' }]}>
                Add Event ({selectedPlants.size})
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.fab} onPress={() => router.navigate('/add-plant')}>
              <Text style={styles.fabText}>+</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* Batch Care Modal */}
      <BatchCareModal
        visible={showCareModal}
        selectedCount={selectedPlants.size}
        onClose={() => setShowCareModal(false)}
        onSubmit={handleBatchCareSubmit}
      />
    </View>
    </WebContainer>
  );
}
