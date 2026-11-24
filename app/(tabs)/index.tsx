import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  SectionList,
  RefreshControl,
  ScrollView,
  TextInput,
  Platform,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import WebContainer from "../../components/WebContainer";
import { useWebModal } from "../../contexts/WebModalContext";
import {
  Filter,
  Plus,
  CalendarPlus,
  Search,
  X,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  ChevronDown,
  ArrowDownUp,
  Check,
  Leaf,
} from "lucide-react-native";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

import { PhotoService } from "../../services/PhotoService";
import { Plant, Tag } from "../../types/Plant";
import { useTheme } from "../../contexts/ThemeContext";
import { createStyles } from "../../styles/MyPlantsStyles";
import { useRealtimeUpdates } from "../../hooks/useRealtimeUpdates";
import { useGlobalStyles } from "../../styles";
import { useBreakpoint } from "../../hooks/useBreakpoint";
import {
  usePlants,
  useCreateEvent,
  useBatchThumbnails,
  useBatchLastEvents,
  useAllTags,
  useBatchPlantTags,
} from "../../hooks/queries";
import {
  Skeleton,
  TextSkeleton,
  PlantCardSkeleton,
} from "../../components/Skeleton";

// Custom hooks
import { usePinnedPlants } from "../../hooks/usePinnedPlants";
import { usePlantSorting } from "../../hooks/usePlantSorting";
import { usePlantFiltering } from "../../hooks/usePlantFiltering";
import { usePlantSearch } from "../../hooks/usePlantSearch";

// Components
import PlantListItem from "../../components/PlantListItem";
import PlantSectionHeader from "../../components/PlantSectionHeader";
import BatchCareModal, { CareDetails } from "../../components/BatchCareModal";
import PlantDetailPanel from "../../components/PlantDetailPanel";

// Constants
import { CareEventType, getCareTypeByType } from "../../constants/careTypes";
import { useAlert } from "../../contexts/AlertContext";

dayjs.extend(relativeTime);

