import { useState, useCallback, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Plant, Tag } from '../types/Plant';

const FILTER_TAGS_KEY = 'filter_selected_tags';

export interface UsePlantFilteringReturn {
  selectedTagIds: Set<string>;
  updateFilterTags: (tagIds: Set<string>) => Promise<void>;
  toggleTagFilter: (tagId: string) => Promise<void>;
  clearAllFilters: () => Promise<void>;
  filterPlants: (plants: Plant[], plantTagsData: Record<string, Tag[]>) => Plant[];
  hasActiveFilters: boolean;
  isLoading: boolean;
}

export const usePlantFiltering = (): UsePlantFilteringReturn => {
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);

  // Load filter tags from AsyncStorage on mount
  useEffect(() => {
    const loadFilterTags = async () => {
      try {
        const stored = await AsyncStorage.getItem(FILTER_TAGS_KEY);
        if (stored) {
          setSelectedTagIds(new Set(JSON.parse(stored)));
        }
      } catch (error) {
        console.error('Failed to load filter tags:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadFilterTags();
  }, []);

  // Save filter tags to AsyncStorage
  const saveFilterTags = useCallback(async (tagIds: Set<string>) => {
    try {
      await AsyncStorage.setItem(FILTER_TAGS_KEY, JSON.stringify(Array.from(tagIds)));
    } catch (error) {
      console.error('Failed to save filter tags:', error);
    }
  }, []);

  // Update filter tags
  const updateFilterTags = useCallback(
    async (tagIds: Set<string>) => {
      setSelectedTagIds(tagIds);
      await saveFilterTags(tagIds);
    },
    [saveFilterTags]
  );

  // Toggle a single tag filter
  const toggleTagFilter = useCallback(
    async (tagId: string) => {
      const newSelected = new Set(selectedTagIds);
      if (newSelected.has(tagId)) {
        newSelected.delete(tagId);
      } else {
        newSelected.add(tagId);
      }
      await updateFilterTags(newSelected);
    },
    [selectedTagIds, updateFilterTags]
  );

  // Clear all filters
  const clearAllFilters = useCallback(async () => {
    await updateFilterTags(new Set());
  }, [updateFilterTags]);

  // Filter plants by selected tags (OR logic - plant must have ANY of the selected tags)
  const filterPlants = useCallback(
    (plants: Plant[], plantTagsData: Record<string, Tag[]>): Plant[] => {
      if (selectedTagIds.size === 0) {
        return plants;
      }

      return plants.filter((plant) => {
        const plantTags = plantTagsData[plant.id] || [];
        const plantTagIds = new Set(plantTags.map((tag) => tag.id));

        // Check if plant has ANY of the selected tag IDs (OR logic)
        const selectedTagIdsArray = Array.from(selectedTagIds);
        return selectedTagIdsArray.some((tagId) => plantTagIds.has(tagId));
      });
    },
    [selectedTagIds]
  );

  const hasActiveFilters = useMemo(() => selectedTagIds.size > 0, [selectedTagIds]);

  return {
    selectedTagIds,
    updateFilterTags,
    toggleTagFilter,
    clearAllFilters,
    filterPlants,
    hasActiveFilters,
    isLoading,
  };
};