export default function HomeScreen() {
  const { theme } = useTheme();
  const { showAlert } = useAlert();
  const globalStyles = useGlobalStyles();
  const styles = createStyles(theme);
  const { isDesktop, isTablet, isWide, canShowSidePanel } = useBreakpoint();
  const { openModal } = useWebModal();
  const isGridLayout = Platform.OS === "web" && isWide;

  // React Query hooks
  const {
    data: plants = [],
    isLoading: plantsLoading,
    refetch: refetchPlants,
  } = usePlants();
  const createEventMutation = useCreateEvent();

  // Batch queries for plant data
  const plantIds = useMemo(() => plants.map((p) => p.id), [plants]);
  const { data: batchThumbnailData = {} } = useBatchThumbnails(plantIds);
  const { data: batchTagsData = {} } = useBatchPlantTags(plantIds);
  const { data: availableTags = [] } = useAllTags();
  const { data: rawEventData, isLoading: eventsLoading } = useBatchLastEvents(
    plantIds,
    ["water", "fertigate"],
  );

  // Custom hooks for state management
  const { pinnedPlantIds, togglePin } = usePinnedPlants();
  const {
    sortPreference,
    updateSortPreference,
    toggleSortDirection,
    sortPlants,
  } = usePlantSorting();
  const {
    selectedTagIds: selectedTagsForFilter,
    toggleTagFilter,
    clearAllFilters,
    filterPlants,
    hasActiveFilters,
  } = usePlantFiltering();
  const {
    searchQuery,
    isSearching,
    searchResults,
    handleSearchChange,
    clearSearch,
  } = usePlantSearch(plants);

  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [plantLastPhotoData, setPlantLastPhotoData] = useState<
    Record<string, string | null>
  >({});

  // Batch care mode state
  const [batchModeEnabled, setBatchModeEnabled] = useState(false);
  const [selectedPlants, setSelectedPlants] = useState<Set<string>>(new Set());
  const [showCareModal, setShowCareModal] = useState(false);

  // Desktop detail panel state
  const [detailPanelPlantId, setDetailPanelPlantId] = useState<string | null>(
    null,
  );
  const showDetailPanel = isGridLayout && detailPanelPlantId !== null;
  // Show panel side-by-side only when wide enough; otherwise overlay it
  const showPanelInline = showDetailPanel && canShowSidePanel;
  const showPanelOverlay = showDetailPanel && !canShowSidePanel;

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
      const lastWatering = events["water"];
      const lastFertigate = events["fertigate"];

      let mostRecentWatering = null;
      if (lastWatering && lastFertigate) {
        mostRecentWatering = dayjs(lastWatering.date).isAfter(
          dayjs(lastFertigate.date),
        )
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
    const pinnedPlants = filteredPlants.filter((plant) =>
      pinnedPlantIds.has(plant.id),
    );
    const unpinnedPlants = filteredPlants.filter(
      (plant) => !pinnedPlantIds.has(plant.id),
    );

    const sections: { title: string; data: Plant[] }[] = [];

    if (pinnedPlants.length > 0) {
      sections.push({
        title: "Pinned",
        data: sortPlants(pinnedPlants, plantWateringData),
      });
    }

    const groupedUnpinnedPlants = unpinnedPlants.reduce(
      (acc, plant) => {
        const location = plant.location || "No Location";
        if (!acc[location]) {
          acc[location] = [];
        }
        acc[location].push(plant);
        return acc;
      },
      {} as Record<string, Plant[]>,
    );

    const locationSections = Object.entries(groupedUnpinnedPlants)
      .map(([location, locationPlants]) => ({
        title: location,
        data: sortPlants(locationPlants, plantWateringData),
      }))
      .filter((section) => section.data.length > 0);

    locationSections.sort((a, b) => {
      if (a.title === "No Location") return 1;
      if (b.title === "No Location") return -1;
      return a.title.localeCompare(b.title);
    });

    sections.push(...locationSections);
    return sections;
  }, [
    plants,
    pinnedPlantIds,
    sortPlants,
    filterPlants,
    batchTagsData,
    plantWateringData,
  ]);

  // Load auxiliary photo data
  const loadPlantAuxiliaryData = useCallback(async () => {
    if (!plants.length) return;

    try {
      // Single batched query for every plant's most-recent photo date,
      // replacing the previous N+1 (one getPhotosByPlantId per plant).
      const plantIds = plants.map((p) => p.id);
      const lastPhotoData =
        await PhotoService.getLastPhotoDatesByPlantIds(plantIds);
      setPlantLastPhotoData(lastPhotoData);
    } catch (error) {
      console.error("Failed to load plant auxiliary data:", error);
      setPlantLastPhotoData({});
    }
  }, [plants]);

  useEffect(() => {
    if (plants.length > 0) {
      loadPlantAuxiliaryData();
    }
  }, [plants, loadPlantAuxiliaryData]);

  // Set up real-time subscriptions
  useRealtimeUpdates({});

  // Refresh on focus so camera icon clears after a new photo.
  useFocusEffect(
    useCallback(() => {
      if (plants.length > 0) {
        loadPlantAuxiliaryData();
      }
    }, [plants, loadPlantAuxiliaryData]),
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
        console.error("Failed to toggle pin:", error);
        showAlert("Error", "Failed to update pin status");
      }
    },
    [togglePin],
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

  const handleBatchCareSubmit = async (
    careType: CareEventType,
    details: CareDetails,
  ) => {
    if (selectedPlants.size === 0) return;

    const selectedPlantsList = Array.from(selectedPlants);
    const careTypeInfo = getCareTypeByType(careType);
    const careTypeLabel = careTypeInfo?.label || careType;

    const eventPromises = selectedPlantsList.map(async (plantId) => {
      const careEventData: any = {
        plant_id: plantId,
        event_type: careType,
        date: details.date.toISOString(),
        notes: details.notes.trim() || `Batch care: ${careTypeLabel}`,
      };

      if (careType === "fertilize" || careType === "fertigate") {
        careEventData.fertilizer_concentration = details.fertilizerStrength;
      } else if (careType === "pest_spotted") {
        careEventData.pest_severity = details.pestSeverity;
      }

      return createEventMutation.mutateAsync(careEventData);
    });

    await Promise.all(eventPromises);
    setSelectedPlants(new Set());
    setShowCareModal(false);
  };

  // Handler for desktop detail panel
  const handlePlantPressDesktop = useCallback((plantId: string) => {
    setDetailPanelPlantId(plantId);
  }, []);

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

  // Determine grid columns based on whether detail panel is open inline
  const gridItemStyle = showPanelInline
    ? styles.gridItemTablet // 2 columns when inline panel is open
    : isDesktop
      ? styles.gridItemDesktop // 3 columns when panel is closed on desktop
      : styles.gridItemTablet; // 2 columns on tablet

  const renderPlantItemInGrid = (item: Plant) => (
    <View key={item.id} style={gridItemStyle}>
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
        onPress={isGridLayout ? handlePlantPressDesktop : undefined}
      />
    </View>
  );

  const renderSectionHeader = ({
    section,
  }: {
    section: { title: string; data: Plant[] };
  }) => (
    <PlantSectionHeader
      title={section.title}
      pinned={section.title === "Pinned"}
      plantCount={section.data.length}
      batchModeEnabled={batchModeEnabled}
      plants={section.data}
      selectedPlantIds={selectedPlants}
      onSelectAll={selectAllInLocation}
    />
  );

  // Desktop grid content renderer
  const renderGridContent = () => (
    <ScrollView
      style={styles.list}
      contentContainerStyle={
        batchModeEnabled && selectedPlants.size > 0
          ? globalStyles.listContent
          : undefined
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={theme.colors.primary}
          colors={[theme.colors.primary]}
        />
      }
    >
      {isSearching ? (
        searchResults.length === 0 ? (
          <View style={styles.emptyState}>
            <Search size={48} color={theme.colors.textSecondary} />
            <Text style={styles.emptyText}>No plants found</Text>
            <Text style={styles.emptySubtext}>Try a different search term</Text>
          </View>
        ) : (
          <View style={styles.gridRow}>
            {searchResults.map((plant) => renderPlantItemInGrid(plant))}
          </View>
        )
      ) : (
        plantsGrouped.map((section) => (
          <View key={section.title}>
            <PlantSectionHeader
              title={section.title}
              pinned={section.title === "Pinned"}
              plantCount={section.data.length}
              batchModeEnabled={batchModeEnabled}
              plants={section.data}
              selectedPlantIds={selectedPlants}
              onSelectAll={selectAllInLocation}
            />
            <View style={styles.gridRow}>
              {section.data.map((plant) => renderPlantItemInGrid(plant))}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );

  const sortLabel =
    sortPreference.type === "name" ? "Name" : "Last watered";

  // Header toolbar (shared between loading and loaded states)
  const renderToolbar = () => (
    <>
      {/* Desktop page title */}
      {isGridLayout && (
        <View style={styles.pageHeader}>
          <View style={styles.pageHeaderLeft}>
            <Leaf size={22} color={theme.colors.primary} />
            <Text style={styles.pageTitle}>My Plants</Text>
          </View>
          <Text style={styles.plantCount}>
            {plants.length} plant{plants.length !== 1 ? "s" : ""}
          </Text>
        </View>
      )}

      {plants.length > 0 && (
        <View style={styles.toolbar}>
          {/* Search Bar */}
          <View
            style={[
              styles.searchBarContainer,
              isSearching && styles.searchBarActive,
            ]}
          >
            <Search size={18} color={theme.colors.textTertiary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search plants"
              placeholderTextColor={theme.colors.textTertiary}
              value={searchQuery}
              onChangeText={handleSearchChange}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={clearSearch}
                style={styles.searchClear}
                accessibilityLabel="Clear search"
              >
                <X size={16} color={theme.colors.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.controlsRow}>
            {batchModeEnabled ? (
              <Text style={styles.selectionCount}>
                {selectedPlants.size === 0
                  ? "Tap plants to select"
                  : `${selectedPlants.size} selected`}
              </Text>
            ) : (
              <View style={styles.controlsLeft}>
                {/* Sort */}
                <TouchableOpacity
                  style={styles.chip}
                  onPress={() => {
                    setShowFilterDropdown(false);
                    setShowSortDropdown(!showSortDropdown);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={`Sort by ${sortLabel}`}
                >
                  <ArrowDownUp size={14} color={theme.colors.textSecondary} />
                  <Text style={styles.chipText}>{sortLabel}</Text>
                  <ChevronDown size={14} color={theme.colors.textTertiary} />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.chipIcon}
                  onPress={toggleSortDirection}
                  accessibilityRole="button"
                  accessibilityLabel={
                    sortPreference.direction === "asc"
                      ? "Sort ascending"
                      : "Sort descending"
                  }
                >
                  {sortPreference.direction === "asc" ? (
                    <ArrowUpNarrowWide
                      size={16}
                      color={theme.colors.textSecondary}
                    />
                  ) : (
                    <ArrowDownWideNarrow
                      size={16}
                      color={theme.colors.textSecondary}
                    />
                  )}
                </TouchableOpacity>

                {/* Tag filter */}
                <TouchableOpacity
                  style={[styles.chip, hasActiveFilters && styles.chipActive]}
                  onPress={() => {
                    setShowSortDropdown(false);
                    setShowFilterDropdown(!showFilterDropdown);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Filter by tag"
                >
                  <Filter
                    size={14}
                    color={
                      hasActiveFilters
                        ? theme.colors.primary
                        : theme.colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.chipText,
                      hasActiveFilters && styles.chipTextActive,
                    ]}
                  >
                    {hasActiveFilters
                      ? `Tags · ${selectedTagsForFilter.size}`
                      : "Tags"}
                  </Text>
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
                      {(
                        [
                          ["name", "Name"],
                          ["lastWatered", "Last watered"],
                        ] as const
                      ).map(([type, label]) => {
                        const selected = sortPreference.type === type;
                        return (
                          <TouchableOpacity
                            key={type}
                            style={[
                              styles.sortDropdownItem,
                              selected && styles.sortDropdownItemSelected,
                            ]}
                            onPress={() => {
                              updateSortPreference(
                                type,
                                sortPreference.direction,
                              );
                              setShowSortDropdown(false);
                            }}
                          >
                            <Text
                              style={[
                                styles.sortDropdownText,
                                selected && styles.sortDropdownTextSelected,
                              ]}
                            >
                              {label}
                            </Text>
                            {selected && (
                              <Check size={16} color={theme.colors.primary} />
                            )}
                          </TouchableOpacity>
                        );
                      })}
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
                    <View style={[styles.sortDropdown, styles.filterDropdown]}>
                      <Text style={styles.dropdownTitle}>Filter by tag</Text>
                      {availableTags.length === 0 ? (
                        <Text style={styles.dropdownEmpty}>
                          No tags yet
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
                              <View
                                style={[
                                  styles.tagColorDot,
                                  { backgroundColor: tag.color },
                                ]}
                              />
                              <Text
                                style={[
                                  styles.sortDropdownText,
                                  isSelected && styles.sortDropdownTextSelected,
                                ]}
                                numberOfLines={1}
                              >
                                {tag.name}
                              </Text>
                              {isSelected && (
                                <Check size={16} color={theme.colors.primary} />
                              )}
                            </TouchableOpacity>
                          );
                        })
                      )}
                      {hasActiveFilters && (
                        <TouchableOpacity
                          style={[
                            styles.sortDropdownItem,
                            styles.dropdownFooter,
                          ]}
                          onPress={clearAllFilters}
                        >
                          <Text
                            style={[
                              styles.sortDropdownText,
                              { color: theme.colors.error },
                            ]}
                          >
                            Clear filters
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </>
                )}
              </View>
            )}

            {/* Batch select mode */}
            <TouchableOpacity
              style={styles.selectButton}
              onPress={toggleBatchMode}
              accessibilityRole="button"
            >
              <Text
                style={[
                  styles.selectButtonText,
                  batchModeEnabled && styles.selectButtonTextActive,
                ]}
              >
                {batchModeEnabled ? "Done" : "Select"}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </>
  );

  // Loading state
  if (loading) {
    return (
      <WebContainer>
        <View style={styles.container}>
          <View style={styles.toolbar}>
            <View style={styles.searchBarContainer}>
              <Search size={18} color={theme.colors.textTertiary} />
              <TextSkeleton width="40%" style={{ marginLeft: 8 }} />
            </View>
            <View style={styles.controlsRow}>
              <View style={styles.controlsLeft}>
                <Skeleton width={110} height={32} borderRadius={16} />
                <Skeleton width={32} height={32} borderRadius={16} />
                <Skeleton width={70} height={32} borderRadius={16} />
              </View>
            </View>
          </View>

          <ScrollView style={styles.list}>
            <View style={styles.sectionHeader}>
              <TextSkeleton width={120} height={20} />
              <TextSkeleton width={60} height={16} />
            </View>
            {isGridLayout ? (
              <View style={styles.gridRow}>
                {Array.from({ length: 6 }).map((_, index) => (
                  <View
                    key={index}
                    style={
                      isDesktop ? styles.gridItemDesktop : styles.gridItemTablet
                    }
                  >
                    <PlantCardSkeleton />
                  </View>
                ))}
              </View>
            ) : (
              Array.from({ length: 6 }).map((_, index) => (
                <PlantCardSkeleton key={index} />
              ))
            )}
          </ScrollView>
        </View>
      </WebContainer>
    );
  }

  return (
    <WebContainer>
      <View
        style={[styles.container, showPanelInline && styles.containerWithPanel]}
      >
        <View
          style={[
            showPanelInline ? styles.mainContent : styles.mainContentFull,
          ]}
        >
          {renderToolbar()}

          {/* Content */}
          {plants.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No plants yet!</Text>
              <Text style={styles.emptySubtext}>
                Add your first plant to get started
              </Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() =>
                  openModal("add-plant") || router.navigate("/add-plant")
                }
              >
                <Text style={styles.addButtonText}>Add Plant</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {isGridLayout ? (
                renderGridContent()
              ) : isSearching ? (
                searchResults.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Search size={48} color={theme.colors.textSecondary} />
                    <Text style={styles.emptyText}>No plants found</Text>
                    <Text style={styles.emptySubtext}>
                      Try a different search term
                    </Text>
                  </View>
                ) : (
                  <FlatList
                    data={searchResults}
                    renderItem={renderPlantItem}
                    keyExtractor={(item) => item.id}
                    style={styles.list}
                    contentContainerStyle={
                      batchModeEnabled && selectedPlants.size > 0
                        ? globalStyles.listContent
                        : undefined
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
                    batchModeEnabled && selectedPlants.size > 0
                      ? globalStyles.listContent
                      : undefined
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
                <TouchableOpacity
                  style={styles.batchFab}
                  onPress={() => setShowCareModal(true)}
                  accessibilityRole="button"
                >
                  <CalendarPlus size={18} color={theme.colors.textOnPrimary} />
                  <Text style={styles.batchFabText}>
                    Log event · {selectedPlants.size}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.fab}
                  onPress={() =>
                    openModal("add-plant") || router.navigate("/add-plant")
                  }
                  accessibilityRole="button"
                  accessibilityLabel="Add plant"
                >
                  <Plus size={26} color={theme.colors.textOnPrimary} />
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

        {/* Desktop Detail Panel - inline when wide enough */}
        {showPanelInline && detailPanelPlantId && (
          <PlantDetailPanel
            plantId={detailPanelPlantId}
            onClose={() => setDetailPanelPlantId(null)}
            onSelectPlant={setDetailPanelPlantId}
          />
        )}

        {/* Desktop Detail Panel - overlay when screen is narrow */}
        {showPanelOverlay && detailPanelPlantId && (
          <View style={styles.panelOverlayBackdrop}>
            <TouchableOpacity
              style={styles.panelOverlayDismiss}
              activeOpacity={1}
              onPress={() => setDetailPanelPlantId(null)}
            />
            <View style={styles.panelOverlayContainer}>
              <PlantDetailPanel
                plantId={detailPanelPlantId}
                onClose={() => setDetailPanelPlantId(null)}
                onSelectPlant={setDetailPanelPlantId}
                style={{ width: "100%" }}
              />
            </View>
          </View>
        )}
      </View>
    </WebContainer>
  );
}
